// Actual browser acceptance in disposable CI. No production, real profiles or test teleportation.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFile } from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { freemem } from 'node:os';
import path from 'node:path';
import { parseArgs, promisify } from 'node:util';
assert.equal(
  process.env.GITHUB_ACTIONS,
  'true',
  'Heavy acceptance runs in isolated CI only',
);
const { values } = parseArgs({
  options: {
    browser: { type: 'string', default: 'msedge' },
    'playwright-module': { type: 'string' },
  },
});
const load = createRequire(import.meta.url);
const { chromium } = load(values['playwright-module']);
const run = promisify(execFile);
const head = (await run('git', ['rev-parse', 'HEAD'])).stdout.trim();
const output = path.resolve(
  'artifacts/generated/task-010/acceptance/chamber',
  values.browser,
);
await mkdir(output, { recursive: true });
const evidence = {
  head,
  browser: values.browser,
  version: null,
  environment: 'ISOLATED_WINDOWS_CI',
  renderer:
    'ANGLE SwiftShader software renderer requested; not Legion/iPhone hardware',
  result: 'RUNNING',
  checks: [],
  screenshots: [],
  errors: [],
  warnings: [],
  memoryGiB: [],
  metrics: [],
};
const browser = await chromium.launch({
  channel: values.browser,
  headless: true,
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
});
evidence.version = browser.version();
async function capture(page, name) {
  evidence.memoryGiB.push(freemem() / 1024 ** 3);
  assert(freemem() > 1024 ** 3, 'CI RAM guard');
  const filename = name + '.png';
  await page.screenshot({
    path: path.join(output, filename),
    fullPage: !(await page.locator('.chamber-dialog[open]').count()),
  });
  const bytes = await readFile(path.join(output, filename));
  evidence.screenshots.push({
    filename,
    sha256: createHash('sha256').update(bytes).digest('hex'),
    width: bytes.readUInt32BE(16),
    height: bytes.readUInt32BE(20),
  });
}
function watch(page) {
  page.on('response', (response) => {
    if (response.status() >= 400)
      evidence.errors.push(`HTTP ${response.status()}: ${response.url()}`);
  });
  page.on('pageerror', (error) => evidence.errors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') evidence.errors.push(message.text());
    if (message.type() === 'warning') evidence.warnings.push(message.text());
  });
  page.on('requestfailed', (request) =>
    evidence.errors.push(request.url() + ': ' + request.failure()?.errorText),
  );
}
async function diagnostics(page) {
  return JSON.parse(
    await page.locator('[data-testid="chamber-diagnostics"]').textContent(),
  );
}
async function until(page, predicate) {
  const started = Date.now();
  while (Date.now() - started < 25000) {
    if (predicate(await diagnostics(page))) return;
    await page.waitForTimeout(200);
  }
  const state = await page
    .locator('.chamber-dialog')
    .evaluate((el) => ({
      ...el.dataset,
      focused: document.activeElement?.outerHTML?.slice(0, 200),
    }));
  throw new Error(
    `Scene condition timed out: ${JSON.stringify({ snapshot: await diagnostics(page), state })}`,
  );
}
async function hold(page, key, predicate) {
  await page.locator('canvas').focus();
  await page.keyboard.down(key);
  try {
    await until(page, predicate);
  } finally {
    await page.keyboard.up(key);
  }
}
async function reset(page) {
  await page
    .getByRole('button', { name: 'Reset position', exact: true })
    .click();
  await until(page, (p) => Math.abs(p.x) < 0.01 && Math.abs(p.z - 5.5) < 0.01);
}
async function noOverflow(page) {
  assert.equal(
    await page.evaluate(
      () => document.documentElement.scrollWidth > innerWidth,
    ),
    false,
  );
  assert.equal(
    await page.evaluate(() => {
      const d = document.querySelector('.chamber-dialog');
      return d?.open && d.scrollWidth > d.clientWidth;
    }),
    false,
  );
}
try {
  for (const width of [320, 390, 768, 1024, 1440, 1920]) {
    const context = await browser.newContext({
      viewport: { width, height: width < 768 ? 844 : 1000 },
      deviceScaleFactor: 1,
      hasTouch: true,
    });
    const page = await context.newPage();
    watch(page);
    try {
      const response = await page.goto(
        'http://127.0.0.1:3005/universe/experimental/chamber',
      );
      assert.equal(response.status(), 200);
      await page.getByRole('button', { name: 'Enter 3D chamber' }).waitFor();
      await noOverflow(page);
      assert(
        await page
          .locator('meta[name="robots"]')
          .getAttribute('content')
          .then((x) => x.includes('noindex')),
      );
      // Complete alternative is functional before the Three chunk is requested.
      const terminal = page.locator('.chamber-text-terminal');
      await terminal
        .getByRole('button', { name: 'Activate text experiment' })
        .click();
      await terminal
        .locator('button', { hasText: 'Replay text experiment' })
        .waitFor();
      assert((await terminal.textContent()).includes('$48,000'));
      await terminal
        .getByRole('button', { name: 'Replay text experiment' })
        .click();
      await page.waitForFunction(
        () =>
          document.querySelector('.chamber-text-terminal').dataset.phase ===
          'COMPLETE',
      );
      await terminal.getByRole('button', { name: 'Reset experiment' }).click();
      assert.equal(await terminal.getAttribute('data-phase'), 'READY');
      await capture(page, `text-terminal-${width}`);
      await page.getByRole('button', { name: 'Enter 3D chamber' }).click();
      await page.waitForFunction(
        () =>
          document.querySelector('.chamber-dialog').dataset.ready === 'true',
        null,
        { timeout: 90000 },
      );
      assert.equal(
        await page.locator('.chamber-dialog').getAttribute('open'),
        '',
      );
      assert.equal(
        await page
          .locator('canvas')
          .evaluate((el) => document.activeElement === el),
        true,
      );
      assert.equal(
        await page
          .getByRole('button', { name: 'Run experiment (E)' })
          .isEnabled(),
        false,
      );
      await page.waitForTimeout(1100);
      await capture(page, `scene-${width}`);
      await noOverflow(page);
      const initial = await diagnostics(page);
      assert(initial.frames > 0);
      assert(initial.triangles > 0);
      assert(initial.calls > 0);
      const gpu = await page.locator('canvas').evaluate((el) => {
        const gl = el.getContext('webgl2'),
          e = gl.getExtension('WEBGL_debug_renderer_info');
        return e ? gl.getParameter(e.UNMASKED_RENDERER_WEBGL) : 'unavailable';
      });
      const heap = await page.evaluate(
        () => performance.memory?.usedJSHeapSize ?? null,
      );
      evidence.metrics.push({
        width,
        ...initial,
        gpu,
        heapBytes: heap,
        measurement:
          'First load includes lazy chunk, procedural assets and first render; 1-second sampled FPS, warm CI software WebGL. Heap is browser JS heap, not scene/GPU bytes.',
      });
      await page.locator('canvas').focus();
      await page.keyboard.down('w');
      await page.keyboard.press('Tab');
      await page.waitForTimeout(1100);
      const blurred = await diagnostics(page);
      await page.waitForTimeout(1100);
      assert.equal(
        (await diagnostics(page)).z,
        blurred.z,
        'Tab clears held movement',
      );
      await page.keyboard.up('w');
      await reset(page);
      // Camera-relative movement and central containment collision through actual keys.
      await hold(page, 'w', (p) => p.z < 0.85);
      await page.locator('canvas').focus();
      await page.keyboard.down('w');
      await page.waitForTimeout(1300);
      await page.keyboard.up('w');
      assert((await diagnostics(page)).z >= 0.6 - 0.001);
      await reset(page);
      await hold(page, 's', (p) => p.z > 6.5);
      assert((await diagnostics(page)).z <= 6.7 + 0.001);
      await reset(page);
      await hold(page, 'a', (p) => p.x < -5.3);
      assert((await diagnostics(page)).x >= -5.7 - 0.001);
      await reset(page);
      // Arrow look and mouse drag do not require pointer lock.
      await hold(page, 'ArrowRight', (p) => p.yaw < -0.25);
      await reset(page);
      await page.mouse.move(width / 2, 250);
      await page.mouse.down();
      await page.mouse.move(width / 2 + 50, 280, { steps: 8 });
      await page.mouse.up();
      await until(page, (p) => p.yaw < -0.1);
      await reset(page);
      // Native lock, genuine Escape release and pause; drag/keyboard remain fallback paths.
      await page
        .getByRole('button', { name: 'Lock mouse', exact: true })
        .click();
      await page.waitForTimeout(500);
      const pointerLocked = await page.evaluate(
        () => document.pointerLockElement?.tagName === 'CANVAS',
      );
      assert(
        pointerLocked,
        'Installed CI browser must support actual pointer lock',
      );
      await page.keyboard.press('Escape');
      await page.waitForFunction(
        () =>
          !document.pointerLockElement &&
          document.querySelector('.chamber-dialog').dataset.paused === 'true',
      );
      const paused = await diagnostics(page);
      await page.waitForTimeout(1200);
      assert.equal((await diagnostics(page)).frames, paused.frames);
      await page.getByRole('button', { name: 'Resume observation' }).click();
      // CDP generates genuine touch events, without calling scene internals.
      const cdp = await context.newCDPSession(page);
      const pad = await page.locator('.chamber-pad').boundingBox();
      await cdp.send('Input.dispatchTouchEvent', {
        type: 'touchStart',
        touchPoints: [{ x: pad.x + pad.width / 2, y: pad.y + pad.height / 2 }],
      });
      await cdp.send('Input.dispatchTouchEvent', {
        type: 'touchMove',
        touchPoints: [{ x: pad.x + pad.width / 2, y: pad.y + 10 }],
      });
      await until(page, (p) => p.z < 4.7);
      await cdp.send('Input.dispatchTouchEvent', {
        type: 'touchEnd',
        touchPoints: [],
      });
      await reset(page);
      await cdp.send('Input.dispatchTouchEvent', {
        type: 'touchStart',
        touchPoints: [{ x: width / 2, y: 260 }],
      });
      await cdp.send('Input.dispatchTouchEvent', {
        type: 'touchMove',
        touchPoints: [{ x: width / 2 + 45, y: 270 }],
      });
      await cdp.send('Input.dispatchTouchEvent', {
        type: 'touchEnd',
        touchPoints: [],
      });
      await until(page, (p) => p.yaw < -0.1);
      await reset(page);
      await cdp.detach();
      // Walk to console, activate, replay and reset the complete comedy sequence.
      await hold(page, 'a', (p) => p.x < -2.7);
      await hold(page, 'w', (p) => p.near);
      assert.equal(
        await page
          .getByRole('button', { name: 'Run experiment (E)' })
          .isEnabled(),
        true,
      );
      await page.locator('canvas').focus();
      await page.keyboard.press('e');
      await page.waitForFunction(
        () =>
          document.querySelector('.chamber-dialog').dataset.alarm === 'true',
      );
      assert(
        (await page.locator('.chamber-console').textContent()).includes(
          '$0.37',
        ),
      );
      assert(
        (await page.locator('.chamber-console').textContent()).includes(
          'SUBJECT REMAINS TECHNICALLY ALIVE',
        ),
      );
      await capture(page, `alarm-${width}`);
      await page
        .getByRole('button', { name: 'Replay experiment', exact: true })
        .click();
      await page.waitForFunction(
        () =>
          document.querySelector('.chamber-dialog').dataset.alarm === 'true',
      );
      await page
        .locator('.chamber-console')
        .getByRole('button', { name: 'Reset experiment', exact: true })
        .click();
      assert.equal(
        await page.locator('.chamber-dialog').getAttribute('data-alarm'),
        'false',
      );
      await reset(page);
      // Real context extension loss / recovery, with no automatic simulation resume.
      assert(
        await page.locator('canvas').evaluate((el) => {
          const ext = el
            .getContext('webgl2')
            .getExtension('WEBGL_lose_context');
          if (!ext) return false;
          ext.loseContext();
          setTimeout(() => ext.restoreContext(), 2200);
          return true;
        }),
      );
      await page.waitForFunction(
        () =>
          document.querySelector('.chamber-dialog').dataset.contextLost ===
          'true',
      );
      await capture(page, `context-loss-${width}`);
      await page.waitForFunction(
        () =>
          document.querySelector('.chamber-dialog').dataset.contextLost ===
          'false',
      );
      assert.equal(
        await page.locator('.chamber-dialog').getAttribute('data-paused'),
        'true',
      );
      await page.getByRole('button', { name: 'Resume observation' }).click();
      await page.emulateMedia({ reducedMotion: 'reduce' });
      assert.equal(
        await page.locator('.chamber-dialog').evaluate(
          (el) =>
            [...el.querySelectorAll('*')].filter(
              (x) =>
                getComputedStyle(x).animationName !== 'none' ||
                getComputedStyle(x)
                  .transitionDuration.split(',')
                  .some((t) => parseFloat(t) > 0),
            ).length,
        ),
        0,
      );
      await page.keyboard.press('Tab');
      assert(
        await page.evaluate(() =>
          document
            .querySelector('.chamber-dialog')
            .contains(document.activeElement),
        ),
      );
      await page.getByRole('button', { name: 'Exit chamber' }).click();
      assert.equal(
        await page
          .getByRole('button', { name: 'Enter 3D chamber' })
          .evaluate((el) => el === document.activeElement),
        true,
      );
      assert.equal(
        await page.locator('.chamber-dialog').getAttribute('open'),
        null,
      );
      await page
        .getByRole('link', { name: 'Return to the Experimental Wing' })
        .click();
      await page.waitForURL('**/universe/experimental');
      assert.equal(
        await page.locator('a[href="/universe/experimental/chamber"]').count(),
        0,
      );
      await page.goBack();
      await page.waitForURL('**/universe/experimental/chamber');
      await page.reload();
      assert.equal(
        await page.locator('.chamber-dialog').getAttribute('open'),
        null,
      );
      await noOverflow(page);
      evidence.checks.push({
        width,
        result: 'PASS',
        movement: true,
        centralCollision: true,
        wallCollision: true,
        consoleProximity: true,
        keyboardLook: true,
        mouseDrag: true,
        pointerLockRelease: true,
        touchMoveLook: true,
        experimentAlarmReplayReset: true,
        contextLossRecovery: true,
        keyboardDialog: true,
        focusRestoration: true,
        reducedMotion: true,
        routeIsolation: true,
        historyRefresh: true,
        textAlternative: true,
        overflow: false,
      });
    } finally {
      await context.close();
    }
    const noJS = await browser.newContext({
      javaScriptEnabled: false,
      viewport: { width, height: 844 },
    });
    try {
      const p = await noJS.newPage();
      await p.goto('http://127.0.0.1:3005/universe/experimental/chamber');
      await p
        .getByText(
          'Activate experiment — read the complete result without JavaScript',
        )
        .click();
      assert(
        (await p.locator('.chamber-text-terminal').textContent()).includes(
          '$48,000',
        ),
      );
      await capture(p, `no-js-${width}`);
    } finally {
      await noJS.close();
    }
  }
  const unavailable = await browser.newContext({
    viewport: { width: 390, height: 844 },
  });
  try {
    await unavailable.addInitScript(() => {
      const original = HTMLCanvasElement.prototype.getContext;
      HTMLCanvasElement.prototype.getContext = function (type, ...args) {
        if (type === 'webgl2') return null;
        return original.call(this, type, ...args);
      };
    });
    const p = await unavailable.newPage();
    watch(p);
    await p.goto('http://127.0.0.1:3005/universe/experimental/chamber');
    await p.getByRole('button', { name: 'Enter 3D chamber' }).click();
    await p
      .getByText(
        'WebGL 2 is unavailable. The text terminal remains fully playable.',
      )
      .waitFor();
    await capture(p, 'webgl-unavailable-390');
    await p.getByRole('button', { name: 'Exit chamber' }).click();
    await p.getByRole('button', { name: 'Activate text experiment' }).click();
    await p.getByRole('button', { name: 'Replay text experiment' }).waitFor();
    evidence.checks.push({
      check:
        'WebGL capability unavailable — injected capability test, complete fallback',
      result: 'PASS',
    });
  } finally {
    await unavailable.close();
  }
  assert.deepEqual(
    evidence.errors,
    [],
    'No unexpected console/page/network errors',
  );
  evidence.result = 'PASS';
} catch (error) {
  evidence.result = 'FAIL';
  evidence.failure = error.stack;
  throw error;
} finally {
  await browser.close();
  await writeFile(
    path.join(output, 'results.json'),
    JSON.stringify(evidence, null, 2) + '\n',
  );
}
