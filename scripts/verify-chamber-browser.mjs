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
  'artifacts/generated/task-010b/acceptance/chamber',
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
  touchTraces: [],
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
  const running = await page
    .locator('.chamber-dialog[open][data-ready="true"][data-paused="false"]')
    .count();
  const pauseForCapture =
    running &&
    page.viewportSize().width === 1920 &&
    !(await page.locator('.chamber-overlay[open]').count());
  if (pauseForCapture)
    await page.getByRole('button', { name: 'Pause', exact: true }).click();
  const filename = name + (pauseForCapture ? '-paused' : '') + '.png';
  try {
    await page.screenshot({
      path: path.join(output, filename),
      fullPage: !(await page.locator('.chamber-dialog[open]').count()),
      timeout: 90000,
    });
  } finally {
    if (pauseForCapture)
      await page
        .getByRole('button', { name: 'Resume observation', exact: true })
        .click();
  }
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
  const state = await page.locator('.chamber-dialog').evaluate((el) => ({
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
async function portraitFallback(page) {
  const button = page.getByRole('button', { name: 'Continue in portrait' });
  if (await button.isVisible()) await button.click();
}
async function tools(page, open) {
  const detail = page.locator('.chamber-comfort');
  if ((await detail.evaluate((el) => el.open)) !== open)
    await detail.locator('summary').click();
}
async function reset(page) {
  await tools(page, true);
  await page
    .getByRole('button', { name: 'Reset position', exact: true })
    .click();
  await tools(page, false);
  await until(page, (p) => Math.abs(p.x) < 0.01 && Math.abs(p.z - 5.5) < 0.01);
}
async function alignWithConsole(page) {
  // One-second diagnostics can overshoot a waypoint on the software renderer.
  // Correct through bounded real key presses, never scene state or teleportation.
  await page.waitForTimeout(1100);
  for (let attempt = 0; attempt < 60; attempt++) {
    const p = await diagnostics(page);
    if (p.x >= -3.8 && p.x <= -2.8) return;
    await page.locator('canvas').focus();
    await page.keyboard.press(p.x < -3.8 ? 'd' : 'a', { delay: 120 });
    await page.waitForTimeout(1100);
  }
  throw new Error('Bounded keyboard console approach failed');
}
async function noOverflow(page) {
  assert(
    await page
      .locator('.chamber-overlay[open]')
      .evaluateAll((nodes) =>
        nodes.every((el) => el.scrollWidth <= el.clientWidth),
      ),
    'No overlay horizontal overflow',
  );
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
async function evolution(page, context, cdp, width) {
  await reset(page);
  const start = await diagnostics(page);
  await page.getByRole('button', { name: 'Third person', exact: true }).click();
  await until(page, (p) => p.perspective === 'third');
  assert.equal((await diagnostics(page)).z, start.z);
  await hold(page, 'w', (p) => p.z < 3.9);
  await until(page, (p) => p.avatarVisible);
  await capture(page, `third-person-${width}`);
  await hold(page, 's', (p) => p.z > 6.5);
  await page.waitForTimeout(1100);
  const camera = (await diagnostics(page)).camera;
  assert.equal(
    (await diagnostics(page)).avatarVisible,
    false,
    'Shortened boom hides obstructing observer',
  );
  assert(camera.z <= 6.75 && Math.abs(camera.x) <= 5.75 && camera.y <= 4.6);
  await page.getByRole('button', { name: 'First person', exact: true }).click();
  await reset(page);
  const original = page.viewportSize();
  const landscape = {
    width: Math.max(844, width),
    height: width < 768 ? width : 600,
  };
  await page.setViewportSize(landscape);
  await page.waitForTimeout(1200);
  await noOverflow(page);
  await capture(page, `landscape-${width}`);
  const box = await page.locator('.chamber-pad').boundingBox();
  const move = { id: 11, x: box.x + box.width / 2, y: box.y + box.height / 2 };
  const look = {
    id: 22,
    x: landscape.width * 0.73,
    y: landscape.height * 0.55,
  };
  const touch = (type, touchPoints) =>
    cdp.send('Input.dispatchTouchEvent', { type, touchPoints });
  // Observe browser-generated pointer lifecycles, rather than inferring a release
  // from position alone (the one-second diagnostic sample can overshoot).
  await page.evaluate(() => {
    window.chamberTouchTrace = [];
    for (const type of ['pointerdown', 'pointerup', 'pointercancel'])
      document.addEventListener(
        type,
        (event) => {
          window.chamberTouchTrace.push({
            type: event.type,
            id: event.pointerId,
            target: event.target.closest('.chamber-pad')
              ? 'movement'
              : event.target.tagName,
          });
        },
        true,
      );
  });
  await touch('touchStart', [move, look]);
  // A gentle strafe along the clear entry corridor avoids accidentally testing
  // the central platform collision while waiting for diagnostic samples.
  const moving = { ...move, x: box.x + box.width * 0.4 },
    looking = { ...look, x: look.x + 40 };
  await touch('touchMove', [moving, looking]);
  await until(page, (p) => p.x < -0.4 && p.yaw < -0.09);
  // Releasing the right thumb must not cancel the left thumb's movement.
  // Chromium has two CDP implementations: SyntheticPointerActions releases
  // missing active points; legacy CreateWebTouchEvents names released points
  // in touchEnd. Observe the actual pointerup in either path, not an assumption.
  const cameraReleased = () => {
    const trace = window.chamberTouchTrace;
    const lookDown = trace.find(
      (event) => event.type === 'pointerdown' && event.target === 'CANVAS',
    );
    return trace.some(
      (event) => event.type === 'pointerup' && event.id === lookDown?.id,
    );
  };
  let releaseMethod = 'legacy released-point list';
  try {
    await touch('touchEnd', [looking]);
  } catch (error) {
    if (!/TouchEnd.*must not.*touch points/.test(error.message)) throw error;
    releaseMethod = 'synthetic active-point list';
    await touch('touchMove', [moving]);
  }
  await page.waitForFunction(cameraReleased);
  const releaseTrace = await page.evaluate(() => window.chamberTouchTrace);
  const moveDown = releaseTrace.find(
    (event) => event.type === 'pointerdown' && event.target === 'movement',
  );
  assert(moveDown, 'Browser dispatched the movement pointer');
  assert(
    !releaseTrace.some(
      (event) => event.type !== 'pointerdown' && event.id === moveDown.id,
    ),
    'Only the camera pointer ended; movement remains held',
  );
  const releaseSample = await diagnostics(page);
  await until(page, (p) => p.frames > releaseSample.frames);
  const afterCameraRelease = await diagnostics(page);
  evidence.touchTraces.push({
    width,
    releaseMethod,
    releaseTrace,
    afterCameraRelease,
  });
  await until(page, (p) => p.x < afterCameraRelease.x - 0.2);
  await touch('touchCancel', []);
  await page.waitForTimeout(2200);
  const stopped = await diagnostics(page);
  await page.waitForTimeout(1400);
  assert(
    Math.hypot(
      (await diagnostics(page)).x - stopped.x,
      (await diagnostics(page)).z - stopped.z,
    ) < 0.025,
    'Cancel releases motion',
  );
  await reset(page);
  await touch('touchStart', [move, look]);
  await touch('touchMove', [moving, looking]);
  await page.setViewportSize(original);
  await touch('touchCancel', []);
  await page.waitForTimeout(2200);
  const rotated = await diagnostics(page);
  await page.waitForTimeout(1200);
  assert.equal(
    (await diagnostics(page)).z,
    rotated.z,
    'Orientation clears held input',
  );
  assert.equal(
    (await diagnostics(page)).x,
    rotated.x,
    'Orientation clears strafe',
  );
  await portraitFallback(page);
  await page.setViewportSize(landscape);
  await reset(page);
  await hold(page, 'w', (p) => p.destination === 'specimen');
  await page.keyboard.press('Tab');
  await page.waitForTimeout(1200);
  if (width >= 768)
    await page
      .getByRole('button', { name: 'Third person', exact: true })
      .click();
  const priorInspection = await diagnostics(page);
  await page.getByRole('button', { name: 'Inspect specimen (E)' }).click();
  const inspecting = await diagnostics(page);
  await page.locator('.chamber-overlay-specimen[open]').waitFor();
  assert(inspecting.inspection);
  await page.keyboard.press('Tab');
  assert(
    await page.evaluate(() =>
      document
        .querySelector('.chamber-overlay-specimen')
        .contains(document.activeElement),
    ),
  );
  await page.keyboard.press('w');
  const surface = await page
    .locator('.chamber-inspection-surface')
    .boundingBox();
  const x = surface.width * 0.5,
    y = surface.height * 0.5;
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x + 70, y + 5, { steps: 6 });
  await page.mouse.up();
  assert(Math.abs((await diagnostics(page)).inspectionYaw) > 0.2);
  await page.mouse.wheel(0, 100);
  await page.waitForTimeout(250);
  assert(
    (await diagnostics(page)).inspectionDistance >
      inspecting.inspectionDistance,
  );
  const a = { id: 31, x: x - 35, y },
    b = { id: 32, x: x + 35, y };
  await touch('touchStart', [a]);
  await touch('touchStart', [a, b]);
  await touch('touchMove', [
    { ...a, x: x - 65 },
    { ...b, x: x + 65 },
  ]);
  await touch('touchEnd', []);
  assert(
    (await diagnostics(page)).inspectionDistance <
      inspecting.inspectionDistance,
    'Genuine pinch zooms',
  );
  await capture(page, `inspection-${width}`);
  await noOverflow(page);
  await page
    .getByRole('button', { name: 'Reset inspection', exact: true })
    .click();
  assert.equal((await diagnostics(page)).inspectionYaw, 0);
  await page.keyboard.press('Escape');
  await page
    .locator('.chamber-overlay-specimen')
    .waitFor({ state: 'detached' });
  const returned = await diagnostics(page);
  await page.waitForFunction(() =>
    document.activeElement?.textContent?.includes('Inspect specimen (E)'),
  );
  assert.equal(
    await page.locator('.chamber-dialog').getAttribute('data-paused'),
    'false',
    'Escape closes only the top inspection modal',
  );
  for (const key of ['x', 'z', 'yaw', 'pitch', 'perspective'])
    assert.equal(returned[key], inspecting[key], `Inspection restores ${key}`);
  for (const key of ['x', 'y', 'z'])
    assert(
      Math.abs(returned.camera[key] - priorInspection.camera[key]) < 0.000001,
      `Restores prior camera ${key}`,
    );
  assert.equal(
    await page
      .getByRole('button', { name: 'Inspect specimen (E)' })
      .evaluate((el) => el === document.activeElement),
    true,
  );
  await reset(page);
  await hold(page, 'd', (p) => p.x > 2.7);
  // Correct overshoot with genuine bounded keys; never teleport the observer.
  for (let n = 0; n < 60; n++) {
    await page.waitForTimeout(1100);
    const p = await diagnostics(page);
    if (p.x >= 2.8 && p.x <= 3.8) break;
    await page.locator('canvas').focus();
    await page.keyboard.press(p.x > 3.8 ? 'a' : 'd', { delay: 120 });
    if (n === 59) throw Error('World console alignment failed');
  }
  await hold(page, 'w', (p) => p.destination === 'world');
  await page.getByRole('button', { name: 'Open World terminal (E)' }).click();
  const beforeWorld = await diagnostics(page),
    url = page.url();
  const world = page.locator('.chamber-overlay-world');
  await world.locator('.atlas-map').waitFor();
  assert.equal(await world.locator('[data-country]').count(), 248);
  await world.locator('.atlas-country-directory summary').click();
  const search = world.getByRole('searchbox');
  await search.fill('Japan');
  await world.getByRole('link', { name: /Japan.*JP/ }).click();
  await world.locator('[data-country="JP"].is-selected').waitFor();
  await world.getByRole('button', { name: 'LAMMB founding' }).click();
  assert.equal(
    await world
      .getByRole('button', { name: 'LAMMB founding' })
      .getAttribute('aria-pressed'),
    'true',
  );
  assert.equal(
    page.url(),
    url,
    'Embedded atlas leaves chamber URL/history unchanged',
  );
  await world.getByRole('button', { name: 'Zoom in', exact: true }).click();
  await world.getByRole('button', { name: 'Reset view', exact: true }).click();
  await world.locator('.atlas-map').focus();
  await page.keyboard.press('+');
  await page.keyboard.press('ArrowRight');
  assert(
    Number(await world.locator('.atlas-map').getAttribute('data-zoom')) > 1,
  );
  await capture(page, `world-terminal-${width}`);
  await noOverflow(page);
  await page.setViewportSize(original);
  await capture(page, `world-original-${width}`);
  await noOverflow(page);
  assert((await world.textContent()).includes('REGISTRY NOT YET LIVE'));
  await page.keyboard.press('Escape');
  await world.waitFor({ state: 'detached' });
  await page.waitForFunction(() =>
    document.activeElement?.textContent?.includes('Open World terminal (E)'),
  );
  const afterWorld = await diagnostics(page);
  assert.equal(
    await page.locator('.chamber-dialog').getAttribute('data-paused'),
    'false',
    'World close restores active gameplay',
  );
  for (const key of ['x', 'z', 'yaw', 'pitch', 'perspective'])
    assert.equal(afterWorld[key], beforeWorld[key], `World restores ${key}`);
  assert.equal(
    await page
      .getByRole('button', { name: 'Open World terminal (E)' })
      .evaluate((el) => el === document.activeElement),
    true,
  );
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await until(page, (p) => p.reducedMotion && !p.hovering);
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.setViewportSize(original);
  await portraitFallback(page);
  await reset(page);
  await hold(page, 'w', (p) => p.destination === 'specimen');
  await page.getByRole('button', { name: 'Inspect specimen (E)' }).click();
  await page.locator('.chamber-overlay-specimen[open]').waitFor();
  await capture(page, `inspection-original-${width}`);
  await noOverflow(page);
  await page
    .getByRole('button', { name: 'Close inspection', exact: true })
    .click();
  await page
    .locator('.chamber-overlay-specimen')
    .waitFor({ state: 'detached' });
  if (
    await page
      .getByRole('button', { name: 'First person', exact: true })
      .isVisible()
  )
    await page
      .getByRole('button', { name: 'First person', exact: true })
      .click();
  await reset(page);
  evidence.checks.push({
    width,
    result: 'PASS',
    landscape,
    dualTouch: true,
    independentRelease: true,
    cancellation: true,
    orientation: true,
    thirdPerson: true,
    cameraCollision: true,
    inspectionOrbitWheelPinchReset: true,
    inspectionRestoration: true,
    sharedAtlas: true,
    embeddedHistory: true,
    worldRestoration: true,
    reducedHover: true,
  });
}
async function modalOrientation() {
  // Fresh touch/mobile entry in landscape: no earlier portrait opt-out or
  // full-page capture can change the recommendation state being exercised.
  const context = await browser.newContext({
    viewport: { width: 844, height: 390 },
    deviceScaleFactor: 1,
    hasTouch: true,
    isMobile: true,
  });
  try {
    const page = await context.newPage();
    watch(page);
    await page.goto('http://127.0.0.1:3005/universe/experimental/chamber');
    await page.getByRole('button', { name: 'Enter 3D chamber' }).click();
    await page.waitForFunction(
      () => document.querySelector('.chamber-dialog').dataset.ready === 'true',
      null,
      { timeout: 90000 },
    );
    assert.equal(
      await page.locator('.chamber-dialog').getAttribute('data-portrait'),
      'false',
    );
    await hold(page, 'd', (p) => p.x > 2.7);
    for (let n = 0; n < 60; n++) {
      await page.waitForTimeout(1100);
      const p = await diagnostics(page);
      if (p.x >= 2.8 && p.x <= 3.8) break;
      await page.locator('canvas').focus();
      await page.keyboard.press(p.x > 3.8 ? 'a' : 'd', { delay: 120 });
      if (n === 59) throw Error('Mobile World approach failed');
    }
    await hold(page, 'w', (p) => p.destination === 'world');
    await page.keyboard.press('Tab');
    await page.waitForTimeout(1200);
    const pose = await diagnostics(page);
    await page.getByRole('button', { name: 'Open World terminal (E)' }).click();
    const world = page.locator('.chamber-overlay-world');
    await world.locator('.atlas-map').waitFor();
    await page.setViewportSize({ width: 390, height: 844 });
    const media = await page.evaluate(() => ({
      coarse: matchMedia('(pointer: coarse)').matches,
      portrait: matchMedia('(orientation: portrait)').matches,
      width: innerWidth,
      height: innerHeight,
      touchPoints: navigator.maxTouchPoints,
    }));
    assert(
      media.coarse && media.portrait,
      `Mobile media: ${JSON.stringify(media)}`,
    );
    await page.waitForFunction(
      () =>
        document.querySelector('.chamber-dialog').dataset.portrait === 'true',
    );
    await page.keyboard.press('Escape');
    await world.waitFor({ state: 'detached' });
    const fallback = page.getByRole('button', { name: 'Continue in portrait' });
    await page.waitForFunction(
      () =>
        document.activeElement?.tagName === 'BUTTON' &&
        document.activeElement.textContent.trim() === 'Continue in portrait',
    );
    assert(await fallback.isVisible());
    await capture(page, 'world-portrait-return');
    await fallback.click();
    const held = await diagnostics(page);
    await until(page, (p) => p.frames > held.frames);
    for (const key of ['x', 'z', 'yaw', 'pitch', 'perspective'])
      assert.equal(
        (await diagnostics(page))[key],
        pose[key],
        `Portrait return preserves ${key}`,
      );
    await noOverflow(page);
    await page.getByRole('button', { name: 'Exit chamber' }).click();
    evidence.checks.push({
      check: 'World rotation focuses portrait fallback and resumes',
      result: 'PASS',
      media,
    });
  } finally {
    await context.close();
  }
}
try {
  await modalOrientation();
  for (const width of [1440, 320, 390, 768, 1024, 1920]) {
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
      await portraitFallback(page);
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
          .getByRole('button', {
            name: 'Run experiment (E)',
            includeHidden: true,
          })
          .isEnabled(),
        false,
      );
      await page.waitForTimeout(1100);
      await noOverflow(page);
      await until(page, (p) => p.fps > 0);
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
      await capture(page, `scene-${width}`);
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
      await tools(page, true);
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
      await tools(page, false);
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
      await evolution(page, context, cdp, width);
      await cdp.detach();
      // Walk to console, activate, replay and reset the complete comedy sequence.
      await hold(page, 'a', (p) => p.x < -2.7);
      await alignWithConsole(page);
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
      if (width === 1440) {
        await tools(page, true);
        await page.getByRole('slider', { name: 'Look sensitivity' }).focus();
        await page.keyboard.press('End');
        assert.equal(await page.getByRole('slider').inputValue(), '6');
        await tools(page, false);
      }
      assert(
        await page.locator('canvas').evaluate((el) => {
          const ext = el
            .getContext('webgl2')
            .getExtension('WEBGL_lose_context');
          if (!ext) return false;
          ext.loseContext();
          return true;
        }),
      );
      await page.waitForFunction(
        () =>
          document.querySelector('.chamber-dialog').dataset.contextLost ===
          'true',
      );
      await capture(page, `context-loss-${width}`);
      assert.equal(
        await page.locator('.chamber-dialog').getAttribute('data-paused'),
        'true',
      );
      await page.getByRole('button', { name: 'Exit chamber' }).click();
      await page.getByRole('button', { name: 'Enter 3D chamber' }).click();
      await page.waitForFunction(
        () =>
          document.querySelector('.chamber-dialog').dataset.ready === 'true',
      );
      await portraitFallback(page);
      await until(page, (p) => p.frames > 0);
      if (width === 1440) {
        await tools(page, true);
        assert.equal(await page.getByRole('slider').inputValue(), '6');
        await tools(page, false);
        const beforeLook = await diagnostics(page);
        await page.mouse.move(1100, 400);
        await page.mouse.down();
        await page.mouse.move(1120, 400);
        await page.mouse.up();
        await until(page, (p) => p.frames > beforeLook.frames);
        assert(
          Math.abs((await diagnostics(page)).yaw - beforeLook.yaw + 0.12) <
            0.001,
          'Selected sensitivity controls the fresh renderer after context-loss re-entry',
        );
        await tools(page, true);
        await page.getByRole('slider').focus();
        await page.keyboard.press('Home');
        await page.keyboard.press('ArrowRight');
        await page.keyboard.press('ArrowRight');
        assert.equal(await page.getByRole('slider').inputValue(), '3');
        await tools(page, false);
      }
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
      assert.equal(await page.locator('.chamber-dialog canvas').count(), 0);
      await page.getByRole('button', { name: 'Enter 3D chamber' }).click();
      await page.waitForFunction(
        () =>
          document.querySelector('.chamber-dialog').dataset.ready === 'true',
      );
      await portraitFallback(page);
      await until(page, (p) => p.frames > 0);
      await page.getByRole('button', { name: 'Exit chamber' }).click();
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
      await p.getByText('Read the complete fictional result').click();
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
  // Hold the lazy script load to exercise completed-story entry and readiness guards.
  const loading = await browser.newContext({
    viewport: { width: 390, height: 844 },
  });
  try {
    const p = await loading.newPage();
    watch(p);
    await p.goto('http://127.0.0.1:3005/universe/experimental/chamber');
    await p.getByRole('button', { name: 'Activate text experiment' }).click();
    await p.getByRole('button', { name: 'Replay text experiment' }).waitFor();
    let delayedChunks = 0;
    await p.route('**/_next/static/chunks/*.js', async (route) => {
      delayedChunks++;
      await p.waitForTimeout(1500);
      await route.continue();
    });
    await p.getByRole('button', { name: 'Enter 3D chamber' }).click();
    const resetButton = p
      .locator('.chamber-console')
      .getByRole('button', { name: 'Reset experiment', exact: true });
    assert.equal(await resetButton.isEnabled(), false);
    await p.waitForFunction(
      () => document.querySelector('.chamber-dialog').dataset.ready === 'true',
    );
    assert(delayedChunks > 0, 'Actual lazy scene script was delayed');
    assert.equal(await resetButton.isEnabled(), true);
    await resetButton.click();
    assert.equal(
      await p.locator('.chamber-dialog').getAttribute('data-alarm'),
      'false',
    );
    await p.getByRole('button', { name: 'Exit chamber' }).click();
    assert.equal(
      await p.locator('.chamber-text-terminal').getAttribute('data-phase'),
      'READY',
    );
    evidence.checks.push({
      check: 'Delayed 3D load guards experiment reset',
      result: 'PASS',
    });
  } finally {
    await loading.close();
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
