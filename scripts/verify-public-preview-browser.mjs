import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { freemem } from 'node:os';
import path from 'node:path';
import { parseArgs } from 'node:util';

const { values } = parseArgs({
  options: {
    'playwright-module': { type: 'string' },
    browser: { type: 'string', default: 'chrome' },
    port: { type: 'string', default: '3005' },
  },
});
assert(['chrome', 'msedge'].includes(values.browser));
assert(/^\d{4,5}$/.test(values.port) && Number(values.port) <= 65535);
const ramGate = 2.75 * 1024 ** 3;
assert(freemem() >= ramGate, 'STOP_FOR_OWNER_REVIEW_RAM');
const { chromium } = createRequire(import.meta.url)(
  values['playwright-module'],
);
const base = `http://127.0.0.1:${values.port}`;
const output = path.resolve(
  'artifacts/generated/task-010b/acceptance/public-preview',
  values.browser,
);
await mkdir(output, { recursive: true });
const evidence = {
  head: execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(),
  browser: values.browser,
  result: 'RUNNING',
  checks: [],
  screenshots: [],
  errors: [],
  memoryGiB: [],
  deliberateCSPViolations: [],
};
const browser = await chromium.launch({
  channel: values.browser,
  headless: true,
});
evidence.version = browser.version();
async function capture(page, name) {
  await page.evaluate(() => scrollTo({ top: 0, behavior: 'instant' }));
  const bytes = await page.screenshot({
    path: path.join(output, `${name}.png`),
    fullPage: !name.startsWith('navigation'),
  });
  evidence.screenshots.push({
    path: `${name}.png`,
    sha256: createHash('sha256').update(bytes).digest('hex'),
  });
}
async function noOverflow(page) {
  assert(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  );
}
async function verifyEntry(page) {
  const entry = page.locator('.chamber-entry');
  const guide = page.locator('.chamber-page > .chamber-quick-guide');
  for (const panel of [entry, guide]) {
    const img = panel.locator('img');
    await img.evaluate((el) => el.decode());
    assert(await img.evaluate((el) => el.naturalWidth > 0));
    assert.equal(await img.getAttribute('alt'), '');
    assert.equal(await img.locator('..').getAttribute('aria-hidden'), 'true');
    assert.equal(
      await panel.evaluate((el) => getComputedStyle(el).animationName),
      'none',
    );
  }
  const guidance = entry.getByText(
    'PLAY IN LANDSCAPE FOR THE BEST EXPERIENCE',
    { exact: true },
  );
  const button = entry.getByRole('button', { name: 'Enter 3D chamber' });
  assert(await guidance.isVisible());
  assert.equal(
    await button.getAttribute('aria-describedby'),
    'chamber-landscape-guidance',
  );
  const guidanceBox = await guidance.boundingBox();
  const buttonBox = await button.boundingBox();
  assert(guidanceBox.y + guidanceBox.height <= buttonBox.y);
  assert(
    await guidance.evaluate(
      (el) => parseFloat(getComputedStyle(el).fontSize) >= 13,
    ),
  );
  // Compute a conservative contrast bound over the brightest possible image.
  // The text region ends before the gradient's 55% stop on desktop; mobile
  // uses a uniform dark overlay. Quick Orientation uses its own uniform veil.
  const contrast = await page.evaluate(() => {
    const luminance = (rgb) =>
      rgb
        .map((n) => {
          const s = n / 255;
          return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
        })
        .reduce((sum, n, i) => sum + n * [0.2126, 0.7152, 0.0722][i], 0);
    return [
      ...document.querySelectorAll('.chamber-entry, .chamber-cinematic-panel'),
    ].map((panel) => {
      const art = panel.querySelector('.chamber-entry-art');
      const veil = getComputedStyle(art, '::after');
      const solid = veil.backgroundColor
        .match(/rgba?\(([^)]+)\)/)?.[1]
        .split(',')
        .map(Number);
      const isGradient = veil.backgroundImage !== 'none';
      const rect = panel.getBoundingClientRect();
      const textRect = panel
        .querySelector('.chamber-panel-content')
        .getBoundingClientRect();
      const farthest = Math.min(1, (textRect.right - rect.left) / rect.width);
      const alpha = isGradient
        ? farthest <= 0.55
          ? 209 / 255
          : (209 - ((209 - 128) * (farthest - 0.55)) / 0.45) / 255
        : (solid[3] ?? 1);
      const backdrop = [5, 10, 12].map((n) => n * alpha + 255 * (1 - alpha));
      const backgroundLum = luminance(backdrop);
      const ratios = [
        ...panel.querySelectorAll('h2, h3, p, li span, strong'),
      ].map((el) => {
        const rgb = getComputedStyle(el)
          .color.match(/[\d.]+/g)
          .slice(0, 3)
          .map(Number);
        return (luminance(rgb) + 0.05) / (backgroundLum + 0.05);
      });
      return { panel: panel.className, minimumRatio: Math.min(...ratios) };
    });
  });
  for (const item of contrast)
    assert(item.minimumRatio >= 4.5, JSON.stringify(item));
  await button.focus();
  assert(
    await button.evaluate(
      (el) =>
        el === document.activeElement &&
        getComputedStyle(el).outlineStyle !== 'none',
    ),
  );
  await noOverflow(page);
  return contrast;
}
try {
  for (const scene of ['observer-access', 'quick-orientation']) {
    const response = await fetch(base + `/art/chamber-entry/${scene}.webp`);
    assert.equal(response.status, 200);
    assert(response.headers.get('content-type').startsWith('image/webp'));
    await response.arrayBuffer();
  }
  for (const width of [320, 390, 768, 1024, 1440, 1920]) {
    evidence.memoryGiB.push(freemem() / 1024 ** 3);
    assert(freemem() >= ramGate, 'STOP_FOR_OWNER_REVIEW_RAM');
    const context = await browser.newContext({
      viewport: { width, height: width < 768 ? 844 : 1000 },
      hasTouch: true,
      reducedMotion: 'reduce',
    });
    const page = await context.newPage();
    page.on('pageerror', (error) => evidence.errors.push(error.message));
    page.on('console', (message) => {
      if (message.type() === 'error')
        evidence.errors.push({
          message: message.text(),
          location: message.location(),
        });
    });
    const response = await page.goto(base + '/universe', { waitUntil: 'load' });
    assert.equal(response.status(), 200);
    assert(
      response
        .headers()
        ['content-security-policy'].includes("frame-ancestors 'none'"),
    );
    const cards = page.locator('.labs-destination');
    assert.equal(await cards.count(), 4);
    for (const card of await cards.all()) {
      await card.scrollIntoViewIfNeeded();
      const img = card.locator('img');
      await img.evaluate((el) => el.decode());
      assert(await img.evaluate((el) => el.naturalWidth > 0));
      assert.equal(await img.getAttribute('alt'), '');
      assert(await card.locator('.ui-icon').isVisible());
      assert.equal(
        await card.evaluate((el) => getComputedStyle(el).transitionDuration),
        '0s',
      );
    }
    assert(await cards.filter({ hasText: 'IN DEVELOPMENT' }).count());
    assert(await cards.filter({ hasText: 'NOT PLAYABLE' }).count());
    await noOverflow(page);
    await page.locator('main').focus();
    await capture(page, `universe-${width}`);
    const trigger = page.getByRole('button', { name: 'Open navigation menu' });
    await trigger.click();
    const dialog = page.locator('.navigation-dialog');
    assert.equal(await trigger.getAttribute('aria-expanded'), 'true');
    assert(await dialog.evaluate((el) => el.scrollWidth <= el.clientWidth));
    const links = dialog.locator('.global-navigation a');
    for (const link of await links.all()) {
      const box = await link.boundingBox();
      assert(box.height >= 44 && box.width >= 44);
      assert.equal(await link.locator('.ui-icon').count(), 1);
      assert.equal(
        await link
          .locator('.ui-icon')
          .evaluate((el) => getComputedStyle(el).color),
        'rgb(204, 255, 0)',
      );
    }
    assert.equal(
      await links
        .filter({ hasText: 'The Universe' })
        .getAttribute('aria-current'),
      'page',
    );
    await dialog.getByRole('button', { name: 'Close navigation menu' }).focus();
    await page.keyboard.press('Tab');
    assert(await links.first().evaluate((el) => el === document.activeElement));
    assert(
      await links
        .first()
        .evaluate((el) => getComputedStyle(el).outlineStyle !== 'none'),
    );
    await links.last().focus();
    await page.keyboard.press('Tab');
    assert(
      await dialog
        .getByRole('button', { name: 'Close navigation menu' })
        .evaluate((el) => el === document.activeElement),
    );
    await capture(page, `navigation-${width}`);
    await page.keyboard.press('Escape');
    assert(await trigger.evaluate((el) => el === document.activeElement));
    assert.equal(await trigger.getAttribute('aria-expanded'), 'false');
    await page.goto(base + '/universe/experimental/chamber', {
      waitUntil: 'load',
    });
    assert(
      await page.locator('.chamber-page > .chamber-quick-guide').isVisible(),
    );
    assert(
      await page
        .getByText(/Portrait works too/)
        .first()
        .isVisible(),
    );
    await noOverflow(page);
    const entryContrast = await verifyEntry(page);
    await capture(page, `entry-guide-${width}`);
    evidence.checks.push({
      width,
      cards: 4,
      svgNavigation: 'PASS',
      touchTargets: 'PASS',
      keyboardFocus: 'PASS',
      reducedMotion: 'PASS',
      overflow: 'PASS',
      entryGuide: 'PASS',
      entryArt: 'PASS',
      landscapeGuidance: 'PASS',
      entryContrast,
    });
    await context.close();
  }
  for (const viewport of [
    { width: 844, height: 390 },
    { width: 667, height: 320 },
  ]) {
    const context = await browser.newContext({
      viewport,
      hasTouch: true,
      isMobile: true,
      reducedMotion: 'reduce',
    });
    const page = await context.newPage();
    page.on('pageerror', (error) => evidence.errors.push(error.message));
    await page.goto(base + '/universe/experimental/chamber', {
      waitUntil: 'load',
    });
    const contrast = await verifyEntry(page);
    await capture(page, `entry-landscape-${viewport.width}`);
    evidence.checks.push({ viewport, landscapeEntry: 'PASS', contrast });
    await context.close();
  }
  // Deliberate image failures are isolated from ordinary error acceptance.
  const brokenContext = await browser.newContext({
    viewport: { width: 390, height: 844 },
  });
  await brokenContext.route('**/*', (route) => {
    const url = decodeURIComponent(route.request().url());
    return url.includes('/art/chamber-entry/')
      ? route.fulfill({
          status: 404,
          contentType: 'text/plain',
          body: 'Deliberate image fallback test',
        })
      : route.continue();
  });
  const brokenPage = await brokenContext.newPage();
  await brokenPage.goto(base + '/universe/experimental/chamber', {
    waitUntil: 'networkidle',
  });
  for (const image of await brokenPage.locator('.chamber-entry-art img').all())
    assert(await image.evaluate((el) => el.hidden));
  assert(
    await brokenPage
      .getByText('PLAY IN LANDSCAPE FOR THE BEST EXPERIENCE', { exact: true })
      .isVisible(),
  );
  assert(
    await brokenPage
      .getByRole('button', { name: 'Enter 3D chamber' })
      .isEnabled(),
  );
  assert(
    await brokenPage
      .locator('.chamber-page > .chamber-quick-guide')
      .getByText('Three ways to get your bearings.', { exact: true })
      .isVisible(),
  );
  await noOverflow(brokenPage);
  await capture(brokenPage, 'entry-image-fallback');
  evidence.checks.push({ imageFailureFallback: 'PASS' });
  await brokenContext.close();
  const noJS = await browser.newContext({
    javaScriptEnabled: false,
    viewport: { width: 390, height: 844 },
  });
  const fallback = await noJS.newPage();
  await fallback.goto(base + '/universe', { waitUntil: 'load' });
  assert.equal(await fallback.locator('.labs-destination').count(), 4);
  await fallback.locator('.fallback-navigation summary').click();
  assert(
    await fallback
      .getByRole('navigation', { name: 'Destinations without JavaScript' })
      .isVisible(),
  );
  await noOverflow(fallback);
  await capture(fallback, 'universe-no-js');
  await fallback.goto(base + '/universe/experimental/chamber', {
    waitUntil: 'load',
  });
  assert(
    await fallback.locator('.chamber-page > .chamber-quick-guide').isVisible(),
  );
  assert(
    !(await fallback
      .getByRole('button', { name: 'Enter 3D chamber' })
      .isVisible()),
  );
  await noJS.close();
  // A separate context isolates expected violation messages from normal acceptance.
  // CSP blocks both requests locally before any external connection is made.
  const securityContext = await browser.newContext();
  const securityPage = await securityContext.newPage();
  await securityPage.goto(base, { waitUntil: 'load' });
  const violations = await securityPage.evaluate(async () => {
    const observed = [];
    const listener = (event) =>
      observed.push({
        directive: event.effectiveDirective,
        blocked: event.blockedURI,
      });
    document.addEventListener('securitypolicyviolation', listener);
    const button = document.createElement('button');
    button.setAttribute('onclick', 'window.lammbUnsafeHandlerRan = true');
    document.body.append(button);
    button.click();
    try {
      await fetch('https://example.invalid/lammb-csp-check');
    } catch {
      /* Expected CSP refusal. */
    }
    await new Promise((resolve) =>
      requestAnimationFrame(() => requestAnimationFrame(resolve)),
    );
    button.remove();
    document.removeEventListener('securitypolicyviolation', listener);
    return { observed, handlerRan: window.lammbUnsafeHandlerRan === true };
  });
  assert.equal(violations.handlerRan, false);
  for (const directive of ['script-src-attr', 'connect-src'])
    assert(violations.observed.some((item) => item.directive === directive));
  evidence.deliberateCSPViolations = violations.observed;
  await securityContext.close();
  const build = await (await fetch(base + '/build-info.json')).json();
  assert.equal(build.commit, evidence.head);
  evidence.build = build;
  assert.deepEqual(evidence.errors, []);
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
  console.log(
    JSON.stringify({
      result: evidence.result,
      checks: evidence.checks.length,
      screenshots: evidence.screenshots.length,
      errors: evidence.errors,
    }),
  );
}
