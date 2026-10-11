import { z } from 'zod';
import { canonicalJson, canonicalSha256, sha256Bytes } from './canonical.ts';
import {
  pngSourceSchema,
  readProofEvidence,
  requireProof,
} from './png-ingestion.ts';
import { pngProofSchema } from './png-proof-schema.ts';
import { loadPngProof, pngContactRenderer } from './png-proof.ts';
import { relativePathSchema, sha256Schema } from './schema.ts';
import { productionSpecSchema } from './production-spec.ts';
import { openSeaMetadataSchema } from './opensea-metadata.ts';

const id = z.string().regex(/^[a-z][a-z0-9-]{1,80}$/);
const pose = z.enum(['FRONT', 'ORIGINAL_THREE_QUARTER']);
const family = z.strictObject({
  pose,
  wool: z.enum(['IVORY_CURLS', 'ASH_CURLS', 'ROLLED_LOCKS', 'NOT_APPLICABLE']),
  expression: z.enum(['HEAVY_LIDDED_UNIMPRESSED', 'NOT_APPLICABLE']),
  clothing: z.enum(['BLACK_HOODIE', 'NOT_APPLICABLE']),
  accessory: z.enum(['NONE', 'EAR_TAG_5280']),
  mutation: z.literal('NONE'),
});
const asset = z.strictObject({
  id,
  source: pngSourceSchema,
  decodedDimensions: pngSourceSchema.shape.dimensions,
  classification: z.enum([
    'NATIVE_MASTER',
    'CONTACT_DERIVATIVE',
    'MASK_DERIVATIVE',
    'HISTORICAL_HYBRID',
  ]),
  role: z.enum(['BASE', 'CONTACT', 'MASK', 'HISTORICAL_OUTPUT']),
  families: family,
  state: z.enum([
    'ART_DIRECTION_APPROVED',
    'CONDITIONAL_ART_APPROVAL',
    'REJECTED',
    'RECONSTRUCTION_VALIDATED',
    'PRODUCTION_REGISTERED',
  ]),
  approvalEvidenceIds: z.array(id).min(1).max(16),
  reconstructionEvidenceIds: z.array(id).max(16),
  productionApproval: z.null(),
  dependencies: z.array(id).max(16),
  registrationIds: z.array(id).max(8),
  compatibleBaseIds: z.array(id).max(16),
  landmarks: z
    .array(
      z.strictObject({
        name: id,
        x: z.number().min(0).max(1254),
        y: z.number().min(0).max(1254),
        uncertaintyPx: z.number().positive().max(64),
        observation: z.literal('OBSERVED_MANUAL_PROXY'),
      }),
    )
    .max(32),
  framing: z.strictObject({
    policy: z.literal('PROPOSED_2_PERCENT_GUARD_8_PERCENT_ASPIRATION'),
    status: z.literal('NOT_PRODUCTION_CERTIFIED'),
    evidenceIds: z.array(id).min(1).max(8),
  }),
  provenance: z.strictObject({
    evidenceIds: z.array(id).min(1).max(16),
    sourcePreserved: z.literal(true),
    portableContactClaimed: z.literal(false),
  }),
});
const proof = z.strictObject({
  id,
  baseId: id,
  contactId: id,
  maskId: id,
  historicalOutputId: id,
  registration: pngProofSchema.shape.registration,
  visibleTraitIds: z.array(id).length(4),
});
const woolIds = {
  IVORY_CURLS: 'lammb-wool-ivory',
  ASH_CURLS: 'lammb-wool-ash',
  ROLLED_LOCKS: 'lammb-wool-locks',
} as const;
function visibleIds(base: z.infer<typeof asset>) {
  const wool = base.families.wool;
  requireProof(
    wool !== 'NOT_APPLICABLE' &&
      base.families.clothing === 'BLACK_HOODIE' &&
      base.families.expression === 'HEAVY_LIDDED_UNIMPRESSED' &&
      base.families.accessory === 'NONE',
    'VISIBLE_BASE_FAMILIES',
  );
  return [
    'lammb-base-anatomy-sheep',
    woolIds[wool],
    'lammb-clothing-hoodie',
    'lammb-accessories-ear-tag',
  ];
}
export const assetRegistrySchema = z
  .strictObject({
    schemaVersion: z.literal(1),
    registryVersion: z.literal('0.1.0'),
    purpose: z.literal('DEVELOPMENT_ONLY'),
    collectionSpecVersion: z.literal('1.1.0'),
    evidence: z
      .array(
        z.strictObject({
          id,
          path: relativePathSchema,
          sha256: sha256Schema,
          kind: z.enum([
            'ART_APPROVAL_RECORD',
            'RECONSTRUCTION_RECORD',
            'INVENTORY',
            'FRAMING_PROPOSAL',
          ]),
        }),
      )
      .min(1)
      .max(32),
    assets: z.array(asset).min(3).max(32),
    proofs: z.array(proof).min(1).max(8),
  })
  .superRefine((r, ctx) => {
    const fail = (message: string) => ctx.addIssue({ code: 'custom', message });
    const unique = (v: string[]) => new Set(v).size === v.length;
    if (
      !unique(r.assets.map((a) => a.id)) ||
      !unique(r.assets.map((a) => a.source.id)) ||
      !unique(r.assets.map((a) => a.source.path)) ||
      !unique(r.evidence.map((e) => e.id)) ||
      !unique(r.proofs.map((p) => p.id))
    )
      fail('Duplicate registry binding');
    const evidence = new Set(r.evidence.map((e) => e.id));
    const kinds = new Map(r.evidence.map((e) => [e.id, e.kind]));
    const assets = new Map(r.assets.map((a) => [a.id, a]));
    for (const a of r.assets) {
      if (
        a.approvalEvidenceIds.some(
          (e) =>
            !['ART_APPROVAL_RECORD', 'INVENTORY'].includes(kinds.get(e) ?? ''),
        ) ||
        a.reconstructionEvidenceIds.some(
          (e) => kinds.get(e) !== 'RECONSTRUCTION_RECORD',
        ) ||
        a.framing.evidenceIds.some((e) => kinds.get(e) !== 'FRAMING_PROPOSAL')
      )
        fail('Wrong evidence role');
      const classifications = {
        BASE: 'NATIVE_MASTER',
        CONTACT: 'CONTACT_DERIVATIVE',
        MASK: 'MASK_DERIVATIVE',
        HISTORICAL_OUTPUT: 'HISTORICAL_HYBRID',
      };
      if (a.classification !== classifications[a.role])
        fail('Source classification/role mismatch');
      if (a.state === 'PRODUCTION_REGISTERED')
        fail('Owner production promotion is not implemented or authorized');
      if (
        a.decodedDimensions.width !== a.source.dimensions.width ||
        a.decodedDimensions.height !== a.source.dimensions.height
      )
        fail('Decoded/source dimension mismatch');
      if (a.source.approval.sha256 !== a.source.sha256)
        fail('Approval hash mismatch');
      if (
        [
          ...a.approvalEvidenceIds,
          ...a.reconstructionEvidenceIds,
          ...a.framing.evidenceIds,
          ...a.provenance.evidenceIds,
        ].some((e) => !evidence.has(e))
      )
        fail('Missing evidence');
      if (
        !unique(a.dependencies) ||
        !unique(a.compatibleBaseIds) ||
        a.dependencies.some((d) => d === a.id || !assets.has(d))
      )
        fail('Invalid dependencies');
      if (
        !unique(a.registrationIds) ||
        a.registrationIds.some(
          (id) =>
            !r.proofs.some(
              (p) =>
                p.id === id &&
                [
                  p.baseId,
                  p.contactId,
                  p.maskId,
                  p.historicalOutputId,
                ].includes(a.id),
            ),
        )
      )
        fail('Invalid asset contact registration');
      if (a.compatibleBaseIds.some((b) => assets.get(b)?.role !== 'BASE'))
        fail('Invalid compatible base');
      if (
        a.landmarks.some(
          (l) =>
            l.x >= a.source.dimensions.width ||
            l.y >= a.source.dimensions.height,
        )
      )
        fail('Landmark outside source');
      if (
        a.state === 'RECONSTRUCTION_VALIDATED' &&
        !a.reconstructionEvidenceIds.length
      )
        fail('Missing reconstruction evidence');
    }
    const visiting = new Set<string>(),
      visited = new Set<string>();
    const visit = (a: string): boolean => {
      if (visiting.has(a)) return false;
      if (visited.has(a)) return true;
      visiting.add(a);
      if (!(assets.get(a)?.dependencies ?? []).every(visit)) return false;
      visiting.delete(a);
      visited.add(a);
      return true;
    };
    if (r.assets.some((a) => !visit(a.id))) fail('Cyclic dependencies');
    for (const p of r.proofs) {
      const b = assets.get(p.baseId),
        c = assets.get(p.contactId),
        m = assets.get(p.maskId),
        h = assets.get(p.historicalOutputId);
      if (!b || !c || !m || !h) {
        fail('Unregistered proof source');
        continue;
      }
      if ([b, c, m, h].some((a) => !a.registrationIds.includes(p.id)))
        fail('Missing asset contact registration');
      if (
        b.role !== 'BASE' ||
        b.state !== 'ART_DIRECTION_APPROVED' ||
        b.source.approval.state !== 'APPROVED_ART_DIRECTION' ||
        c.role !== 'CONTACT' ||
        m.role !== 'MASK' ||
        h.role !== 'HISTORICAL_OUTPUT' ||
        [c, m, h].some(
          (a) =>
            a.state !== 'RECONSTRUCTION_VALIDATED' ||
            a.source.approval.state !== 'VALIDATED_RECONSTRUCTION_INPUT',
        )
      )
        fail('Source role or approval mismatch');
      if (
        !c.compatibleBaseIds.includes(b.id) ||
        !m.compatibleBaseIds.includes(b.id) ||
        c.families.pose !== b.families.pose ||
        m.families.pose !== b.families.pose ||
        p.registration.poseFamily !== b.families.pose
      )
        fail('Incompatible pose/contact receiver');
      if (
        c.families.accessory !== 'EAR_TAG_5280' ||
        canonicalJson(h.families) !==
          canonicalJson({ ...b.families, accessory: 'EAR_TAG_5280' }) ||
        ![b.id, c.id, m.id].every((d) => h.dependencies.includes(d))
      )
        fail('Historical output family/dependency mismatch');
      if (
        h.source.channels !== 3 ||
        canonicalJson(h.source.dimensions) !==
          canonicalJson(b.source.dimensions)
      )
        fail('Historical native layout mismatch');
      try {
        if (canonicalJson(p.visibleTraitIds) !== canonicalJson(visibleIds(b)))
          fail('Wrong visible metadata facets');
        pngProofSchema.parse({
          schemaVersion: 1,
          purpose: 'DEVELOPMENT_ONLY',
          renderer: pngContactRenderer.descriptor,
          canvas: b.source.dimensions,
          base: b.source,
          joint: c.source,
          mask: m.source,
          registration: p.registration,
          expectedOutputSha256: h.source.sha256,
          productionRegistered: false,
        });
      } catch {
        fail('Invalid source-specific registration or visible families');
      }
    }
  });
export type AssetRegistry = z.infer<typeof assetRegistrySchema>;
export function resolveRegisteredProof(input: unknown, proofId: string) {
  const registry = assetRegistrySchema.parse(JSON.parse(canonicalJson(input)));
  const p = registry.proofs.find((p) => p.id === proofId);
  requireProof(p, 'UNREGISTERED_PROOF');
  const find = (id: string) => registry.assets.find((a) => a.id === id)!;
  const base = find(p.baseId),
    joint = find(p.contactId),
    mask = find(p.maskId),
    historical = find(p.historicalOutputId);
  const request = pngProofSchema.parse({
    schemaVersion: 1,
    purpose: 'DEVELOPMENT_ONLY',
    renderer: pngContactRenderer.descriptor,
    canvas: base.source.dimensions,
    base: base.source,
    joint: joint.source,
    mask: mask.source,
    registration: p.registration,
    expectedOutputSha256: historical.source.sha256,
    productionRegistered: false,
  });
  return {
    registry,
    registrySha256: canonicalSha256(registry),
    proof: p,
    request,
    historical,
  };
}

// Evidence bytes and the registry digest must be reviewed by a trusted caller.
// A locally forged approval JSON is not cryptographic owner authentication.
export async function renderRegisteredProof(
  root: string,
  input: unknown,
  proofId: string,
  expectedRegistrySha256: string,
) {
  const resolved = resolveRegisteredProof(input, proofId);
  requireProof(
    resolved.registrySha256 === expectedRegistrySha256,
    'REGISTRY_SHA256',
  );
  const evidenceStart = performance.now();
  for (const e of resolved.registry.evidence)
    await readProofEvidence(root, { path: e.path, sha256: e.sha256 });
  const evidenceVerificationMs = performance.now() - evidenceStart;
  const loadStart = performance.now();
  const sources = await loadPngProof(root, resolved.request);
  const sourceLoadMs = performance.now() - loadStart;
  const renderStart = performance.now();
  const rendered = await pngContactRenderer.render(resolved.request, sources);
  const rendererMs = performance.now() - renderStart;
  requireProof(
    canonicalSha256(input) === expectedRegistrySha256,
    'MUTATED_REGISTRY',
  );
  return {
    ...rendered,
    resolved,
    timings: { evidenceVerificationMs, sourceLoadMs, rendererMs },
    receipt: {
      ...rendered.receipt,
      registrySha256: expectedRegistrySha256,
      registryVersion: resolved.registry.registryVersion,
      proofId,
    },
  };
}
export function createRegisteredMetadata(
  specInput: unknown,
  registryInput: unknown,
  proofId: string,
  output: Uint8Array,
) {
  const r = resolveRegisteredProof(registryInput, proofId);
  requireProof(
    sha256Bytes(output) === r.request.expectedOutputSha256,
    'METADATA_IMAGE_SHA256',
  );
  const spec = productionSpecSchema.parse(specInput);
  requireProof(
    spec.specVersion === r.registry.collectionSpecVersion,
    'METADATA_SPEC_VERSION',
  );
  const attributes = r.proof.visibleTraitIds.flatMap((id) => {
    const t = spec.traits.find((t) => t.id === id);
    requireProof(t, 'METADATA_UNKNOWN_TRAIT');
    return t.metadata;
  });
  requireProof(attributes.length === 4, 'METADATA_FACETS');
  const metadata = openSeaMetadataSchema.parse({
    name: `LAMMB — Development Registered Proof ${proofId}`,
    description:
      'Unpublished source-bound ear-tag reconstruction. Visible traits only; no NFT assignment or production approval.',
    image: `https://artwork.invalid/lammb/${r.request.expectedOutputSha256}.png`,
    external_url: 'https://lammb.fun',
    attributes,
  });
  return {
    metadata,
    binding: {
      purpose: 'DEVELOPMENT_ONLY',
      registrySha256: r.registrySha256,
      proofId,
      imageSha256: sha256Bytes(output),
      metadataSha256: canonicalSha256(metadata),
      specSha256: canonicalSha256(spec),
      visibleTraitIds: r.proof.visibleTraitIds,
      publication: 'NOT_PUBLISHED_PLACEHOLDER_URI',
      tokenAssignment: null,
    },
  };
}
