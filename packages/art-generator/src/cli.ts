import { resolve, join } from 'node:path';
import { performance } from 'node:perf_hooks';
import { generateCollection, verifyCollection } from './engine.ts';
import {
  readAssetBytes,
  readArtifacts,
  readJson,
  REPOSITORY_ROOT,
  writeArtifacts,
} from './io.ts';

const command = process.argv[2];
const flags = new Map<string, string>();
const allowed = new Set([
  '--catalog',
  '--manifest',
  '--request',
  '--assets-root',
  '--out',
  '--json',
]);
try {
  if (!['generate', 'verify', 'summarize'].includes(command ?? ''))
    throw new Error(
      'Usage: generate|verify|summarize --out relative-directory [--catalog file --manifest file --request file --assets-root directory --json]',
    );
  for (let index = 3; index < process.argv.length; index++) {
    const flag = process.argv[index]!;
    if (!allowed.has(flag) || flags.has(flag))
      throw new Error(`Unknown or repeated flag: ${flag}`);
    if (flag === '--json') {
      flags.set(flag, 'true');
      continue;
    }
    const value = process.argv[++index];
    if (!value || value.startsWith('--'))
      throw new Error(`Missing value: ${flag}`);
    flags.set(flag, value);
  }
  const out = flags.get('--out');
  if (!out)
    throw new Error('--out is required and is relative to artifacts/generated');
  const fixtureRoot = join(REPOSITORY_ROOT, 'packages/art-generator/fixtures');
  const catalog = await readJson(
    resolve(flags.get('--catalog') ?? join(fixtureRoot, 'stress-catalog.json')),
  );
  const manifest = await readJson(
    resolve(flags.get('--manifest') ?? join(fixtureRoot, 'stress-assets.json')),
  );
  const request = await readJson(
    resolve(flags.get('--request') ?? join(fixtureRoot, 'stress-request.json')),
  );
  if ((catalog as { purpose?: string }).purpose !== 'DEVELOPMENT_ONLY')
    throw new Error('Task 003 CLI permits DEVELOPMENT_ONLY construction only');
  const assetBytes = await readAssetBytes(
    resolve(flags.get('--assets-root') ?? join(fixtureRoot, 'assets')),
    manifest,
  );
  const inputs = { catalog, manifest, request, assetBytes };
  if (command === 'generate') {
    const started = performance.now();
    const result = generateCollection(inputs);
    const elapsedMs = performance.now() - started;
    if (!result.ok) {
      console.error(JSON.stringify(result.error, null, 2));
      process.exitCode = 1;
    } else {
      const outputDirectory = await writeArtifacts(out, result.artifacts);
      // Performance belongs to this external report, never deterministic artifacts.
      const report = {
        ...result.artifacts.summary,
        outputDirectory,
        elapsedMs,
      };
      console.log(
        flags.has('--json')
          ? JSON.stringify(report)
          : `DEVELOPMENT_ONLY: ${report.generatedSpecimens}/${report.requestedSpecimens} specimens; ${report.uniqueFingerprints} unique; ${report.grailCount} grails\nLogical SHA-256: ${report.logicalCollectionSha256}\nGeneration: ${elapsedMs.toFixed(3)} ms\nArtifacts: ${outputDirectory}`,
      );
    }
  } else {
    const artifacts = await readArtifacts(out);
    const verified = verifyCollection(inputs, artifacts);
    if (!verified.ok) {
      console.error(JSON.stringify(verified.error, null, 2));
      process.exitCode = 1;
    } else if (command === 'verify')
      console.log(
        flags.has('--json')
          ? JSON.stringify(verified)
          : `Verified by offline reconstruction: ${verified.logicalCollectionSha256}`,
      );
    else {
      const result = generateCollection(inputs);
      if (!result.ok) throw new Error('Reconstruction failed');
      console.log(
        JSON.stringify(
          result.artifacts.summary,
          null,
          flags.has('--json') ? 0 : 2,
        ),
      );
    }
  }
} catch (error) {
  console.error(
    JSON.stringify({
      code: 'CLI_FAILURE',
      message:
        error instanceof Error ? error.message : 'Offline command failed',
    }),
  );
  process.exitCode = 1;
}
