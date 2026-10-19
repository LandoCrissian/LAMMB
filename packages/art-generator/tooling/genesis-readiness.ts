import { mkdir, open } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { parseArgs } from 'node:util';
import { pathToFileURL } from 'node:url';
import { freemem } from 'node:os';
import sharp from 'sharp';
import {
  bindGeometryIndex,
  bytesHash,
  entryIds,
  genesisDigest,
  loadSelection,
  requireGenesis,
  selectionEntry,
  serializeGenesis,
} from '../src/genesis-model.ts';
import {
  adaptMetadata,
  asGenesisFailure,
  readGenesisFile,
  restoreTask070,
  safeRelativePath,
  verifyArtifact,
  verifyGenesisFile,
} from '../src/genesis-adapter.ts';
import type {
  AdaptedComposition,
  VerifiedArtifact,
} from '../src/genesis-adapter.ts';
import {
  developmentRecord,
  registrySnapshot,
  transitionRecord,
} from '../src/genesis-registry.ts';
import {
  appendDryRunSnapshot,
  createDryRunStore,
  readDryRunStore,
} from '../src/genesis-store.ts';

export interface ReadinessOptions {
  task070Root: string;
  selectionSha256: string;
  approvalSha256: string;
  geometryRoot: string;
  geometryIndexSha256: string;
  geometryIndexFile?: string;
  sourceRoot: string;
  outputRoot: string;
}
export async function runGenesisReadiness(options: ReadinessOptions) {
  // Explicit local read-only roots. No credentials, network or registry executor.
  sharp.concurrency(1);
  sharp.cache(false);
  const readText = async (path: string, root: string) =>
    (await readGenesisFile(path, [root], 16 * 1024 * 1024)).toString('utf8');
  const selectionRaw = await readText(
    join(options.task070Root, 'TASK070_EXACT_ACCEPTANCE_MANIFEST_v2.json'),
    options.task070Root,
  );
  const approvalRaw = await readText(
    join(options.task070Root, 'TASK070_OWNER_APPROVAL_SCOPE.json'),
    options.task070Root,
  );
  const indexRaw = await readText(
    join(
      options.geometryRoot,
      safeRelativePath(options.geometryIndexFile ?? 'INDEX-v2.json'),
    ),
    options.geometryRoot,
  );
  const base = loadSelection(selectionRaw, options.selectionSha256, {
    raw: approvalRaw,
    expectedSha256: options.approvalSha256,
  });
  const context = bindGeometryIndex(
    base,
    indexRaw,
    options.geometryIndexSha256,
  );
  const output = resolve(options.outputRoot);
  // mkdir is exclusive, so no existing production store/output can be reused.
  await mkdir(output);
  await mkdir(join(output, 'adapted'));
  const store = join(output, 'simulation-journal');
  await createDryRunStore(store);
  const save = async (name: string, value: unknown) => {
    const file = await open(join(output, safeRelativePath(name)), 'wx', 0o600);
    try {
      await file.writeFile(serializeGenesis(value));
      await file.sync();
    } finally {
      await file.close();
    }
  };
  const compositions: AdaptedComposition[] = [],
    artifacts: VerifiedArtifact[] = [];
  const results: {
    id: string;
    result: string;
    effectiveMetadataSha256: string;
    roundTrip: boolean;
  }[] = [];
  const failures: ReturnType<typeof asGenesisFailure>[] = [];
  for (const id of entryIds(context)) {
    try {
      requireGenesis(freemem() / 1048576 >= 2048, 'RAM_SAFETY');
      const entry = selectionEntry(context, id);
      const raw = await readText(
        join(
          options.task070Root,
          safeRelativePath(entry.preparedMetadataReference),
        ),
        options.task070Root,
      );
      const proof = await verifyArtifact(context, id, {
        sourceRoots: [options.sourceRoot],
        geometryRoot: options.geometryRoot,
      });
      const composition = adaptMetadata(context, id, raw, proof);
      const restored = restoreTask070(composition, context);
      requireGenesis(
        restored.sourceMetadataJson === raw &&
          serializeGenesis(restored.entry) === serializeGenesis(entry),
        'LOSSLESS_ROUND_TRIP',
        id,
      );
      const replay = adaptMetadata(
        context,
        id,
        restored.sourceMetadataJson,
        proof,
      );
      requireGenesis(
        serializeGenesis(composition) === serializeGenesis(replay),
        'ADAPTER_REPLAY',
        id,
      );
      await save('adapted/' + id + '.json', composition);
      compositions.push(composition);
      artifacts.push(proof);
      results.push({
        id,
        result: 'PASS',
        effectiveMetadataSha256: composition.effectiveMetadataSha256,
        roundTrip: true,
      });
      if (results.length % 25 === 0)
        console.log(
          'VERIFIED_METADATA',
          results.length,
          'AVAILABLE_MIB',
          Math.round(freemem() / 1048576),
        );
    } catch (error) {
      failures.push(asGenesisFailure(error));
      await save('validation-failure.json', {
        results,
        failures,
        productionRegistrations: 0,
      });
      throw error; // Source or lossless integrity failure is never bypassed.
    }
  }
  requireGenesis(
    results.length === 720 && failures.length === 0,
    'INCOMPLETE_COLLECTION',
  );
  // Re-read the approved bytes before committing any readiness snapshots.
  for (const id of entryIds(context)) {
    const e = selectionEntry(context, id);
    await verifyGenesisFile(e.nativePngLocation, e.pngSha256, [
      options.sourceRoot,
    ]);
  }
  requireGenesis(
    bytesHash(
      await readText(
        join(options.task070Root, 'TASK070_EXACT_ACCEPTANCE_MANIFEST_v2.json'),
        options.task070Root,
      ),
    ) === options.selectionSha256 &&
      bytesHash(
        await readText(
          join(options.task070Root, 'TASK070_OWNER_APPROVAL_SCOPE.json'),
          options.task070Root,
        ),
      ) === options.approvalSha256,
    'APPROVAL_CHANGED_DURING_RUN',
  );
  const development = compositions.map((v) => developmentRecord(v, context));
  let commit = await appendDryRunSnapshot(
    store,
    registrySnapshot(development, context, true),
    context,
    null,
  );
  const accepted = development.map((r) =>
    transitionRecord(r, 'OWNER_ACCEPTED', context),
  );
  commit = await appendDryRunSnapshot(
    store,
    registrySnapshot(accepted, context, true),
    context,
    commit.head,
  );
  const validated = accepted.map((r, i) =>
    transitionRecord(r, 'VALIDATED_FOR_REGISTRATION', context, {
      artifact: artifacts[i]!,
    }),
  );
  const snapshot = registrySnapshot(validated, context, true);
  commit = await appendDryRunSnapshot(store, snapshot, context, commit.head);
  const retry = await appendDryRunSnapshot(store, snapshot, context, null);
  requireGenesis(
    retry.idempotent && retry.head.digest === commit.head!.digest,
    'IDEMPOTENT_RETRY',
  );
  const rollback = registrySnapshot(
    validated.map((r) =>
      transitionRecord(r, 'REVOKED_PREDEPLOYMENT', context, {
        deploymentState: 'UNDEPLOYED',
      }),
    ),
    context,
    true,
  );
  const after = await readDryRunStore(store, context);
  requireGenesis(
    after.head?.digest === commit.head!.digest,
    'ROLLBACK_CHANGED_READINESS_STORE',
  );
  await save('dry-run-manifest.json', snapshot);
  const report = {
    schemaVersion: 'lammb-genesis-readiness-report/1',
    selectionSha256: context.selectionSha256,
    approvalSha256: context.approvalSha256,
    geometryIndexSha256: options.geometryIndexSha256,
    discovered: 720,
    validated: results.length,
    failures,
    counts: { ordinary: 690, ultimate: 24, grails: 6 },
    stateCounts: {
      DEVELOPMENT: 0,
      OWNER_ACCEPTED: 0,
      VALIDATED_FOR_REGISTRATION: 720,
      REGISTERED: 0,
    },
    productionRegistrations: 0,
    executionAuthorizationProvided: false,
    deterministicAdapterReplay: 720,
    exactSourceMetadataRoundTrips: 720,
    identicalRetryCreatedNoGeneration: retry.idempotent,
    rollbackSimulation: {
      count: rollback.records.length,
      target: 'REVOKED_PREDEPLOYMENT',
      digest: genesisDigest(rollback),
      productionStateMutated: false,
    },
    journalHead: after.head,
    dryRunManifestSha256: genesisDigest(snapshot),
    registeredStateNeverEntered: validated.every(
      (r) =>
        r.registeredAt === null &&
        !r.history.some((h) => h.to === 'REGISTERED'),
    ),
    ownerScope:
      'PRESERVED_TASK070_COLLECTION_LEVEL_AUTHORIZATION_NO_INVENTED_INDIVIDUAL_EVENTS',
    results,
  };
  await save('validation-report.json', report);
  console.log(
    JSON.stringify({
      validated: 720,
      productionRegistrations: 0,
      dryRunManifestSha256: report.dryRunManifestSha256,
    }),
  );
  return report;
}
if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href
) {
  const { values } = parseArgs({
    options: {
      'task070-root': { type: 'string' },
      'selection-sha256': { type: 'string' },
      'approval-sha256': { type: 'string' },
      'geometry-root': { type: 'string' },
      'geometry-index-sha256': { type: 'string' },
      'source-root': { type: 'string' },
      'output-root': { type: 'string' },
    },
    strict: true,
  });
  for (const value of Object.values(values))
    requireGenesis(
      typeof value === 'string' && value.length > 0,
      'CLI_REQUIRED_ARGUMENT',
    );
  requireGenesis(Object.keys(values).length === 7, 'CLI_REQUIRED_ARGUMENT');
  await runGenesisReadiness({
    task070Root: values['task070-root']!,
    selectionSha256: values['selection-sha256']!,
    approvalSha256: values['approval-sha256']!,
    geometryRoot: values['geometry-root']!,
    geometryIndexSha256: values['geometry-index-sha256']!,
    sourceRoot: values['source-root']!,
    outputRoot: values['output-root']!,
  }).catch((error: unknown) => {
    console.error(JSON.stringify(asGenesisFailure(error)));
    process.exitCode = 1;
  });
}
