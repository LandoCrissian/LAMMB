import { collection } from '@lammb/collection/config';
import { resolve, join } from 'node:path';
import { z } from 'zod';
import { logicalSpecimenSchema, purposeSchema } from './engine-schema.ts';
import {
  readAssetBytes,
  readArtifacts,
  readJson,
  REPOSITORY_ROOT,
  writeGeneratedBundle,
} from './io.ts';
import { validateArt } from './art-inputs.ts';
import { deriveCompositionPlan } from './composition.ts';
import { createRenderBundle, verifyRenderBundle } from './renderer.ts';
import { artReadiness } from './readiness.ts';

const command = process.argv[2];
const flags = new Map<string, string>();
const allowed = new Set([
  '--manifest',
  '--approvals',
  '--catalog',
  '--request',
  '--plan-request',
  '--assets-root',
  '--logical-dir',
  '--index',
  '--out',
  '--json',
]);
try {
  if (
    !['validate', 'plan', 'render-fixture', 'readiness'].includes(command ?? '')
  )
    throw new Error(
      'Usage: validate|plan|render-fixture|readiness [--logical-dir generated-directory] [--index integer] [--out generated-directory] [--json]',
    );
  for (let i = 3; i < process.argv.length; i++) {
    const flag = process.argv[i]!;
    if (!allowed.has(flag) || flags.has(flag))
      throw new Error(`Unknown or repeated flag: ${flag}`);
    if (flag === '--json') {
      flags.set(flag, 'true');
      continue;
    }
    const value = process.argv[++i];
    if (!value || value.startsWith('--'))
      throw new Error(`Missing value: ${flag}`);
    flags.set(flag, value);
  }
  const fixtureRoot = join(REPOSITORY_ROOT, 'packages/art-generator/fixtures');
  const input = (flag: string, fallback: string) =>
    readJson(resolve(flags.get(flag) ?? join(fixtureRoot, fallback)));
  const manifest = await input('--manifest', 'art-assets-v2.json');
  const approvals = await input('--approvals', 'art-approvals.json');
  const assetBytes = await readAssetBytes(
    resolve(flags.get('--assets-root') ?? join(fixtureRoot, 'assets')),
    manifest,
  );
  const validated = validateArt(manifest, approvals, assetBytes);
  let report: unknown;
  if (command === 'validate') {
    report = {
      ok: true,
      schemaVersion: 2,
      purpose: validated.manifest.purpose,
      assetCount: validated.manifest.assets.length,
      declarationOnly: validated.declarationOnly,
    };
  } else {
    const logicalDir = flags.get('--logical-dir');
    if (!logicalDir)
      throw new Error(
        '--logical-dir required; logical specimens must already exist under artifacts/generated',
      );
    const artifacts = (await readArtifacts(logicalDir)) as {
      logicalCollection: unknown;
    };
    const logical = z
      .object({
        purpose: purposeSchema,
        specimens: z.array(logicalSpecimenSchema).min(1).max(collection.supply),
      })
      .parse(artifacts.logicalCollection);
    if (logical.purpose !== validated.manifest.purpose)
      throw new Error('Logical collection environment mismatch');
    const inputs = {
      manifest,
      approvals,
      assetBytes,
      catalog: await input('--catalog', 'stress-catalog.json'),
      request: await input('--request', 'stress-request.json'),
      planRequest: await input('--plan-request', 'art-plan-request.json'),
    };
    if (command === 'readiness') {
      report = artReadiness(inputs, logical.specimens);
      if (!(report as { ok: boolean }).ok) process.exitCode = 1;
    } else {
      const indexText = flags.get('--index') ?? '0';
      if (!/^(?:0|[1-9][0-9]{0,3})$/.test(indexText))
        throw new Error('Invalid specimen index');
      const specimen = logical.specimens.find(
        (s) => s.index === Number(indexText),
      );
      if (!specimen) throw new Error('Specimen index missing');
      if (command === 'plan') {
        const plan = deriveCompositionPlan(inputs, specimen);
        if (flags.has('--out'))
          await writeGeneratedBundle(
            flags.get('--out')!,
            { plan },
            { plan: 'plan.json' },
          );
        report = plan;
      } else {
        const out = flags.get('--out');
        if (!out) throw new Error('--out required for render-fixture');
        const bundle = createRenderBundle(inputs, specimen);
        const verification = verifyRenderBundle(inputs, specimen, bundle);
        if (!verification.ok) throw new Error(verification.message);
        await writeGeneratedBundle(
          out,
          bundle,
          {
            plan: 'plan.json',
            metadata: 'render-metadata.json',
            provenance: 'render-provenance.json',
            outputText: 'fixture-render.txt',
          },
          ['outputText'],
        );
        report = {
          ok: true,
          ...bundle.provenance,
        };
      }
    }
  }
  console.log(JSON.stringify(report, null, flags.has('--json') ? 0 : 2));
} catch (error) {
  console.error(
    JSON.stringify({
      ok: false,
      code: 'ART_CLI_FAILURE',
      message:
        error instanceof Error ? error.message : 'Offline art command failed',
    }),
  );
  process.exitCode = 1;
}
