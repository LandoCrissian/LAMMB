import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { z } from 'zod';
import { sha256Bytes } from '../src/canonical.ts';
import { productionSpecSchema } from '../src/production-spec.ts';
import { relativePathSchema, sha256Schema } from '../src/schema.ts';
import { readProofEvidence } from '../src/png-ingestion.ts';

const id = z.string().regex(/^[a-z][a-z0-9-]{1,159}$/);
const text = z.string().trim().min(1).max(2400);
const source = z.strictObject({
  id,
  path: relativePathSchema,
  sha256: sha256Schema,
  // Descriptive dimensions only; this does not expand the production decoder.
  dimensions: z.strictObject({
    width: z.number().int().positive().max(8192),
    height: z.number().int().positive().max(8192),
  }),
  role: z.enum([
    'SOURCE_ARTWORK',
    'NEGATIVE_QA_ONLY',
    'HISTORICAL_RASTER_DEPENDENCY',
    'PRIMARY_RASTER_REFERENCE',
    'SUPPORTING_APPROVED_RASTER_REFERENCE',
    'GENERATED_NATIVE_STUDY',
  ]),
});
export const artworkBacklogSchema = z
  .strictObject({
    schemaVersion: z.literal('lammb-artwork-backlog/1.0.0'),
    backlogVersion: z.enum(['0.1.0', '0.2.0', '0.3.0']),
    purpose: z.literal('ART_DEVELOPMENT_NOT_PRODUCTION_ASSIGNMENT'),
    mainSha: z.string().regex(/^[a-f0-9]{40}$/),
    collectionSupply: z.literal(5280),
    traitBibleVersion: z.literal('1.1.0'),
    traitBibleSha256: sha256Schema,
    grailReservationsChanged: z.literal(false),
    frequenciesChanged: z.literal(false),
    productionPromotionAuthorized: z.literal(false),
    evidence: z
      .array(
        z.strictObject({
          id,
          path: relativePathSchema,
          sha256: sha256Schema,
          bytes: z
            .number()
            .int()
            .nonnegative()
            .max(4 * 1024 * 1024),
          kind: text,
        }),
      )
      .min(1)
      .max(512),
    items: z
      .array(
        z.strictObject({
          id,
          label: text,
          kind: z.enum([
            'PRESERVED_ARTWORK',
            'QUARANTINED_REPAIR_EXPERIMENT',
            'EXISTING_TRAIT_REQUIREMENT',
            'PRODUCTION_GAP',
            'AUTHORIZED_NEW_STUDY',
          ]),
          family: text,
          sources: z.array(source).max(32),
          traitIds: z.array(id).max(9),
          artisticApproval: z.enum([
            'ART_DIRECTION_APPROVED',
            'CONDITIONAL_ART_APPROVAL',
            'REJECTED',
            'UNREVIEWED',
          ]),
          productionRegistration: z.literal('NOT_PRODUCTION_REGISTERED'),
          technicalStatus: text,
          knownLimitations: z.array(text).min(1).max(32),
          requiredImprovements: z.array(text).min(1).max(32),
          nextAction: text,
          ownerDecisionHistory: z
            .array(
              z.strictObject({
                id,
                authority: z.enum([
                  'INHERITED_OWNER_DIRECTIVE',
                  'CURRENT_OWNER_DIRECTIVE',
                  'TECHNICAL_ART_REVIEW',
                ]),
                decision: text,
                scope: text,
                evidence: id.nullable(),
                date: z.iso.datetime().nullable(),
              }),
            )
            .max(128),
          finalProductionApproval: z.null(),
          studyReview: z
            .strictObject({
              qaClassification: z.enum([
                'PRODUCTION_CANDIDATE',
                'NEEDS_REFINEMENT',
                'REJECTED',
              ]),
              ownerReviewStatus: z.literal('PENDING'),
              provenanceEvidence: id,
              compatibilityRestrictions: z.array(text).min(1).max(32),
            })
            .optional(),
        }),
      )
      .min(1)
      .max(4096),
  })
  .superRefine((b, ctx) => {
    const fail = (message: string) => ctx.addIssue({ code: 'custom', message });
    if (new Set(b.items.map((i) => i.id)).size !== b.items.length)
      fail('Duplicate backlog item ID');
    if (new Set(b.evidence.map((e) => e.id)).size !== b.evidence.length)
      fail('Duplicate evidence ID');
    const evidence = new Set(b.evidence.map((e) => e.id));
    for (const i of b.items) {
      if (new Set(i.sources.map((s) => s.id)).size !== i.sources.length)
        fail('Duplicate item source ID');
      if (
        new Set(i.ownerDecisionHistory.map((h) => h.id)).size !==
        i.ownerDecisionHistory.length
      )
        fail('Duplicate decision event');
      if (
        i.ownerDecisionHistory.some(
          (h) => h.evidence !== null && !evidence.has(h.evidence),
        )
      )
        fail('Unbound history evidence');
      if (i.kind === 'PRESERVED_ARTWORK' && !i.sources.length)
        fail('Preserved artwork requires exact source');
      if (
        i.artisticApproval === 'ART_DIRECTION_APPROVED' &&
        !i.ownerDecisionHistory.some(
          (h) =>
            h.authority !== 'TECHNICAL_ART_REVIEW' &&
            h.decision === 'ART_DIRECTION_APPROVED' &&
            h.evidence !== null,
        )
      )
        fail('Art approval requires inherited or explicit owner evidence');
      if (
        i.artisticApproval === 'REJECTED' &&
        (i.kind === 'AUTHORIZED_NEW_STUDY'
          ? !i.sources.some((s) => s.role === 'NEGATIVE_QA_ONLY') ||
            i.sources.some(
              (s) =>
                s.role === 'GENERATED_NATIVE_STUDY' ||
                s.role === 'SOURCE_ARTWORK',
            )
          : i.sources[0]?.role !== 'NEGATIVE_QA_ONLY')
      )
        fail('Rejected master cannot be a positive reference');
      if (
        i.kind === 'QUARANTINED_REPAIR_EXPERIMENT' &&
        i.sources.some((s) => s.role !== 'NEGATIVE_QA_ONLY')
      )
        fail('Quarantine cannot become a positive source');
      if (
        i.kind === 'AUTHORIZED_NEW_STUDY' &&
        !i.sources.some((s) => s.role === 'PRIMARY_RASTER_REFERENCE')
      )
        fail('Study requires primary raster reference');
      if (
        i.studyReview &&
        (!evidence.has(i.studyReview.provenanceEvidence) ||
          i.artisticApproval !== 'UNREVIEWED' ||
          i.technicalStatus !== i.studyReview.qaClassification)
      )
        fail(
          'Pending study review must bind provenance without owner approval',
        );
    }
  });

// Append-only owner-decision update. A prior rejection cannot be silently
// rehabilitated, and approved input references retain their original roles.
export function validateArtworkBacklogUpdate(previous: unknown, next: unknown) {
  const before = artworkBacklogSchema.parse(previous);
  const after = artworkBacklogSchema.parse(next);
  const same = (a: unknown, b: unknown) =>
    JSON.stringify(a) === JSON.stringify(b);
  if (
    before.items.length !== after.items.length ||
    !before.evidence.every((e, i) => same(e, after.evidence[i])) ||
    before.traitBibleSha256 !== after.traitBibleSha256 ||
    before.mainSha !== after.mainSha
  )
    throw new Error('BACKLOG_HISTORY_REWRITE');
  for (let index = 0; index < before.items.length; index++) {
    const a = before.items[index]!,
      b = after.items[index]!;
    if (
      a.id !== b.id ||
      a.kind !== b.kind ||
      a.family !== b.family ||
      !same(a.sources, b.sources) ||
      !same(a.traitIds, b.traitIds) ||
      !a.ownerDecisionHistory.every((h, i) =>
        same(h, b.ownerDecisionHistory[i]),
      ) ||
      (a.artisticApproval === 'REJECTED' && b.artisticApproval !== 'REJECTED')
    )
      throw new Error('BACKLOG_HISTORY_REWRITE');
    if (a.artisticApproval !== b.artisticApproval) {
      const event = b.ownerDecisionHistory.at(-1);
      if (
        b.ownerDecisionHistory.length <= a.ownerDecisionHistory.length ||
        event?.authority !== 'CURRENT_OWNER_DIRECTIVE' ||
        event.decision !== b.artisticApproval ||
        !event.evidence ||
        !event.date
      )
        throw new Error('BACKLOG_OWNER_TRANSITION');
    }
  }
  return after;
}

// Stage 23 adds new studies without rewriting the pinned Stage 22 snapshot.
// This is a bounded append contract, separate from owner-decision transitions.
export function validateArtworkStudyAppend(previous: unknown, next: unknown) {
  const before = artworkBacklogSchema.parse(previous);
  const after = artworkBacklogSchema.parse(next);
  const same = (a: unknown, b: unknown) =>
    JSON.stringify(a) === JSON.stringify(b);
  const root = (b: typeof before) => {
    const { backlogVersion, evidence, items, ...rest } = b;
    void backlogVersion;
    void evidence;
    void items;
    return rest;
  };
  const added = after.items.slice(before.items.length);
  if (
    before.backlogVersion !== '0.2.0' ||
    after.backlogVersion !== '0.3.0' ||
    added.length < 1 ||
    added.length > 3 ||
    !same(root(before), root(after)) ||
    !before.items.every((i, index) => same(i, after.items[index])) ||
    !before.evidence.every((e, index) => same(e, after.evidence[index]))
  )
    throw new Error('BACKLOG_STUDY_HISTORY_REWRITE');
  const approved = before.items
    .filter((i) => i.artisticApproval === 'ART_DIRECTION_APPROVED')
    .flatMap((i) => i.sources)
    .filter((s) =>
      ['SOURCE_ARTWORK', 'GENERATED_NATIVE_STUDY'].includes(s.role),
    );
  const priorHashes = new Set(
    before.items.flatMap((i) => i.sources.map((s) => s.sha256)),
  );
  const newEvidence = after.evidence.slice(before.evidence.length);
  const outputHashes = new Set<string>();
  for (const item of added) {
    const review = item.studyReview;
    const inputs = item.sources.filter((s) =>
      [
        'PRIMARY_RASTER_REFERENCE',
        'SUPPORTING_APPROVED_RASTER_REFERENCE',
      ].includes(s.role),
    );
    const outputs = item.sources.filter((s) => !inputs.includes(s));
    if (
      item.kind !== 'AUTHORIZED_NEW_STUDY' ||
      item.artisticApproval !== 'UNREVIEWED' ||
      !review ||
      outputs.length !== 1 ||
      inputs.filter((s) => s.role === 'PRIMARY_RASTER_REFERENCE').length !==
        1 ||
      !inputs.every((s) =>
        approved.some(
          (a) =>
            a.path === s.path &&
            a.sha256 === s.sha256 &&
            same(a.dimensions, s.dimensions),
        ),
      ) ||
      !newEvidence.some(
        (e) =>
          e.id === review.provenanceEvidence &&
          e.kind === 'IMAGEGEN_GENERATION_PROVENANCE',
      ) ||
      !item.ownerDecisionHistory.some(
        (h) =>
          h.authority === 'TECHNICAL_ART_REVIEW' &&
          h.decision === review.qaClassification &&
          h.evidence === review.provenanceEvidence &&
          h.date !== null,
      ) ||
      item.ownerDecisionHistory.some((h) =>
        ['ART_DIRECTION_APPROVED', 'CONDITIONAL_ART_APPROVAL'].includes(
          h.decision,
        ),
      )
    )
      throw new Error('BACKLOG_STUDY_PROVENANCE');
    const output = outputs[0]!;
    if (
      !output.path.endsWith('.png') ||
      output.role !==
        (review.qaClassification === 'REJECTED'
          ? 'NEGATIVE_QA_ONLY'
          : 'GENERATED_NATIVE_STUDY') ||
      priorHashes.has(output.sha256) ||
      outputHashes.has(output.sha256)
    )
      throw new Error('BACKLOG_STUDY_OUTPUT');
    outputHashes.add(output.sha256);
  }
  return after;
}

export function validateArtworkBacklog(
  input: unknown,
  specInput: unknown,
  exactSpecSha256: string,
) {
  const parsed = artworkBacklogSchema.safeParse(input);
  if (!parsed.success) throw new Error('ARTWORK_BACKLOG_SCHEMA');
  const b = parsed.data,
    spec = productionSpecSchema.parse(specInput);
  if (
    b.traitBibleSha256 !== exactSpecSha256 ||
    spec.specVersion !== b.traitBibleVersion ||
    spec.supply !== b.collectionSupply
  )
    throw new Error('ARTWORK_BACKLOG_SPEC_BINDING');
  const traits = new Set(spec.traits.map((t) => t.id));
  for (const i of b.items)
    if (
      i.traitIds.some((t) => !traits.has(t)) ||
      new Set(i.traitIds).size !== i.traitIds.length
    )
      throw new Error('ARTWORK_BACKLOG_UNKNOWN_TRAIT');
  return b;
}

// Source checks use the existing confined, bounded digest reader. These are hash
// checks, not PNG decoding, owner authentication or production promotion.
export async function verifyArtworkBacklogSources(
  root: string,
  input: unknown,
) {
  const b = artworkBacklogSchema.parse(input),
    declarations = [...b.evidence, ...b.items.flatMap((i) => i.sources)];
  const unique = new Map<string, { path: string; sha256: string }>();
  for (const d of declarations) {
    const old = unique.get(d.path);
    if (old && old.sha256 !== d.sha256)
      throw new Error('ARTWORK_BACKLOG_SOURCE_CONFLICT');
    unique.set(d.path, { path: d.path, sha256: d.sha256 });
  }
  for (const d of unique.values()) await readProofEvidence(root, d);
  return {
    declaredBindings: declarations.length,
    verifiedUniquePaths: unique.size,
    productionPromotions: 0,
  };
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href
) {
  const [backlogPath, specPath, root] = process.argv.slice(2);
  if (!backlogPath || !specPath)
    throw new Error(
      'Usage: artwork-backlog.ts BACKLOG SPEC [PRIVATE_STUDIO_ROOT]',
    );
  const bytes = await readFile(specPath);
  const b = validateArtworkBacklog(
    JSON.parse(await readFile(backlogPath, 'utf8')),
    JSON.parse(bytes.toString('utf8')),
    sha256Bytes(bytes),
  );
  const sources = root
    ? await verifyArtworkBacklogSources(root, b)
    : { status: 'PRIVATE_SOURCE_HASH_CHECK_NOT_REQUESTED' };
  console.log(
    JSON.stringify({
      status: 'PASS',
      items: b.items.length,
      sourceChecks: sources,
      productionRegistered: 0,
    }),
  );
}
