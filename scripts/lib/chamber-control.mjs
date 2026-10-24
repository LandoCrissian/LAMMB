import assert from 'node:assert/strict';

// Keep native input serial when switching from raw CDP touch/pointer capture.
// Do not query the renderer between move/down/up: mixed touch + software WebGL
// can stall that evaluation before the gesture finishes. Check geometry first,
// record trusted event receivers passively, then verify after the full gesture.
// No force, DOM click, scene mutation, input retry or extra timeout.
export async function clickChamberControl(page, control) {
  // mouse.down/up have no locator timeout of their own. Preserve the original
  // 30-second click budget across the whole sequence. A failed
  // caller closes its disposable browser, cancelling outstanding protocol work.
  let timer,
    expired = false,
    phase = 'enabled check',
    prepared = false,
    inspected = false;
  let inspect, target;
  const deadline = new Promise((_, reject) => {
    timer = setTimeout(() => {
      expired = true;
      reject(
        new Error(
          `Chamber control input acknowledgement timed out (30000ms) during ${phase}: ${String(control)}`,
        ),
      );
    }, 30000);
  });
  const check = () => {
    if (expired) throw new Error('Chamber control input deadline expired');
  };
  try {
    await Promise.race([
      deadline,
      (async () => {
        assert(await control.isEnabled(), 'Chamber control must be enabled');
        check();
        phase = 'control identity';
        target = await control.elementHandle();
        check();
        assert(target, 'Chamber control must resolve to an element');
        phase = 'visible geometry';
        const box = await target.boundingBox();
        check();
        assert(
          box && box.width > 0 && box.height > 0,
          'Visible control geometry',
        );
        const point = { x: box.x + box.width / 2, y: box.y + box.height / 2 };
        const viewport = page.viewportSize();
        assert(
          viewport &&
            Number.isFinite(point.x) &&
            Number.isFinite(point.y) &&
            point.x >= 0 &&
            point.x < viewport.width &&
            point.y >= 0 &&
            point.y < viewport.height,
          'Chamber control must be inside the viewport',
        );
        inspect = (stage) =>
          target.evaluate(
            (element, { at, stage }) => {
              const key = Symbol.for('lammb.acceptance.control-pointer-trace');
              const doc = element.ownerDocument;
              if (stage === 'prepare') {
                const hit = doc.elementFromPoint(at.x, at.y);
                if (
                  !element.isConnected ||
                  !(hit === element || element.contains(hit))
                )
                  return false;
                const receipt = { down: false, up: false, stop: null };
                const record = (event) => {
                  if (
                    event.isTrusted &&
                    event.button === 0 &&
                    event.pointerType === 'mouse' &&
                    event.composedPath().includes(element)
                  ) {
                    if (event.type === 'pointerdown') receipt.down = true;
                    if (event.type === 'pointerup' && receipt.down)
                      receipt.up = true;
                  }
                };
                receipt.stop = () => {
                  doc.removeEventListener('pointerdown', record, true);
                  doc.removeEventListener('pointerup', record, true);
                  delete element[key];
                };
                element[key] = receipt;
                doc.addEventListener('pointerdown', record, true);
                doc.addEventListener('pointerup', record, true);
                return true;
              }
              const receipt = element[key];
              if (!receipt) return false;
              receipt.stop();
              return stage === 'verify' && receipt.down && receipt.up;
            },
            { at: point, stage },
          );
        phase = 'native hit test';
        assert(
          await inspect('prepare'),
          'Chamber control must receive native input',
        );
        prepared = true;
        check();
        phase = 'move acknowledgement';
        await page.mouse.move(point.x, point.y);
        check();
        phase = 'press acknowledgement';
        await page.mouse.down();
        check();
        phase = 'release acknowledgement';
        await page.mouse.up();
        check();
        phase = 'trusted input receipt';
        assert(
          await inspect('verify'),
          'Chamber control must receive trusted down/up',
        );
        inspected = true;
      })(),
    ]);
  } finally {
    clearTimeout(timer);
    // Keep the original node even when activation changes its accessible name.
    // Cleanup is read-only and must not extend the input deadline on a stuck page.
    if (target) {
      const cleanup =
        prepared && !inspected ? inspect('cleanup') : Promise.resolve();
      void cleanup
        .catch(() => {})
        .then(() => target.dispose())
        .catch(() => {});
    }
  }
}

// Research proximity is transient under a held key, while diagnostics publish
// once/second. Stop between bounded native key pulses so sampling cannot miss
// the entire zone; recover southward if an earlier movement overshot it.
export async function approachChamberConsole(page, read, record = () => {}) {
  const deadline = Date.now() + 25000;
  while (Date.now() < deadline) {
    const position = await read();
    if (position.near) return;
    assert(
      position.x >= -4.6 && position.x <= -2.2,
      'Research approach requires the aligned left aisle',
    );
    // The actual chamber-model research terminal is at z=0.4. Its own `near`
    // result remains authoritative; no renderer coordinates are assigned here.
    const key = position.z > 0.4 ? 'w' : 's';
    if (Date.now() + 1600 > deadline) break;
    record({ key, x: position.x, z: position.z });
    await page.keyboard.press(key, { delay: 500 });
    await page.waitForTimeout(1100);
  }
  throw new Error('Research approach timed out (25000ms)');
}
