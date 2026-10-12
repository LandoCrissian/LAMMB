import { z } from 'zod';
import { canonicalJson, canonicalSha256 } from '../src/canonical.ts';
import { requireProof } from '../src/png-ingestion.ts';
import { pngProofSchema } from '../src/png-proof-schema.ts';
import { productionSpecSchema } from '../src/production-spec.ts';
import { sha256Schema } from '../src/schema.ts';
import { openSeaMetadataSchema } from '../src/opensea-metadata.ts';
import {
  assessRegistrationReadiness,
  traitBindingSchema,
} from './trait-binding.ts';
import { validateSourceTraitExtension } from './source-trait-extension.ts';

const eyesId = 'lammb-source-eyes-olive-green';
const backgroundId = 'lammb-source-environments-charcoal-studio-gradient';
const sourceSchema = z.strictObject({
  proofId: z.enum([
    'proof-canonical',
    'proof-broad-ash',
    'proof-rolled-locks',
    'proof-front-stage16',
  ]),
  sourceSha256: sha256Schema,
  outputSha256: sha256Schema,
  evidenceSha256: sha256Schema,
  requestSha256: sha256Schema,
});
const eventContext = {
  proposalSha256: sha256Schema,
  sources: z.array(sourceSchema).length(4),
  productionPromotionAuthorized: z.literal(false),
  generatorActivationAuthorized: z.literal(false),
  frequencyAssignmentAuthorized: z.literal(false),
};

// Append a trusted owner directive to the preserved proposal event. This is an
// operator receipt with hash binding, not cryptographic owner authentication.
export const sourceApprovalHistorySchema = z.strictObject({
  schemaVersion: z.literal('lammb-source-trait-approval-history/1.0.0'),
  purpose: z.literal('DEVELOPMENT_ONLY'),
  preservedBacklogSha256: sha256Schema,
  events: z.tuple([
    z.strictObject({
      ...eventContext,
      id: z.literal('stage31b-proposal-recorded'),
      actor: z.literal('CODEX'),
      decision: z.literal('PROPOSAL_RECORDED_OWNER_APPROVAL_PENDING'),
      previousEventSha256: z.null(),
    }),
    z.strictObject({
      ...eventContext,
      id: z.literal('task031c-owner-source-trait-approval'),
      actor: z.literal('OWNER'),
      decision: z.literal('APPROVED_SOURCE_SPECIFIC'),
      authorizationReference: z.literal('TASK_031C_OWNER_APPROVED_DEFINITIONS'),
      approvedLabels: z.tuple([
        z.literal('Olive Green'),
        z.literal('Charcoal Studio Gradient'),
      ]),
      previousEventSha256: sha256Schema,
    }),
  ]),
});

const approvedDefinitionGate = {
  visualDefinition: z.string().trim().min(1).max(2400),
  proposalDefinitionSha256: sha256Schema,
  approval: z.literal('APPROVED_SOURCE_SPECIFIC'),
  approvalEventId: z.literal('task031c-owner-source-trait-approval'),
  sources: z.array(sourceSchema).length(4),
  interchangeableLayer: z.literal(false),
  selectionWeight: z.null(),
  plannedCount: z.null(),
  generatorEnabled: z.literal(false),
};

// Unweighted source catalog alongside the existing frequency-bearing catalog.
// Its categories and public attributes use the existing schema vocabulary.
export const approvedSourceCatalogSchema = z.strictObject({
  schemaVersion: z.literal('lammb-approved-source-development-catalog/1.0.0'),
  purpose: z.literal('DEVELOPMENT_ONLY'),
  baseSpecSha256: sha256Schema,
  approvalHistorySha256: sha256Schema,
  proposalSha256: sha256Schema,
  traits: z.tuple([
    z.strictObject({
      ...approvedDefinitionGate,
      id: z.literal(eyesId),
      proposalId: z.literal('proposed-lammb-eyes-olive-green'),
      category: z.literal('eyes'),
      label: z.literal('Olive Green'),
      metadata: z.strictObject({
        trait_type: z.literal('Eyes'),
        value: z.literal('Olive Green'),
      }),
    }),
    z.strictObject({
      ...approvedDefinitionGate,
      id: z.literal(backgroundId),
      proposalId: z.literal(
        'proposed-lammb-environments-charcoal-studio-gradient',
      ),
      category: z.literal('environments'),
      label: z.literal('Charcoal Studio Gradient'),
      metadata: z.strictObject({
        trait_type: z.literal('Background'),
        value: z.literal('Charcoal Studio Gradient'),
      }),
    }),
  ]),
  generatorEnabled: z.literal(false),
  productionRegistered: z.literal(false),
});

type Cohort = Parameters<typeof validateSourceTraitExtension>[2] & {
  backlogSha256: string;
};

export function createApprovedSourceCatalog(
  historyInput: unknown,
  proposalInput: unknown,
  cohort: Cohort,
  specInput: unknown,
  expectedHistorySha256: string,
  expectedProposalSha256: string,
) {
  requireProof(
    canonicalSha256(historyInput) === sha256Schema.parse(expectedHistorySha256),
    'APPROVAL_HISTORY_SHA256',
  );
  const h = sourceApprovalHistorySchema.parse(historyInput),
    proposal = validateSourceTraitExtension(
      proposalInput,
      specInput,
      cohort,
      expectedProposalSha256,
    ),
    spec = productionSpecSchema.parse(specInput);
  requireProof(
    h.preservedBacklogSha256 === cohort.backlogSha256,
    'APPROVAL_BACKLOG_BINDING',
  );
  requireProof(
    h.events[1].previousEventSha256 === canonicalSha256(h.events[0]),
    'APPROVAL_HISTORY_CHAIN',
  );
  const sources = cohort.records.map(({ evidence: e }) => {
    const receipt = traitBindingSchema.parse(e);
    return {
      proofId: receipt.proofId,
      sourceSha256: receipt.sourceSha256,
      outputSha256: receipt.outputSha256,
      evidenceSha256: canonicalSha256(e),
      requestSha256: receipt.requestSha256,
    };
  });
  for (const event of h.events)
    requireProof(
      event.proposalSha256 === expectedProposalSha256 &&
        canonicalJson(event.sources) === canonicalJson(sources),
      'APPROVAL_SOURCE_SCOPE',
    );
  const traits = proposal.definitions.map((definition, index) => ({
    id: index === 0 ? eyesId : backgroundId,
    proposalId: definition.id,
    category: definition.category,
    label: definition.metadata.value,
    metadata: definition.metadata,
    visualDefinition: definition.visualDefinition,
    proposalDefinitionSha256: canonicalSha256(definition),
    approval: 'APPROVED_SOURCE_SPECIFIC',
    approvalEventId: h.events[1].id,
    sources,
    interchangeableLayer: false,
    selectionWeight: null,
    plannedCount: null,
    generatorEnabled: false,
  }));
  requireProof(
    new Set(traits.map((t) => t.id)).size === 2 &&
      new Set(
        traits.map((t) =>
          canonicalJson({ category: t.category, metadata: t.metadata }),
        ),
      ).size === 2,
    'CATALOG_DUPLICATE_DEFINITION',
  );
  for (const t of traits)
    requireProof(
      !spec.traits.some(
        (old) =>
          old.id === t.id ||
          (old.category === t.category &&
            old.metadata.some(
              (m) => canonicalJson(m) === canonicalJson(t.metadata),
            )),
      ),
      'CATALOG_EXISTING_DEFINITION',
    );
  return approvedSourceCatalogSchema.parse({
    schemaVersion: 'lammb-approved-source-development-catalog/1.0.0',
    purpose: 'DEVELOPMENT_ONLY',
    baseSpecSha256: canonicalSha256(specInput),
    approvalHistorySha256: expectedHistorySha256,
    proposalSha256: expectedProposalSha256,
    traits,
    generatorEnabled: false,
    productionRegistered: false,
  });
}

export function validateApprovedSourceCatalog(
  input: unknown,
  ...context: Parameters<typeof createApprovedSourceCatalog>
) {
  const expected = createApprovedSourceCatalog(...context);
  requireProof(
    canonicalJson(input) === canonicalJson(expected),
    'APPROVED_CATALOG_RECORD',
  );
  return expected;
}

export function createCompleteSourceRecipe(
  catalogInput: unknown,
  catalogContext: Parameters<typeof createApprovedSourceCatalog>,
  recipeContext: Parameters<typeof assessRegistrationReadiness>,
) {
  const catalog = validateApprovedSourceCatalog(
      catalogInput,
      ...catalogContext,
    ),
    e = traitBindingSchema.parse(recipeContext[0]),
    previous = assessRegistrationReadiness(...recipeContext),
    request = pngProofSchema.parse(recipeContext[1].request);
  requireProof(
    catalog.baseSpecSha256 === canonicalSha256(recipeContext[2]),
    'COMPLETE_RECIPE_SPEC',
  );
  for (const definition of catalog.traits)
    requireProof(
      definition.sources.some(
        (s) =>
          s.proofId === e.proofId &&
          s.sourceSha256 === e.sourceSha256 &&
          s.outputSha256 === e.outputSha256 &&
          s.evidenceSha256 === recipeContext[5] &&
          s.requestSha256 === e.requestSha256,
      ),
      'COMPLETE_RECIPE_SOURCE_RESTRICTION',
    );
  const names = {
    'proof-canonical': 'Canonical',
    'proof-broad-ash': 'Broad Ash',
    'proof-rolled-locks': 'Rolled Locks',
    'proof-front-stage16': 'Front',
  };
  const name = names[e.proofId as keyof typeof names];
  requireProof(Boolean(name), 'COMPLETE_RECIPE_UNKNOWN_SOURCE');
  const metadata = openSeaMetadataSchema.parse({
    ...previous.metadata,
    name: 'LAMMB — ' + name,
    description:
      'An unimpressed LAMMB sheep with olive-green eyes, a black hoodie and a 5280 ear tag against a charcoal studio gradient. Unpublished development artwork; no token assignment or production registration.',
    attributes: [
      ...previous.metadata.attributes,
      ...catalog.traits.map((t) => t.metadata),
    ],
  });
  const traitVector = previous.traitVector.map((slot) => {
    const t = catalog.traits.find((t) => t.category === slot.category);
    return t
      ? {
          ...slot,
          state: 'VERIFIED_PRESENT',
          traitId: t.id,
          definitionSha256: canonicalSha256(t),
          approvalHistorySha256: catalog.approvalHistorySha256,
        }
      : slot;
  });
  requireProof(
    traitVector.every((v) =>
      ['VERIFIED_PRESENT', 'VERIFIED_ABSENT'].includes(v.state),
    ) &&
      traitVector.length === 9 &&
      metadata.attributes.length === 8,
    'COMPLETE_RECIPE_FACETS',
  );
  return {
    schemaVersion: 'lammb-complete-source-development-recipe/1.0.0',
    purpose: 'DEVELOPMENT_ONLY',
    id: e.proofId,
    status: 'COMPLETE_SOURCE_BOUND_DEVELOPMENT_RECIPE',
    metadataCompletenessScope: 'EXISTING_SPEC_PLUS_APPROVED_SOURCE_CATALOG',
    sourceHashes: previous.sourceHashes,
    outputSha256: previous.outputSha256,
    dimensions: request.canvas,
    provenance: e.provenance,
    evidenceSha256: recipeContext[5],
    approvedCatalogSha256: canonicalSha256(catalog),
    approvalHistorySha256: catalog.approvalHistorySha256,
    rendererRecipeReference: {
      path: 'packages/art-generator/fixtures/stage30-recipe-reviews.json',
      proofId: e.proofId,
      requestSha256: e.requestSha256,
      contactRegistrationSha256: canonicalSha256(request.registration),
    },
    traitVector,
    pose: previous.pose,
    metadata,
    metadataSha256: canonicalSha256(metadata),
    completeMetadata: true,
    unresolvedFacets: [],
    sourceArtApproval: 'APPROVED_ART_DIRECTION',
    sourceTraitApproval: 'APPROVED_SOURCE_SPECIFIC',
    generatorEnabled: false,
    productionRegistered: false,
    productionPromotionAuthorized: false,
    promotionGate: previous.promotionGate,
    publication: 'NOT_PUBLISHED_PLACEHOLDER_URI',
    tokenAssignment: null,
  };
}

export function validateCompleteSourceRecipe(
  input: unknown,
  ...context: Parameters<typeof createCompleteSourceRecipe>
) {
  const expected = createCompleteSourceRecipe(...context);
  requireProof(
    canonicalJson(input) === canonicalJson(expected),
    'COMPLETE_RECIPE_RECORD',
  );
  return expected;
}
