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
import { validateArtworkBacklog } from './artwork-backlog.ts';

const id = z.string().regex(/^[a-z][a-z0-9-]{1,159}$/);
const evidence = z.strictObject({
  path: relativePathSchema,
  sha256: sha256Schema,
});
// Validate the fields consumed from the preserved, richer ImageGen receipt.
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
export const mutationOwnerDecisionsSchema = z
  .strictObject({
    schemaVersion: z.literal('lammb-stage22-owner-decisions/1.0.0'),
    recordedAt: z.iso.datetime(),
    authority: z.literal('CURRENT_OWNER_DIRECTIVE'),
    authentication: z.literal(
      'TRUSTED_OPERATOR_TRANSCRIPTION_NOT_SIGNED_OWNER_AUTH',
    ),
    productionApproval: z.literal(false),
    decisions: z
      .array(
        z.strictObject({
          backlogId: id,
          sourceSha256: sha256Schema,
          decision: z.enum(['ART_DIRECTION_APPROVED', 'REJECTED']),
          scope: z.literal('ART_DIRECTION_ONLY_NOT_PRODUCTION_REGISTRATION'),
          instruction: z.string().min(1).max(1200),
        }),
      )
      .min(1)
      .max(16),
  })
  .superRefine((r, ctx) => {
    if (
      new Set(r.decisions.map((d) => d.backlogId)).size !== r.decisions.length
    )
      ctx.addIssue({ code: 'custom', message: 'Duplicate owner decision' });
  });

// A bounded authored-source declaration, not an extension of Stage 17's
// contact registry. These frames cannot be resolved as ordinary hoodie layers.
export const authoredMutationRegistrySchema = z
  .strictObject({
    schemaVersion: z.literal('lammb-authored-mutation-development/1.0.0'),
    purpose: z.literal('DEVELOPMENT_ONLY'),
    specSha256: sha256Schema,
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
            'MAGMA_INTEGRATED_HOODIE',
            'NORMAL_LOCALIZED_PIXEL_DRIP',
          ]),
          sourceMode: z.literal('IMMUTABLE_FULL_FRAME'),
          pose: z.literal('FRONT'),
          registrationState: z.literal('ART_DIRECTION_APPROVED'),
          productionRegistered: z.literal(false),
          contactReuse: z.literal('NONE_VALIDATED'),
          coverage: z.enum(['NOT_APPLICABLE', 'REQUIRES_VALIDATION']),
          visibleTraitIds: z.array(id).min(1).max(4),
        }),
      )
      .min(1)
      .max(16),
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
          message: `Duplicate authored ${field}`,
        });
  });

export function resolveAuthoredMutations(
  registryInput: unknown,
  backlogInput: unknown,
  specInput: unknown,
  rawSpecSha256: string,
  ownerInput: unknown,
) {
  const registry = authoredMutationRegistrySchema.parse(registryInput);
  requireProof(registry.specSha256 === rawSpecSha256, 'AUTHORED_SPEC_BINDING');
  requireProof(
    canonicalSha256(specInput) === registry.specCanonicalSha256,
    'AUTHORED_SPEC_CONTENT',
  );
  requireProof(
    canonicalSha256(backlogInput) === registry.backlogSha256,
    'AUTHORED_BACKLOG_CONTENT',
  );
  const backlog = validateArtworkBacklog(
    backlogInput,
    specInput,
    rawSpecSha256,
  );
  const spec = productionSpecSchema.parse(specInput);
  const owner = mutationOwnerDecisionsSchema.parse(ownerInput);
  requireProof(
    backlog.evidence.some(
      (e) =>
        e.path === registry.ownerEvidence.path &&
        e.sha256 === registry.ownerEvidence.sha256,
    ),
    'AUTHORED_OWNER_EVIDENCE',
  );
  requireProof(
    backlog.evidence.some(
      (e) =>
        e.path === registry.provenanceEvidence.path &&
        e.sha256 === registry.provenanceEvidence.sha256,
    ),
    'AUTHORED_PROVENANCE',
  );
  const rejectedHashes = new Set(
    backlog.items.flatMap((i) =>
      i.sources
        .filter((s) => s.role === 'NEGATIVE_QA_ONLY')
        .map((s) => s.sha256),
    ),
  );
  const resolved = registry.assets.map((asset) => {
    const item = backlog.items.find((i) => i.id === asset.backlogId);
    requireProof(
      item?.artisticApproval === 'ART_DIRECTION_APPROVED',
      'AUTHORED_APPROVAL',
    );
    const source = item.sources.find((s) => s.id === asset.sourceId);
    requireProof(
      source?.role === 'GENERATED_NATIVE_STUDY' &&
        source.sha256 === asset.sourceSha256 &&
        !rejectedHashes.has(source.sha256),
      'AUTHORED_SOURCE',
    );
    const decision = owner.decisions.find((d) => d.backlogId === item.id);
    const event = item.ownerDecisionHistory.at(-1);
    const declaredEvidence = backlog.evidence.find(
      (e) => e.id === event?.evidence,
    );
    requireProof(
      decision?.decision === 'ART_DIRECTION_APPROVED' &&
        decision.sourceSha256 === source.sha256 &&
        event?.decision === decision.decision &&
        event.authority === owner.authority &&
        event.date === owner.recordedAt &&
        declaredEvidence?.path === registry.ownerEvidence.path &&
        declaredEvidence.sha256 === registry.ownerEvidence.sha256,
      'AUTHORED_OWNER_BINDING',
    );
    const magma = asset.family === 'MAGMA_INTEGRATED_HOODIE';
    const expectedTraits = magma
      ? [
          'lammb-base-anatomy-sheep',
          'lammb-clothing-hoodie',
          'lammb-mutations-magma',
        ]
      : ['lammb-base-anatomy-sheep', 'lammb-clothing-hoodie'];
    requireProof(
      item.id ===
        (magma
          ? 'backlog-study21-magma-hoodie'
          : 'backlog-study21-refined-pixel-drip') &&
        item.family === (magma ? 'MAGMA' : 'PIXEL_CORRUPTION') &&
        asset.coverage === (magma ? 'NOT_APPLICABLE' : 'REQUIRES_VALIDATION') &&
        JSON.stringify([...asset.visibleTraitIds].sort()) ===
          JSON.stringify(expectedTraits.sort()),
      'AUTHORED_FAMILY_FACETS',
    );
    const traits = asset.visibleTraitIds.map((traitId) => {
      const trait = spec.traits.find((t) => t.id === traitId);
      requireProof(trait, 'AUTHORED_UNKNOWN_TRAIT');
      return trait;
    });
    const restrictions = magma
      ? spec.traits
          .find((t) => t.id === 'lammb-mutations-magma')!
          .mutation!.categoryEffects.find((e) => e.category === 'clothing')!
      : null;
    const compatibility =
      restrictions &&
      !restrictions.allowedTraitIds.includes('lammb-clothing-hoodie')
        ? 'BLOCKED_BY_EXISTING_MAGMA_CLOTHING_RULE'
        : 'INCOMPLETE_TRAIT_VECTOR';
    const references = item.sources.filter(
      (s) =>
        s.role === 'PRIMARY_RASTER_REFERENCE' ||
        s.role === 'SUPPORTING_APPROVED_RASTER_REFERENCE',
    );
    requireProof(
      references.length === 2 &&
        references.every((s) => !rejectedHashes.has(s.sha256)),
      'AUTHORED_REFERENCE_BINDING',
    );
    return { asset, source, traits, compatibility, references };
  });
  return { registry, resolved };
}

export function createAuthoredDevelopmentMetadata(
  resolved: ReturnType<typeof resolveAuthoredMutations>['resolved'][number],
  nativeBytes: Uint8Array,
) {
  requireProof(
    sha256Bytes(nativeBytes) === resolved.source.sha256,
    'AUTHORED_METADATA_IMAGE',
  );
  const metadata = openSeaMetadataSchema.parse({
    name: `LAMMB — Development Art Study ${resolved.asset.id}`,
    description:
      'Unpublished authored art study. Partial visible traits only; not an eligible collection vector, NFT assignment or production registration.',
    image: `https://artwork.invalid/lammb/${resolved.source.sha256}.png`,
    external_url: 'https://lammb.fun',
    attributes: resolved.traits.flatMap((t) => t.metadata),
  });
  return {
    metadata,
    binding: {
      purpose: 'DEVELOPMENT_ONLY',
      imageSha256: resolved.source.sha256,
      metadataSha256: canonicalSha256(metadata),
      compatibility: resolved.compatibility,
      completeCollectionVector: false,
      productionRegistered: false,
      omittedFacets: [
        'Eyes',
        'Expression',
        'Wool',
        'Background',
        'Accessories',
        'Pixel Corruption',
      ],
      publication: 'NOT_PUBLISHED_PLACEHOLDER_URI',
    },
  };
}

export async function validateAuthoredMutationSources(
  root: string,
  registryInput: unknown,
  backlogInput: unknown,
  specInput: unknown,
  rawSpecSha256: string,
  expectedRegistrySha256: string,
) {
  // Snapshot before I/O and bind both snapshot and caller input after awaits.
  const snapshot = JSON.parse(JSON.stringify(registryInput)) as unknown;
  const backlogSnapshot = JSON.parse(JSON.stringify(backlogInput)) as unknown;
  const specSnapshot = JSON.parse(JSON.stringify(specInput)) as unknown;
  const backlogDigest = canonicalSha256(backlogSnapshot),
    specDigest = canonicalSha256(specSnapshot);
  requireProof(
    canonicalSha256(snapshot) === expectedRegistrySha256,
    'AUTHORED_REGISTRY_SHA256',
  );
  const registry = authoredMutationRegistrySchema.parse(snapshot);
  const ownerBytes = await readProofEvidence(root, registry.ownerEvidence);
  const provenanceBytes = await readProofEvidence(
    root,
    registry.provenanceEvidence,
  );
  const result = resolveAuthoredMutations(
    snapshot,
    backlogSnapshot,
    specSnapshot,
    rawSpecSha256,
    JSON.parse(ownerBytes.toString('utf8')),
  );
  const parsedProvenance = generationEvidenceSchema.safeParse(
    JSON.parse(provenanceBytes.toString('utf8')),
  );
  requireProof(parsedProvenance.success, 'AUTHORED_GENERATION_SCHEMA');
  const provenance = parsedProvenance.data;
  const verified = [];
  for (const asset of result.resolved) {
    const generation = provenance.filter(
      (g) => g.outputSha256 === asset.source.sha256,
    );
    requireProof(generation.length === 1, 'AUTHORED_GENERATION_BINDING');
    requireProof(
      generation[0]!.actualNativeDimensions.width ===
        asset.source.dimensions.width &&
        generation[0]!.actualNativeDimensions.height ===
          asset.source.dimensions.height &&
        generation[0]!.references.length === asset.references.length &&
        asset.references.every((s) =>
          generation[0]!.references.some(
            (r) => r.sha256 === s.sha256 && r.role === s.role,
          ),
        ),
      'AUTHORED_REFERENCE_BINDING',
    );
    for (const reference of asset.references)
      await readProofEvidence(root, {
        path: reference.path,
        sha256: reference.sha256,
      });
    const native = await readProofEvidence(root, {
      path: asset.source.path,
      sha256: asset.source.sha256,
    });
    const decoded = await decodeApprovedPng(native, {
      id: `dev-png-${asset.asset.id}`,
      path: asset.source.path,
      sha256: asset.source.sha256,
      dimensions: asset.source.dimensions,
      channels: 3,
      colorPolicy: 'SRGB_8BIT_UNTAGGED_OR_STANDARD_SRGB',
      approval: {
        state: 'APPROVED_ART_DIRECTION',
        sha256: asset.source.sha256,
        evidence: registry.ownerEvidence.path,
      },
      productionRegistered: false,
    });
    requireProof(
      canonicalSha256(registryInput) === expectedRegistrySha256,
      'AUTHORED_MUTATED_REGISTRY',
    );
    requireProof(
      canonicalSha256(backlogInput) === backlogDigest &&
        canonicalSha256(specInput) === specDigest,
      'AUTHORED_MUTATED_CONTEXT',
    );
    verified.push({
      id: asset.asset.id,
      imageSha256: asset.source.sha256,
      dimensions: { width: decoded.width, height: decoded.height },
      bytes: native.length,
      decodedBytes: decoded.decodedBytes,
      pixelSha256: sha256Bytes(decoded.bytes),
      ...createAuthoredDevelopmentMetadata(asset, native),
    });
  }
  return {
    purpose: 'DEVELOPMENT_ONLY',
    registrySha256: expectedRegistrySha256,
    specRawSha256: rawSpecSha256,
    specCanonicalSha256: registry.specCanonicalSha256,
    backlogSha256: registry.backlogSha256,
    ownerEvidenceSha256: registry.ownerEvidence.sha256,
    generationEvidenceSha256: registry.provenanceEvidence.sha256,
    verified,
    productionRegisteredCount: 0,
  };
}
