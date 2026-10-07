import { spawnSync } from 'node:child_process';
import {
  mkdir,
  mkdtemp,
  readFile,
  rm,
  symlink,
  unlink,
  writeFile,
} from 'node:fs/promises';
import { join, relative } from 'node:path';
import { pathToFileURL } from 'node:url';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import manifestData from '../packages/art-generator/fixtures/art-assets-v2.json';
import { sha256Bytes } from '../packages/art-generator/src/canonical.ts';
import {
  GENERATED_ROOT,
  REPOSITORY_ROOT,
  readAssetBytes,
  readJson,
} from '../packages/art-generator/src/io.ts';

let root: string;
let directory: string;
let blocker: string;
let logicalDir: string;
const fixtureRoot = join(REPOSITORY_ROOT, 'packages/art-generator/fixtures');
function cli(command: string, ...flags: string[]) {
  return spawnSync(
    process.execPath,
    [
      '--import',
      pathToFileURL(blocker).href,
      '--experimental-strip-types',
      join(REPOSITORY_ROOT, 'packages/art-generator/src/art-cli.ts'),
      command,
      ...flags,
    ],
    {
      cwd: REPOSITORY_ROOT,
      encoding: 'utf8',
      timeout: 15000,
      env: { ...process.env, NODE_OPTIONS: '', NODE_NO_WARNINGS: '1' },
    },
  );
}
beforeAll(async () => {
  await mkdir(GENERATED_ROOT, { recursive: true });
  root = await mkdtemp(join(GENERATED_ROOT, 'art-test-'));
  directory = relative(GENERATED_ROOT, root);
  logicalDir = `${directory}/logical`;
  blocker = join(root, 'deny-network.mjs');
  await writeFile(
    blocker,
    `import http from 'node:http';\nimport https from 'node:https';\nimport net from 'node:net';\nimport tls from 'node:tls';\nimport dns from 'node:dns';\nimport { syncBuiltinESMExports } from 'node:module';\nconst deny = () => { throw new Error('NETWORK ACCESS FORBIDDEN IN OFFLINE TEST'); };\nglobalThis.fetch = deny;\nfor (const api of [http,https]) { api.request=deny; api.get=deny; }\nnet.connect=deny; net.createConnection=deny; net.Socket.prototype.connect=deny; tls.connect=deny; dns.lookup=deny; dns.resolve=deny;\nsyncBuiltinESMExports();\n`,
  );
  const generated = spawnSync(
    process.execPath,
    [
      '--import',
      pathToFileURL(blocker).href,
      '--experimental-strip-types',
      join(REPOSITORY_ROOT, 'packages/art-generator/src/cli.ts'),
      'generate',
      '--out',
      logicalDir,
      '--json',
    ],
    {
      cwd: REPOSITORY_ROOT,
      encoding: 'utf8',
      timeout: 15000,
      env: { ...process.env, NODE_OPTIONS: '', NODE_NO_WARNINGS: '1' },
    },
  );
  expect(generated.status, generated.stderr).toBe(0);
});
afterAll(async () => {
  if (!relative(GENERATED_ROOT, root).startsWith('art-test-'))
    throw new Error('Unsafe cleanup');
  await rm(root, { recursive: true, force: true });
});

describe('offline art CLI and protected output boundary', () => {
  it('validates, plans, renders, and checks readiness with network functions disabled', async () => {
    const sourceBefore = await readFile(
      join(fixtureRoot, 'assets/dev-asset-base.txt'),
    );
    for (const command of ['validate', 'plan', 'readiness']) {
      const result = cli(command, '--logical-dir', logicalDir, '--json');
      expect(result.status, result.stderr).toBe(0);
      expect(() => JSON.parse(result.stdout)).not.toThrow();
    }
    const readiness = JSON.parse(
      cli('readiness', '--logical-dir', logicalDir, '--json').stdout,
    ) as { plannedSpecimens: number; productionReady100: boolean };
    expect(readiness.plannedSpecimens).toBe(100);
    expect(readiness.productionReady100).toBe(false);
    const out = `${directory}/render`;
    const result = cli(
      'render-fixture',
      '--logical-dir',
      logicalDir,
      '--out',
      out,
      '--json',
    );
    expect(result.status, result.stderr).toBe(0);
    const report = JSON.parse(result.stdout) as {
      renderedOutputSha256: string;
    };
    const actual = await readFile(
      join(GENERATED_ROOT, out, 'fixture-render.txt'),
    );
    expect(sha256Bytes(actual)).toBe(report.renderedOutputSha256);
    const out2 = `${directory}/render-repeat`;
    expect(
      cli('render-fixture', '--logical-dir', logicalDir, '--out', out2).status,
    ).toBe(0);
    expect(
      await readFile(join(GENERATED_ROOT, out2, 'fixture-render.txt')),
    ).toEqual(actual);
    expect(
      cli('render-fixture', '--logical-dir', logicalDir, '--out', out).status,
    ).toBe(1);
    expect(
      await readFile(join(fixtureRoot, 'assets/dev-asset-base.txt')),
    ).toEqual(sourceBefore);
  });
  it('returns nonzero for unsafe outputs, missing logical inputs, malformed flags and remote manifests', () => {
    for (const flags of [
      ['--out', '../escape'],
      ['--out', '/absolute'],
      ['--out', 'https://example.test/out'],
      ['--out', 'x', '--out', 'y'],
      ['--unknown', 'x'],
      ['--index', '1.2'],
      ['--index', '5280'],
    ])
      expect(
        cli('render-fixture', '--logical-dir', logicalDir, ...flags).status,
      ).toBe(1);
    expect(cli('plan').status).toBe(1);
    expect(cli('readiness', '--logical-dir', 'missing-logical').status).toBe(1);
    expect(
      cli('validate', '--manifest', 'https://example.test/art.json').status,
    ).toBe(1);
  });
  it('rejects missing assets with a machine-readable failure', async () => {
    const manifest = structuredClone(manifestData);
    manifest.assets[0]!.path = 'dev-missing.txt';
    const path = join(root, 'missing-art.json');
    await writeFile(path, JSON.stringify(manifest));
    const result = cli(
      'readiness',
      '--logical-dir',
      logicalDir,
      '--manifest',
      path,
      '--json',
    );
    expect(result.status).toBe(1);
    expect(JSON.parse(result.stderr)).toMatchObject({
      ok: false,
      code: 'ART_CLI_FAILURE',
    });
  });
  it('rejects JSON ancestor symlinks and source symlink escapes', async () => {
    const jsonLink = join(root, 'json-link');
    await symlink(
      fixtureRoot,
      jsonLink,
      process.platform === 'win32' ? 'junction' : 'dir',
    );
    await expect(
      readJson(join(jsonLink, 'art-assets-v2.json')),
    ).rejects.toThrow(/links\/junctions/);
    await unlink(jsonLink);
    const sourceLink = join(fixtureRoot, 'assets/dev-task004-link.txt');
    await symlink(
      join(fixtureRoot, 'assets/dev-asset-base.txt'),
      sourceLink,
      'file',
    );
    try {
      const m = structuredClone(manifestData);
      m.assets[0]!.path = 'dev-task004-link.txt';
      await expect(
        readAssetBytes(join(fixtureRoot, 'assets'), m),
      ).rejects.toThrow(/links\/junctions/);
    } finally {
      await unlink(sourceLink);
    }
  });
  it('rejects production use of development source directory', async () => {
    const m = structuredClone(manifestData);
    m.purpose = 'PRODUCTION';
    await expect(
      readAssetBytes(join(fixtureRoot, 'assets'), m),
    ).rejects.toThrow(/Development source root/);
  });
  it('rejects output junction escapes and retains source bytes', async () => {
    const link = join(root, 'output-link');
    await symlink(
      fixtureRoot,
      link,
      process.platform === 'win32' ? 'junction' : 'dir',
    );
    try {
      const result = cli(
        'render-fixture',
        '--logical-dir',
        logicalDir,
        '--out',
        `${directory}/output-link/escape`,
      );
      expect(result.status).toBe(1);
      expect(result.stderr).toContain('links/junctions');
    } finally {
      await unlink(link);
    }
  });
});
