// Disposable CI browser only; synthetic UI fixtures never enable registrations.
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import path from 'node:path';
import { parseArgs } from 'node:util';
const { values } = parseArgs({
  options: {
    'playwright-module': { type: 'string' },
    browser: { type: 'string', default: 'chrome' },
  },
});
assert.equal(process.env.GITHUB_ACTIONS, 'true', 'Isolated CI acceptance only');
assert(['chrome', 'msedge'].includes(values.browser));
const load = createRequire(import.meta.url);
const { chromium } = load(values['playwright-module']);
const output = path.resolve(
  'artifacts/generated/task-010b/acceptance/genesis',
  values.browser,
);
await mkdir(output, { recursive: true });
const report = {
  head: execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(),
  browser: values.browser,
  checks: [],
  errors: [],
  scope:
    'Default closed production page plus synthetic UI fixtures; real signature and database checks run separately in verify.',
};
const browser = await chromium.launch({
  channel: values.browser,
  headless: true,
});
try {
  for (const width of [320, 390, 768, 1440]) {
    const context = await browser.newContext({
      viewport: { width, height: 900 },
      deviceScaleFactor: 1,
    });
    const page = await context.newPage();
    page.on('pageerror', (e) => report.errors.push(e.message));
    const response = await page.goto('http://127.0.0.1:3005/mint', {
      waitUntil: 'networkidle',
    });
    assert.equal(response.status(), 200);
    assert.equal(await page.locator('[data-stage]').count(), 4);
    assert.deepEqual(
      await page
        .locator('[data-stage]')
        .evaluateAll((nodes) => nodes.map((n) => n.dataset.stage)),
      ['FOUNDER', 'GTD', 'WL', 'PUBLIC'],
    );
    assert.equal(
      await page
        .getByRole('button', { name: 'Verify wallet & check status' })
        .isDisabled(),
      true,
    );
    assert.equal(
      await page
        .getByRole('button', { name: 'OpenSea public mint · inactive' })
        .isDisabled(),
      true,
    );
    assert.equal(
      await page
        .locator('[data-stage="FOUNDER"] button,[data-stage="FOUNDER"] input')
        .count(),
      0,
    );
    assert.equal(
      await page
        .getByRole('link', { name: /View official OpenSea/ })
        .getAttribute('href'),
      'https://opensea.io/collection/lammbs',
    );
    assert(
      await page
        .getByText('No partner projects have been finalized.', { exact: false })
        .isVisible(),
    );
    assert(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth + 1,
      ),
      'Horizontal overflow',
    );
    await page.getByRole('link', { name: 'Explore the stages' }).click();
    await page.getByText('Where do I mint?', { exact: true }).click();
    assert(
      await page
        .getByText(/Only at the official OpenSea collection linked above/)
        .isVisible(),
    );
    await page.evaluate(() =>
      window.scrollTo({ top: 0, left: 0, behavior: 'instant' }),
    );
    await page.screenshot({
      path: path.join(output, 'genesis-' + width + '.png'),
      fullPage: true,
    });
    const flags = await (
      await context.request.get('http://127.0.0.1:3005/api/genesis/config')
    ).json();
    assert.deepEqual(flags, {
      registrationEnabled: false,
      adminEnabled: false,
      mintEnabled: false,
    });
    const blocked = await context.request.post(
      'http://127.0.0.1:3005/api/genesis/challenge',
      {
        headers: { Origin: 'https://lammb.fun' },
        data: { address: '0x' + '1'.repeat(40), purpose: 'collector' },
      },
    );
    assert.equal(blocked.status(), 503);
    report.checks.push({
      width,
      closed: true,
      overflow: false,
      screenshot: 'genesis-' + width + '.png',
    });
    await context.close();
  }
  // Exercise browser → client request/response boundaries with explicit fixtures.
  // No real wallet, signature prompt, personal profile or live database is used.
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
  });
  const page = await context.newPage();
  const methods = [],
    requests = [];
  let applied = false,
    signedIn = true;
  await page.addInitScript(() => {
    window.__genesisTestMethods = [];
    const listeners = new Map();
    window.__genesisEmitAccountChanged = () => {
      for (const callback of listeners.get('accountsChanged') ?? []) callback();
    };
    window.ethereum = {
      on: (event, callback) => {
        const existing = listeners.get(event) ?? [];
        listeners.set(event, [...existing, callback]);
      },
      removeListener: (event, callback) => {
        listeners.set(
          event,
          (listeners.get(event) ?? []).filter((c) => c !== callback),
        );
      },
      request: async ({ method }) => {
        window.__genesisTestMethods.push(method);
        if (method === 'eth_requestAccounts')
          window.__genesisEmitAccountChanged();
        if (method === 'eth_requestAccounts' || method === 'eth_accounts')
          return ['0x' + '1'.repeat(40)];
        if (method === 'personal_sign') return '0x' + 'a'.repeat(130);
        throw new Error('Unexpected wallet method');
      },
    };
  });
  await page.route('**/api/genesis/**', async (route) => {
    const action = new URL(route.request().url()).pathname.split('/').at(-1);
    requests.push({ action, method: route.request().method() });
    let body;
    if (action === 'config')
      body = {
        registrationEnabled: true,
        adminEnabled: false,
        mintEnabled: false,
      };
    else if (action === 'challenge')
      body = {
        id: 'a'.repeat(64),
        message: 'Synthetic browser fixture only. No transaction.',
        expires: Date.now() + 300000,
      };
    else if (action === 'verify') {
      signedIn = true;
      body = { verified: true };
    } else if (action === 'status') {
      if (!signedIn)
        return route.fulfill({
          status: 401,
          contentType: 'application/json',
          body: '{"error":"SESSION_REQUIRED"}',
        });
      body = {
        address: '0x' + '1'.repeat(40),
        founder: false,
        wl: applied ? 'PENDING' : 'NOT_APPLIED',
        wlAllowance: 0,
        gtdAllowance: 0,
      };
    } else if (action === 'apply') {
      assert.equal(route.request().postDataJSON().consent, true);
      applied = true;
      body = { status: 'PENDING', duplicate: false };
    } else if (action === 'logout') {
      signedIn = false;
      body = { signedOut: true };
    } else throw new Error('Unexpected API action');
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(body),
    });
  });
  await page.goto('http://127.0.0.1:3005/mint', { waitUntil: 'networkidle' });
  // Fixture status reads as an already verified session; verify the explicit login
  // flow after signing out instead of mistaking restored status for a new signature.
  await page.getByRole('button', { name: 'Sign out', exact: true }).click();
  await page
    .getByRole('button', { name: 'Verify wallet & check status' })
    .click();
  const submit = page.getByRole('button', { name: 'Submit WL application' });
  await submit.waitFor({ state: 'visible' });
  assert.equal(await submit.isDisabled(), true);
  await page.getByRole('checkbox').check();
  await submit.click();
  await page
    .getByText('WL application submitted for review. No mint is reserved.')
    .waitFor({ state: 'visible' });
  assert.equal(
    await page.getByRole('button', { name: 'Submit WL application' }).count(),
    0,
  );
  methods.push(...(await page.evaluate(() => window.__genesisTestMethods)));
  assert.deepEqual(methods, [
    'eth_requestAccounts',
    'personal_sign',
    'eth_accounts',
  ]);
  assert.equal(requests.filter((r) => r.action === 'apply').length, 1);
  report.checks.push({
    fixture: 'WL_CONSENT_PENDING',
    methods,
    requests,
    approved: false,
  });
  await page.evaluate(() => window.__genesisEmitAccountChanged());
  await page
    .getByRole('button', { name: 'Verify wallet & check status' })
    .waitFor({ state: 'visible' });
  assert.equal(await page.getByRole('checkbox').count(), 0);
  assert.equal(requests.filter((r) => r.action === 'logout').length, 2);
  report.checks.push({
    fixture: 'ACCOUNT_CHANGE_REVOKES_SESSION',
    passed: true,
  });
  await context.close();
  assert.deepEqual(report.errors, []);
  report.result = 'PASS';
} finally {
  await browser.close();
  await writeFile(
    path.join(output, 'results.json'),
    JSON.stringify(report, null, 2) + '\n',
  );
}
console.log(JSON.stringify(report));
