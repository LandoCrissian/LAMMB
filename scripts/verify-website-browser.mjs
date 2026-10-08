// Manual acceptance runner: use an existing official Playwright installation.
// No dependency installation, browser downloads, existing profiles or deployment.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFile } from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import path from 'node:path';
import { parseArgs, promisify } from 'node:util';

const run = promisify(execFile);
const { values } = parseArgs({
  options: {
    'playwright-module': { type: 'string' },
    browser: { type: 'string', default: 'msedge' },
    output: { type: 'string', default: 'task-005c/final' },
    port: { type: 'string', default: '3005' },
  },
});
assert(
  ['msedge', 'chrome'].includes(values.browser),
  'Use an installed browser channel',
);
assert(
  /^\d{4,5}$/.test(values.port) && Number(values.port) <= 65535,
  'Invalid localhost port',
);
const generated = path.resolve('artifacts/generated');
const output = path.resolve(generated, values.output, values.browser);
const relative = path.relative(generated, output);
assert(
  relative && !relative.startsWith('..') && !path.isAbsolute(relative),
  'Evidence must stay within artifacts/generated',
);
const origin = `http://127.0.0.1:${values.port}`;
const art = JSON.parse(
  await readFile(
    'apps/web/public/art/cinematic-preview/provenance.json',
    'utf8',
  ),
);
const load = createRequire(import.meta.url);
const { chromium } = load(values['playwright-module'] || 'playwright');
const routes = [
  '/',
  '/universe',
  '/collection',
  '/ascent',
  '/community',
  '/faq',
  '/world',
  '/profile',
  '/mint',
  '/development/launch',
];
const widths = [320, 390, 768, 1440];
const evidence = {
  browserChannel: values.browser,
  playwrightVersion: load(
    path.join(values['playwright-module'] || 'playwright', 'package.json'),
  ).version,
  headAtRun: (await run('git', ['rev-parse', 'HEAD'])).stdout.trim(),
  origin,
  pages: [],
  interactions: [],
  screenshots: [],
  homepageComposition: [],
  errors: [],
  consoleWarnings: [],
  memorySamplesGB: [],
  result: 'RUNNING',
};
const sourcePaths = (await run('git', ['ls-files', 'apps/web'])).stdout
  .trim()
  .split(/\r?\n/)
  .sort();
const sourceHashes = [];
for (const filename of sourcePaths) {
  sourceHashes.push([
    filename,
    createHash('sha256')
      .update(await readFile(filename))
      .digest('hex'),
  ]);
}
evidence.websiteSourceSHA256 = createHash('sha256')
  .update(JSON.stringify(sourceHashes))
  .digest('hex');
await mkdir(output, { recursive: true });
let browser;
let sampling = false;
let memoryFloorCrossed = false;
async function sampleMemory() {
  if (sampling || process.platform !== 'win32') return;
  sampling = true;
  try {
    const { stdout } = await run(
      'powershell.exe',
      [
        '-NoProfile',
        '-Command',
        '(Get-CimInstance Win32_OperatingSystem).FreePhysicalMemory',
      ],
      { windowsHide: true, timeout: 10000 },
    );
    const available = Number(stdout.trim()) / 1048576;
    assert(Number.isFinite(available) && available > 0, 'Memory sample failed');
    evidence.memorySamplesGB.push(available);
    if (available < 1) memoryFloorCrossed = true;
  } finally {
    sampling = false;
  }
}
async function guard() {
  await sampleMemory();
  assert(
    !memoryFloorCrossed,
    'STOP_FOR_OWNER_REVIEW_BROWSER: available RAM below 1 GiB',
  );
}
async function capture(page, name, fullPage = true) {
  await guard();
  const filename = `${name}.png`;
  await page.screenshot({ path: path.join(output, filename), fullPage });
  evidence.screenshots.push({
    filename,
    sha256: createHash('sha256')
      .update(await readFile(path.join(output, filename)))
      .digest('hex'),
  });
}
async function geometry(page) {
  return page.evaluate(() => {
    const viewportWidth = document.documentElement.clientWidth;
    return {
      viewportWidth,
      documentWidth: document.documentElement.scrollWidth,
      clippedHeadings: [...document.querySelectorAll('h1,h2,h3')]
        .filter((el) => {
          const range = document.createRange();
          range.selectNodeContents(el);
          return [...range.getClientRects()].some(
            (rect) => rect.left < -1 || rect.right > viewportWidth + 1,
          );
        })
        .map((el) => el.innerText),
      duplicateIds: [...document.querySelectorAll('[id]')]
        .map((el) => el.id)
        .filter((id, index, ids) => ids.indexOf(id) !== index),
      mainCount: document.querySelectorAll('main').length,
      h1Count: document.querySelectorAll('h1').length,
      title: document.title,
      imageFailures: [...document.images]
        .filter(
          (img) =>
            img.getClientRects().length &&
            (!img.complete || img.naturalWidth === 0),
        )
        .map((img) => img.src),
    };
  });
}
function validateGeometry(result) {
  assert(
    result.documentWidth <= result.viewportWidth,
    `Horizontal overflow: ${JSON.stringify(result)}`,
  );
  assert.deepEqual(result.clippedHeadings, [], 'Clipped heading text');
  assert.deepEqual(result.duplicateIds, [], 'Duplicate element IDs');
  assert.deepEqual(result.imageFailures, [], 'Missing image');
  assert.equal(result.mainCount, 1);
  assert.equal(result.h1Count, 1);
}
async function visit(page, route) {
  await guard();
  const response = await page.goto(`${origin}${route}`, {
    waitUntil: 'networkidle',
  });
  assert.equal(response.status(), 200, `Route failed: ${route}`);
  await page.evaluate(() => document.fonts.ready);
}
async function assertFocusContained(page, dialog) {
  assert(await dialog.evaluate((el) => el.contains(document.activeElement)));
  for (let index = 0; index < 14; index++) {
    await page.keyboard.press('Tab');
    assert(
      await dialog.evaluate((el) => el.contains(document.activeElement)),
      'Modal focus escaped',
    );
  }
  await page.keyboard.press('Shift+Tab');
  assert(await dialog.evaluate((el) => el.contains(document.activeElement)));
  await page.locator('.global-header .brand-mark').focus();
  assert(
    await dialog.evaluate((el) => el.contains(document.activeElement)),
    'Background accepted focus',
  );
  await assert.rejects(
    () =>
      page
        .locator('.global-header .brand-mark')
        .click({ trial: true, timeout: 300 }),
    /Timeout/,
    'Background accepted a pointer interaction',
  );
  assert.equal(
    await page.evaluate(() => document.body.style.overflow),
    'hidden',
  );
}
async function awaitInspectionView(page, view) {
  const expected = art.assets.find((asset) => asset.id === view).path;
  await page.waitForFunction((expectedPath) => {
    const source = document
      .querySelector('.inspection-dialog[open] .inspection-image')
      .getAttribute('src');
    const url = new URL(source, location.origin);
    return (
      (url.pathname === '/_next/image'
        ? url.searchParams.get('url')
        : url.pathname) === expectedPath
    );
  }, expected);
  await page.locator('.inspection-image').evaluate((el) => el.decode());
}
async function interactionChecks(page, width) {
  await visit(page, '/');
  await page.keyboard.press('Tab');
  assert.equal(
    await page
      .locator('.skip-link')
      .evaluate((el) => el === document.activeElement),
    true,
  );
  assert.equal(
    await page
      .locator('.skip-link')
      .evaluate((el) => el.getBoundingClientRect().top >= 0),
    true,
  );
  await page.keyboard.press('Enter');
  await page.waitForFunction(() => document.activeElement.id === 'main');
  evidence.interactions.push({ width, check: 'skip-link', result: 'PASS' });
  await visit(page, '/');
  await page.keyboard.press('Tab');
  await page.keyboard.press('Tab');
  assert.equal(
    await page
      .locator('.global-header .brand-mark')
      .evaluate((el) => el === document.activeElement),
    true,
  );
  await page.keyboard.press('Tab');
  const menu = page.locator('.menu-toggle');
  assert.equal(
    await menu.evaluate((el) => el === document.activeElement),
    true,
  );
  const focus = await menu.evaluate((el) => ({
    style: getComputedStyle(el).outlineStyle,
    width: getComputedStyle(el).outlineWidth,
  }));
  assert.notEqual(focus.style, 'none');
  assert(parseFloat(focus.width) >= 2);
  await capture(page, `menu-focus-${width}`, false);
  await page.keyboard.press('Enter');
  const navigationDialog = page.locator('.navigation-dialog');
  assert(await navigationDialog.evaluate((el) => el.open));
  assert(await page.locator('#global-navigation').isVisible());
  assert.equal(await page.locator('#global-navigation a').count(), 9);
  await assertFocusContained(page, navigationDialog);
  validateGeometry(await geometry(page));
  await capture(page, `menu-open-${width}`, false);
  await page.keyboard.press('Escape');
  assert.equal(await navigationDialog.evaluate((el) => el.open), false);
  assert.equal(
    await menu.evaluate((el) => el === document.activeElement),
    true,
  );
  assert.equal(await page.locator('#global-navigation').isVisible(), false);
  await page.keyboard.press('Space');
  await page.locator('#global-navigation a[href="/universe"]').focus();
  await page.keyboard.press('Enter');
  await page.waitForURL(`${origin}/universe`);
  assert.equal(await navigationDialog.evaluate((el) => el.open), false);
  assert.equal(
    await page
      .locator('#global-navigation a[href="/universe"]')
      .getAttribute('aria-current'),
    'page',
  );
  if (width < 1100) await menu.tap();
  else await menu.click();
  assert(await navigationDialog.evaluate((el) => el.open));
  const closeMenu = page.getByRole('button', {
    name: 'Close navigation menu',
    exact: true,
  });
  if (width < 1100) await closeMenu.tap();
  else await closeMenu.click();
  assert.equal(
    await menu.evaluate((el) => el === document.activeElement),
    true,
  );
  evidence.interactions.push({
    width,
    check: 'all-width-hamburger-keyboard-touch-focus-escape-route',
    result: 'PASS',
    focus,
  });

  await visit(page, '/');
  const trigger = page.getByRole('button', {
    name: 'Inspect sealed specimen concept',
    exact: true,
  });
  await trigger.focus();
  await page.keyboard.press('Enter');
  const inspection = page.locator('.inspection-dialog');
  assert(await inspection.evaluate((el) => el.open));
  await assertFocusContained(page, inspection);
  const viewSources = [];
  for (const view of ['FRONT', 'SIDE', 'REAR']) {
    const control = inspection.getByRole('button', { name: view, exact: true });
    if (width < 1100) await control.tap();
    else await control.click();
    const image = inspection.locator('.inspection-image');
    await image.waitFor();
    const expected = art.assets.find(
      (asset) => asset.id === view.toLowerCase(),
    ).path;
    await page.waitForFunction((expectedPath) => {
      const source = document
        .querySelector('.inspection-dialog[open] .inspection-image')
        .getAttribute('src');
      const url = new URL(source, location.origin);
      return (
        (url.pathname === '/_next/image'
          ? url.searchParams.get('url')
          : url.pathname) === expectedPath
      );
    }, expected);
    await image.evaluate((el) => el.decode());
    assert.equal(await control.getAttribute('aria-pressed'), 'true');
    assert.equal(
      await inspection.locator('button[aria-pressed="true"]').count(),
      1,
    );
    viewSources.push(await image.getAttribute('src'));
    validateGeometry(await geometry(page));
    await capture(page, `inspection-${view.toLowerCase()}-${width}`, false);
  }
  assert.equal(new Set(viewSources).size, 3);
  await inspection.getByRole('button', { name: 'FRONT', exact: true }).focus();
  await page.keyboard.press('Home');
  await awaitInspectionView(page, 'front');
  await page.keyboard.press('ArrowRight');
  await awaitInspectionView(page, 'side');
  assert.equal(
    await inspection
      .getByRole('button', { name: 'SIDE', exact: true })
      .getAttribute('aria-pressed'),
    'true',
  );
  await page.keyboard.press('End');
  await awaitInspectionView(page, 'rear');
  assert.equal(
    await inspection
      .getByRole('button', { name: 'REAR', exact: true })
      .getAttribute('aria-pressed'),
    'true',
  );
  await page.keyboard.press('ArrowRight');
  await awaitInspectionView(page, 'front');
  assert.equal(
    await inspection
      .getByRole('button', { name: 'FRONT', exact: true })
      .getAttribute('aria-pressed'),
    'true',
  );
  await page.keyboard.press('ArrowLeft');
  await awaitInspectionView(page, 'rear');
  assert.equal(
    await inspection
      .getByRole('button', { name: 'REAR', exact: true })
      .getAttribute('aria-pressed'),
    'true',
  );
  await page.keyboard.press('Escape');
  assert.equal(await inspection.evaluate((el) => el.open), false);
  assert.equal(
    await trigger.evaluate((el) => el === document.activeElement),
    true,
  );
  assert.equal(await page.evaluate(() => document.body.style.overflow), '');
  if (width < 1100) await trigger.tap();
  else await trigger.click();
  await awaitInspectionView(page, 'front');
  const closeInspection = page.getByRole('button', {
    name: 'Close specimen inspection',
    exact: true,
  });
  if (width < 1100) await closeInspection.tap();
  else await closeInspection.click();
  assert.equal(
    await trigger.evaluate((el) => el === document.activeElement),
    true,
  );
  evidence.interactions.push({
    width,
    check: 'inspection-three-2d-views-keyboard-touch-inertness-focus-return',
    result: 'PASS',
    viewSources,
  });
  await visit(page, '/faq');
  const question = page.locator('.faq-item summary').first();
  await question.focus();
  await page.keyboard.press('Enter');
  assert.equal(
    await page.locator('.faq-item').first().getAttribute('open'),
    '',
  );
  assert(await page.locator('.faq-item > p').first().isVisible());
  await capture(page, `faq-open-${width}`, false);
  await page.keyboard.press('Space');
  assert.equal(
    await page.locator('.faq-item').first().getAttribute('open'),
    null,
  );
  evidence.interactions.push({
    width,
    check: 'native-faq-enter-space',
    result: 'PASS',
  });
  await page.locator('.global-footer a[href="/world"]').focus();
  await page.keyboard.press('Enter');
  await page.waitForURL(`${origin}/world`);
  assert(
    await page
      .getByText('PLANNED / REGISTRATION UNAVAILABLE', { exact: true })
      .isVisible(),
  );
  evidence.interactions.push({
    width,
    check: 'footer-keyboard-world-transition',
    result: 'PASS',
  });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await visit(page, '/');
  const reduced = await page.evaluate(() => ({
    preference: matchMedia('(prefers-reduced-motion: reduce)').matches,
    scrollBehavior: getComputedStyle(document.documentElement).scrollBehavior,
    activeMotion: [...document.querySelectorAll('*')].filter((el) => {
      const style = getComputedStyle(el);
      return (
        style.animationName !== 'none' ||
        style.transitionDuration
          .split(',')
          .some((duration) => parseFloat(duration) > 0)
      );
    }).length,
  }));
  assert(reduced.preference);
  assert.equal(reduced.scrollBehavior, 'auto');
  assert.equal(reduced.activeMotion, 0);
  await capture(page, `home-reduced-motion-${width}`, false);
  await page
    .getByRole('button', {
      name: 'Inspect sealed specimen concept',
      exact: true,
    })
    .click();
  await page.locator('.inspection-image').evaluate((el) => el.decode());
  await capture(page, `inspection-reduced-motion-${width}`, false);
  await page.keyboard.press('Escape');
  evidence.interactions.push({
    width,
    check: 'reduced-motion',
    result: 'PASS',
    ...reduced,
  });
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await visit(page, '/development/launch');
  assert.deepEqual(
    await page
      .locator('[data-state]')
      .evaluateAll((els) => els.map((el) => el.dataset.state)),
    [
      'PRE_ASCENT',
      'ASCENT',
      'MINT',
      'RECOVERY',
      'BLACKOUT',
      'REVEAL',
      'REVEALED',
    ],
  );
  evidence.interactions.push({
    width,
    check: 'seven-launch-presentations',
    result: 'PASS',
  });
  const missing = await page.goto(`${origin}/unknown-task-005c-route`, {
    waitUntil: 'networkidle',
  });
  assert.equal(missing.status(), 404);
  assert(await page.getByRole('heading', { level: 1 }).isVisible());
  validateGeometry(await geometry(page));
  await capture(page, `not-found-${width}`);
  await page.getByRole('link', { name: 'Return to LAMMB' }).click();
  await page.waitForURL(`${origin}/`);
  await page.waitForLoadState('networkidle');
  await page
    .locator('.cinema-specimen .specimen-preview-image')
    .evaluate((el) => el.decode());
  evidence.interactions.push({
    width,
    check: '404-and-return-navigation',
    result: 'PASS',
  });
}
let memoryTimer;
try {
  await sampleMemory();
  if (process.platform === 'win32')
    assert(
      evidence.memorySamplesGB[0] >= 2,
      'STOP_FOR_OWNER_REVIEW_BROWSER: less than 2 GiB prelaunch',
    );
  memoryTimer = setInterval(
    () =>
      sampleMemory().catch((error) => {
        evidence.errors.push({ type: 'memory', message: error.message });
        memoryFloorCrossed = true;
      }),
    3000,
  );
  browser = await chromium.launch({ channel: values.browser, headless: true });
  evidence.browserVersion = browser.version();
  for (const width of widths) {
    const context = await browser.newContext({
      viewport: { width, height: width < 768 ? 844 : 1000 },
      isMobile: width < 1100,
      hasTouch: width < 1100,
      deviceScaleFactor: 1,
    });
    await context.route('**/*', (route) => {
      if (new URL(route.request().url()).origin !== origin) {
        evidence.errors.push({
          type: 'external-request',
          url: route.request().url(),
        });
        return route.abort();
      }
      return route.continue();
    });
    const page = await context.newPage();
    await page.addInitScript(() => {
      window.__lammbLayoutShifts = [];
      new PerformanceObserver((list) => {
        for (const entry of list.getEntries())
          if (!entry.hadRecentInput)
            window.__lammbLayoutShifts.push(entry.value);
      }).observe({ type: 'layout-shift', buffered: true });
    });
    page.on('pageerror', (error) =>
      evidence.errors.push({
        type: 'pageerror',
        url: page.url(),
        message: error.message,
      }),
    );
    page.on('console', (msg) => {
      if (msg.type() === 'warning')
        evidence.consoleWarnings.push({ url: page.url(), message: msg.text() });
      if (msg.type() === 'error')
        evidence.errors.push({
          type: 'console',
          url: page.url(),
          message: msg.text(),
          expected404:
            page.url().endsWith('/unknown-task-005c-route') &&
            msg.text().includes('404'),
        });
    });
    page.on('requestfailed', (request) =>
      evidence.errors.push({
        type: 'requestfailed',
        url: request.url(),
        pageUrl: page.url(),
        width,
        message: request.failure()?.errorText,
      }),
    );
    page.on('response', (response) => {
      if (
        response.status() >= 400 &&
        !response.url().endsWith('/unknown-task-005c-route')
      )
        evidence.errors.push({
          type: 'http-error',
          url: response.url(),
          status: response.status(),
        });
    });
    try {
      for (const route of routes) {
        await visit(page, route);
        const layout = await geometry(page);
        validateGeometry(layout);
        const name = `${route === '/' ? 'home' : route.slice(1).replaceAll('/', '-')}-${width}`;
        await capture(page, name);
        if (route === '/') {
          await capture(page, `home-viewport-${width}`, false);
          const composition = await page.evaluate(() => {
            const hero = document
              .querySelector('.cinema-hero')
              .getBoundingClientRect();
            const image = document.querySelector(
              '.cinema-specimen .specimen-preview-image',
            );
            const specimen = image.getBoundingClientRect();
            return {
              pageHeight: document.documentElement.scrollHeight,
              heroHeight: hero.height,
              specimenWidth: specimen.width,
              specimenHeight: specimen.height,
              specimenSource: image.currentSrc,
              destinationCount: document.querySelectorAll('.cinema-destination')
                .length,
              noColoradoLabel: !/\bColorado\b/i.test(document.body.innerText),
              supplyWithoutComma: !document.body.innerText.includes('5,280'),
              imageTransferBytes: performance
                .getEntriesByType('resource')
                .filter(
                  (entry) =>
                    entry.initiatorType === 'img' ||
                    entry.name.includes('/_next/image'),
                )
                .reduce((sum, entry) => sum + entry.transferSize, 0),
              observedLayoutShift: window.__lammbLayoutShifts.reduce(
                (sum, value) => sum + value,
                0,
              ),
            };
          });
          assert.equal(composition.destinationCount, 4);
          assert(composition.noColoradoLabel && composition.supplyWithoutComma);
          assert(!composition.specimenSource.includes('/art/sealed-specimen/'));
          evidence.homepageComposition.push({ width, ...composition });
        }
        evidence.pages.push({
          route,
          width,
          height: width < 768 ? 844 : 1000,
          status: 200,
          ...layout,
        });
        console.log(`${values.browser} ${width}px ${route}: PASS`);
      }
      await interactionChecks(page, width);
    } finally {
      await context.close();
    }
  }
  assert.deepEqual(
    evidence.errors.filter((error) => !error.expected404),
    [],
    'Unexpected browser/network errors',
  );
  evidence.result = 'PASS';
} catch (error) {
  evidence.result = 'FAIL';
  evidence.failure = error.message;
  console.error(error);
  process.exitCode = 1;
} finally {
  clearInterval(memoryTimer);
  if (browser) await browser.close();
  while (sampling) await new Promise((resolve) => setTimeout(resolve, 100));
  await sampleMemory();
  evidence.minimumAvailableRAMGB = Math.min(...evidence.memorySamplesGB);
  evidence.browserClosed = true;
  await writeFile(
    path.join(output, 'results.json'),
    `${JSON.stringify(evidence, null, 2)}\n`,
  );
  console.log(
    JSON.stringify({
      result: evidence.result,
      pages: evidence.pages.length,
      interactions: evidence.interactions.length,
      screenshots: evidence.screenshots.length,
      minimumAvailableRAMGB: evidence.minimumAvailableRAMGB,
      report: path.join(output, 'results.json'),
    }),
  );
}
