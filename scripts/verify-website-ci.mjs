// Own a localhost-only preview in the disposable CI runner, never the Legion.
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createWriteStream } from 'node:fs';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';

assert.equal(process.env.GITHUB_ACTIONS, 'true', 'CI runner only');
assert.equal(
  process.platform,
  'win32',
  'Use the supported Windows browser image',
);
const driver = process.env.LAMMB_PLAYWRIGHT_MODULE;
assert(driver, 'Pinned temporary Playwright driver required');
const output = path.resolve('artifacts/generated/task-007/acceptance');
await mkdir(output, { recursive: true });
const log = createWriteStream(path.join(output, 'preview-server.log'));
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
    cwd: path.resolve('apps/web'),
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
    assert.equal(
      server.exitCode,
      null,
      'Preview server exited before acceptance',
    );
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
      /* Preview is still starting. */
    }
    await delay(500);
  }
  assert(ready, 'Local preview did not become ready');
  for (const browser of ['msedge', 'chrome']) {
    const code = await new Promise((resolve, reject) => {
      const check = spawn(
        process.execPath,
        [
          'scripts/verify-website-browser.mjs',
          '--playwright-module',
          driver,
          '--browser',
          browser,
          '--output',
          'task-007/acceptance',
        ],
        { windowsHide: true, stdio: 'inherit' },
      );
      check.once('error', reject);
      check.once('close', resolve);
    });
    assert.equal(code, 0, `${browser} acceptance failed`);
  }
} finally {
  // This process was created solely for this isolated CI job.
  if (server.exitCode === null) server.kill('SIGTERM');
  await exited;
  log.end();
}
