import { z } from 'zod';
import { canonicalSha256, sha256Bytes } from '../src/canonical.ts';
import {
  decodeApprovedPng,
  readProofEvidence,
  requireProof,
} from '../src/png-ingestion.ts';
import { openSeaMetadataSchema } from '../src/opensea-metadata.ts';
import { productionSpecSchema } from '../src/production-spec.ts';
import { relativePathSchema, sha256Schema } from '../src/schema.ts';
import {
  artworkOwnerDecisionsSchema,
  validateArtworkBacklog,
} from './artwork-backlog.ts';

const id = z.string().regex(/^[a-z][a-z0-9-]{1,159}$/);
const evidence = z.strictObject({
  path: relativePathSchema,
  sha256: sha256Schema,
});
export const authoredSourceProposalSchema = z
  .strictObject({
    schemaVersion: z.literal('lammb-authored-source-proposals/1.0.0'),
    purpose: z.literal('DEVELOPMENT_ONLY'),
    productionPromotionAuthorized: z.literal(false),
    specRawSha256: sha256Schema,
    specCanonicalSha256: sha256Schema,
    backlogSha256: sha256Schema,
    ownerEvidence: evidence,
    provenanceEvidence: evidence,
    assets: z
      .array(
        z.strictObject({
          id,
          backlogId: id,
          sourceId: id,
          sourceSha256: sha256Schema,
          family: z.enum([
            'AMUSED_HOODIE',
            'LAB_COAT',
            'COLLAR_SHIFT',
            'AFTER_HOURS_OBSERVER',
          ]),
          visibleTraitIds: z.array(id).min(2).max(3),
          composition: z.literal('IMMUTABLE_AUTHORED_FULL_FRAME_ONLY'),
          poseContactRegistration: z.literal('NOT_VALIDATED'),
          extractedLayers: z.literal(false),
          productionRegistered: z.literal(false),
        }),
      )
      .length(2),
  })
  .superRefine((r, ctx) => {
    for (const field of [
      'id',
      'backlogId',
      'sourceId',
      'sourceSha256',
      'family',
    ] as const)
      if (new Set(r.assets.map((a) => a[field])).size !== r.assets.length)
        ctx.addIssue({
          code: 'custom',
          message: `Duplicate authored proposal ${field}`,
        });
  });

const families = {
  AMUSED_HOODIE: {
    backlogId: 'backlog-study25-amused',
    referenceCount: 2,
    traits: [
      'lammb-base-anatomy-sheep',
      'lammb-expressions-amused',
      'lammb-clothing-hoodie',
    ],
  },
  LAB_COAT: {
    backlogId: 'backlog-study25-lab-coat',
    referenceCount: 2,
    traits: ['lammb-base-anatomy-sheep', 'lammb-clothing-long-coat'],
  },
  COLLAR_SHIFT: {
    backlogId: 'backlog-study27-collar-shift',
    referenceCount: 3,
    traits: ['lammb-base-anatomy-sheep', 'lammb-clothing-bomber'],
  },
  AFTER_HOURS_OBSERVER: {
    backlogId: 'backlog-study27-after-hours-observer',
    referenceCount: 2,
    traits: [
      'lammb-base-anatomy-sheep',
      'lammb-clothing-long-coat',
      'lammb-environments-lab',
    ],
  },
} as const;

// A proposal binds an approved authored frame. It cannot assemble new trait
// combinations, authenticate the owner, register contacts or promote production.
export function resolveAuthoredSourceProposals(
  proposalInput: unknown,
  backlogInput: unknown,
  specInput: unknown,
  rawSpecSha256: string,
  ownerInput: unknown,
) {
  const proposal = authoredSourceProposalSchema.parse(proposalInput);
  requireProof(
    proposal.specRawSha256 === rawSpecSha256 &&
      proposal.specCanonicalSha256 === canonicalSha256(specInput),
    'PROPOSAL_SPEC_BINDING',
  );
  requireProof(
    proposal.backlogSha256 === canonicalSha256(backlogInput),
    'PROPOSAL_BACKLOG_BINDING',
  );
  const backlog = validateArtworkBacklog(
    backlogInput,
    specInput,
    rawSpecSha256,
  );
  const spec = productionSpecSchema.parse(specInput);
  const owner = artworkOwnerDecisionsSchema.parse(ownerInput);
  const excluded = new Set(
    backlog.items.flatMap((i) =>
      i.sources
        .filter((s) => s.role === 'NEGATIVE_QA_ONLY')
        .map((s) => s.sha256),
    ),
  );
  for (const e of [proposal.ownerEvidence, proposal.provenanceEvidence])
    requireProof(
      backlog.evidence.some((b) => b.path === e.path && b.sha256 === e.sha256),
      'PROPOSAL_EVIDENCE',
    );
  const resolved = proposal.assets.map((asset) => {
    const family = families[asset.family];
    requireProof(
      asset.backlogId === family.backlogId &&
        JSON.stringify(asset.visibleTraitIds) === JSON.stringify(family.traits),
      'PROPOSAL_FAMILY_FACETS',
    );
    const item = backlog.items.find((i) => i.id === asset.backlogId);
    requireProof(
      item?.artisticApproval === 'ART_DIRECTION_APPROVED' &&
        item.studyReview?.ownerReviewStatus === 'ART_DIRECTION_APPROVED',
      'PROPOSAL_ART_APPROVAL',
    );
    const source = item.sources.find((s) => s.id === asset.sourceId);
    requireProof(
      source?.role === 'GENERATED_NATIVE_STUDY' &&
        source.sha256 === asset.sourceSha256 &&
        !excluded.has(source.sha256),
      'PROPOSAL_NATIVE_SOURCE',
    );
    const decision = owner.decisions.find((d) => d.backlogId === item.id),
      event = item.ownerDecisionHistory.at(-1);
    const bound = backlog.evidence.find((e) => e.id === event?.evidence);
    requireProof(
      decision?.decision === 'ART_DIRECTION_APPROVED' &&
        decision.sourceSha256 === source.sha256 &&
        event?.authority === owner.authority &&
        event.decision === decision.decision &&
        event.date === owner.recordedAt &&
        bound?.path === proposal.ownerEvidence.path &&
        bound.sha256 === proposal.ownerEvidence.sha256,
      'PROPOSAL_OWNER_BINDING',
    );
    requireProof(
      item.studyReview.provenanceEvidence ===
        backlog.evidence.find(
          (e) =>
            e.path === proposal.provenanceEvidence.path &&
            e.sha256 === proposal.provenanceEvidence.sha256,
        )?.id,
      'PROPOSAL_GENERATION_BINDING',
    );
    const references = item.sources.filter((s) =>
      [
        'PRIMARY_RASTER_REFERENCE',
        'SUPPORTING_APPROVED_RASTER_REFERENCE',
      ].includes(s.role),
    );
    requireProof(
      references.length === family.referenceCount &&
        references.filter((s) => s.role === 'PRIMARY_RASTER_REFERENCE')
          .length === 1,
      'PROPOSAL_REFERENCES',
    );
    const traits = asset.visibleTraitIds.map((traitId) => {
      const trait = spec.traits.find((t) => t.id === traitId);
      requireProof(trait && item.traitIds.includes(traitId), 'PROPOSAL_TRAIT');
      return trait;
    });
    return { asset, source, references, traits };
  });
  return { proposal, resolved };
}

export function createAuthoredProposalMetadata(
  frame: ReturnType<typeof resolveAuthoredSourceProposals>['resolved'][number],
  native: Uint8Array,
) {
  requireProof(
    sha256Bytes(native) === frame.source.sha256,
    'PROPOSAL_METADATA_IMAGE',
  );
  const metadata = openSeaMetadataSchema.parse({
    name: `LAMMB — Development Authored Source ${frame.asset.id}`,
    description:
      'Unpublished partial visible-trait example for one approved authored source. No NFT assignment, complete collection vector or production registration.',
    image: `https://artwork.invalid/lammb/${frame.source.sha256}.png`,
    external_url: 'https://lammb.fun',
    attributes: frame.traits.flatMap((t) => t.metadata),
  });
  return {
    metadata,
    binding: {
      purpose: 'DEVELOPMENT_ONLY',
      imageSha256: frame.source.sha256,
      metadataSha256: canonicalSha256(metadata),
      completeCollectionVector: false,
      productionRegistered: false,
      tokenAssignment: null,
      publication: 'NOT_PUBLISHED_PLACEHOLDER_URI',
    },
  };
}

const generationEvidenceSchema = z
  .array(
    z.object({
      tool: z.literal('image_gen.imagegen'),
      outputSha256: sha256Schema,
      actualNativeDimensions: z.object({
        width: z.number().int().positive(),
        height: z.number().int().positive(),
      }),
      references: z
        .array(
          z.object({
            sha256: sha256Schema,
            role: z.enum([
              'PRIMARY_RASTER_REFERENCE',
              'SUPPORTING_APPROVED_RASTER_REFERENCE',
            ]),
          }),
        )
        .min(1)
        .max(8),
    }),
  )
  .min(1)
  .max(16);

export async function validateAuthoredSourceProposals(
  root: string,
  proposalInput: unknown,
  backlogInput: unknown,
  specInput: unknown,
  rawSpecSha256: string,
  expectedProposalSha256: string,
) {
  const snapshot = JSON.parse(JSON.stringify(proposalInput)) as unknown;
  const b = JSON.parse(JSON.stringify(backlogInput)) as unknown,
    s = JSON.parse(JSON.stringify(specInput)) as unknown;
  const backlogDigest = canonicalSha256(b),
    specDigest = canonicalSha256(s);
  requireProof(
    canonicalSha256(snapshot) === expectedProposalSha256,
    'PROPOSAL_SHA256',
  );
  const p = authoredSourceProposalSchema.parse(snapshot);
  const owner = await readProofEvidence(root, p.ownerEvidence),
    provenanceBytes = await readProofEvidence(root, p.provenanceEvidence);
  const result = resolveAuthoredSourceProposals(
    snapshot,
    b,
    s,
    rawSpecSha256,
    JSON.parse(owner.toString('utf8')),
  );
  const generations = generationEvidenceSchema.parse(
    JSON.parse(provenanceBytes.toString('utf8')),
  );
  const verified = [];
  for (const frame of result.resolved) {
    const matches = generations.filter(
      (g) => g.outputSha256 === frame.source.sha256,
    );
    requireProof(matches.length === 1, 'PROPOSAL_GENERATION_SOURCE');
    const g = matches[0]!;
    requireProof(
      g.actualNativeDimensions.width === frame.source.dimensions.width &&
        g.actualNativeDimensions.height === frame.source.dimensions.height &&
        g.references.length === frame.references.length &&
        frame.references.every((r) =>
          g.references.some((x) => x.sha256 === r.sha256 && x.role === r.role),
        ),
      'PROPOSAL_GENERATION_REFERENCES',
    );
    for (const ref of frame.references)
      await readProofEvidence(root, { path: ref.path, sha256: ref.sha256 });
    const native = await readProofEvidence(root, {
      path: frame.source.path,
      sha256: frame.source.sha256,
    });
    const decoded = await decodeApprovedPng(native, {
      id: `dev-png-${frame.asset.id}`,
      path: frame.source.path,
      sha256: frame.source.sha256,
      dimensions: frame.source.dimensions,
      channels: 3,
      colorPolicy: 'SRGB_8BIT_UNTAGGED_OR_STANDARD_SRGB',
      approval: {
        state: 'APPROVED_ART_DIRECTION',
        sha256: frame.source.sha256,
        evidence: p.ownerEvidence.path,
      },
      productionRegistered: false,
    });
    requireProof(
      canonicalSha256(proposalInput) === expectedProposalSha256,
      'PROPOSAL_MUTATED_INPUT',
    );
    requireProof(
      canonicalSha256(backlogInput) === backlogDigest &&
        canonicalSha256(specInput) === specDigest,
      'PROPOSAL_MUTATED_CONTEXT',
    );
    verified.push({
      id: frame.asset.id,
      dimensions: { width: decoded.width, height: decoded.height },
      nativeBytes: native.length,
      decodedBytes: decoded.decodedBytes,
      pixelSha256: sha256Bytes(decoded.bytes),
      ...createAuthoredProposalMetadata(frame, native),
    });
  }
  return {
    purpose: 'DEVELOPMENT_ONLY',
    proposalSha256: expectedProposalSha256,
    productionRegistered: false,
    verified,
  };
}
