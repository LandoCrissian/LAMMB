import assert from 'node:assert/strict';

// Keep native input serial when switching from raw CDP touch/pointer capture.
// Locator hover also installs a hit-target event interceptor whose completion
// can stall in that mixed stream. Read geometry/hit targets explicitly, then
// await each real mouse command. No force, DOM click, scene mutation or retry.
export async function clickChamberControl(page, control) {
  // mouse.down/up have no locator timeout of their own. Preserve the original
  // 30-second click budget across the whole sequence. A failed
  // caller closes its disposable browser, cancelling outstanding protocol work.
  let timer,
    expired = false,
    phase = 'enabled check';
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
        phase = 'visible geometry';
        const box = await control.boundingBox();
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
        const receivesInput = () =>
          control.evaluate((element, at) => {
            const hit = element.ownerDocument.elementFromPoint(at.x, at.y);
            return (
              element.isConnected && (hit === element || element.contains(hit))
            );
          }, point);
        phase = 'native hit test';
        assert(
          await receivesInput(),
          'Chamber control must receive native input',
        );
        check();
        phase = 'move acknowledgement';
        await page.mouse.move(point.x, point.y);
        check();
        phase = 'post-move hit test';
        assert(
          await receivesInput(),
          'Chamber control became occluded after move',
        );
        check();
        phase = 'press acknowledgement';
        await page.mouse.down();
        check();
        phase = 'release acknowledgement';
        await page.mouse.up();
      })(),
    ]);
  } finally {
    clearTimeout(timer);
  }
}
