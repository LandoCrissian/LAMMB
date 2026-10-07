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
import { isAbsolute, join, relative, resolve } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { canonicalJson } from '../packages/art-generator/src/canonical.ts';
import { generateCollection } from '@lammb/art-generator/engine';
import {
  GENERATED_ROOT,
  REPOSITORY_ROOT,
  readArtifacts,
  readAssetBytes,
  readJson,
  writeArtifacts,
} from '../packages/art-generator/src/io.ts';

let testRoot: string;
let testDirectory: string;
const fixtureRoot = join(REPOSITORY_ROOT, 'packages/art-generator/fixtures');
const cliPath = join(REPOSITORY_ROOT, 'packages/art-generator/src/cli.ts');
const cli = (command: string, ...args: string[]) =>
  spawnSync(
    process.execPath,
    ['--experimental-strip-types', cliPath, command, ...args],
    {
      cwd: REPOSITORY_ROOT,
      encoding: 'utf8',
      timeout: 15000,
      env: { ...process.env, NODE_OPTIONS: '' },
    },
  );

beforeAll(async () => {
  await mkdir(GENERATED_ROOT, { recursive: true });
  testRoot = await mkdtemp(join(GENERATED_ROOT, 'generator-test-'));
  testDirectory = relative(GENERATED_ROOT, testRoot).replaceAll('\\', '/');
});

afterAll(async () => {
  // Check the absolute cleanup target before recursive removal on Windows or Linux.
  const target = resolve(testRoot);
  const inside = relative(GENERATED_ROOT, target);
  if (
    !inside ||
    isAbsolute(inside) ||
    inside === '..' ||
    inside.startsWith('../') ||
    inside.startsWith('..\\')
  )
    throw new Error('Unsafe test cleanup path');
  await rm(target, { recursive: true, force: true });
});

describe('offline I/O confinement', () => {
  it('checks actual source bytes, writes canonical bundles and refuses overwrites', async () => {
    const catalog = await readJson(join(fixtureRoot, 'stress-catalog.json'));
    const manifest = await readJson(join(fixtureRoot, 'stress-assets.json'));
    const request = await readJson(join(fixtureRoot, 'stress-request.json'));
    const assetBytes = await readAssetBytes(
      join(fixtureRoot, 'assets'),
      manifest,
    );
    const generated = generateCollection({
      catalog,
      manifest,
      request,
      assetBytes,
    });
    expect(generated.ok).toBe(true);
    if (!generated.ok) return;
    const out = `${testDirectory}/io-bundle`;
    const directory = await writeArtifacts(out, generated.artifacts);
    expect(await readArtifacts(out)).toEqual(generated.artifacts);
    expect(await readFile(join(directory, 'collection.json'), 'utf8')).toBe(
      canonicalJson(generated.artifacts.logicalCollection),
    );
    await expect(writeArtifacts(out, generated.artifacts)).rejects.toThrow(
      /already exists/,
    );
    for (const unsafe of [
      '../escape',
      '/absolute',
      'C:/absolute',
      'https://example.test/output',
      'dev\\escape',
      'CON',
    ]) {
      await expect(
        writeArtifacts(unsafe, generated.artifacts),
      ).rejects.toThrow();
      await expect(readArtifacts(unsafe)).rejects.toThrow();
    }
    await expect(readAssetBytes(testRoot, manifest)).rejects.toThrow(
      /not approved/,
    );
    await expect(
      readAssetBytes(join(fixtureRoot, 'assets'), {
        schemaVersion: 1,
        purpose: 'DEVELOPMENT_ONLY',
        assets: [{ path: '../escape' }],
      }),
    ).rejects.toThrow();
  });

  it('rejects output directory junctions before reading or writing', async () => {
    const link = join(testRoot, 'linked-directory');
    await symlink(
      fixtureRoot,
      link,
      process.platform === 'win32' ? 'junction' : 'dir',
    );
    try {
      await expect(
        readArtifacts(`${testDirectory}/linked-directory`),
      ).rejects.toThrow(/links\/junctions/);
      await expect(
        writeArtifacts(
          `${testDirectory}/linked-directory/nested`,
          {} as Parameters<typeof writeArtifacts>[1],
        ),
      ).rejects.toThrow(/links\/junctions/);
    } finally {
      await unlink(link);
    }
  });

  it('rejects non-files, oversized JSON and malformed JSON', async () => {
    await expect(readJson(testRoot)).rejects.toThrow(/bounded regular file/);
    const path = join(testRoot, 'input.json');
    await writeFile(path, 'not JSON');
    await expect(readJson(path)).rejects.toThrow();
    await writeFile(path, ' '.repeat(256));
    await expect(readJson(path, 128)).rejects.toThrow(/bounded regular file/);
  });
});

describe('development CLI exit codes and independent reconstruction', () => {
  it('generates, verifies and summarizes without network configuration', () => {
    const out = `${testDirectory}/cli-bundle`;
    const generated = cli('generate', '--out', out, '--json');
    expect(generated.status, generated.stderr).toBe(0);
    const report = JSON.parse(generated.stdout) as {
      generatedSpecimens: number;
      uniqueFingerprints: number;
      elapsedMs: number;
    };
    expect(report.generatedSpecimens).toBe(100);
    expect(report.uniqueFingerprints).toBe(100);
    expect(report.elapsedMs).toBeGreaterThan(0);
    const verified = cli('verify', '--out', out, '--json');
    expect(verified.status, verified.stderr).toBe(0);
    expect(JSON.parse(verified.stdout)).toMatchObject({ ok: true });
    const summarized = cli('summarize', '--out', out, '--json');
    expect(summarized.status, summarized.stderr).toBe(0);
    expect(JSON.parse(summarized.stdout)).toMatchObject({
      requestedSpecimens: 100,
      generatedSpecimens: 100,
      uniqueFingerprints: 100,
    });
  });

  it('exits nonzero on malformed input, unsafe output paths and repeated or unknown flags', async () => {
    for (const args of [
      [],
      ['--out', '../escape'],
      ['--out', 'C:/absolute'],
      ['--unknown', 'x'],
      ['--out', 'x', '--out', 'y'],
      ['--out'],
    ]) {
      const result = cli('generate', ...args);
      expect(result.status).toBe(1);
      expect(result.stdout).toBe('');
    }
    const invalidCatalog = join(testRoot, 'invalid-catalog.json');
    await writeFile(invalidCatalog, '{"purpose":"PRODUCTION"}');
    const result = cli(
      'generate',
      '--catalog',
      invalidCatalog,
      '--out',
      `${testDirectory}/must-not-exist`,
    );
    expect(result.status).toBe(1);
    expect(result.stderr).toContain('DEVELOPMENT_ONLY');
    await expect(
      readArtifacts(`${testDirectory}/must-not-exist`),
    ).rejects.toThrow();
  });

  it('detects changed seed, catalog, output, forged digests and missing output with nonzero exit codes', async () => {
    const out = `${testDirectory}/negative-bundle`;
    expect(cli('generate', '--out', out, '--json').status).toBe(0);
    const originalRequest = (await readJson(
      join(fixtureRoot, 'stress-request.json'),
    )) as Record<string, unknown>;
    const changedRequest = join(testRoot, 'changed-request.json');
    await writeFile(
      changedRequest,
      JSON.stringify({ ...originalRequest, seedHex: '01'.repeat(32) }),
    );
    expect(
      cli('verify', '--out', out, '--request', changedRequest).status,
    ).toBe(1);
    const catalog = (await readJson(
      join(fixtureRoot, 'stress-catalog.json'),
    )) as { traits: { frequency: { weight: number } }[] };
    catalog.traits[0]!.frequency.weight++;
    const changedCatalog = join(testRoot, 'changed-catalog.json');
    await writeFile(changedCatalog, JSON.stringify(catalog));
    expect(
      cli('verify', '--out', out, '--catalog', changedCatalog).status,
    ).toBe(1);
    const collectionPath = join(testRoot, 'negative-bundle/collection.json');
    const original = await readFile(collectionPath, 'utf8');
    const changed = JSON.parse(original) as {
      specimens: { traitIds: string[] }[];
    };
    changed.specimens[1]!.traitIds[0] = 'dev-altered';
    await writeFile(collectionPath, JSON.stringify(changed));
    expect(cli('verify', '--out', out).status).toBe(1);
    await writeFile(collectionPath, original);
    const provenancePath = join(testRoot, 'negative-bundle/provenance.json');
    const provenance = JSON.parse(
      await readFile(provenancePath, 'utf8'),
    ) as Record<string, unknown>;
    provenance.logicalCollectionSha256 = '0'.repeat(64);
    await writeFile(provenancePath, JSON.stringify(provenance));
    expect(cli('verify', '--out', out).status).toBe(1);
    await unlink(collectionPath);
    expect(cli('verify', '--out', out).status).toBe(1);
  });
});
