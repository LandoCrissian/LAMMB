import assert from 'node:assert/strict';

// Playwright 1.62's default mouse click pipelines move/down/up. Do not mix
// unacknowledged pointer commands with the Chamber's raw CDP touch gestures and
// pointer capture. Keep native hit testing and await each input acknowledgement;
// no force, DOM click, scene mutation, retry or extra timeout is involved.
export async function clickChamberControl(page, control) {
  assert(await control.isEnabled(), 'Chamber control must be enabled');
  await control.hover();
  await page.mouse.down();
  await page.mouse.up();
}
