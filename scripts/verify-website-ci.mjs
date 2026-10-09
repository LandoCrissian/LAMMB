// Own previews only in the disposable Windows CI runner, never the Legion.
import assert from 'node:assert/strict';
import { spawn, execFile } from 'node:child_process';
import { createWriteStream } from 'node:fs';
import { mkdir, cp, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { promisify } from 'node:util';
import { setTimeout as delay } from 'node:timers/promises';
assert.equal(process.env.GITHUB_ACTIONS, 'true', 'CI runner only');
assert.equal(
  process.platform,
  'win32',
  'Use the supported Windows browser image',
);
const driver = process.env.LAMMB_PLAYWRIGHT_MODULE;
assert(driver, 'Pinned temporary Playwright driver required');
const selectedBrowser = process.env.LAMMB_BROWSER;
assert(
  !selectedBrowser || ['msedge', 'chrome'].includes(selectedBrowser),
  'Only installed CI browsers are supported',
);
const browsers = selectedBrowser ? [selectedBrowser] : ['msedge', 'chrome'];
const root = process.cwd();
const run = promisify(execFile);
const baselineSHA = '723807c813270c193c95ae12afbfced3ef952d26';
const output = path.resolve('artifacts/generated/task-010b/acceptance');
await mkdir(output, { recursive: true });
const baseline = path.join(process.env.RUNNER_TEMP, 'lammb-task-010b-baseline');
await run('git', ['worktree', 'add', '--detach', baseline, baselineSHA]);
async function command(executable, args, cwd) {
  const code = await new Promise((resolve, reject) => {
    const child = spawn(executable, args, {
      cwd,
      windowsHide: true,
      stdio: 'inherit',
    });
    child.once('error', reject);
    child.once('close', resolve);
  });
  assert.equal(code, 0, `${executable} ${args.join(' ')} failed`);
}
await command(process.env.ComSpec, ['/d', '/s', '/c', 'npm ci'], baseline);
await command(
  process.env.ComSpec,
  ['/d', '/s', '/c', 'npm run build'],
  baseline,
);
async function preview(cwd, baselineOnly) {
  const label = baselineOnly ? 'baseline' : 'head';
  const log = createWriteStream(path.join(output, `${label}-server.log`));
  const server = spawn(
    process.execPath,
    [
      '../../node_modules/next/dist/bin/next',
      'start',
      '--hostname',
      '127.0.0.1',
      '--port',
      '3005',
    ],
    {
      cwd: path.join(cwd, 'apps/web'),
      windowsHide: true,
      stdio: ['ignore', 'pipe', 'pipe'],
    },
  );
  server.stdout.pipe(log, { end: false });
  server.stderr.pipe(log, { end: false });
  let launchError;
  server.once('error', (error) => {
    launchError = error;
  });
  const exited = new Promise((resolve) => server.once('close', resolve));
  try {
    let ready = false;
    for (let attempt = 0; attempt < 60; attempt++) {
      if (launchError) throw launchError;
      assert.equal(server.exitCode, null, 'Preview exited before acceptance');
      try {
        const response = await fetch('http://127.0.0.1:3005/', {
          signal: AbortSignal.timeout(2000),
        });
        await response.arrayBuffer();
        if (response.ok) {
          ready = true;
          break;
        }
      } catch {
        /* Starting. */
      }
      await delay(500);
    }
    assert(ready, 'Local preview did not become ready');
    if (!baselineOnly) {
      await command(
        process.execPath,
        [
          path.join(root, 'scripts/verify-social-metadata.mjs'),
          '--base-url',
          'http://127.0.0.1:3005',
          '--output',
          path.join(output, 'social', 'http-metadata.json'),
        ],
        cwd,
      );
      await cp(
        path.join(
          root,
          'artifacts/generated/task-010s/acceptance/built-metadata.json',
        ),
        path.join(output, 'social', 'built-metadata.json'),
      );
    }
    for (const browser of browsers) {
      const args = [
        path.join(root, 'scripts/verify-website-browser.mjs'),
        '--playwright-module',
        driver,
        '--browser',
        browser,
        '--output',
        'task-010b/acceptance',
      ];
      if (baselineOnly) args.push('--baseline-only');
      if (!baselineOnly) {
        try {
          await command(
            process.execPath,
            [
              path.join(root, 'scripts/verify-social-browser.mjs'),
              '--playwright-module',
              driver,
              '--browser',
              browser,
              '--port',
              '3005',
            ],
            cwd,
          );
        } finally {
          await cp(
            path.join(
              root,
              'artifacts/generated/task-010s/acceptance',
              browser,
            ),
            path.join(output, 'social', browser),
            { recursive: true },
          );
        }
      }
      if (!baselineOnly)
        await command(
          process.execPath,
          [
            path.join(root, 'scripts/verify-chamber-browser.mjs'),
            '--playwright-module',
            driver,
            '--browser',
            browser,
          ],
          cwd,
        );
      await command(process.execPath, args, cwd);
    }
  } finally {
    if (server.exitCode === null) server.kill('SIGTERM');
    await exited;
    log.end();
  }
}
await preview(baseline, true);
await cp(
  path.join(baseline, 'artifacts/generated/task-010b/acceptance'),
  path.join(output, 'baseline'),
  { recursive: true },
);
await preview(root, false);
const comparison = {
  baselineSHA,
  measurement:
    'Same disposable runner, sequential production builds and installed browsers; unthrottled DPR1 localhost, warm navigation. Not field data; one sample per width/browser, timing variance expected.',
  rows: [],
};
for (const browser of browsers) {
  const before = JSON.parse(
    await readFile(
      path.join(output, 'baseline', browser, 'results.json'),
      'utf8',
    ),
  );
  const after = JSON.parse(
    await readFile(path.join(output, browser, 'results.json'), 'utf8'),
  );
  assert.equal(before.headAtRun, baselineSHA);
  assert.equal(after.result, 'PASS');
  for (const item of before.audits.filter((audit) =>
    ['/', '/universe'].includes(audit.route),
  )) {
    const updated = after.audits.find(
      (audit) => audit.route === item.route && audit.width === item.width,
    );
    assert(updated);
    const metrics = [
      'lcpMs',
      'cls',
      'jsTransferBytes',
      'cssTransferBytes',
      'imageTransferBytes',
    ];
    const select = (audit) =>
      Object.fromEntries(metrics.map((metric) => [metric, audit[metric]]));
    comparison.rows.push({
      browser,
      route: item.route,
      width: item.width,
      before: select(item),
      after: select(updated),
    });
  }
}
await writeFile(
  path.join(output, 'performance-comparison.json'),
  JSON.stringify(comparison, null, 2) + '\n',
);
