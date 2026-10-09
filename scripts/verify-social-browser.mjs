// Optional browser evidence using an existing driver and installed browser.
// Does not install software, use personal profiles, or start a server.
import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import path from 'node:path';
import { parseArgs, promisify } from 'node:util';

const { values } = parseArgs({
  options: {
    'playwright-module': { type: 'string' },
    browser: { type: 'string', default: 'chrome' },
    port: { type: 'string', default: '3017' },
  },
});
assert(['chrome', 'msedge'].includes(values.browser));
assert(/^\d{4,5}$/.test(values.port) && Number(values.port) <= 65535);
const load = createRequire(import.meta.url);
const { chromium } = load(values['playwright-module'] || 'playwright');
const origin = `http://127.0.0.1:${values.port}`;
const output = path.resolve(
  'artifacts/generated/task-010s/acceptance',
  values.browser,
);
await mkdir(output, { recursive: true });
const manifest = JSON.parse(
  await readFile('apps/web/public/social/provenance.json'),
);
const built = JSON.parse(
  await readFile(
    'artifacts/generated/task-010s/acceptance/built-metadata.json',
  ),
);
const browser = await chromium.launch({
  channel: values.browser,
  headless: true,
});
const results = {
  headAtRun: (
    await promisify(execFile)('git', ['rev-parse', 'HEAD'])
  ).stdout.trim(),
  browser: values.browser,
  audits: [],
  screenshots: [],
  errors: [],
};
try {
  for (const javaScriptEnabled of [true, false]) {
    const context = await browser.newContext({
      javaScriptEnabled,
      viewport: { width: 1280, height: 900 },
      deviceScaleFactor: 1,
    });
    const page = await context.newPage();
    page.on('pageerror', (error) => results.errors.push(error.message));
    for (const expected of built.metadata) {
      const response = await page.goto(origin + expected.route, {
        waitUntil: 'load',
      });
      assert.equal(response.status(), 200);
      assert(await page.locator('main').isVisible());
      assert.equal(await page.title(), expected.title);
      const canonical = await page
        .locator('link[rel="canonical"]')
        .getAttribute('href');
      assert.equal(new URL(canonical).href, new URL(expected.canonical).href);
      assert.equal(
        await page.locator('meta[property="og:image"]').getAttribute('content'),
        expected.image,
      );
      assert.equal(
        await page.locator('meta[name="twitter:card"]').getAttribute('content'),
        'summary_large_image',
      );
      assert(!(await page.locator('body').innerText()).includes('5,280'));
      if (javaScriptEnabled && expected.route === '/world') {
        await page.locator('.atlas-map').waitFor({ state: 'visible' });
        assert.equal(await page.locator('[data-country]').count(), 248);
      }
      results.audits.push({
        route: expected.route,
        javaScriptEnabled,
        status: response.status(),
        title: expected.title,
        canonical,
        image: expected.image,
      });
      if (
        javaScriptEnabled &&
        manifest.assets.some((asset) => asset.route === expected.route)
      ) {
        const id = manifest.assets.find(
          (asset) => asset.route === expected.route,
        ).id;
        await page.screenshot({ path: path.join(output, id + '-desktop.png') });
        results.screenshots.push(id + '-desktop.png');
      }
    }
    // The unknown dossier and generic route must continue to return 404.
    for (const route of ['/universe/archive/999', '/not-a-lammb-route']) {
      const response = await page.goto(origin + route, { waitUntil: 'load' });
      assert.equal(response.status(), 404);
      results.audits.push({ route, javaScriptEnabled, status: 404 });
    }
    await context.close();
  }
  const mobile = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 1,
    isMobile: true,
    hasTouch: true,
  });
  const phone = await mobile.newPage();
  phone.on('pageerror', (error) => results.errors.push(error.message));
  for (const asset of manifest.assets) {
    const response = await phone.goto(origin + asset.route, {
      waitUntil: 'load',
    });
    assert.equal(response.status(), 200);
    if (asset.route === '/world') {
      await phone.locator('.atlas-map').waitFor({ state: 'visible' });
      assert.equal(await phone.locator('[data-country]').count(), 248);
    }
    const metrics = await phone.evaluate(() => ({
      scroll: document.documentElement.scrollWidth,
      client: document.documentElement.clientWidth,
    }));
    assert(metrics.scroll <= metrics.client, asset.route + ': mobile overflow');
    await phone.screenshot({
      path: path.join(output, asset.id + '-mobile.png'),
    });
    results.screenshots.push(asset.id + '-mobile.png');
  }
  await mobile.close();
  const review = await browser.newContext({
    viewport: { width: 1280, height: 1030 },
    deviceScaleFactor: 1,
  });
  const sheet = await review.newPage();
  const escape = (value) =>
    value
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('"', '&quot;');
  const html = `<!doctype html><html lang="en"><meta charset="utf-8"><title>LAMMB social card review</title><style>
    *{box-sizing:border-box}body{margin:0;padding:36px;background:#080B09;color:#F4F5EB;font-family:Arial,sans-serif}
    h1{margin:0 0 10px;font-size:28px}header p{color:#A9B4A3;font-size:16px;margin:0 0 24px}
    .cards{display:grid;grid-template-columns:1fr 1fr;gap:24px}.card{border:1px solid #38432D;background:#10150F;border-radius:12px;overflow:hidden}
    img{display:block;width:100%;height:auto}.copy{padding:18px}.copy span{font-size:14px;color:#A9B4A3}.copy h2{font-size:20px;margin:10px 0}.copy p{font-size:15px;line-height:1.5;margin:0;color:#D0D7C9}
    </style><header><h1>LAMMB / SOCIAL CARD REVIEW</h1><p>Four distinct 1200 × 630 assets · Local production metadata · Illustrative layout; X presentation can vary.</p></header>
    <div class="cards">${manifest.assets
      .map((asset) => {
        const metadata = built.metadata.find(
          (item) => item.route === asset.route,
        );
        return `<article class="card"><img alt="${escape(asset.id)} preview" src="${origin + asset.path}"><div class="copy"><span>${escape(metadata.canonical)}</span><h2>${escape(metadata.title)}</h2><p>${escape(metadata.description)}</p></div></article>`;
      })
      .join('')}</div></html>`;
  await writeFile(path.join(output, 'review.html'), html);
  await sheet.setContent(html, { waitUntil: 'load' });
  assert(
    await sheet
      .locator('img')
      .evaluateAll((images) =>
        images.every(
          (image) =>
            image.complete &&
            image.naturalWidth === 1200 &&
            image.naturalHeight === 630,
        ),
      ),
  );
  await sheet.screenshot({
    path: path.join(output, 'social-card-review.png'),
    fullPage: true,
  });
  results.screenshots.push('social-card-review.png');
  await sheet.setViewportSize({ width: 1200, height: 630 });
  for (const asset of manifest.assets) {
    await sheet.setContent(
      `<style>body{margin:0}img{display:block}</style><img src="${origin + asset.path}" width="1200" height="630" alt="${asset.id}">`,
      { waitUntil: 'load' },
    );
    await sheet.screenshot({ path: path.join(output, asset.id + '-card.png') });
    results.screenshots.push(asset.id + '-card.png');
  }
  await review.close();
  assert.deepEqual(results.errors, []);
  results.result = 'PASS';
} finally {
  await browser.close();
  await writeFile(
    path.join(output, 'results.json'),
    JSON.stringify(results, null, 2) + '\n',
  );
}
console.log(
  JSON.stringify(
    {
      result: results.result,
      browser: results.browser,
      audits: results.audits.length,
      screenshots: results.screenshots.length,
      errors: results.errors,
    },
    null,
    2,
  ),
);
