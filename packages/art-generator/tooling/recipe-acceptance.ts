import { z } from 'zod';
import { canonicalSha256, sha256Bytes } from '../src/canonical.ts';
import { pngProofSchema } from '../src/png-proof-schema.ts';
import { requireProof } from '../src/png-ingestion.ts';
import {
  productionSpecSchema,
  simulationInputs,
} from '../src/production-spec.ts';
import { evaluateComposition } from '../src/constraints.ts';
import { openSeaMetadataSchema } from '../src/opensea-metadata.ts';
import {
  identifierSchema,
  sha256Schema,
  traitCategorySchema,
} from '../src/schema.ts';

const text = z.string().trim().min(1).max(2400);
export const recipeReviewSchema = z.strictObject({
  schemaVersion: z.literal('lammb-development-recipe-review/1.0.0'),
  purpose: z.literal('DEVELOPMENT_ONLY'),
  id: identifierSchema,
  sourceMode: z.literal('PROVEN_DETERMINISTIC_CONTACT'),
  authority: z.literal('TECHNICAL_SOURCE_REVIEW_NOT_OWNER_PRODUCTION_APPROVAL'),
  productionRegistered: z.literal(false),
  requestSha256: sha256Schema,
  specSha256: sha256Schema,
  sourceFamily: z.strictObject({
    pose: z.enum(['FRONT', 'ORIGINAL_THREE_QUARTER']),
    anatomy: z.literal('SHEEP'),
    woolTraitId: identifierSchema,
    clothing: z.literal('BLACK_HOODIE'),
    accessory: z.literal('EAR_TAG_5280'),
    mutation: z.literal('NONE'),
  }),
  slots: z
    .array(
      z.strictObject({
        category: traitCategorySchema,
        status: z.enum(['SUPPORTED_VISIBLE', 'SUPPORTED_ABSENT', 'UNRESOLVED']),
        traitId: identifierSchema.nullable(),
        evidence: text,
        missingEvidence: z.array(text).max(8),
      }),
    )
    .length(9),
  compatibilityRestrictions: z.array(text).min(3).max(16),
});

// A reviewed receipt is pinned by a trusted local caller. This is not image
// recognition or owner authentication. Call the existing bounded PNG renderer
// first; this adapter hashes its output and reconciles reviewed observations.
// Even COMPLETE_DEVELOPMENT_VECTOR could never promote production registration.
export function reconcileRecipeAcceptance(
  reviewInput: unknown,
  requestInput: unknown,
  specInput: unknown,
  output: Uint8Array,
  expectedReviewSha256: string,
) {
  requireProof(
    canonicalSha256(reviewInput) === sha256Schema.parse(expectedReviewSha256),
    'RECIPE_REVIEW_SHA256',
  );
  const review = recipeReviewSchema.parse(reviewInput),
    request = pngProofSchema.parse(requestInput),
    spec = productionSpecSchema.parse(specInput);
  requireProof(
    review.requestSha256 === canonicalSha256(requestInput),
    'RECIPE_REQUEST_BINDING',
  );
  requireProof(
    review.specSha256 === canonicalSha256(specInput),
    'RECIPE_SPEC_BINDING',
  );
  requireProof(
    sha256Bytes(output) === request.expectedOutputSha256,
    'RECIPE_OUTPUT_BINDING',
  );
  requireProof(
    review.sourceFamily.pose === request.registration.poseFamily,
    'RECIPE_POSE',
  );
  const knownSources = new Map([
    [
      '34a8b9369ce4ccbf6c5f07bff54e176660798ec668a45f97b6a8f793961a592a',
      ['ORIGINAL_THREE_QUARTER', 'lammb-wool-ivory'],
    ],
    [
      'b2736f8678ec0c0eb3b83ff4192720c9116a79129e5b5b0713a6e7698c9ad493',
      ['ORIGINAL_THREE_QUARTER', 'lammb-wool-ash'],
    ],
    [
      '6b94719ef6c30bfaf730733ead2bfcea45821017aa122ba521587d36dbac8df7',
      ['ORIGINAL_THREE_QUARTER', 'lammb-wool-locks'],
    ],
    [
      '23213a0781d596408ec29143f22ecfd4d7ddc29aa9a3dca38a7de44709bb5449',
      ['FRONT', 'lammb-wool-ivory'],
    ],
  ]);
  const known = knownSources.get(request.base.sha256);
  requireProof(
    known &&
      known[0] === review.sourceFamily.pose &&
      known[1] === review.sourceFamily.woolTraitId,
    'RECIPE_KNOWN_SOURCE_FAMILY',
  );
  const byCategory = new Map(review.slots.map((s) => [s.category, s]));
  requireProof(
    byCategory.size === 9 &&
      spec.categories.every((c) => byCategory.has(c.category)),
    'RECIPE_CATEGORY_COVERAGE',
  );
  const supportedIds: string[] = [],
    attributes: { trait_type: string; value: string }[] = [];
  const absentIds = new Map([
    ['mutations', 'lammb-mutations-none'],
    ['pixel_corruption', 'lammb-pixel-corruption-none'],
    ['accessories', 'lammb-accessories-none'],
  ]);
  const exact = new Map([
    ['base_anatomy', 'lammb-base-anatomy-sheep'],
    ['wool', review.sourceFamily.woolTraitId],
    ['expressions', 'lammb-expressions-heavy-lidded'],
    ['clothing', 'lammb-clothing-hoodie'],
    ['accessories', 'lammb-accessories-ear-tag'],
    ['mutations', 'lammb-mutations-none'],
    ['pixel_corruption', 'lammb-pixel-corruption-none'],
  ]);
  for (const slot of review.slots) {
    if (slot.status === 'UNRESOLVED') {
      requireProof(
        slot.traitId === null && slot.missingEvidence.length > 0,
        'RECIPE_UNRESOLVED_VALUE',
      );
      continue;
    }
    requireProof(
      slot.traitId !== null && slot.missingEvidence.length === 0,
      'RECIPE_SUPPORTED_EVIDENCE',
    );
    const trait = spec.traits.find((t) => t.id === slot.traitId);
    requireProof(
      trait && trait.category === slot.category,
      'RECIPE_TRAIT_CATEGORY',
    );
    if (exact.has(slot.category))
      requireProof(
        slot.traitId === exact.get(slot.category),
        'RECIPE_SOURCE_FACETS',
      );
    if (slot.status === 'SUPPORTED_ABSENT')
      requireProof(
        absentIds.get(slot.category) === slot.traitId,
        'RECIPE_ABSENCE',
      );
    else {
      requireProof(
        absentIds.get(slot.category) !== slot.traitId,
        'RECIPE_ABSENT_FACET',
      );
      attributes.push(...trait.metadata);
    }
    supportedIds.push(slot.traitId);
  }
  const inputs = simulationInputs(spec),
    traits = new Map(inputs.catalog.traits.map((t) => [t.id, t])),
    assets = new Map(inputs.manifest.assets.map((a) => [a.id, a]));
  const evaluated = evaluateComposition(
    supportedIds.map((id) => traits.get('dev-' + id)!),
    inputs.catalog,
    assets,
  );
  requireProof(evaluated.rejections.length === 0, 'RECIPE_INCOMPATIBLE_TRAITS');
  const unresolved = review.slots.filter((s) => s.status === 'UNRESOLVED');
  const metadata = openSeaMetadataSchema.parse({
    name: 'LAMMB — Development Recipe ' + review.id,
    description:
      'Unpublished source-bound development reconciliation. No token assignment, final artwork approval or production registration.',
    image:
      'https://artwork.invalid/lammb/' + request.expectedOutputSha256 + '.png',
    external_url: 'https://lammb.fun',
    attributes,
  });
  return {
    id: review.id,
    purpose: 'DEVELOPMENT_ONLY',
    status: unresolved.length ? 'INCOMPLETE' : 'COMPLETE_DEVELOPMENT_VECTOR',
    outputHashBound: true,
    completeMetadataVector: unresolved.length === 0,
    sourceArtApproval: request.base.approval.state,
    sourceFamily: review.sourceFamily,
    requestSha256: review.requestSha256,
    reviewSha256: expectedReviewSha256,
    sourceHashes: {
      base: request.base.sha256,
      joint: request.joint.sha256,
      mask: request.mask.sha256,
    },
    outputSha256: request.expectedOutputSha256,
    dimensions: request.canvas,
    supportedTraitIds: supportedIds,
    unresolved,
    metadata,
    metadataSha256: canonicalSha256(metadata),
    productionRegistered: false,
    tokenAssignment: null,
    publication: 'NOT_PUBLISHED_PLACEHOLDER_URI',
    sourceRegistrationEligibility: unresolved.length
      ? 'METADATA_REVIEW_INCOMPLETE'
      : 'METADATA_RECONCILED_OWNER_REGISTRATION_REQUIRED',
    constraints: review.compatibilityRestrictions,
  };
}
