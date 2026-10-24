import assert from 'node:assert/strict';

// Playwright 1.62's default mouse click pipelines move/down/up. Do not mix
// unacknowledged pointer commands with the Chamber's raw CDP touch gestures and
// pointer capture. Keep native hit testing and await each input acknowledgement;
// no force, DOM click, scene mutation, retry or extra timeout is involved.
export async function clickChamberControl(page, control) {
  // mouse.down/up have no locator timeout of their own. Preserve the original
  // 30-second click budget across the whole sequence, including hover. A failed
  // caller closes its disposable browser, cancelling outstanding protocol work.
  let timer,
    expired = false,
    phase = 'enabled check';
  const deadline = new Promise((_, reject) => {
    timer = setTimeout(() => {
      expired = true;
      reject(
        new Error(
          `Chamber control input acknowledgement timed out (30000ms) during ${phase}`,
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
        phase = 'hover acknowledgement';
        await control.hover();
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
