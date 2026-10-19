import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { basename, join, resolve, sep } from 'node:path';
import sharp from 'sharp';
import {
  bindGeometryIndex,
  bytesHash,
  genesisDigest,
  imageCid,
  layerOrder,
  loadSelection,
  serializeGenesis,
} from '../packages/art-generator/src/genesis-model.ts';
import type { Task070Entry } from '../packages/art-generator/src/genesis-model.ts';
import {
  adaptMetadata,
  verifyArtifact,
} from '../packages/art-generator/src/genesis-adapter.ts';

// Synthetic protocol fixtures, never LAMMB artwork or collection-capacity proof.
export async function genesisFixture() {
  const root = await mkdtemp(join(tmpdir(), 'TASK071-test-'));
  const geometryRoot = join(root, 'geometry');
  await mkdir(geometryRoot);
  const png = await sharp({
    create: {
      width: 1024,
      height: 1024,
      channels: 3,
      background: { r: 1, g: 2, b: 3 },
    },
  })
    .png()
    .toBuffer();
  const raw = await sharp(png).raw().toBuffer(),
    pngHash = bytesHash(png),
    pixelHash = bytesHash(raw);
  const pngPath = join(root, 'fixture.png'),
    sourcePath = join(root, 'source.json');
  await writeFile(pngPath, png);
  const sourceJson = serializeGenesis({
    syntheticOnly: true,
    geometryVersion: 1,
  });
  await writeFile(sourcePath, sourceJson);
  const sourceHash = bytesHash(sourceJson);
  const metadata = {
    name: 'Fixture - T071-000',
    description: 'Exact Unicode: Å A\u030a\r\nNo normalization.',
    image: 'ipfs://' + imageCid(pngHash),
    external_url: 'https://lammb.fun',
    attributes: [{ trait_type: 'Species', value: 'LAMMB Sheep' }],
  };
  const metadataRaw = JSON.stringify(metadata, null, 2) + '\n';
  const entries: Task070Entry[] = Array.from({ length: 720 }, (_, i) => {
    const id = 'T071-' + String(i).padStart(3, '0');
    const pngSha256 = i === 0 ? pngHash : bytesHash('synthetic PNG ' + i);
    const pixelSha256 =
      i === 0 ? pixelHash : bytesHash('synthetic pixels ' + i);
    return {
      stableCompositionId: id,
      stableLineageId: id,
      classification: i < 690 ? 'ORDINARY' : i < 714 ? 'ULTIMATE' : 'GRAIL',
      characterLineage: id,
      characterFamily: null,
      sourceFace: null,
      nativePngLocation: pngPath,
      pngSha256,
      pixelSha256,
      effectiveRecipe: { path: sourcePath, sha256: sourceHash },
      recipeContainers: [],
      sourceReferences: [],
      rendererVersion: {
        path: sourcePath,
        sha256: sourceHash,
        preservedLegacyExtension: { value: 0.125, label: 'A\u030a' },
      },
      effectiveHistoricalMetadataReference: sourcePath,
      effectiveHistoricalMetadataSha256: sourceHash,
      preparedMetadataReference: 'fixture-metadata.json',
      preparedMetadataSha256: bytesHash(metadataRaw),
      ownerApprovalScope:
        'COLLECTION_LEVEL_TASK070_CURRENT_720_SELECTION_HASH_RECONCILED',
      exactOwnerDecision: null,
      exactOwnerDecisionTimestamp: null,
      ownerAcceptanceState:
        'EXACT_SELECTION_COVERED_BY_CURRENT_COLLECTION_LEVEL_OWNER_AUTHORIZATION',
      artisticReviewStatus: 'RECOMMEND_ACCEPT',
      similarityReviewStatus: 'Synthetic test only',
      recoveryArchiveReference: {
        reviewedCompositionId: id,
        pngSha256,
        pixelSha256,
        syntheticOnly: true,
        references: [
          {
            driveId: 'SYNTHETIC_ARCHIVE_ONLY',
            archiveSha256: bytesHash('synthetic recovery archive'),
            member: 'fixture.png',
          },
        ],
      },
      pfpReferences: [{}, {}, {}, {}],
      productionRegistered: false,
      finalTokenId: null,
      rarityWeight: null,
      acceptedImageHash: pngSha256,
    };
  });
  const manifest = {
    schemaVersion: 'lammb-task070-exact-selection-acceptance/2.0',
    purpose:
      'HASH_BOUND_COLLECTION_SELECTION_ACCEPTANCE_NOT_EXECUTED_PRODUCTION_REGISTRY',
    sourceTask069DeliverySha256: bytesHash('synthetic delivery'),
    sourceTask069IndexSha256: bytesHash('synthetic index'),
    counts: { ordinary: 690, ultimate: 24, grails: 6, total: 720 },
    productionRegistrations: 0,
    tokenIdsAssigned: false,
    entries,
    supersedesPendingCandidateManifestSha256: bytesHash('synthetic parent'),
    approvalBasis:
      'Synthetic unit test authority; never an owner approval for real artwork',
  };
  const manifestRaw = JSON.stringify(manifest);
  const approval = {
    exactSelectionManifestSha256: bytesHash(manifestRaw),
    exactSelectionCoveredCount: 720,
    effectiveScope:
      'COLLECTION_LEVEL_TASK070_CURRENT_720_SELECTION_HASH_RECONCILED',
  };
  const approvalRaw = JSON.stringify(approval);
  const base = loadSelection(manifestRaw, bytesHash(manifestRaw), {
    raw: approvalRaw,
    expectedSha256: bytesHash(approvalRaw),
  });
  const layers = {
    background: [],
    clothing: [
      [100, 1],
      [164, 1],
    ],
    skin: [[100, 1]],
    wool: [[102, 1]],
    eyes: [[101, 1]],
    expression: [],
    headwear: [],
    jewelry: [],
    effects: [],
  };
  const grid = Array.from({ length: 64 }, () => Array<string>(64).fill('off'));
  for (const address of [100, 101, 102, 164])
    grid[Math.floor(address / 64)]![address % 64] = 'on';
  const geometry = {
    schemaVersion: 1,
    id: entries[0]!.stableCompositionId,
    selectionSha256: base.selectionSha256,
    pngSha256: pngHash,
    pixelSha256: pixelHash,
    sourceBindings: [{ path: sourcePath, sha256: sourceHash }],
    grid: [64, 64],
    layerOrder: [...layerOrder],
    paintNames: ['off', 'on'],
    palette: [null, [0, 255, 0]],
    layers,
    gridSha256: genesisDigest(grid),
    contactCount: 1,
    derivation: 'EXACT_EDITABLE_FRAME',
  };
  const geometryRaw = JSON.stringify(geometry);
  await writeFile(join(geometryRoot, 'fixture.json'), geometryRaw);
  const index = {
    schemaVersion: 2,
    selectionSha256: base.selectionSha256,
    files: entries.map((e) => ({
      id: e.stableCompositionId,
      path: 'fixture.json',
      sha256: bytesHash(geometryRaw),
      gridSha256: geometry.gridSha256,
      sourceBindingsSha256: genesisDigest(geometry.sourceBindings),
    })),
  };
  const indexRaw = JSON.stringify(index),
    context = bindGeometryIndex(base, indexRaw, bytesHash(indexRaw));
  const proof = await verifyArtifact(context, entries[0]!.stableCompositionId, {
    sourceRoots: [root],
    geometryRoot,
  });
  const composition = adaptMetadata(
    context,
    entries[0]!.stableCompositionId,
    metadataRaw,
    proof,
  );
  return {
    root,
    geometryRoot,
    png,
    pngPath,
    sourcePath,
    sourceJson,
    manifest,
    manifestRaw,
    approval,
    approvalRaw,
    base,
    context,
    metadata,
    metadataRaw,
    geometry,
    geometryRaw,
    index,
    proof,
    composition,
  };
}
export type GenesisFixture = Awaited<ReturnType<typeof genesisFixture>>;
export async function cleanupGenesisFixture(f: { root: string }) {
  const root = resolve(f.root);
  if (
    !root.startsWith(resolve(tmpdir()) + sep) ||
    !basename(root).startsWith('TASK071-test-')
  )
    throw new Error('REFUSE_TEST_CLEANUP_OUTSIDE_OWN_TEMP');
  await rm(root, { recursive: true, force: true });
}
