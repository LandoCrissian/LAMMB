import { z } from 'zod';
import {
  canonicalJson,
  canonicalSha256,
  sha256Bytes,
} from '../src/canonical.ts';
import { pngProofBudget, requireProof } from '../src/png-ingestion.ts';
import { productionSpecSchema } from '../src/production-spec.ts';
import { identifierSchema, sha256Schema } from '../src/schema.ts';
import {
  recipeReviewSchema,
  reconcileRecipeAcceptance,
} from './recipe-acceptance.ts';
import { openSeaMetadataSchema } from '../src/opensea-metadata.ts';
import { pngProofSchema } from '../src/png-proof-schema.ts';

const text = z.string().trim().min(1).max(2400);
const roiSchema = z.strictObject({
  x: z.number().int().nonnegative(),
  y: z.number().int().nonnegative(),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
});
const regionSchema = z.strictObject({
  id: identifierSchema,
  role: z.enum(['IRIS_LOWER_CRESCENT_PROXY', 'OBSERVED_BACKGROUND_PROXY']),
  roi: roiSchema,
  pixelSha256: sha256Schema,
  scope: z.literal('MANUALLY_OBSERVED_PROXY_NOT_SEGMENTATION_OR_ALBEDO'),
});

// Four current-source evidence receipts only. These explicitly unresolved
// observations cannot be silently converted to new/verified trait bindings.
// A future resolved receipt requires a separately reviewed schema/spec decision.
export const traitBindingSchema = z.strictObject({
  schemaVersion: z.literal('lammb-source-trait-evidence/1.0.0'),
  purpose: z.literal('DEVELOPMENT_ONLY'),
  proofId: identifierSchema,
  sourceSha256: sha256Schema,
  decodedSourcePixelSha256: sha256Schema,
  outputSha256: sha256Schema,
  specSha256: sha256Schema,
  requestSha256: sha256Schema,
  reviewSha256: sha256Schema,
  ownerArtApproval: z.literal('APPROVED_ART_DIRECTION'),
  productionRegistered: z.literal(false),
  promotionGate: z.literal(
    'SEPARATE_EXPLICIT_OWNER_PRODUCTION_APPROVAL_REQUIRED',
  ),
  provenance: z
    .array(z.strictObject({ path: text, sha256: sha256Schema }))
    .min(1)
    .max(16),
  eyes: z.strictObject({
    status: z.literal('EYE_BINDING_UNRESOLVED'),
    bindingTraitId: z.null(),
    visibleEyeCount: z.literal(2),
    appearance: text,
    structure: text,
    comparedTraitDefinitions: z
      .array(
        z.strictObject({
          traitId: identifierSchema,
          definitionSha256: sha256Schema,
        }),
      )
      .length(8),
    regions: z.array(regionSchema).length(2),
    resolutionRequired: text,
  }),
  background: z.strictObject({
    status: z.literal('BACKGROUND_BINDING_UNRESOLVED'),
    bindingTraitId: z.null(),
    appearance: text,
    integratedAuthoredFrame: z.literal(true),
    interchangeable: z.literal(false),
    comparedTraitDefinitions: z
      .array(
        z.strictObject({
          traitId: identifierSchema,
          definitionSha256: sha256Schema,
        }),
      )
      .length(6),
    regions: z.array(regionSchema).min(2).max(8),
    resolutionRequired: text,
  }),
  pose: z.strictObject({
    registrationFamily: z.enum(['FRONT', 'ORIGINAL_THREE_QUARTER']),
    publicAttribute: z.literal('OMITTED_NO_EXISTING_POSE_TRAIT'),
  }),
});

export function measureNativeRegion(
  raw: Uint8Array,
  width: number,
  height: number,
  regionInput: unknown,
) {
  const roi = roiSchema.parse(regionInput);
  requireProof(
    Number.isSafeInteger(width) &&
      Number.isSafeInteger(height) &&
      width > 0 &&
      height > 0 &&
      width <= pngProofBudget.maxDimension &&
      height <= pngProofBudget.maxDimension &&
      raw.length === width * height * 3,
    'BINDING_RGB_LAYOUT',
  );
  requireProof(
    roi.x + roi.width <= width && roi.y + roi.height <= height,
    'BINDING_REGION_BOUNDS',
  );
  const pixels = Buffer.alloc(roi.width * roi.height * 3),
    min = [255, 255, 255],
    max = [0, 0, 0],
    sums = [0, 0, 0],
    colors = new Set<string>();
  let at = 0,
    exactCcff00Pixels = 0;
  for (let y = roi.y; y < roi.y + roi.height; y++)
    for (let x = roi.x; x < roi.x + roi.width; x++) {
      const p = (y * width + x) * 3,
        rgb = [raw[p]!, raw[p + 1]!, raw[p + 2]!];
      pixels.set(rgb, at);
      at += 3;
      colors.add(rgb.join(','));
      if (rgb[0] === 204 && rgb[1] === 255 && rgb[2] === 0) exactCcff00Pixels++;
      for (let c = 0; c < 3; c++) {
        min[c] = Math.min(min[c]!, rgb[c]!);
        max[c] = Math.max(max[c]!, rgb[c]!);
        sums[c] = sums[c]! + rgb[c]!;
      }
    }
  return {
    roi,
    pixelSha256: sha256Bytes(pixels),
    pixels: roi.width * roi.height,
    uniqueRgbColors: colors.size,
    minimumRgb: min,
    maximumRgb: max,
    meanRgbRounded: sums.map((n) => Math.round(n / (roi.width * roi.height))),
    exactCcff00Pixels,
  };
}

export function validateTraitBinding(
  evidenceInput: unknown,
  row: {
    id: string;
    request: unknown;
    review: unknown;
    reviewSha256: string;
    provenance: { path: string; sha256: string }[];
  },
  specInput: unknown,
  rawBase: Uint8Array,
  expectedEvidenceSha256: string,
) {
  requireProof(
    canonicalSha256(evidenceInput) ===
      sha256Schema.parse(expectedEvidenceSha256),
    'BINDING_EVIDENCE_SHA256',
  );
  const e = traitBindingSchema.parse(evidenceInput),
    spec = productionSpecSchema.parse(specInput);
  // Reuse the original parsed request through the review adapter; no alternative
  // source/registration is accepted by this evidence contract.
  const request = pngProofSchema.parse(row.request);
  requireProof(
    e.proofId === row.id &&
      e.sourceSha256 === request.base.sha256 &&
      e.outputSha256 === request.expectedOutputSha256 &&
      e.requestSha256 === canonicalSha256(row.request) &&
      e.reviewSha256 === row.reviewSha256 &&
      e.specSha256 === canonicalSha256(specInput),
    'BINDING_SOURCE_CONTEXT',
  );
  requireProof(
    e.decodedSourcePixelSha256 === sha256Bytes(rawBase),
    'BINDING_SOURCE_PIXELS',
  );
  requireProof(
    canonicalJson(e.provenance) ===
      canonicalJson(
        row.provenance.map((p) => ({ path: p.path, sha256: p.sha256 })),
      ),
    'BINDING_PROVENANCE',
  );
  requireProof(
    e.pose.registrationFamily === request.registration.poseFamily,
    'BINDING_POSE',
  );
  for (const [category, block, role] of [
    ['eyes', e.eyes, 'IRIS_LOWER_CRESCENT_PROXY'],
    ['environments', e.background, 'OBSERVED_BACKGROUND_PROXY'],
  ] as const) {
    const definitions = spec.traits
      .filter((t) => t.category === category)
      .map((t) => ({
        traitId: t.id,
        definitionSha256: canonicalSha256({
          id: t.id,
          definition: t.visualDefinition,
          metadata: t.metadata,
          approval: t.approval,
        }),
      }));
    requireProof(
      canonicalJson(definitions) ===
        canonicalJson(block.comparedTraitDefinitions),
      'BINDING_TRAIT_DEFINITIONS',
    );
    requireProof(
      new Set(block.regions.map((r) => r.id)).size === block.regions.length,
      'BINDING_DUPLICATE_REGION',
    );
    for (const region of block.regions) {
      requireProof(region.role === role, 'BINDING_REGION_ROLE');
      const measured = measureNativeRegion(
        rawBase,
        request.canvas.width,
        request.canvas.height,
        region.roi,
      );
      requireProof(
        measured.pixelSha256 === region.pixelSha256,
        'BINDING_REGION_PIXELS',
      );
    }
  }
  return e;
}

// Complete source-backed PNG reconstruction is established outside this pure
// metadata gate by the existing renderer. This receipt never grants promotion.
export function assessRegistrationReadiness(
  evidenceInput: unknown,
  row: Parameters<typeof validateTraitBinding>[1],
  specInput: unknown,
  rawBase: Uint8Array,
  output: Uint8Array,
  expectedEvidenceSha256: string,
) {
  const e = validateTraitBinding(
    evidenceInput,
    row,
    specInput,
    rawBase,
    expectedEvidenceSha256,
  );
  const reviewed = reconcileRecipeAcceptance(
    row.review,
    row.request,
    specInput,
    output,
    row.reviewSha256,
  );
  requireProof(
    reviewed.sourceArtApproval === 'APPROVED_ART_DIRECTION',
    'BINDING_ART_APPROVAL',
  );
  requireProof(
    reviewed.unresolved.length === 2 &&
      reviewed.unresolved.every((s) =>
        ['eyes', 'environments'].includes(s.category),
      ),
    'BINDING_UNRESOLVED_CONTEXT',
  );
  const spec = productionSpecSchema.parse(specInput),
    none = spec.traits.find((t) => t.id === 'lammb-pixel-corruption-none')!;
  // Existing Trait Bible explicitly encodes NONE as a meaningful clean state.
  // Stage30's historical five-facet metadata stays immutable; this new example
  // restores the existing semantic convention without pretending an effect exists.
  const metadata = openSeaMetadataSchema.parse({
    ...reviewed.metadata,
    name: 'LAMMB — Development Trait Evidence ' + e.proofId,
    attributes: [...reviewed.metadata.attributes, ...none.metadata],
  });
  requireProof(metadata.attributes.length === 6, 'BINDING_METADATA_FACETS');
  return {
    schemaVersion: 'lammb-development-registration-readiness/1.0.0',
    purpose: 'DEVELOPMENT_ONLY',
    id: e.proofId,
    status: 'BLOCKED_INCOMPLETE_METADATA',
    evidenceSha256: expectedEvidenceSha256,
    sourceHashes: reviewed.sourceHashes,
    outputSha256: reviewed.outputSha256,
    metadata,
    metadataSha256: canonicalSha256(metadata),
    supportedInternalTraitIds: reviewed.supportedTraitIds,
    traitVector: recipeReviewSchema.parse(row.review).slots.map((slot) => ({
      category: slot.category,
      state:
        slot.status === 'UNRESOLVED'
          ? 'UNRESOLVED'
          : slot.status === 'SUPPORTED_ABSENT'
            ? 'VERIFIED_ABSENT'
            : 'VERIFIED_PRESENT',
      traitId: slot.traitId,
      sourceSha256: e.sourceSha256,
      evidenceSha256: expectedEvidenceSha256,
    })),
    unresolved: ['eyes', 'environments'],
    pose: e.pose,
    completeMetadata: false,
    registrationCandidate: false,
    productionRegistered: false,
    promotionGate: e.promotionGate,
    publication: 'NOT_PUBLISHED_PLACEHOLDER_URI',
    tokenAssignment: null,
  };
}

export function requireUniqueRegistrationOutputs(
  records: { outputSha256: string }[],
) {
  requireProof(
    records.length > 0 && records.length <= 4,
    'BINDING_COHORT_SIZE',
  );
  requireProof(
    records.every((r) => sha256Schema.safeParse(r.outputSha256).success),
    'BINDING_OUTPUT_HASH',
  );
  requireProof(
    new Set(records.map((r) => r.outputSha256)).size === records.length,
    'BINDING_DUPLICATE_OUTPUT',
  );
}

// Import/export validation against the computed assessment, not a caller's
// unsupported COMPLETED flag. This preserves the owner gate even for malformed
// OpenSea-shaped JSON or metadata that sneaks in Eye/Background/Pose facets.
export function validateRegistrationExample(
  input: unknown,
  context: Parameters<typeof assessRegistrationReadiness>,
) {
  const expected = assessRegistrationReadiness(...context);
  requireProof(
    canonicalJson(input) === canonicalJson(expected),
    'BINDING_REGISTRATION_RECORD',
  );
  openSeaMetadataSchema.parse(expected.metadata);
  requireProof(
    !expected.productionRegistered &&
      !expected.registrationCandidate &&
      !expected.completeMetadata,
    'BINDING_PROMOTION',
  );
  return expected;
}
