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
try {
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
    });
    await context.close();
  }
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
