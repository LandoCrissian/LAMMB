import { z } from 'zod';
import sharp from 'sharp';
import cohortInput from '../fixtures/stage34-authored-frames.json' with { type: 'json' };
import {
  canonicalJson,
  canonicalSha256,
  sha256Bytes,
} from '../src/canonical.ts';
import {
  decodeApprovedPng,
  pngProofBudget,
  pngSourceSchema,
  readProofEvidence,
  requireProof,
} from '../src/png-ingestion.ts';
import { productionSpecSchema } from '../src/production-spec.ts';
import { relativePathSchema, sha256Schema } from '../src/schema.ts';
import { openSeaMetadataSchema } from '../src/opensea-metadata.ts';
import { validateArtworkBacklog } from './artwork-backlog.ts';
import { resampleNativeForDevelopment } from './delivery-derivative.ts';

// Never expose shared mutable imported JSON as the trust anchor.
const fixture = structuredClone(cohortInput);

const evidence = z.strictObject({
  path: relativePathSchema,
  sha256: sha256Schema,
});
const category = z.enum([
  'base_anatomy',
  'wool',
  'eyes',
  'expressions',
  'clothing',
  'accessories',
  'pixel_corruption',
  'environments',
  'mutations',
]);
const rowSchema = z.strictObject({
  id: z.enum([
    'authored-amused',
    'authored-utility-vest',
    'authored-magma-hoodie',
    'authored-after-hours-observer',
  ]),
  label: z.string().min(1).max(160),
  backlogId: z.string().min(1),
  source: pngSourceSchema,
  ownerDecision: z.strictObject({
    id: z.string(),
    authority: z.literal('CURRENT_OWNER_DIRECTIVE'),
    decision: z.literal('ART_DIRECTION_APPROVED'),
    scope: z.literal('ART_DIRECTION_ONLY_NOT_PRODUCTION_REGISTRATION'),
    evidence: z.string(),
    date: z.iso.datetime(),
  }),
  provenance: z.array(evidence).min(2).max(8),
  referenceDependencies: z.array(evidence).min(1).max(8),
  poseFamily: z.string().min(1),
  recipeType: z.enum(['AUTHORED_FULL_FRAME', 'INTEGRATED_SPECIAL_MUTATION']),
  facets: z
    .array(
      z.strictObject({
        category,
        traitId: z.string().min(1),
        status: z.enum([
          'VERIFIED_PRESENT',
          'VERIFIED_ABSENT',
          'OWNER_SOURCE_BINDING_REQUIRED',
          'OWNER_DEFINITION_REQUIRED',
          'OWNER_FAMILY_COMPATIBILITY_REQUIRED',
        ]),
        evidence: z.string().min(1),
      }),
    )
    .length(9),
  eyeEvidenceRoi: z.strictObject({
    x: z.number().int().nonnegative(),
    y: z.number().int().nonnegative(),
    width: z.number().int().positive(),
    height: z.number().int().positive(),
  }),
  compatibility: z.array(z.string()).min(1),
  metadataStatus: z.literal('INCOMPLETE_OWNER_BINDINGS_REQUIRED'),
  productionRegistered: z.literal(false),
  generatorEnabled: z.literal(false),
});
export type AuthoredFrame = z.infer<typeof rowSchema>;

// Static reviewed cohort; callers cannot add arbitrary PNGs, reinterpret traits
// or forge approvals. These pins retain the existing 121 records and Trait Bible.
export function resolveAuthoredFrame(
  input: unknown,
  backlogInput: unknown,
  specInput: unknown,
) {
  const row = rowSchema.parse(input),
    expected = fixture.sources.find((s) => s.id === row.id);
  requireProof(
    expected && canonicalJson(row) === canonicalJson(expected),
    'AUTHORED_SOURCE_BINDING',
  );
  const spec = productionSpecSchema.parse(specInput);
  requireProof(
    canonicalSha256(spec) === fixture.specSha256,
    'AUTHORED_SPEC_BINDING',
  );
  const backlog = validateArtworkBacklog(
    backlogInput,
    spec,
    'f8a6f7e1d113258ad0df7a49795f013a41dd3fa195f65e03ed7279f02b392c6e',
  );
  requireProof(
    canonicalSha256(backlog) === fixture.backlogSha256,
    'AUTHORED_BACKLOG_BINDING',
  );
  const item = backlog.items.find((i) => i.id === row.backlogId),
    source = item?.sources.find((s) => s.role === 'GENERATED_NATIVE_STUDY');
  requireProof(
    item?.artisticApproval === 'ART_DIRECTION_APPROVED' &&
      item.productionRegistration === 'NOT_PRODUCTION_REGISTERED' &&
      source?.sha256 === row.source.sha256 &&
      source.path === row.source.path,
    'AUTHORED_ART_APPROVAL',
  );
  requireProof(
    canonicalJson(item.ownerDecisionHistory.at(-1)) ===
      canonicalJson(row.ownerDecision),
    'AUTHORED_OWNER_DECISION',
  );
  requireProof(
    new Set(row.facets.map((f) => f.category)).size === 9,
    'AUTHORED_FACET_CATEGORIES',
  );
  for (const ref of row.provenance)
    requireProof(
      backlog.evidence.some(
        (e) => e.path === ref.path && e.sha256 === ref.sha256,
      ),
      'AUTHORED_PROVENANCE_BINDING',
    );
  for (const ref of row.referenceDependencies)
    requireProof(
      item.sources.some((s) => s.path === ref.path && s.sha256 === ref.sha256),
      'AUTHORED_REFERENCE_BINDING',
    );
  requireProof(
    row.source.dimensions.width === 1254 &&
      row.source.dimensions.height === 1254 &&
      row.source.channels === 3,
    'AUTHORED_NATIVE_DIMENSIONS',
  );
  const roi = row.eyeEvidenceRoi;
  requireProof(
    roi.x + roi.width <= 1254 && roi.y + roi.height <= 1254,
    'AUTHORED_EVIDENCE_ROI',
  );
  return { row, spec };
}

export async function loadAuthoredFrame(
  root: string,
  input: unknown,
  backlog: unknown,
  spec: unknown,
) {
  const { row } = resolveAuthoredFrame(input, backlog, spec),
    data = new Map<string, Uint8Array>();
  for (const ref of [
    row.source,
    ...row.provenance,
    ...row.referenceDependencies,
  ]) {
    data.set(
      ref.path,
      await readProofEvidence(root, { path: ref.path, sha256: ref.sha256 }),
    );
  }
  return data;
}

export function createAuthoredMetadata(
  input: unknown,
  backlog: unknown,
  specInput: unknown,
  outputSha256: string,
) {
  const { row, spec } = resolveAuthoredFrame(input, backlog, specInput);
  sha256Schema.parse(outputSha256);
  const attributes: { trait_type: string; value: string | number }[] = [],
    proposed: { trait_type: string; value: string | number }[] = [];
  for (const facet of row.facets) {
    const trait = spec.traits.find((t) => t.id === facet.traitId);
    const extension = fixture.definitions.find((d) => d.id === facet.traitId);
    if (extension)
      requireProof(
        extension.sourceIds.includes(row.id) &&
          extension.state === 'OWNER_APPROVAL_PENDING' &&
          extension.selectionWeight === null &&
          extension.generatorEnabled === false,
        'AUTHORED_PROPOSAL_SCOPE',
      );
    requireProof(Boolean(trait || extension), 'AUTHORED_UNKNOWN_TRAIT');
    requireProof(
      trait?.category === facet.category ||
        extension?.category === facet.category,
      'AUTHORED_TRAIT_CATEGORY',
    );
    const parts = trait?.metadata ?? [
      {
        trait_type:
          facet.category === 'eyes'
            ? 'Eyes'
            : facet.category === 'environments'
              ? 'Background'
              : facet.category === 'wool'
                ? 'Wool'
                : 'Clothing',
        value: extension!.label,
      },
    ];
    proposed.push(...parts);
    if (
      facet.status === 'VERIFIED_PRESENT' ||
      facet.status === 'VERIFIED_ABSENT'
    )
      attributes.push(...parts);
  }
  const base = {
    name: 'LAMMB — ' + row.label,
    description:
      'Approved authored LAMMB character. Unpublished development metadata proposal; source-specific bindings require owner review. No token assignment or production registration.',
    image: 'https://artwork.invalid/lammb/authored/' + outputSha256 + '.png',
    external_url: 'https://lammb.fun' as const,
  };
  return {
    verifiedPartialMetadata: openSeaMetadataSchema.parse({
      ...base,
      attributes,
    }),
    proposedMetadata: openSeaMetadataSchema.parse({
      ...base,
      attributes: proposed,
    }),
    completeMetadata: false as const,
    unresolved: row.facets.filter((f) => f.status.startsWith('OWNER_')),
    ownerDefinitionApproval: 'PENDING' as const,
    generatorEnabled: false as const,
    productionRegistered: false as const,
  };
}

export async function renderAuthoredFrame(
  input: unknown,
  backlog: unknown,
  spec: unknown,
  inputs: ReadonlyMap<string, Uint8Array>,
) {
  const { row } = resolveAuthoredFrame(input, backlog, spec);
  let rasterBytes = 0;
  for (const ref of [
    row.source,
    ...row.provenance,
    ...row.referenceDependencies,
  ])
    requireProof(inputs.has(ref.path), 'AUTHORED_MISSING_PROVENANCE_OR_SOURCE');
  for (const ref of [
    row.source,
    ...row.provenance,
    ...row.referenceDependencies,
  ]) {
    const bytes = inputs.get(ref.path);
    requireProof(bytes, 'AUTHORED_MISSING_PROVENANCE_OR_SOURCE');
    requireProof(
      bytes.length <= pngProofBudget.maxSourceBytes,
      'AUTHORED_SOURCE_BUDGET',
    );
    requireProof(sha256Bytes(bytes) === ref.sha256, 'AUTHORED_SOURCE_SHA256');
  }
  for (const ref of [row.source, ...row.referenceDependencies])
    rasterBytes += inputs.get(ref.path)!.length;
  requireProof(
    rasterBytes <= pngProofBudget.maxTotalSourceBytes,
    'AUTHORED_RASTER_TOTAL_BUDGET',
  );
  const native = Buffer.from(inputs.get(row.source.path)!);
  const start = performance.now(),
    decoded = await decodeApprovedPng(native, row.source),
    decodeMs = performance.now() - start;
  const t = performance.now(),
    delivery = await resampleNativeForDevelopment(native),
    renderMs = performance.now() - t;
  requireProof(
    sha256Bytes(native) === row.source.sha256,
    'AUTHORED_NATIVE_MUTATED',
  );
  const deliverySha256 = sha256Bytes(delivery.output);
  return {
    native,
    delivery: delivery.output,
    receipt: {
      schemaVersion: 'lammb-authored-frame-delivery/1.0.0',
      purpose: 'DEVELOPMENT_ONLY',
      id: row.id,
      requestSha256: canonicalSha256(row),
      backlogSha256: fixture.backlogSha256,
      specSha256: fixture.specSha256,
      recipeType: row.recipeType,
      poseFamily: row.poseFamily,
      sourceSha256: row.source.sha256,
      nativeOutputSha256: sha256Bytes(native),
      nativeDecodedPixelSha256: sha256Bytes(decoded.bytes),
      nativeDimensions: { width: 1254, height: 1254 },
      deliveryDimensions: { width: 3072, height: 3072 },
      deliverySha256,
      deliveryDecodedPixelSha256: sha256Bytes(delivery.pixels),
      deliveryBytes: delivery.output.length,
      nativeMethod: 'EXACT_AUTHORED_PNG_PASSTHROUGH',
      nativePixelChanges: 0,
      contactLayersApplied: 0,
      deliveryMethod: 'NOHALO_EDGE_CLAMP_CPU_AFFINE',
      transformation: {
        scaleNumerator: 512,
        scaleDenominator: 209,
        offsetX: 0,
        offsetY: 0,
        supportRightBottomNativePixels: 4,
        intermediateDimension: 3082,
        outputWindow: { x: 0, y: 0, width: 3072, height: 3072 },
      },
      encoding: {
        format: 'PNG_RGB8',
        compressionLevel: 9,
        adaptiveFiltering: false,
        palette: false,
      },
      codecs: {
        sharp: sharp.versions.sharp!,
        vips: sharp.versions.vips!,
        png: sharp.versions.png!,
        'zlib-ng': sharp.versions['zlib-ng']!,
      },
      sourceApproval: row.ownerDecision,
      provenance: row.provenance,
      referenceDependencies: row.referenceDependencies,
      metadata: createAuthoredMetadata(row, backlog, spec, deliverySha256),
      nativeDetailCreated: false,
      productionRegistered: false,
      generatorEnabled: false,
      tokenAssignment: null,
      derivativeOwnerApproval: 'PENDING',
    },
    measurements: {
      decodeMs,
      renderMs,
      peakRssMiB: process.resourceUsage().maxRSS / 1024,
      cpuConcurrency: 1,
      methodGpuVramMiB: 0,
    },
  };
}
