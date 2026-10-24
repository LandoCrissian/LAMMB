import { constants } from 'node:fs';
import { lstat, open, realpath } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { dirname, isAbsolute, join, relative, resolve } from 'node:path';
import sharp from 'sharp';
import { z } from 'zod';
import { inspectPng } from './png-ingestion.ts';
import {
  GenesisError,
  bytesHash,
  genesisDigest,
  serializeGenesis,
  parseGenesisJson,
  parseSchema,
  requireGenesis,
  genesisMetadataSchema,
  selectionEntry,
  geometryFile,
  validateGeometry,
  imageCid,
  task070EntrySchema,
  compositionIdSchema,
} from './genesis-model.ts';
import type { SelectionContext, Task070Entry } from './genesis-model.ts';

const contained = (root: string, path: string) => {
  const r = relative(root, path);
  return (
    r !== '' &&
    !isAbsolute(r) &&
    r !== '..' &&
    !r.startsWith('..\\') &&
    !r.startsWith('../')
  );
};
export function safeRelativePath(value: string) {
  requireGenesis(
    value.length > 0 &&
      !/[\\:\u0000]/.test(value) &&
      !isAbsolute(value) &&
      value.split('/').every((p) => p !== '' && p !== '.' && p !== '..'),
    'RELATIVE_PATH',
  );
  return value;
}
async function guardedFile(
  path: string,
  roots: readonly string[],
  limit: number,
) {
  const target = resolve(path);
  const root = roots.map((r) => resolve(r)).find((r) => contained(r, target));
  requireGenesis(root, 'FILE_OUTSIDE_TRUSTED_ROOT');
  const rootStat = await lstat(root);
  requireGenesis(
    rootStat.isDirectory() && !rootStat.isSymbolicLink(),
    'FILE_ROOT_LINK',
  );
  const realRoot = await realpath(root);
  let current = root;
  for (const part of relative(root, target).split(/[\\/]/)) {
    current = join(current, part);
    const s = await lstat(current);
    requireGenesis(
      !s.isSymbolicLink() && contained(realRoot, await realpath(current)),
      'FILE_LINK',
    );
  }
  const before = await lstat(target);
  requireGenesis(
    before.isFile() && before.size > 0 && before.size <= limit,
    'FILE_BUDGET',
  );
  const file = await open(
    target,
    constants.O_RDONLY | (constants.O_NOFOLLOW ?? 0),
  );
  try {
    const opened = await file.stat();
    requireGenesis(
      opened.isFile() &&
        opened.ino === before.ino &&
        opened.dev === before.dev &&
        opened.size === before.size &&
        opened.mtimeMs === before.mtimeMs,
      'FILE_CHANGED',
    );
    return { file, target, opened };
  } catch (e) {
    await file.close();
    throw e;
  }
}
export async function readGenesisFile(
  path: string,
  roots: readonly string[],
  limit: number,
) {
  const { file, opened, target } = await guardedFile(path, roots, limit);
  try {
    const bytes = Buffer.alloc(opened.size);
    let offset = 0;
    while (offset < bytes.length) {
      const result = await file.read(
        bytes,
        offset,
        bytes.length - offset,
        offset,
      );
      requireGenesis(result.bytesRead > 0, 'FILE_TRUNCATED');
      offset += result.bytesRead;
    }
    const after = await file.stat(),
      named = await lstat(target);
    requireGenesis(
      after.size === opened.size &&
        after.mtimeMs === opened.mtimeMs &&
        after.ino === named.ino &&
        after.dev === named.dev &&
        !named.isSymbolicLink(),
      'FILE_CHANGED',
    );
    return bytes;
  } finally {
    await file.close();
  }
}
export async function verifyGenesisFile(
  path: string,
  expected: string,
  roots: readonly string[],
) {
  const { file, opened, target } = await guardedFile(
    path,
    roots,
    64 * 1024 * 1024,
  );
  try {
    const hash = createHash('sha256'),
      block = Buffer.alloc(65536);
    let offset = 0;
    while (offset < opened.size) {
      const r = await file.read(
        block,
        0,
        Math.min(block.length, opened.size - offset),
        offset,
      );
      requireGenesis(r.bytesRead > 0, 'FILE_TRUNCATED');
      hash.update(block.subarray(0, r.bytesRead));
      offset += r.bytesRead;
    }
    const after = await file.stat(),
      named = await lstat(target);
    requireGenesis(
      after.size === opened.size &&
        after.mtimeMs === opened.mtimeMs &&
        after.ino === named.ino &&
        after.dev === named.dev &&
        !named.isSymbolicLink(),
      'FILE_CHANGED',
    );
    requireGenesis(hash.digest('hex') === expected, 'SOURCE_FILE_DIGEST');
  } finally {
    await file.close();
  }
}
export interface VerifiedArtifact {
  readonly id: string;
  readonly selectionSha256: string;
  readonly pngSha256: string;
  readonly pixelSha256: string;
  readonly geometrySha256: string;
  readonly gridSha256: string;
  readonly sourceBindingsSha256: string;
}
const proofs = new WeakMap<VerifiedArtifact, number>();
export async function verifyArtifact(
  c: SelectionContext,
  id: string,
  options: { sourceRoots: readonly string[]; geometryRoot: string },
): Promise<VerifiedArtifact> {
  try {
    return await verifyArtifactUnchecked(c, id, options);
  } catch (e) {
    if (e instanceof GenesisError) throw new GenesisError(e.code, id, e.field);
    throw new GenesisError(
      'ARTIFACT_IO',
      id,
      (e as NodeJS.ErrnoException).code ?? null,
    );
  }
}
async function verifyArtifactUnchecked(
  c: SelectionContext,
  id: string,
  options: { sourceRoots: readonly string[]; geometryRoot: string },
): Promise<VerifiedArtifact> {
  const e = selectionEntry(c, id),
    descriptor = geometryFile(c, id);
  const geometryRaw = (
    await readGenesisFile(
      join(options.geometryRoot, safeRelativePath(descriptor.path)),
      [options.geometryRoot],
      2 * 1024 * 1024,
    )
  ).toString('utf8');
  const geometry = validateGeometry(c, id, geometryRaw);
  for (const f of geometry.sourceBindings)
    await verifyGenesisFile(f.path, f.sha256, options.sourceRoots);
  const extra: { path: string; sha256: string }[] = [
    {
      path: e.effectiveHistoricalMetadataReference.split('#')[0]!,
      sha256: e.effectiveHistoricalMetadataSha256,
    },
  ];
  for (const s of [
    ...e.sourceReferences,
    ...e.recipeContainers,
    e.rendererVersion,
  ]) {
    const p = s.path ?? s.reference,
      h = s.sha256 ?? s.containerSha256;
    if (typeof p === 'string' && typeof h === 'string')
      extra.push({ path: p.split('#')[0]!, sha256: h });
  }
  for (const f of extra)
    await verifyGenesisFile(f.path, f.sha256, options.sourceRoots);
  const image = await readGenesisFile(
    e.nativePngLocation,
    options.sourceRoots,
    4 * 1024 * 1024,
  );
  requireGenesis(bytesHash(image) === e.pngSha256, 'PNG_DIGEST', id);
  const header = inspectPng(image);
  requireGenesis(
    header.width === 1024 && header.height === 1024 && header.channels === 3,
    'PNG_LAYOUT',
    id,
  );
  const decoded = await sharp(image, {
    failOn: 'warning',
    limitInputPixels: 1024 * 1024,
    sequentialRead: true,
    unlimited: false,
  })
    .raw()
    .toBuffer({ resolveWithObject: true });
  requireGenesis(
    decoded.info.channels === 3 && bytesHash(decoded.data) === e.pixelSha256,
    'PIXEL_DIGEST',
    id,
  );
  const proof = Object.freeze({
    id,
    selectionSha256: c.selectionSha256,
    pngSha256: e.pngSha256,
    pixelSha256: e.pixelSha256,
    geometrySha256: descriptor.sha256,
    gridSha256: geometry.gridSha256,
    sourceBindingsSha256: genesisDigest(geometry.sourceBindings),
  });
  proofs.set(proof, Date.now());
  return proof;
}
export interface AdaptedComposition {
  schemaVersion: 'lammb-genesis-composition/1';
  compositionId: string;
  classification: Task070Entry['classification'];
  pngSha256: string;
  pixelSha256: string;
  sourceMetadataSha256: string;
  effectiveMetadataSha256: string;
  provenance: {
    selectionSha256: string;
    historicalMetadataReference: string;
    historicalMetadataSha256: string;
    recipe: Task070Entry['effectiveRecipe'];
    rendererVersion: Task070Entry['rendererVersion'];
    recovery: Task070Entry['recoveryArchiveReference'];
  };
  metadata: ReturnType<typeof genesisMetadataSchema.parse>;
  verification: VerifiedArtifact;
  extensions: { task070: { entry: Task070Entry; sourceMetadataJson: string } };
}
export function adaptMetadata(
  c: SelectionContext,
  id: string,
  sourceMetadataJson: string,
  proof: VerifiedArtifact,
): AdaptedComposition {
  requireGenesis(
    Buffer.byteLength(sourceMetadataJson) <= 256 * 1024,
    'METADATA_BYTES',
    id,
  );
  const e = selectionEntry(c, id);
  requireGenesis(
    proofs.has(proof) &&
      proof.id === id &&
      proof.selectionSha256 === c.selectionSha256 &&
      proof.pngSha256 === e.pngSha256 &&
      proof.pixelSha256 === e.pixelSha256,
    'ARTIFACT_PROOF',
    id,
  );
  const metadata = parseSchema(
    genesisMetadataSchema,
    parseGenesisJson(sourceMetadataJson),
    'METADATA_SCHEMA',
    id,
  );
  requireGenesis(
    new Set(metadata.attributes.map((a) => a.trait_type)).size ===
      metadata.attributes.length,
    'DUPLICATE_TRAIT_LABEL',
    id,
  );
  requireGenesis(
    bytesHash(sourceMetadataJson) === e.preparedMetadataSha256,
    'METADATA_SOURCE_DIGEST',
    id,
  );
  requireGenesis(
    metadata.image === 'ipfs://' + imageCid(e.pngSha256),
    'METADATA_IMAGE_BINDING',
    id,
  );
  // The frozen digest binds every value, label, image URI, name and description.
  // Parsing is never used to coerce one trait or classification into another.
  const record: AdaptedComposition = {
    schemaVersion: 'lammb-genesis-composition/1',
    compositionId: id,
    classification: e.classification,
    pngSha256: e.pngSha256,
    pixelSha256: e.pixelSha256,
    sourceMetadataSha256: e.preparedMetadataSha256,
    effectiveMetadataSha256: genesisDigest(metadata),
    provenance: {
      selectionSha256: c.selectionSha256,
      historicalMetadataReference: e.effectiveHistoricalMetadataReference,
      historicalMetadataSha256: e.effectiveHistoricalMetadataSha256,
      recipe: e.effectiveRecipe,
      rendererVersion: e.rendererVersion,
      recovery: e.recoveryArchiveReference,
    },
    metadata,
    verification: proof,
    extensions: { task070: { entry: e, sourceMetadataJson } },
  };
  serializeGenesis(record);
  return record;
}
export function restoreTask070(
  record: AdaptedComposition,
  c: SelectionContext,
) {
  requireGenesis(
    record.schemaVersion === 'lammb-genesis-composition/1',
    'ADAPTER_VERSION',
    record.compositionId,
  );
  const e = selectionEntry(c, record.compositionId);
  requireGenesis(
    genesisDigest(record.extensions.task070.entry) === genesisDigest(e) &&
      bytesHash(record.extensions.task070.sourceMetadataJson) ===
        e.preparedMetadataSha256 &&
      record.pngSha256 === e.pngSha256 &&
      record.pixelSha256 === e.pixelSha256 &&
      record.classification === e.classification &&
      genesisDigest(record.metadata) === record.effectiveMetadataSha256 &&
      genesisDigest(
        parseGenesisJson(record.extensions.task070.sourceMetadataJson),
      ) === record.effectiveMetadataSha256,
    'ROUND_TRIP_BINDING',
    record.compositionId,
  );
  return {
    entry: JSON.parse(serializeGenesis(e)) as Task070Entry,
    sourceMetadataJson: record.extensions.task070.sourceMetadataJson,
  };
}
export function validateAdapted(
  record: AdaptedComposition,
  c: SelectionContext,
) {
  const sha = z.string().regex(/^[0-9a-f]{64}$/);
  const object = z.record(z.string(), z.json());
  parseSchema(
    z.strictObject({
      schemaVersion: z.literal('lammb-genesis-composition/1'),
      compositionId: compositionIdSchema,
      classification: task070EntrySchema.shape.classification,
      pngSha256: sha,
      pixelSha256: sha,
      sourceMetadataSha256: sha,
      effectiveMetadataSha256: sha,
      provenance: z.strictObject({
        selectionSha256: sha,
        historicalMetadataReference: z.string().min(1),
        historicalMetadataSha256: sha,
        recipe: object,
        rendererVersion: object,
        recovery: object,
      }),
      metadata: genesisMetadataSchema,
      verification: z.strictObject({
        id: compositionIdSchema,
        selectionSha256: sha,
        pngSha256: sha,
        pixelSha256: sha,
        geometrySha256: sha,
        gridSha256: sha,
        sourceBindingsSha256: sha,
      }),
      extensions: z.strictObject({
        task070: z.strictObject({
          entry: task070EntrySchema,
          sourceMetadataJson: z.string().min(1),
        }),
      }),
    }),
    record,
    'ADAPTER_SCHEMA',
    record.compositionId,
  );
  const restored = restoreTask070(record, c);
  requireGenesis(
    genesisDigest(record.provenance) ===
      genesisDigest({
        selectionSha256: c.selectionSha256,
        historicalMetadataReference:
          restored.entry.effectiveHistoricalMetadataReference,
        historicalMetadataSha256:
          restored.entry.effectiveHistoricalMetadataSha256,
        recipe: restored.entry.effectiveRecipe,
        rendererVersion: restored.entry.rendererVersion,
        recovery: restored.entry.recoveryArchiveReference,
      }),
    'PROVENANCE_BINDING',
    record.compositionId,
  );
  requireGenesis(
    Object.keys(record).sort().join('|') ===
      [
        'schemaVersion',
        'compositionId',
        'classification',
        'pngSha256',
        'pixelSha256',
        'sourceMetadataSha256',
        'effectiveMetadataSha256',
        'provenance',
        'metadata',
        'verification',
        'extensions',
      ]
        .sort()
        .join('|') &&
      Object.keys(record.extensions).join('|') === 'task070' &&
      Object.keys(record.extensions.task070).sort().join('|') ===
        'entry|sourceMetadataJson',
    'ADAPTER_UNKNOWN_FIELD',
    record.compositionId,
  );
  requireGenesis(
    record.sourceMetadataSha256 === restored.entry.preparedMetadataSha256 &&
      record.verification.id === record.compositionId &&
      record.verification.selectionSha256 === c.selectionSha256 &&
      record.verification.pngSha256 === record.pngSha256 &&
      record.verification.pixelSha256 === record.pixelSha256 &&
      record.verification.geometrySha256 ===
        geometryFile(c, record.compositionId).sha256 &&
      record.verification.gridSha256 ===
        geometryFile(c, record.compositionId).gridSha256 &&
      record.verification.sourceBindingsSha256 ===
        geometryFile(c, record.compositionId).sourceBindingsSha256,
    'VERIFICATION_BINDING',
    record.compositionId,
  );
  return true;
}
export function artifactSourceDirectory(path: string) {
  return dirname(resolve(path));
}
export function requireCurrentArtifact(
  proof: VerifiedArtifact,
  record: AdaptedComposition,
  maximumAgeMs = Infinity,
) {
  requireGenesis(
    proofs.has(proof) &&
      Date.now() - proofs.get(proof)! <= maximumAgeMs &&
      genesisDigest(proof) === genesisDigest(record.verification),
    'CURRENT_ARTIFACT_PROOF',
    record.compositionId,
  );
}
export function asGenesisFailure(error: unknown) {
  return error instanceof GenesisError
    ? { code: error.code, id: error.compositionId, field: error.field }
    : { code: 'UNEXPECTED_LOCAL_IO', id: null, field: null };
}
