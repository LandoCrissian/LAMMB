import { z } from 'zod';
import { canonicalJson, canonicalSha256 } from '../src/canonical.ts';
import { requireProof } from '../src/png-ingestion.ts';
import { productionSpecSchema } from '../src/production-spec.ts';
import { sha256Schema } from '../src/schema.ts';
import { openSeaMetadataSchema } from '../src/opensea-metadata.ts';
import {
  assessRegistrationReadiness,
  requireUniqueRegistrationOutputs,
  traitBindingSchema,
} from './trait-binding.ts';

const text = z.string().trim().min(1).max(2400);
const definitionGate = {
  status: z.literal('OWNER_DEFINITION_APPROVAL_PENDING'),
  scope: z.literal('EXACT_LISTED_SOURCE_FRAMES_ONLY'),
  visualDefinition: text,
  selectionWeight: z.null(),
  proposedTotalCount: z.null(),
  generatorEnabled: z.literal(false),
};
const ids = [
  'proof-canonical',
  'proof-broad-ash',
  'proof-rolled-locks',
  'proof-front-stage16',
] as const;

// Separate proposal vocabulary. Never fed into simulationInputs, the catalog,
// renderer, production registry or approved trait-frequency configuration.
export const sourceTraitExtensionSchema = z.strictObject({
  schemaVersion: z.literal('lammb-source-trait-extension-proposal/1.0.0'),
  purpose: z.literal('DEVELOPMENT_ONLY'),
  specSha256: sha256Schema,
  priorEvidenceCohortSha256: sha256Schema,
  definitions: z.tuple([
    z.strictObject({
      ...definitionGate,
      id: z.literal('proposed-lammb-eyes-olive-green'),
      category: z.literal('eyes'),
      metadata: z.strictObject({
        trait_type: z.literal('Eyes'),
        value: z.literal('Olive Green'),
      }),
    }),
    z.strictObject({
      ...definitionGate,
      id: z.literal('proposed-lammb-environments-charcoal-studio-gradient'),
      category: z.literal('environments'),
      metadata: z.strictObject({
        trait_type: z.literal('Background'),
        value: z.literal('Charcoal Studio Gradient'),
      }),
    }),
  ]),
  bindings: z
    .array(
      z.strictObject({
        proofId: z.enum(ids),
        sourceSha256: sha256Schema,
        outputSha256: sha256Schema,
        evidenceSha256: sha256Schema,
        eyeDefinitionId: z.literal('proposed-lammb-eyes-olive-green'),
        backgroundDefinitionId: z.literal(
          'proposed-lammb-environments-charcoal-studio-gradient',
        ),
        interpretation: z.literal(
          'MANUAL_NATIVE_VISUAL_REVIEW_NOT_ALBEDO_OR_AUTOMATIC_COLOR_CLASSIFICATION',
        ),
        backgroundInterchangeable: z.literal(false),
      }),
    )
    .length(4),
  productionRegistered: z.literal(false),
  generatorEnabled: z.literal(false),
  ownerDefinitionApproval: z.literal('PENDING'),
  promotionGate: z.literal(
    'SEPARATE_EXPLICIT_OWNER_PRODUCTION_APPROVAL_REQUIRED',
  ),
});

type Cohort = { records: { evidence: unknown; evidenceSha256: string }[] };

export function validateSourceTraitExtension(
  proposalInput: unknown,
  specInput: unknown,
  cohort: Cohort,
  expectedProposalSha256: string,
) {
  requireProof(
    canonicalSha256(proposalInput) ===
      sha256Schema.parse(expectedProposalSha256),
    'EXTENSION_PROPOSAL_SHA256',
  );
  const proposal = sourceTraitExtensionSchema.parse(proposalInput),
    spec = productionSpecSchema.parse(specInput);
  requireProof(
    proposal.specSha256 === canonicalSha256(specInput),
    'EXTENSION_SPEC_BINDING',
  );
  requireProof(
    proposal.priorEvidenceCohortSha256 === canonicalSha256(cohort),
    'EXTENSION_HISTORY_BINDING',
  );
  requireProof(cohort.records.length === 4, 'EXTENSION_COHORT');
  const cohortIds = cohort.records.map(
    (r) => traitBindingSchema.parse(r.evidence).proofId,
  );
  requireProof(
    new Set(cohortIds).size === 4 && ids.every((id) => cohortIds.includes(id)),
    'EXTENSION_COHORT',
  );
  requireProof(
    new Set(proposal.bindings.map((b) => b.proofId)).size === 4 &&
      ids.every((id) => proposal.bindings.some((b) => b.proofId === id)),
    'EXTENSION_DUPLICATE_SOURCE',
  );
  requireUniqueRegistrationOutputs(proposal.bindings);
  requireProof(
    new Set(proposal.bindings.map((b) => b.sourceSha256)).size === 4,
    'EXTENSION_DUPLICATE_SOURCE',
  );
  for (const definition of proposal.definitions)
    requireProof(
      !spec.traits.some((t) => t.id === definition.id),
      'EXTENSION_EXISTING_ID',
    );
  for (const row of cohort.records) {
    const evidence = traitBindingSchema.parse(row.evidence),
      binding = proposal.bindings.find((b) => b.proofId === evidence.proofId);
    requireProof(
      row.evidenceSha256 === canonicalSha256(row.evidence),
      'EXTENSION_EVIDENCE_SHA256',
    );
    requireProof(
      binding &&
        binding.sourceSha256 === evidence.sourceSha256 &&
        binding.outputSha256 === evidence.outputSha256 &&
        binding.evidenceSha256 === row.evidenceSha256,
      'EXTENSION_SOURCE_BINDING',
    );
  }
  return proposal;
}

// Pure metadata reconciliation, not PNG decoding or proof of rendering. The
// bounded existing renderer independently validates all original native inputs.
// A proposal can be descriptively complete while its new definitions remain
// unapproved and unusable by the collection constructor.
export function createSourceBoundMetadataProposal(
  proposalInput: unknown,
  cohort: Cohort,
  expectedProposalSha256: string,
  context: Parameters<typeof assessRegistrationReadiness>,
) {
  const [evidenceInput, , specInput] = context;
  const proposal = validateSourceTraitExtension(
      proposalInput,
      specInput,
      cohort,
      expectedProposalSha256,
    ),
    evidence = traitBindingSchema.parse(evidenceInput),
    previous = assessRegistrationReadiness(...context),
    binding = proposal.bindings.find((b) => b.proofId === evidence.proofId);
  requireProof(
    binding &&
      binding.evidenceSha256 === context[5] &&
      binding.sourceSha256 === evidence.sourceSha256 &&
      binding.outputSha256 === evidence.outputSha256,
    'EXTENSION_CONTEXT',
  );
  const metadata = openSeaMetadataSchema.parse({
    ...previous.metadata,
    name: 'LAMMB — Proposed Source Metadata ' + evidence.proofId,
    description:
      'Unpublished development metadata for verified LAMMB artwork. Olive Green eyes and Charcoal Studio Gradient are source-bound definitions pending owner approval; no token assignment or production registration.',
    attributes: [
      ...previous.metadata.attributes,
      ...proposal.definitions.map((d) => d.metadata),
    ],
  });
  requireProof(metadata.attributes.length === 8, 'EXTENSION_METADATA_FACETS');
  const traitVector = previous.traitVector.map((slot) => {
    const definition = proposal.definitions.find(
      (d) => d.category === slot.category,
    );
    return definition
      ? {
          ...slot,
          state: 'PROPOSED_SOURCE_BINDING',
          traitId: definition.id,
          definitionSha256: canonicalSha256(definition),
          proposalSha256: expectedProposalSha256,
        }
      : slot;
  });
  return {
    schemaVersion: 'lammb-proposed-complete-source-metadata/1.0.0',
    purpose: 'DEVELOPMENT_ONLY',
    id: evidence.proofId,
    status: 'COMPLETE_PROPOSED_SOURCE_METADATA',
    sourceHashes: previous.sourceHashes,
    outputSha256: previous.outputSha256,
    evidenceSha256: context[5],
    proposalSha256: expectedProposalSha256,
    metadata,
    metadataSha256: canonicalSha256(metadata),
    traitVector,
    pose: previous.pose,
    completeProposedMetadata: true,
    completeApprovedCatalogMetadata: false,
    unresolvedVisibleFacets: [],
    pendingDefinitionApprovals: proposal.definitions.map((d) => d.id),
    generatorEnabled: false,
    registrationCandidate: false,
    productionRegistered: false,
    promotionGate: proposal.promotionGate,
    publication: 'NOT_PUBLISHED_PLACEHOLDER_URI',
    tokenAssignment: null,
  };
}

export function validateSourceBoundMetadataProposal(
  input: unknown,
  ...context: Parameters<typeof createSourceBoundMetadataProposal>
) {
  const expected = createSourceBoundMetadataProposal(...context);
  requireProof(
    canonicalJson(input) === canonicalJson(expected),
    'EXTENSION_METADATA_RECORD',
  );
  return expected;
}
