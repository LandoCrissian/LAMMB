import { z } from 'zod';
import catalogInput from '../fixtures/stage35-approved-authored-catalog.json' with { type: 'json' };
import historyInput from '../../../docs/art-production/STAGE35_OWNER_APPROVAL_HISTORY.json' with { type: 'json' };
import previousHistoryInput from '../../../docs/art-production/STAGE31C_OWNER_APPROVAL_HISTORY.json' with { type: 'json' };
import previousCatalogInput from '../fixtures/stage31c-approved-source-catalog.json' with { type: 'json' };
import { canonicalJson, canonicalSha256 } from '../src/canonical.ts';
import { requireProof } from '../src/png-ingestion.ts';
import { sha256Schema, relativePathSchema } from '../src/schema.ts';
import { openSeaMetadataSchema } from '../src/opensea-metadata.ts';
import {
  approvedSourceCatalogSchema,
  sourceApprovalHistorySchema,
} from './approved-source-traits.ts';
import { resolveAuthoredFrame } from './authored-frame.ts';

// Reviewed static trust anchors. This is an operator receipt of the human
// directive, not cryptographic owner authentication or a public promotion API.
const trustedCatalog = structuredClone(catalogInput);
const trustedHistory = structuredClone(historyInput);
const previousHistory = structuredClone(previousHistoryInput);
const previousCatalog = structuredClone(previousCatalogInput);
const sourceId = z.enum([
  'authored-amused',
  'authored-utility-vest',
  'authored-magma-hoodie',
  'authored-after-hours-observer',
]);
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
const dimensions = z.strictObject({
  width: z.number().int().positive(),
  height: z.number().int().positive(),
});
const restriction = z.strictObject({
  sourceId,
  sourceSha256: sha256Schema,
  deliverySha256: sha256Schema,
  requestSha256: sha256Schema,
});
export const approvedAuthoredCatalogSchema = z.strictObject({
  schemaVersion: z.literal('lammb-approved-authored-development-catalog/1.0.0'),
  purpose: z.literal('DEVELOPMENT_ONLY'),
  baselineMain: z.literal('2545d730ddba57752990b30a84aa857e76324e3c'),
  baseSpecSha256: sha256Schema,
  backlogSha256: sha256Schema,
  stage34ProposalSha256: sha256Schema,
  previousCatalogSha256: sha256Schema,
  approvalHistorySha256: sha256Schema,
  definitions: z
    .array(
      z.strictObject({
        id: z.string().min(1),
        category,
        label: z.string().min(1),
        metadata: z.strictObject({
          trait_type: z.string().min(1),
          value: z.string().min(1),
        }),
        visualDefinition: z.string().min(1).max(2400),
        action: z.enum([
          'EXTEND_EXISTING_SOURCE_SCOPE',
          'APPROVE_NEW_SOURCE_SPECIFIC_DEFINITION',
        ]),
        preservedDefinitionSha256: sha256Schema.nullable(),
        sourceRestrictions: z.array(restriction).min(1).max(4),
        approval: z.literal('APPROVED_SOURCE_SPECIFIC'),
        approvalEventId: z.literal('task035-owner-authored-source-metadata'),
        interchangeableLayer: z.literal(false),
        selectionWeight: z.null(),
        plannedCount: z.null(),
        generatorEnabled: z.literal(false),
        productionRegistered: z.literal(false),
      }),
    )
    .length(3),
  sources: z
    .array(
      z.strictObject({
        id: sourceId,
        sourceSha256: sha256Schema,
        requestSha256: sha256Schema,
        rendererReceiptSha256: sha256Schema,
        nativeDecodedPixelSha256: sha256Schema,
        deliverySha256: sha256Schema,
        deliveryDecodedPixelSha256: sha256Schema,
        nativeDimensions: dimensions,
        deliveryDimensions: dimensions,
        recipeType: z.enum([
          'AUTHORED_FULL_FRAME',
          'INTEGRATED_SPECIAL_MUTATION',
        ]),
        poseFamily: z.string().min(1),
        sourceArtApproval: z.strictObject({
          id: z.string(),
          authority: z.literal('CURRENT_OWNER_DIRECTIVE'),
          decision: z.literal('ART_DIRECTION_APPROVED'),
          scope: z.literal('ART_DIRECTION_ONLY_NOT_PRODUCTION_REGISTRATION'),
          evidence: z.string(),
          date: z.iso.datetime(),
        }),
        visualEvidence: z.strictObject({
          path: relativePathSchema,
          sha256: sha256Schema,
          roi: z.strictObject({
            x: z.number().int().nonnegative(),
            y: z.number().int().nonnegative(),
            width: z.number().int().positive(),
            height: z.number().int().positive(),
          }),
          interpretation: z.literal(
            'MANUAL_NATIVE_VISUAL_CORRESPONDENCE_NOT_EXACT_ALBEDO_MEASUREMENT',
          ),
        }),
        facets: z
          .array(
            z.strictObject({
              category,
              traitId: z.string().min(1),
              status: z.enum(['VERIFIED_PRESENT', 'VERIFIED_ABSENT']),
              evidence: z.string().min(1),
            }),
          )
          .length(9),
        compatibility: z.array(z.string().min(1)).min(1),
        compatibilityScope: z.enum([
          'AUTHORED_FRAME_ONLY',
          'OWNER_APPROVED_INTEGRATED_MAGMA_AUTHORED_FRAME_ONLY',
        ]),
        completeMetadata: z.literal(true),
        productionRegistered: z.literal(false),
        generatorEnabled: z.literal(false),
      }),
    )
    .length(4),
  exposedMagmaRetained: z.strictObject({
    path: relativePathSchema,
    sha256: sha256Schema,
  }),
  generatorEnabled: z.literal(false),
  productionRegistered: z.literal(false),
  frequencyChanges: z.literal(false),
});

export function validateApprovedAuthoredCatalog(
  input: unknown,
  approvals: unknown,
) {
  const catalog = approvedAuthoredCatalogSchema.parse(input);
  requireProof(
    canonicalJson(catalog) === canonicalJson(trustedCatalog),
    'AUTHORED_APPROVED_CATALOG',
  );
  requireProof(
    canonicalJson(approvals) === canonicalJson(trustedHistory),
    'AUTHORED_APPROVAL_HISTORY',
  );
  sourceApprovalHistorySchema.parse(previousHistory);
  approvedSourceCatalogSchema.parse(previousCatalog);
  requireProof(
    canonicalSha256(approvals) === catalog.approvalHistorySha256 &&
      canonicalSha256(previousCatalog) === catalog.previousCatalogSha256 &&
      canonicalSha256(previousHistory) ===
        trustedHistory.previousHistory.sha256 &&
      canonicalJson(trustedHistory.events.slice(0, 2)) ===
        canonicalJson(previousHistory.events) &&
      trustedHistory.events[2]!.previousEventSha256 ===
        canonicalSha256(previousHistory.events[1]),
    'AUTHORED_APPROVAL_CHAIN',
  );
  const sourceIds = new Set(catalog.sources.map((s) => s.id));
  requireProof(sourceIds.size === 4, 'AUTHORED_APPROVED_SOURCE_SET');
  for (const definition of catalog.definitions) {
    const old = previousCatalog.traits.find((t) => t.id === definition.id);
    if (definition.action === 'EXTEND_EXISTING_SOURCE_SCOPE') {
      requireProof(
        old &&
          canonicalSha256(old) === definition.preservedDefinitionSha256 &&
          old.label === definition.label &&
          old.category === definition.category &&
          old.visualDefinition === definition.visualDefinition &&
          canonicalJson(old.metadata) === canonicalJson(definition.metadata),
        'AUTHORED_PRIOR_DEFINITION_PRESERVED',
      );
    } else
      requireProof(
        !old && definition.preservedDefinitionSha256 === null,
        'AUTHORED_NEW_DEFINITION',
      );
  }
  return catalog;
}

export function createCompleteAuthoredRecipe(
  catalogInput: unknown,
  approvals: unknown,
  input: unknown,
  backlog: unknown,
  specInput: unknown,
  rendererReceipt: unknown,
) {
  const catalog = validateApprovedAuthoredCatalog(catalogInput, approvals);
  const { row, spec } = resolveAuthoredFrame(input, backlog, specInput);
  const source = catalog.sources.find((s) => s.id === row.id);
  requireProof(
    source &&
      source.sourceSha256 === row.source.sha256 &&
      source.requestSha256 === canonicalSha256(row) &&
      canonicalJson(source.sourceArtApproval) ===
        canonicalJson(row.ownerDecision),
    'AUTHORED_COMPLETE_SOURCE_BINDING',
  );
  requireProof(
    canonicalSha256(rendererReceipt) === source.rendererReceiptSha256,
    'AUTHORED_COMPLETE_RENDER_RECEIPT',
  );
  const attributes: { trait_type: string; value: string | number }[] = [];
  const traitVector = source.facets.map((facet) => {
    const definition = catalog.definitions.find((t) => t.id === facet.traitId);
    const trait = spec.traits.find((t) => t.id === facet.traitId);
    requireProof(
      new Set(source.facets.map((f) => f.category)).size === 9,
      'AUTHORED_COMPLETE_FACETS',
    );
    if (definition)
      requireProof(
        definition.category === facet.category &&
          definition.sourceRestrictions.some(
            (s) =>
              s.sourceId === row.id &&
              s.sourceSha256 === row.source.sha256 &&
              s.deliverySha256 === source.deliverySha256 &&
              s.requestSha256 === source.requestSha256,
          ),
        'AUTHORED_COMPLETE_TRAIT_SCOPE',
      );
    else
      requireProof(
        trait?.category === facet.category,
        'AUTHORED_COMPLETE_UNKNOWN_TRAIT',
      );
    attributes.push(...(definition ? [definition.metadata] : trait!.metadata));
    return {
      ...facet,
      definitionSha256: canonicalSha256(definition ?? trait!),
    };
  });
  requireProof(
    !spec.traits.some((t) => t.id === 'lammb-source-clothing-scorched-hoodie'),
    'AUTHORED_NO_WEIGHTED_GARMENT_ACTIVATION',
  );
  if (row.id === 'authored-magma-hoodie')
    requireProof(
      source.recipeType === 'INTEGRATED_SPECIAL_MUTATION' &&
        source.compatibilityScope ===
          'OWNER_APPROVED_INTEGRATED_MAGMA_AUTHORED_FRAME_ONLY' &&
        traitVector.some(
          (f) => f.traitId === 'lammb-source-clothing-scorched-hoodie',
        ) &&
        traitVector.some((f) => f.traitId === 'lammb-mutations-magma'),
      'AUTHORED_INTEGRATED_MAGMA_ONLY',
    );
  const metadata = openSeaMetadataSchema.parse({
    name: 'LAMMB — ' + row.label,
    description:
      row.id === 'authored-magma-hoodie'
        ? 'A volcanic LAMMB with olive-green eyes, singed curls and an integrated scorched hoodie against a charcoal studio gradient. Unpublished source-specific development artwork; no token assignment or production registration.'
        : row.id === 'authored-after-hours-observer'
          ? 'An olive-eyed LAMMB in a structured dark lab coat observing an atmospheric containment laboratory. Unpublished source-specific development artwork; no token assignment or production registration.'
          : 'An olive-eyed LAMMB with ivory curls and ' +
            (row.id === 'authored-amused'
              ? 'an amused expression in a black hoodie'
              : 'a structured utility vest') +
            ' against a charcoal studio gradient. Unpublished source-specific development artwork; no token assignment or production registration.',
    image:
      'https://artwork.invalid/lammb/authored/' +
      source.deliverySha256 +
      '.png',
    external_url: 'https://lammb.fun',
    attributes,
  });
  return {
    schemaVersion: 'lammb-complete-authored-development-recipe/1.0.0',
    purpose: 'DEVELOPMENT_ONLY',
    id: row.id,
    status: 'COMPLETE_SOURCE_BOUND_DEVELOPMENT_RECIPE',
    sourceSha256: row.source.sha256,
    nativeOutputSha256: row.source.sha256,
    nativeDecodedPixelSha256: source.nativeDecodedPixelSha256,
    deliverySha256: source.deliverySha256,
    deliveryDecodedPixelSha256: source.deliveryDecodedPixelSha256,
    nativeDimensions: source.nativeDimensions,
    deliveryDimensions: source.deliveryDimensions,
    sourceApproval: source.sourceArtApproval,
    provenance: row.provenance,
    referenceDependencies: row.referenceDependencies,
    visualEvidence: source.visualEvidence,
    rendererRecipeReference: {
      path: 'packages/art-generator/fixtures/stage34-authored-frames.json',
      requestSha256: source.requestSha256,
      rendererReceiptSha256: source.rendererReceiptSha256,
      method: 'EXACT_AUTHORED_NATIVE_PASSTHROUGH_PLUS_NOHALO_CPU_DELIVERY',
    },
    approvedCatalogSha256: canonicalSha256(catalog),
    approvalHistorySha256: catalog.approvalHistorySha256,
    traitVector,
    metadata,
    metadataSha256: canonicalSha256(metadata),
    compatibility: source.compatibility,
    compatibilityScope: source.compatibilityScope,
    recipeType: source.recipeType,
    poseFamily: source.poseFamily,
    completeMetadata: true,
    unresolvedFacets: [],
    sourceTraitApproval: 'APPROVED_SOURCE_SPECIFIC',
    productionRegistered: false,
    productionPromotionAuthorized: false,
    promotionGate: 'EXPLICIT_SEPARATE_OWNER_PRODUCTION_REGISTRATION_REQUIRED',
    generatorEnabled: false,
    tokenAssignment: null,
    publication: 'UNPUBLISHED_PLACEHOLDER_URI',
    deliveryArtApproval: 'PENDING',
  };
}

export function validateCompleteAuthoredRecipe(
  input: unknown,
  ...context: Parameters<typeof createCompleteAuthoredRecipe>
) {
  const expected = createCompleteAuthoredRecipe(...context);
  requireProof(
    canonicalJson(input) === canonicalJson(expected),
    'AUTHORED_COMPLETE_RECIPE_RECORD',
  );
  return expected;
}

export function requireUniqueCompleteAuthoredOutputs(
  recipes: readonly ReturnType<typeof createCompleteAuthoredRecipe>[],
) {
  for (const field of [
    'nativeOutputSha256',
    'nativeDecodedPixelSha256',
    'deliverySha256',
    'deliveryDecodedPixelSha256',
  ] as const) {
    const hashes = recipes.map((r) => sha256Schema.parse(r[field]));
    requireProof(
      new Set(hashes).size === hashes.length,
      'AUTHORED_COMPLETE_DUPLICATE_OUTPUT',
    );
  }
}
