import { z } from 'zod';
import { canonicalSha256, sha256Bytes } from './canonical.ts';
import {
  decodeApprovedPng,
  pngSourceSchema,
  readProofEvidence,
  readProofSource,
  requireProof,
} from './png-ingestion.ts';
import {
  renderRegisteredProof,
  resolveRegisteredProof,
} from './asset-registry.ts';
import { openSeaMetadataSchema } from './opensea-metadata.ts';
import {
  productionSpecSchema,
  visibleAttributeSchema,
} from './production-spec.ts';
import { relativePathSchema, sha256Schema } from './schema.ts';

const id = z.string().regex(/^[a-z][a-z0-9-]{1,80}$/);
const note = z.string().trim().min(1).max(1200);
const evidence = z.strictObject({
  path: relativePathSchema,
  sha256: sha256Schema,
});
export const pilotCandidateSchema = z
  .strictObject({
    id,
    label: note,
    mode: z.enum(['AUTHORED_FULL_FRAME', 'REGISTERED_CONTACT']),
    source: pngSourceSchema,
    historicalAssetId: id,
    proofId: id.nullable(),
    observed: z.strictObject({
      pose: note,
      expression: note,
      wool: note,
      clothing: note,
      accessories: note,
      mutation: note,
    }),
    visibleClaims: z
      .array(
        z.strictObject({
          traitId: id,
          facets: z
            .array(visibleAttributeSchema.shape.trait_type)
            .min(1)
            .max(8),
          observation: note,
        }),
      )
      .min(1)
      .max(9),
    unresolvedMetadata: z.array(note).max(16),
    qa: z.strictObject({
      proposedClass: z.enum([
        'PRODUCTION_CANDIDATE',
        'NEEDS_REFINEMENT',
        'REJECTED',
      ]),
      anatomy: note,
      framing: note,
      materials: note,
      thumbnail: note,
      defects: z.array(note).max(16),
      finalOwnerApproval: z.null(),
    }),
    productionRegistered: z.literal(false),
  })
  .superRefine((c, ctx) => {
    if ((c.mode === 'REGISTERED_CONTACT') !== (c.proofId !== null))
      ctx.addIssue({
        code: 'custom',
        message: 'Contact mode requires a registered proof only',
      });
    if (c.source.approval.state !== 'APPROVED_ART_DIRECTION')
      ctx.addIssue({
        code: 'custom',
        message: 'Pilot finals require artistic approval evidence',
      });
  });
export const productionPilotSchema = z
  .strictObject({
    schemaVersion: z.literal('lammb-development-pilot/1.0.0'),
    purpose: z.literal('DEVELOPMENT_ONLY'),
    collectionSupply: z.literal(5280),
    plannedNetwork: z.literal(
      'Robinhood Chain; no chain configuration or token assignment',
    ),
    specSha256: sha256Schema,
    approvalInventory: evidence,
    registrySha256: sha256Schema,
    framingPolicy: z.literal('2_PERCENT_DIAGNOSTIC_8_PERCENT_ASPIRATIONAL'),
    candidates: z.array(pilotCandidateSchema).min(1).max(20),
  })
  .superRefine((p, ctx) => {
    for (const values of [
      p.candidates.map((c) => c.id),
      p.candidates.map((c) => c.source.sha256),
    ])
      if (new Set(values).size !== values.length)
        ctx.addIssue({
          code: 'custom',
          message: 'Duplicate candidate identity or finished image',
        });
  });
export type PilotCandidate = z.infer<typeof pilotCandidateSchema>;

// A trusted operator pins this manifest digest. JSON approval records are evidence,
// not cryptographic owner authentication, and never grant production registration.
const inventoryRecord = z.object({
  assetId: z.string().regex(/^[a-z][a-z0-9-]{1,120}$/),
  sha256: sha256Schema,
  aliases: z.array(z.string()).min(1),
  principalArtwork: z.boolean(),
  approvalStatus: z.string(),
});
export async function verifyPilotApproval(
  root: string,
  manifest: unknown,
  candidateId: string,
  expectedManifestSha256: string,
) {
  const p = productionPilotSchema.parse(manifest);
  requireProof(
    canonicalSha256(p) === expectedManifestSha256,
    'PILOT_MANIFEST_SHA256',
  );
  const c = p.candidates.find((c) => c.id === candidateId);
  requireProof(c, 'UNDECLARED_PILOT_CANDIDATE');
  const bytes = await readProofEvidence(root, p.approvalInventory);
  const parsedRecords = z
    .object({ assets: z.array(inventoryRecord).max(4096) })
    .safeParse(JSON.parse(Buffer.from(bytes).toString('utf8')));
  requireProof(parsedRecords.success, 'PILOT_INVENTORY_SCHEMA');
  const records = parsedRecords.data;
  const matches = records.assets.filter(
    (a) => a.assetId === c.historicalAssetId,
  );
  requireProof(matches.length === 1, 'PILOT_APPROVAL_RECORD');
  const a = matches[0]!;
  requireProof(
    a.principalArtwork &&
      a.approvalStatus === 'APPROVED_ART_DIRECTION' &&
      a.sha256 === c.source.sha256,
    'PILOT_ART_APPROVAL',
  );
  // The confined reader below is authoritative for path safety. This comparison
  // additionally rejects replacement aliases that were never in the review record.
  const normalize = (s: string) =>
    s.replaceAll('\\', '/').replace(/\/$/, '').toLowerCase();
  const sourcePath = `${normalize(root)}/${normalize(c.source.path)}`;
  requireProof(
    a.aliases.some((s) => normalize(s) === sourcePath),
    'PILOT_REVIEWED_PATH',
  );
  return { manifest: p, candidate: c };
}

export function createPilotMetadata(
  specInput: unknown,
  candidateInput: unknown,
  output: Uint8Array,
) {
  const spec = productionSpecSchema.parse(specInput);
  const c = pilotCandidateSchema.parse(candidateInput);
  requireProof(
    sha256Bytes(output) === c.source.sha256,
    'PILOT_METADATA_IMAGE_SHA256',
  );
  const selected = c.visibleClaims.map((claim) => {
    const trait = spec.traits.find((t) => t.id === claim.traitId);
    requireProof(trait, 'PILOT_UNKNOWN_TRAIT');
    requireProof(!/-none$/.test(trait.id), 'PILOT_ABSENT_TRAIT');
    requireProof(
      new Set(claim.facets).size === claim.facets.length &&
        claim.facets.every((f) =>
          trait.metadata.some((m) => m.trait_type === f),
        ),
      'PILOT_UNKNOWN_FACET',
    );
    // Bundles are all-or-nothing visible configurations, never arbitrary layering.
    if (trait.category === 'accessories')
      requireProof(
        claim.facets.length === trait.metadata.length,
        'PILOT_INCOMPLETE_BUNDLE',
      );
    return { trait, claim };
  });
  requireProof(
    new Set(selected.map((s) => s.trait.category)).size === selected.length,
    'PILOT_DUPLICATE_CATEGORY',
  );
  const ids = new Set(selected.map((s) => s.trait.id));
  const tags = new Set(selected.flatMap((s) => s.trait.tags));
  for (const { trait } of selected) {
    requireProof(
      !trait.incompatibleTraitIds.some((i) => ids.has(i)) &&
        !trait.excludesTags.some((t) => tags.has(t)),
      'PILOT_INCOMPATIBLE_TRAITS',
    );
    requireProof(
      trait.requiresTraitIds.every((i) => ids.has(i)) &&
        trait.requiresTags.every((t) => tags.has(t)),
      'PILOT_MISSING_REQUIRED_TRAIT',
    );
    for (const effect of trait.mutation?.categoryEffects ?? []) {
      const other = selected.find((s) => s.trait.category === effect.category);
      if (other)
        requireProof(
          effect.allowedTraitIds.includes(other.trait.id),
          'PILOT_MUTATION_CATEGORY',
        );
    }
  }
  const attributes = selected.flatMap((s) =>
    s.trait.metadata.filter((m) => s.claim.facets.includes(m.trait_type)),
  );
  const metadata = openSeaMetadataSchema.parse({
    name: `LAMMB — Development Study ${c.label}`,
    description:
      'Unpublished artwork pilot. Reviewed visible facets only; incomplete collection trait assignment. No token, allocation, rarity or production approval.',
    image: `https://artwork.invalid/lammb/${c.source.sha256}.png`,
    external_url: 'https://lammb.fun',
    attributes,
  });
  return {
    metadata,
    binding: {
      purpose: 'DEVELOPMENT_ONLY',
      candidateId: c.id,
      imageSha256: c.source.sha256,
      metadataSha256: canonicalSha256(metadata),
      specSha256: canonicalSha256(spec),
      reviewedClaims: c.visibleClaims,
      unresolvedMetadata: c.unresolvedMetadata,
      completeCollectionVector: false,
      tokenAssignment: null,
      publication: 'NOT_PUBLISHED_PLACEHOLDER_URI',
      productionRegistered: false,
    },
  };
}

export async function renderPilotCandidate(
  root: string,
  manifest: unknown,
  candidateId: string,
  expectedManifestSha256: string,
  specInput: unknown,
  registry: unknown,
) {
  const started = performance.now();
  const { manifest: p, candidate: c } = await verifyPilotApproval(
    root,
    manifest,
    candidateId,
    expectedManifestSha256,
  );
  requireProof(c.qa.proposedClass !== 'REJECTED', 'PILOT_REJECTED_CANDIDATE');
  requireProof(
    canonicalSha256(productionSpecSchema.parse(specInput)) === p.specSha256,
    'PILOT_SPEC_SHA256',
  );
  const source = await readProofSource(root, c.source);
  const decodeStart = performance.now();
  const decoded = await decodeApprovedPng(source, c.source);
  const decodingMs = performance.now() - decodeStart;
  let output = source;
  let reconstruction: unknown = {
    method: 'IMMUTABLE_AUTHORED_BYTES',
    outsideSourceChanges: 0,
  };
  if (c.mode === 'REGISTERED_CONTACT') {
    const resolved = resolveRegisteredProof(registry, c.proofId!);
    requireProof(
      resolved.registrySha256 === p.registrySha256 &&
        resolved.request.expectedOutputSha256 === c.source.sha256 &&
        resolved.historical.source.path === c.source.path,
      'PILOT_REGISTRY_BINDING',
    );
    requireProof(
      resolved.proof.visibleTraitIds.every((id) =>
        c.visibleClaims.some((v) => v.traitId === id),
      ) && resolved.proof.visibleTraitIds.length === c.visibleClaims.length,
      'PILOT_CONTACT_METADATA_BINDING',
    );
    const first = await renderRegisteredProof(
      root,
      registry,
      c.proofId!,
      p.registrySha256,
    );
    const replay = await renderRegisteredProof(
      root,
      registry,
      c.proofId!,
      p.registrySha256,
    );
    requireProof(
      Buffer.from(first.output).equals(Buffer.from(replay.output)) &&
        Buffer.from(first.output).equals(Buffer.from(source)),
      'PILOT_RECONSTRUCTION',
    );
    output = Buffer.from(first.output);
    reconstruction = {
      method: 'REGISTERED_SOURCE_SPECIFIC_CONTACT',
      first: first.receipt,
      replay: replay.receipt,
      timings: first.timings,
      replayTimings: replay.timings,
      exactHistoricalBytes: true,
    };
  }
  requireProof(sha256Bytes(output) === c.source.sha256, 'PILOT_OUTPUT_SHA256');
  requireProof(
    canonicalSha256(manifest) === expectedManifestSha256,
    'PILOT_MUTATED_MANIFEST',
  );
  const meta = createPilotMetadata(specInput, c, output);
  return {
    bytes: output,
    candidate: c,
    ...meta,
    receipt: {
      manifestSha256: expectedManifestSha256,
      candidateId: c.id,
      mode: c.mode,
      imageSha256: c.source.sha256,
      decodedPixelSha256: sha256Bytes(decoded.bytes),
      dimensions: c.source.dimensions,
      sourceBytes: source.length,
      decodedBytes: decoded.decodedBytes,
      outputBytes: output.length,
      decodingMs,
      totalMs: performance.now() - started,
      reconstruction,
      productionRegistered: false,
    },
  };
}
