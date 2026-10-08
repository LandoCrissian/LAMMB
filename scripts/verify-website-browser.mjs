// Manual acceptance runner: use an existing official Playwright installation.
// No dependency installation, browser downloads, existing profiles or deployment.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFile } from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { freemem } from 'node:os';
import path from 'node:path';
import { parseArgs, promisify } from 'node:util';

const run = promisify(execFile);
const { values } = parseArgs({
  options: {
    'playwright-module': { type: 'string' },
    browser: { type: 'string', default: 'msedge' },
    output: { type: 'string', default: 'task-008/acceptance' },
    port: { type: 'string', default: '3005' },
    origin: { type: 'string' },
    widths: { type: 'string', default: '320,390,768,1024,1440,1920' },
    'home-only': { type: 'boolean', default: false },
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
const origin = values.origin || `http://127.0.0.1:${values.port}`;
assert(
  origin === 'https://lammb.fun' ||
    origin === `http://127.0.0.1:${values.port}`,
  'Audit only the authorized production or localhost origin',
);
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
  '/vault',
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
const widths = values.widths.split(',').map(Number);
assert(
  widths.length > 0 &&
    widths.length <= 6 &&
    new Set(widths).size === widths.length &&
    widths.every((width) => [320, 390, 768, 1024, 1440, 1920].includes(width)),
  'Use distinct supported acceptance widths',
);
const evidence = {
  environment:
    process.env.GITHUB_ACTIONS === 'true' ? 'ISOLATED_WINDOWS_CI' : 'LOCAL',
  runId: process.env.GITHUB_RUN_ID || null,
  capturedAt: new Date().toISOString(),
  browserChannel: values.browser,
  playwrightVersion: load(
    path.join(values['playwright-module'] || 'playwright', 'package.json'),
  ).version,
  headAtRun: (await run('git', ['rev-parse', 'HEAD'])).stdout.trim(),
  origin,
  scope: values['home-only'] ? 'HOMEPAGE_LAB_ONLY' : 'FULL_ACCEPTANCE',
  pages: [],
  interactions: [],
  screenshots: [],
  homepageComposition: [],
  audits: [],
  errors: [],
  consoleWarnings: [],
  memorySamplesGB: [],
  memorySource: 'node:os.freemem (Windows available physical memory), GiB',
  imageReadiness:
    'Laid-out page images scrolled into view and decoded before geometry/capture; closed disclosures and dialogs stay closed',
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
let memoryFloorCrossed = false;
async function sampleMemory() {
  if (process.platform !== 'win32') return;
  // Same physical-RAM guard, without spawning a PowerShell process per sample.
  const available = freemem() / 1024 ** 3;
  assert(Number.isFinite(available) && available > 0, 'Memory sample failed');
  evidence.memorySamplesGB.push(available);
  if (available < 1) memoryFloorCrossed = true;
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
  const scroll = await page.evaluate(() => ({ x: scrollX, y: scrollY }));
  try {
    if (fullPage)
      await page.evaluate(() => {
        // Keep fixed/sticky UI at the page origin in full-page evidence.
        window.scrollTo({ left: 0, top: 0, behavior: 'instant' });
      });
    await page.screenshot({ path: path.join(output, filename), fullPage });
  } finally {
    if (fullPage)
      await page.evaluate(({ x, y }) => {
        window.scrollTo({ left: x, top: y, behavior: 'instant' });
      }, scroll);
  }
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
            !img.closest('details:not([open])') &&
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
async function settlePageImages(page) {
  const scroll = await page.evaluate(() => ({ x: scrollX, y: scrollY }));
  for (const image of await page.locator('img').all()) {
    const laidOut = await image.evaluate(
      (img) =>
        img.getClientRects().length > 0 && !img.closest('details:not([open])'),
    );
    if (!laidOut) continue;
    // networkidle can precede native lazy loading, especially in Chrome.
    // Trigger the real load and require success, rather than ignoring it.
    await image.scrollIntoViewIfNeeded();
    const deadline = Date.now() + 15000;
    while (
      !(await image.evaluate((img) => img.complete && img.naturalWidth > 0))
    ) {
      assert(Date.now() < deadline, 'Page image failed to load within 15s');
      // Poll from the driver: page animation/timer callbacks can be disabled
      // in the deliberate no-JavaScript acceptance context.
      await page.waitForTimeout(50);
    }
    await image.evaluate((img) => img.decode());
  }
  await page.evaluate(({ x, y }) => {
    window.scrollTo({ left: x, top: y, behavior: 'instant' });
  }, scroll);
}
async function visit(page, route) {
  await guard();
  const response = await page.goto(`${origin}${route}`, {
    waitUntil: 'networkidle',
  });
  assert.equal(response.status(), 200, `Route failed: ${route}`);
  await page.evaluate(() => document.fonts.ready);
  await settlePageImages(page);
  return response;
}
async function auditPage(page) {
  return page.evaluate(() => {
    const resources = performance.getEntriesByType('resource');
    const transfer = (predicate) =>
      resources
        .filter(predicate)
        .reduce((sum, entry) => sum + entry.transferSize, 0);
    return {
      measurement:
        'LAB_UNTHROTTLED_DPR1_AFTER_NETWORKIDLE_AND_IMAGE_READINESS_NOT_FIELD_DATA',
      lcpMs: window.__lammbLCP?.startTime ?? null,
      lcpElement: window.__lammbLCP?.element ?? null,
      cls: window.__lammbLayoutShifts.reduce((sum, value) => sum + value, 0),
      inp: null,
      inpReason:
        'No valid field dataset available; interactions are functional checks only',
      jsTransferBytes: transfer((entry) => entry.initiatorType === 'script'),
      cssTransferBytes: transfer((entry) => /\.css(\?|$)/.test(entry.name)),
      imageTransferBytes: transfer(
        (entry) =>
          entry.initiatorType === 'img' ||
          entry.name.includes('/_next/image') ||
          entry.name.includes('/.netlify/images'),
      ),
      fontResourceCount: resources.filter((entry) =>
        /\.(woff2?|ttf|otf)(\?|$)/.test(entry.name),
      ).length,
      stylesheets: [...document.querySelectorAll('link[rel="stylesheet"]')].map(
        (el) => el.href,
      ),
      renderBlockingResources: resources
        .filter((entry) => entry.renderBlockingStatus === 'blocking')
        .map((entry) => ({
          url: entry.name,
          transferBytes: entry.transferSize,
          durationMs: entry.duration,
        })),
      headings: [...document.querySelectorAll('h1,h2,h3,h4')].map((el) => ({
        level: Number(el.tagName.slice(1)),
        text: el.innerText,
      })),
      linkDestinations: [
        ...new Set(
          [...document.querySelectorAll('a[href]')].map((el) =>
            el.getAttribute('href'),
          ),
        ),
      ],
      smallText: [
        ...document.querySelectorAll(
          'p,dt,small,.destination-copy > span,.footer-status',
        ),
      ]
        .filter(
          (el) =>
            el.getClientRects().length &&
            parseFloat(getComputedStyle(el).fontSize) < 12,
        )
        .map((el) => ({
          selector: el.className || el.tagName.toLowerCase(),
          text: el.innerText,
          fontSizePx: parseFloat(getComputedStyle(el).fontSize),
        })),
      images: [...document.images]
        .filter((el) => el.getClientRects().length)
        .map((el) => ({
          alt: el.alt,
          source: el.currentSrc,
          displayWidth: el.getBoundingClientRect().width,
          displayHeight: el.getBoundingClientRect().height,
          naturalWidth: el.naturalWidth,
          naturalHeight: el.naturalHeight,
        })),
      controls: [...document.querySelectorAll('button,summary,a[href]')]
        .filter((el) => el.getClientRects().length)
        .map((el) => ({
          name: el.getAttribute('aria-label') || el.innerText,
          width: el.getBoundingClientRect().width,
          height: el.getBoundingClientRect().height,
        })),
    };
  });
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
      (['/_next/image', '/.netlify/images'].includes(url.pathname)
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
  assert.equal(await page.locator('#global-navigation a').count(), 10);
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
        (['/_next/image', '/.netlify/images'].includes(url.pathname)
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
  await universeChecks(page, width);
  await atlasChecks(page, width);
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
    await page.getByText('REGISTRY NOT YET LIVE', { exact: true }).isVisible(),
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

async function universeChecks(page, width) {
  await visit(page, '/');
  await page.getByRole('link', { name: 'Enter the Vault' }).click();
  await page.waitForURL(`${origin}/vault`);
  await page.reload({ waitUntil: 'networkidle' });
  assert.equal(
    await page.locator('.current-location strong').innerText(),
    'The Vault',
  );
  await page.getByRole('link', { name: 'Discover the collection' }).click();
  await page.waitForURL(`${origin}/collection`);
  await page.goBack({ waitUntil: 'networkidle' });
  await page.waitForURL(`${origin}/vault`);
  assert.equal(new URL(page.url()).pathname, '/vault');
  await page.goForward({ waitUntil: 'networkidle' });
  await page.waitForURL(`${origin}/collection`);
  assert.equal(new URL(page.url()).pathname, '/collection');
  await page.locator('.menu-toggle').click();
  assert(await page.locator('.navigation-dialog').evaluate((el) => el.open));
  await page.goBack({ waitUntil: 'networkidle' });
  await page.waitForURL(`${origin}/vault`);
  assert.equal(new URL(page.url()).pathname, '/vault');
  assert.equal(
    await page.locator('.navigation-dialog').evaluate((el) => el.open),
    false,
  );
  assert.equal(await page.evaluate(() => document.body.style.overflow), '');
  assert.equal(
    await page
      .locator('#global-navigation a[aria-current="page"]')
      .getAttribute('href'),
    '/vault',
  );
  evidence.interactions.push({
    width,
    check: 'vault-deep-link-refresh-back-forward-menu-reset',
    result: 'PASS',
  });

  const trigger = page.getByRole('button', {
    name: 'Inspect sealed specimen concept',
    exact: true,
  });
  if (width < 1100) await trigger.tap();
  else await trigger.click();
  const inspection = page.locator('.inspection-dialog');
  await assertFocusContained(page, inspection);
  for (const view of ['front', 'side', 'rear']) {
    const control = inspection.getByRole('button', {
      name: view.toUpperCase(),
      exact: true,
    });
    if (width < 1100) await control.tap();
    else await control.click();
    await awaitInspectionView(page, view);
    assert.equal(await control.getAttribute('aria-pressed'), 'true');
    await capture(page, `vault-inspection-${view}-${width}`, false);
  }
  await page.keyboard.press('Home');
  await awaitInspectionView(page, 'front');
  await page.keyboard.press('ArrowRight');
  await awaitInspectionView(page, 'side');
  await page.keyboard.press('Escape');
  assert.equal(await inspection.evaluate((el) => el.open), false);
  assert(await trigger.evaluate((el) => el === document.activeElement));
  assert.equal(await page.evaluate(() => document.body.style.overflow), '');
  await guard();
  // A same-document fragment navigation correctly has no HTTP response.
  await page.goto(`${origin}/vault#specimen-views`, {
    waitUntil: 'networkidle',
  });
  assert.equal(new URL(page.url()).hash, '#specimen-views');
  const summary = page.locator('.vault-views summary');
  await summary.focus();
  await page.keyboard.press('Enter');
  for (const image of await page.locator('.vault-view-grid img').all())
    await image.evaluate((el) => el.decode());
  assert.equal(await page.locator('.vault-view-grid figure').count(), 3);
  validateGeometry(await geometry(page));
  await capture(page, `vault-static-views-${width}`);
  await page.keyboard.press('Space');
  assert.equal(await page.locator('.vault-views').getAttribute('open'), null);
  assert.equal(
    await page
      .locator('.global-header')
      .evaluate((el) => Math.round(el.getBoundingClientRect().top)),
    0,
  );
  evidence.interactions.push({
    width,
    check: 'vault-inspection-touch-keyboard-static-views-sticky-navigation',
    result: 'PASS',
  });

  await page.emulateMedia({ reducedMotion: 'reduce' });
  await visit(page, '/vault');
  const activeMotion = await page.evaluate(
    () =>
      [...document.querySelectorAll('*')]
        .flatMap((el) =>
          [null, '::before', '::after'].map((pseudo) =>
            getComputedStyle(el, pseudo),
          ),
        )
        .filter(
          (style) =>
            style.animationName !== 'none' ||
            style.transitionDuration
              .split(',')
              .some((duration) => parseFloat(duration) > 0),
        ).length,
  );
  assert.equal(activeMotion, 0);
  await capture(page, `vault-reduced-motion-${width}`, false);
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  evidence.interactions.push({
    width,
    check: 'vault-reduced-motion-including-pseudo-elements',
    result: 'PASS',
    activeMotion,
  });
}

async function noScriptChecks(width) {
  await guard();
  const context = await browser.newContext({
    javaScriptEnabled: false,
    viewport: { width, height: 844 },
  });
  await context.route('**/*', (route) =>
    new URL(route.request().url()).origin === origin
      ? route.continue()
      : route.abort(),
  );
  try {
    const page = await context.newPage();
    await visit(page, '/');
    assert.equal(await page.locator('.menu-toggle').isVisible(), false);
    assert.equal(await page.locator('.specimen-trigger').isVisible(), false);
    assert(await page.locator('.specimen-static-fallback img').isVisible());
    await page.locator('.fallback-navigation summary').click();
    assert.equal(await page.locator('.fallback-navigation a').count(), 10);
    await page.locator('.fallback-navigation a[href="/vault"]').click();
    await page.waitForURL(`${origin}/vault`);
    await page.locator('.vault-views summary').click();
    for (const image of await page.locator('.vault-view-grid img').all())
      await image.evaluate((el) => el.decode());
    assert.equal(await page.locator('.vault-view-grid img:visible').count(), 3);
    await settlePageImages(page);
    validateGeometry(await geometry(page));
    await capture(page, `vault-without-javascript-${width}`);
    await visit(page, '/world');
    await page.locator('.atlas-country-directory summary').click();
    assert.equal(await page.locator('.atlas-country-list a').count(), 249);
    assert.equal(await page.locator('.atlas-stage').isVisible(), false);
    assert(
      await page
        .getByText('REGISTRY NOT YET LIVE', { exact: true })
        .isVisible(),
    );
    await capture(page, `world-without-javascript-${width}`);
    evidence.interactions.push({
      width,
      check: 'no-javascript-native-navigation-static-specimen-gallery',
      result: 'PASS',
    });
  } finally {
    await context.close();
  }
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
      window.__lammbLCP = null;
      new PerformanceObserver((list) => {
        for (const entry of list.getEntries())
          window.__lammbLCP = {
            startTime: entry.startTime,
            element: entry.element?.className || entry.element?.tagName || null,
          };
      }).observe({ type: 'largest-contentful-paint', buffered: true });
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
      for (const route of values['home-only'] ? ['/'] : routes) {
        const response = await visit(page, route);
        const layout = await geometry(page);
        validateGeometry(layout);
        const name = `${route === '/' ? 'home' : route.slice(1).replaceAll('/', '-')}-${width}`;
        await capture(page, name);
        evidence.audits.push({ route, width, ...(await auditPage(page)) });
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
          responseHeaders: await response.allHeaders(),
          ...layout,
        });
        console.log(`${values.browser} ${width}px ${route}: PASS`);
      }
      if (!values['home-only']) await interactionChecks(page, width);
    } finally {
      await context.close();
    }
    if (!values['home-only']) await noScriptChecks(width);
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

async function atlasChecks(page, width) {
  await visit(page, '/world');
  const map = page.locator('.atlas-map');
  await map.waitFor();
  assert.equal(await page.locator('.atlas-country').count(), 248);
  assert.equal(await page.locator('.atlas-exception').count(), 4);
  const source = await page.evaluate(async () => {
    const response = await fetch('/maps/countries-v1.json');
    return response.json();
  });
  const mapLab = await auditPage(page);
  const resource = await page.evaluate(() => {
    const entry = performance
      .getEntriesByType('resource')
      .find((entry) => entry.name.endsWith('/maps/countries-v1.json'));
    return entry
      ? { transferSize: entry.transferSize, duration: entry.duration }
      : null;
  });
  evidence.audits.push({
    route: '/world',
    width,
    atlas: true,
    boundaryTransferBytes: resource?.transferSize ?? null,
    boundaryDurationMs: resource?.duration ?? null,
    ...mapLab,
  });
  await capture(page, `world-viewport-${width}`, false);
  // Native SVG hit testing at a known interior point, not a programmatic click.
  await map.scrollIntoViewIfNeeded();
  const us = source.acceptancePoints.find((point) => point.code === 'US');
  const clickPoint = await map.evaluate((el, xy) => {
    const p = new DOMPoint(...xy).matrixTransform(el.getScreenCTM());
    return {
      x: p.x,
      y: p.y,
      hit: document.elementFromPoint(p.x, p.y)?.getAttribute('data-country'),
    };
  }, us.xy);
  assert.equal(clickPoint.hit, 'US', 'Country polygon hit test failed');
  if (width < 1100) await page.touchscreen.tap(clickPoint.x, clickPoint.y);
  else await page.mouse.click(clickPoint.x, clickPoint.y);
  await page.waitForURL(/country=US/);
  assert.equal(
    await page
      .locator('.atlas-country.is-selected')
      .getAttribute('data-country'),
    'US',
  );
  assert(
    await page
      .getByRole('heading', { name: 'United States of America', exact: true })
      .isVisible(),
  );
  await capture(page, `world-selected-us-${width}`);
  await page
    .getByRole('button', { name: 'LAMMB founding', exact: true })
    .click();
  assert.equal(
    await page
      .getByRole('button', { name: 'LAMMB founding', exact: true })
      .getAttribute('aria-pressed'),
    'true',
  );
  assert(
    await page
      .getByText('LAMMB / founding collection concept.', { exact: false })
      .isVisible(),
  );
  await page
    .getByRole('button', { name: 'All communities', exact: true })
    .click();

  await page.locator('.atlas-country-directory summary').click();
  const input = page.getByRole('searchbox', {
    name: 'Find a country or ISO code',
  });
  await input.fill('Brazil');
  const result = page.locator('.atlas-country-list a').first();
  assert.equal(await page.locator('.atlas-country-list a').count(), 1);
  await result.focus();
  await page.keyboard.press('Enter');
  await page.waitForURL(/country=BR/);
  assert(
    await page
      .getByRole('heading', { name: 'Brazil', exact: true })
      .isVisible(),
  );
  await page.goBack();
  await page.waitForURL(/country=US/);
  await page.goForward();
  await page.waitForURL(/country=BR/);
  await page.reload({ waitUntil: 'networkidle' });
  await map.waitFor();
  assert.equal(
    await page
      .locator('.atlas-country.is-selected')
      .getAttribute('data-country'),
    'BR',
  );

  await page.getByRole('button', { name: 'Reset view', exact: true }).click();
  assert.equal(await map.getAttribute('data-zoom'), '1.000');
  await map.focus();
  await page.keyboard.press('+');
  assert.equal(await map.getAttribute('data-zoom'), '1.500');
  const beforePan = await map.locator('g').getAttribute('transform');
  await page.keyboard.press('ArrowRight');
  assert.notEqual(await map.locator('g').getAttribute('transform'), beforePan);
  await page.keyboard.press('Home');
  assert.equal(await map.getAttribute('data-zoom'), '1.000');
  await page.getByRole('button', { name: 'Zoom in', exact: true }).click();
  await map.scrollIntoViewIfNeeded();
  const box = await map.boundingBox();
  const beforeDrag = await map.locator('g').getAttribute('transform');
  await page.mouse.move(box.x + box.width * 0.5, box.y + box.height * 0.5);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width * 0.6, box.y + box.height * 0.55, {
    steps: 10,
  });
  await page.mouse.up();
  assert.notEqual(await map.locator('g').getAttribute('transform'), beforeDrag);
  assert(
    new URL(page.url()).hash.includes('country=BR'),
    'Dragging must not select a different country',
  );
  let pinch = 'NOT_APPLICABLE_DESKTOP_TOUCH_DISABLED';
  if (width < 1100) {
    await page.getByRole('button', { name: 'Reset view', exact: true }).click();
    await map.scrollIntoViewIfNeeded();
    const rect = await map.boundingBox();
    const cx = rect.x + rect.width / 2,
      cy = rect.y + rect.height / 2;
    const client = await page.context().newCDPSession(page);
    await client.send('Input.dispatchTouchEvent', {
      type: 'touchStart',
      touchPoints: [
        { x: cx - 25, y: cy, id: 1 },
        { x: cx + 25, y: cy, id: 2 },
      ],
    });
    for (let step = 1; step <= 5; step++) {
      const offset = 25 + step * 8;
      await client.send('Input.dispatchTouchEvent', {
        type: 'touchMove',
        touchPoints: [
          { x: cx - offset, y: cy, id: 1 },
          { x: cx + offset, y: cy, id: 2 },
        ],
      });
      await page.waitForTimeout(30);
    }
    await client.send('Input.dispatchTouchEvent', {
      type: 'touchEnd',
      touchPoints: [],
    });
    assert(
      Number(await map.getAttribute('data-zoom')) > 1.8,
      'Native two-pointer pinch failed',
    );
    await client.detach();
    pinch = 'PASS_CDP_NATIVE_TOUCH_EMULATION_NOT_PHYSICAL_DEVICE';
  }
  await page.getByRole('button', { name: 'Reset view', exact: true }).click();
  // Island, microstate, missing boundary and source-policy exceptions.
  for (const [query, code] of [
    ['Fiji', 'FJ'],
    ['Vatican', 'VA'],
    ['Gibraltar', 'GI'],
    ['Bouvet', 'BV'],
    ['Taiwan', 'TW'],
    ['Palestine', 'PS'],
    ['United States Minor', 'UM'],
  ]) {
    if (
      !(await page
        .locator('.atlas-country-directory')
        .evaluate((el) => el.open))
    )
      await page.locator('.atlas-country-directory summary').click();
    await input.fill(query);
    await page
      .locator(`.atlas-country-list a[href^="#country=${code}&"]`)
      .click();
    await page.waitForURL(new RegExp(`country=${code}`));
    if (code === 'UM')
      assert(await page.locator('.atlas-boundary-warning').isVisible());
    else
      assert.equal(
        await page
          .locator('.atlas-country.is-selected')
          .getAttribute('data-country'),
        code,
      );
    if (code === 'FJ') await capture(page, `world-fiji-antimeridian-${width}`);
    if (code === 'VA') await capture(page, `world-vatican-${width}`);
  }
  await input.fill('no-such-country');
  assert.equal(await page.locator('.atlas-country-list a').count(), 0);
  assert(
    await page
      .getByText('No countries match. Try another name or code.')
      .isVisible(),
  );
  await input.fill('');
  if (width < 1024) {
    const sheet = page.locator('.atlas-sheet-toggle');
    await sheet.click();
    assert.equal(await sheet.getAttribute('aria-expanded'), 'false');
    assert.equal(
      await page.locator('#atlas-country-details').isVisible(),
      false,
    );
    await sheet.focus();
    await page.keyboard.press('Enter');
    assert.equal(await sheet.getAttribute('aria-expanded'), 'true');
    assert(await page.locator('#atlas-country-details').isVisible());
  }
  validateGeometry(await geometry(page));
  await capture(page, `world-country-sheet-${width}`);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const motion = await page.evaluate(
    () =>
      [...document.querySelectorAll('.atlas-experience *')].filter((el) => {
        const style = getComputedStyle(el);
        return (
          style.animationName !== 'none' ||
          style.transitionDuration.split(',').some((n) => parseFloat(n) > 0)
        );
      }).length,
  );
  assert.equal(motion, 0);
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  evidence.interactions.push({
    width,
    check:
      'atlas-real-hit-test-search-keyboard-pan-zoom-pinch-reset-country-sheet-filters-history-edge-cases',
    result: 'PASS',
    pinch,
    motion,
  });

  // Broken data remains a recoverable map error, with an independent country alternative.
  const fallback = await browser.newContext({
    viewport: { width, height: 844 },
  });
  let requests = 0;
  await fallback.route('**/maps/countries-v1.json', (route) =>
    ++requests === 1
      ? route.fulfill({ status: 503, body: 'temporarily unavailable' })
      : route.continue(),
  );
  try {
    const errorPage = await fallback.newPage();
    await visit(errorPage, '/world');
    await errorPage.getByRole('button', { name: 'Retry map' }).waitFor();
    await errorPage.locator('.atlas-country-directory summary').click();
    await errorPage.getByRole('searchbox').fill('Japan');
    await errorPage.locator('.atlas-country-list a').first().click();
    assert(await errorPage.locator('.atlas-country-status').isVisible());
    await errorPage.getByRole('button', { name: 'Retry map' }).click();
    await errorPage.locator('.atlas-map').waitFor();
    assert.equal(
      await errorPage
        .locator('.atlas-country.is-selected')
        .getAttribute('data-country'),
      'JP',
    );
    evidence.interactions.push({
      width,
      check: 'atlas-broken-boundary-fallback-and-retry',
      result: 'PASS',
      intentional503: true,
    });
  } finally {
    await fallback.close();
  }
}
