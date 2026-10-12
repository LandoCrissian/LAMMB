import { mkdtemp, mkdir, writeFile, rm, symlink } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { basename, dirname, join, resolve } from 'node:path';
import { deflateSync } from 'node:zlib';
import sharp from 'sharp';
import { beforeAll, describe, expect, it } from 'vitest';
import spec from '../packages/art-generator/specs/lammb-traits-v1.json';
import {
  canonicalSha256,
  sha256Bytes,
} from '../packages/art-generator/src/canonical.ts';
import {
  decodeApprovedPng,
  inspectPng,
  pngProofBudget,
  readProofSource,
} from '../packages/art-generator/src/png-ingestion.ts';
import {
  configurePngProofWorker,
  pngContactRenderer,
} from '../packages/art-generator/src/png-proof.ts';
import { pngProofSchema } from '../packages/art-generator/src/png-proof-schema.ts';
import type { PngProofRequest } from '../packages/art-generator/src/png-proof-schema.ts';
import { createPngProofMetadata } from '../packages/art-generator/src/png-proof-metadata.ts';
import recipeReviews from '../packages/art-generator/fixtures/stage30-recipe-reviews.json';
import bindingEvidence from '../packages/art-generator/fixtures/stage31-trait-bindings.json';
import sourceExtension from '../packages/art-generator/fixtures/stage31b-source-trait-extension.json';
import metadataProposals from '../docs/art-production/STAGE31B_METADATA_PROPOSALS.json';
import ownerSourceApprovals from '../docs/art-production/STAGE31C_OWNER_APPROVAL_HISTORY.json';
import approvedSourceCatalog from '../packages/art-generator/fixtures/stage31c-approved-source-catalog.json';
import completeRecipeSnapshots from '../docs/art-production/STAGE31C_COMPLETE_RECIPES.json';
import {
  developmentCatalog,
  sourceBoundDevelopmentCatalog,
} from '../packages/art-generator/fixtures/development-catalog.ts';
import { simulationInputs } from '../packages/art-generator/src/production-spec.ts';
import {
  approvedSourceCatalogSchema,
  createApprovedSourceCatalog,
  createCompleteSourceRecipe,
  sourceApprovalHistorySchema,
  validateApprovedSourceCatalog,
  validateCompleteSourceRecipe,
} from '../packages/art-generator/tooling/approved-source-traits.ts';
import { openSeaMetadataSchema } from '../packages/art-generator/src/opensea-metadata.ts';
import {
  createSourceBoundMetadataProposal,
  sourceTraitExtensionSchema,
  validateSourceBoundMetadataProposal,
  validateSourceTraitExtension,
} from '../packages/art-generator/tooling/source-trait-extension.ts';
import {
  assessRegistrationReadiness,
  measureNativeRegion,
  requireUniqueRegistrationOutputs,
  traitBindingSchema,
  validateRegistrationExample,
  validateTraitBinding,
} from '../packages/art-generator/tooling/trait-binding.ts';
import stage16Request from '../packages/art-generator/fixtures/stage16-png-proof.json';
import stage17Registry from '../packages/art-generator/fixtures/stage17-asset-registry.json';
import { resolveRegisteredProof } from '../packages/art-generator/src/asset-registry.ts';
import {
  recipeReviewSchema,
  reconcileRecipeAcceptance,
} from '../packages/art-generator/tooling/recipe-acceptance.ts';

// Tiny synthetic pixels only: no collection artwork, production approval or GPU.
const encode = (bytes: Buffer, w: number, h: number, c: 3 | 4) =>
  sharp(bytes, { raw: { width: w, height: h, channels: c } })
    .png({ compressionLevel: 9, adaptiveFiltering: false, palette: false })
    .toBuffer();
let request: PngProofRequest;
let sources: Map<string, Uint8Array>;
let expectedRaw: Buffer;
beforeAll(async () => {
  configurePngProofWorker();
  const raw = Buffer.alloc(5 * 5 * 3);
  for (let i = 0; i < raw.length; i += 3) {
    raw[i] = 50;
    raw[i + 1] = 100;
    raw[i + 2] = 150;
  }
  const joint = Buffer.alloc(3 * 3 * 4);
  joint.set([200, 50, 20, 128], 4 * 4);
  const mask = Buffer.alloc(5 * 5 * 3);
  mask.set([128, 128, 128], (2 * 5 + 2) * 3);
  expectedRaw = Buffer.from(raw);
  expectedRaw.set([125, 75, 85], (2 * 5 + 2) * 3);
  const data = await Promise.all([
    encode(raw, 5, 5, 3),
    encode(joint, 3, 3, 4),
    encode(mask, 5, 5, 3),
  ]);
  const declaration = (
    id: string,
    b: Buffer,
    w: number,
    h: number,
    c: 3 | 4,
    state: 'APPROVED_ART_DIRECTION' | 'VALIDATED_RECONSTRUCTION_INPUT',
  ) => ({
    id,
    path: id + '.png',
    sha256: sha256Bytes(b),
    dimensions: { width: w, height: h },
    channels: c,
    colorPolicy: 'SRGB_8BIT_UNTAGGED_OR_STANDARD_SRGB',
    approval: {
      state,
      sha256: sha256Bytes(b),
      evidence: 'Synthetic unit test; never approved collection art',
    },
    productionRegistered: false,
  });
  const base = declaration(
      'dev-png-test-base',
      data[0]!,
      5,
      5,
      3,
      'APPROVED_ART_DIRECTION',
    ),
    jointSource = declaration(
      'dev-png-test-joint',
      data[1]!,
      3,
      3,
      4,
      'VALIDATED_RECONSTRUCTION_INPUT',
    ),
    maskSource = declaration(
      'dev-png-test-mask',
      data[2]!,
      5,
      5,
      3,
      'VALIDATED_RECONSTRUCTION_INPUT',
    );
  request = pngProofSchema.parse({
    schemaVersion: 1,
    purpose: 'DEVELOPMENT_ONLY',
    renderer: { id: 'png-contact-proof', version: '1.0.0' },
    canvas: { width: 5, height: 5 },
    base,
    joint: jointSource,
    mask: maskSource,
    registration: {
      poseFamily: 'FRONT',
      baseSha256: base.sha256,
      jointSha256: jointSource.sha256,
      maskSha256: maskSource.sha256,
      roi: { x: 1, y: 1, width: 3, height: 3 },
      polygon: [
        [1, 1],
        [4, 1],
        [4, 4],
        [1, 4],
      ],
      transform: 'IDENTITY_NO_RESAMPLING',
      colorMath: 'SRGB_BYTE_INTEGER_SOURCE_OVER',
      alpha: 'STRAIGHT_RGBA_ZERO_RGB_AT_ZERO_ALPHA',
      maskPolicy: 'EXACT_SAVED_MASK_EQUALS_JOINT_ALPHA',
      evidence: 'Synthetic contact',
    },
    expectedOutputSha256: sha256Bytes(await encode(expectedRaw, 5, 5, 3)),
    productionRegistered: false,
  });
  sources = new Map([
    [base.id, data[0]!],
    [jointSource.id, data[1]!],
    [maskSource.id, data[2]!],
  ]);
});

describe('Stage31C owner-approved source catalog and complete recipes', () => {
  // Synthetic receipts test reconciliation/security only. Private native
  // acceptance independently decodes and reconstructs all four real PNGs.
  const raw = Buffer.alloc(1254 * 1254 * 3, 40);
  const context = (i = 0) => {
    const row = structuredClone(recipeReviews.recipes[i]!),
      cohort = structuredClone(bindingEvidence),
      proposal = structuredClone(sourceExtension),
      history = structuredClone(ownerSourceApprovals),
      out = Buffer.from('synthetic complete recipe ' + i),
      e = traitBindingSchema.parse(cohort.records[i]!.evidence);
    row.request.expectedOutputSha256 = sha256Bytes(out);
    row.review.requestSha256 = canonicalSha256(row.request);
    row.reviewSha256 = canonicalSha256(row.review);
    e.outputSha256 = sha256Bytes(out);
    e.requestSha256 = canonicalSha256(row.request);
    e.reviewSha256 = row.reviewSha256;
    e.decodedSourcePixelSha256 = sha256Bytes(raw);
    for (const r of [...e.eyes.regions, ...e.background.regions])
      r.pixelSha256 = measureNativeRegion(raw, 1254, 1254, r.roi).pixelSha256;
    cohort.records[i] = {
      ...cohort.records[i]!,
      evidence: e,
      evidenceSha256: canonicalSha256(e),
    };
    proposal.bindings[i]!.outputSha256 = e.outputSha256;
    proposal.bindings[i]!.evidenceSha256 = canonicalSha256(e);
    proposal.priorEvidenceCohortSha256 = canonicalSha256(cohort);
    const sources = cohort.records.map(({ evidence: r, evidenceSha256 }) => ({
      proofId: r.proofId,
      sourceSha256: r.sourceSha256,
      outputSha256: r.outputSha256,
      evidenceSha256,
      requestSha256: r.requestSha256,
    }));
    for (const event of history.events) {
      event.proposalSha256 = canonicalSha256(proposal);
      event.sources = structuredClone(sources);
    }
    history.events[1]!.previousEventSha256 = canonicalSha256(history.events[0]);
    const catalogArgs: Parameters<typeof createApprovedSourceCatalog> = [
        history,
        proposal,
        cohort,
        spec,
        canonicalSha256(history),
        canonicalSha256(proposal),
      ],
      catalog = createApprovedSourceCatalog(...catalogArgs);
    const recipeArgs: Parameters<typeof assessRegistrationReadiness> = [
      e,
      row,
      spec,
      raw,
      out,
      canonicalSha256(e),
    ];
    return {
      row,
      e,
      cohort,
      proposal,
      history,
      catalog,
      catalogArgs,
      recipeArgs,
    };
  };
  const create = (c: ReturnType<typeof context>) =>
    createCompleteSourceRecipe(c.catalog, c.catalogArgs, c.recipeArgs);
  it('exports two unweighted source-approved traits alongside an unchanged generator catalog', () => {
    expect(developmentCatalog.traits).toHaveLength(0);
    expect(sourceBoundDevelopmentCatalog).toEqual(
      approvedSourceCatalogSchema.parse(approvedSourceCatalog),
    );
    expect(sourceBoundDevelopmentCatalog.traits.map((t) => t.id)).toEqual([
      'lammb-source-eyes-olive-green',
      'lammb-source-environments-charcoal-studio-gradient',
    ]);
    for (const t of sourceBoundDevelopmentCatalog.traits) {
      expect(t.sources).toHaveLength(4);
      expect(t.selectionWeight).toBeNull();
      expect(t.plannedCount).toBeNull();
      expect(t.generatorEnabled).toBe(false);
    }
    expect(
      simulationInputs(spec).catalog.traits.some((t) =>
        t.id.includes('lammb-source-'),
      ),
    ).toBe(false);
    expect(spec.traits).toHaveLength(66);
    expect(
      spec.traits.find((t) => t.id === 'lammb-eyes-radioactive')!
        .visualDefinition,
    ).toBe(
      'Coherent CCFF00 irises with dark pupils, purposeful eyelids and restrained glow.',
    );
  });
  it('pins the append-only proposal/approval chain to four exact historical sources', () => {
    expect(canonicalSha256(ownerSourceApprovals)).toBe(
      '229547e54995112ed5127597db9b1dd830b57fc889593240b0ab2d47164f84c9',
    );
    expect(canonicalSha256(approvedSourceCatalog)).toBe(
      '961940a8df3ae8767fff9c5804455b5e954834f2ba32a24074eeb34567f2b2b3',
    );
    expect(ownerSourceApprovals.events[1]!.previousEventSha256).toBe(
      canonicalSha256(ownerSourceApprovals.events[0]),
    );
    expect(() =>
      validateApprovedSourceCatalog(
        approvedSourceCatalog,
        ownerSourceApprovals,
        sourceExtension,
        bindingEvidence,
        spec,
        canonicalSha256(ownerSourceApprovals),
        canonicalSha256(sourceExtension),
      ),
    ).not.toThrow();
    expect(sourceExtension.ownerDefinitionApproval).toBe('PENDING');
    expect(
      bindingEvidence.records.every(
        (r) =>
          r.evidence.eyes.bindingTraitId === null &&
          r.evidence.background.bindingTraitId === null,
      ),
    ).toBe(true);
  });
  it('keeps four saved complete recipes bound to the native hashes, renderer and approved metadata', () => {
    expect(completeRecipeSnapshots.completeMetadataRecipeCount).toBe(4);
    expect(completeRecipeSnapshots.productionRegisteredCount).toBe(0);
    expect(completeRecipeSnapshots.generatorActivatedTraitCount).toBe(0);
    expect(completeRecipeSnapshots.records).toHaveLength(4);
    for (const [i, r] of completeRecipeSnapshots.records.entries()) {
      const e = bindingEvidence.records[i]!.evidence,
        row = recipeReviews.recipes[i]!;
      expect(r.sourceHashes.base).toBe(e.sourceSha256);
      expect(r.outputSha256).toBe(e.outputSha256);
      expect(r.evidenceSha256).toBe(bindingEvidence.records[i]!.evidenceSha256);
      expect(r.approvedCatalogSha256).toBe(
        canonicalSha256(approvedSourceCatalog),
      );
      expect(r.approvalHistorySha256).toBe(
        canonicalSha256(ownerSourceApprovals),
      );
      expect(r.metadataSha256).toBe(canonicalSha256(r.metadata));
      expect(r.rendererRecipeReference.requestSha256).toBe(
        canonicalSha256(row.request),
      );
      expect(r.rendererRecipeReference.contactRegistrationSha256).toBe(
        canonicalSha256(row.request.registration),
      );
      expect(openSeaMetadataSchema.safeParse(r.metadata).success).toBe(true);
      expect(
        r.metadata.attributes.filter((a) =>
          ['Eyes', 'Background'].includes(a.trait_type),
        ),
      ).toEqual(approvedSourceCatalog.traits.map((t) => t.metadata));
      expect(r.metadata.attributes).toContainEqual({
        trait_type: 'Wool',
        value: ['Ivory Curls', 'Ash Curls', 'Rolled Locks', 'Ivory Curls'][i],
      });
      expect(r.completeMetadata).toBe(true);
      expect(r.productionRegistered).toBe(false);
      expect(r.generatorEnabled).toBe(false);
    }
    expect(() =>
      requireUniqueRegistrationOutputs(completeRecipeSnapshots.records),
    ).not.toThrow();
    expect(() =>
      requireUniqueRegistrationOutputs([
        completeRecipeSnapshots.records[0]!,
        completeRecipeSnapshots.records[0]!,
      ]),
    ).toThrow('BINDING_DUPLICATE_OUTPUT');
  });
  it.each(['name', 'description', 'image', 'external_url', 'attributes'])(
    'rejects missing required OpenSea fixture field: %s',
    (field) => {
      const metadata: Record<string, unknown> = structuredClone(
        completeRecipeSnapshots.records[0]!.metadata,
      );
      delete metadata[field];
      expect(openSeaMetadataSchema.safeParse(metadata).success).toBe(false);
    },
  );
  it.each([0, 1, 2, 3])('completes only the approved native recipe %i', (i) => {
    const c = context(i),
      r = create(c);
    expect(r.completeMetadata).toBe(true);
    expect(r.unresolvedFacets).toEqual([]);
    expect(r.traitVector).toHaveLength(9);
    expect(
      r.traitVector.filter((v) => v.state === 'VERIFIED_PRESENT'),
    ).toHaveLength(7);
    expect(
      r.traitVector.filter((v) => v.state === 'VERIFIED_ABSENT'),
    ).toHaveLength(2);
    expect(r.traitVector.find((v) => v.category === 'eyes')!.traitId).toBe(
      'lammb-source-eyes-olive-green',
    );
    expect(
      r.traitVector.find((v) => v.category === 'environments')!.traitId,
    ).toBe('lammb-source-environments-charcoal-studio-gradient');
    expect(r.metadata.attributes).toHaveLength(8);
    expect(r.metadata.attributes).toContainEqual({
      trait_type: 'Eyes',
      value: 'Olive Green',
    });
    expect(r.metadata.attributes).toContainEqual({
      trait_type: 'Background',
      value: 'Charcoal Studio Gradient',
    });
    expect(r.metadata.attributes).toContainEqual({
      trait_type: 'Wool',
      value: ['Ivory Curls', 'Ash Curls', 'Rolled Locks', 'Ivory Curls'][i],
    });
    expect(r.metadata.attributes).toContainEqual({
      trait_type: 'Ear Tag',
      value: '5280',
    });
    expect(r.metadata.attributes).toContainEqual({
      trait_type: 'Pixel Corruption',
      value: 'NONE',
    });
    expect(
      r.metadata.attributes.some((a) =>
        ['Mutation', 'Material', 'Pose', 'Rarity'].includes(a.trait_type),
      ),
    ).toBe(false);
    expect(r.metadata.image).toBe(
      'https://artwork.invalid/lammb/' + r.outputSha256 + '.png',
    );
    expect(r.metadata.name).toBe(
      'LAMMB — ' + ['Canonical', 'Broad Ash', 'Rolled Locks', 'Front'][i],
    );
    expect(r.rendererRecipeReference.requestSha256).toBe(c.e.requestSha256);
    expect(r.dimensions).toEqual({ width: 1254, height: 1254 });
    expect(r.productionRegistered).toBe(false);
    expect(r.productionPromotionAuthorized).toBe(false);
    expect(r.generatorEnabled).toBe(false);
    expect(r.tokenAssignment).toBeNull();
    expect(openSeaMetadataSchema.safeParse(r.metadata).success).toBe(true);
    expect(
      validateCompleteSourceRecipe(r, c.catalog, c.catalogArgs, c.recipeArgs),
    ).toEqual(r);
  });
  it.each([
    'history-chain',
    'old-event',
    'source',
    'output',
    'request',
    'missing-source',
  ])('rejects repinned owner history corruption: %s', (scenario) => {
    const c = context();
    if (scenario === 'history-chain')
      c.history.events[1]!.previousEventSha256 = 'a'.repeat(64);
    if (scenario === 'old-event')
      c.history.events[0]!.proposalSha256 = 'a'.repeat(64);
    if (scenario === 'source')
      c.history.events[1]!.sources[0]!.sourceSha256 = 'a'.repeat(64);
    if (scenario === 'output')
      c.history.events[1]!.sources[0]!.outputSha256 = 'a'.repeat(64);
    if (scenario === 'request')
      c.history.events[1]!.sources[0]!.requestSha256 = 'a'.repeat(64);
    if (scenario === 'missing-source') c.history.events[1]!.sources.pop();
    c.catalogArgs[4] = canonicalSha256(c.history);
    expect(() => createApprovedSourceCatalog(...c.catalogArgs)).toThrow();
  });
  it('rejects stale approval digest and does not reinterpret approvals as production authorization', () => {
    const c = context();
    c.history.events[1]!.sources[0]!.outputSha256 = 'a'.repeat(64);
    expect(() => createApprovedSourceCatalog(...c.catalogArgs)).toThrow(
      'APPROVAL_HISTORY_SHA256',
    );
    const event = {
      ...ownerSourceApprovals.events[1],
      productionPromotionAuthorized: true,
    };
    expect(
      sourceApprovalHistorySchema.safeParse({
        ...ownerSourceApprovals,
        events: [ownerSourceApprovals.events[0], event],
      }).success,
    ).toBe(false);
    expect(
      sourceApprovalHistorySchema.safeParse({
        ...ownerSourceApprovals,
        events: [ownerSourceApprovals.events[0]],
      }).success,
    ).toBe(false);
  });
  it.each([
    'new-source',
    'wrong-eye',
    'wrong-background',
    'weight',
    'count',
    'activation',
    'production',
    'duplicate-definition',
  ])('rejects unsupported catalog changes: %s', (scenario) => {
    const c = context(),
      bad: Record<string, unknown> = structuredClone(c.catalog),
      traits = bad.traits as Record<string, unknown>[];
    if (scenario === 'new-source')
      (traits[0]!.sources as Record<string, unknown>[])[0]!.sourceSha256 =
        'a'.repeat(64);
    if (scenario === 'wrong-eye')
      traits[0]!.metadata = { trait_type: 'Eyes', value: 'Radioactive Green' };
    if (scenario === 'wrong-background')
      traits[1]!.metadata = { trait_type: 'Background', value: 'Graphite' };
    if (scenario === 'weight') traits[0]!.selectionWeight = 1;
    if (scenario === 'count') traits[0]!.plannedCount = 5280;
    if (scenario === 'activation') bad.generatorEnabled = true;
    if (scenario === 'production') bad.productionRegistered = true;
    if (scenario === 'duplicate-definition')
      traits[1] = structuredClone(traits[0]!);
    expect(() => validateApprovedSourceCatalog(bad, ...c.catalogArgs)).toThrow(
      'APPROVED_CATALOG_RECORD',
    );
  });
  it.each([
    'eyes',
    'background',
    'wool',
    'image',
    'missing-facet',
    'extra-facet',
    'numeric-label',
    'production',
    'activation',
    'token',
  ])('rejects incorrect complete recipe or metadata: %s', (scenario) => {
    const c = context(),
      r = create(c),
      bad: Record<string, unknown> = structuredClone(r),
      m = bad.metadata as {
        image: string;
        attributes: { trait_type: string; value: unknown }[];
      };
    if (scenario === 'eyes')
      m.attributes.find((a) => a.trait_type === 'Eyes')!.value = 'CCFF00 Glow';
    if (scenario === 'background')
      m.attributes.find((a) => a.trait_type === 'Background')!.value =
        'Containment Lab';
    if (scenario === 'wool')
      m.attributes.find((a) => a.trait_type === 'Wool')!.value = 'Ash Curls';
    if (scenario === 'image') m.image = 'https://artwork.invalid/wrong.png';
    if (scenario === 'missing-facet') m.attributes.pop();
    if (scenario === 'extra-facet')
      m.attributes.push({ trait_type: 'Rarity', value: 'Legendary' });
    if (scenario === 'numeric-label')
      m.attributes.find((a) => a.trait_type === 'Ear Tag')!.value = 5280;
    if (scenario === 'production') bad.productionRegistered = true;
    if (scenario === 'activation') bad.generatorEnabled = true;
    if (scenario === 'token') bad.tokenAssignment = 1;
    expect(() =>
      validateCompleteSourceRecipe(bad, c.catalog, c.catalogArgs, c.recipeArgs),
    ).toThrow('COMPLETE_RECIPE_RECORD');
  });
  it('rejects altered source pixels/output bytes, provenance and mismatched approval scope', () => {
    const c = context();
    c.recipeArgs[3] = Buffer.alloc(raw.length, 41);
    expect(() => create(c)).toThrow('BINDING_SOURCE_PIXELS');
    const d = context();
    d.recipeArgs[4] = Buffer.from('wrong PNG receipt');
    expect(() => create(d)).toThrow('RECIPE_OUTPUT_BINDING');
    const f = context();
    f.recipeArgs[0] = { ...f.e, provenance: [] };
    expect(() => create(f)).toThrow();
    const h = context(1),
      g = context(0);
    expect(() =>
      createCompleteSourceRecipe(g.catalog, g.catalogArgs, h.recipeArgs),
    ).toThrow('COMPLETE_RECIPE_SOURCE_RESTRICTION');
    const p = context();
    p.row.request.base.approval.state = 'VALIDATED_RECONSTRUCTION_INPUT';
    expect(() => create(p)).toThrow();
  });
});

describe('Stage31B source-bound extension proposals', () => {
  // Synthetic receipts exercise validation only. Native reconstruction and
  // visual interpretation remain separate private acceptance evidence.
  const raw = Buffer.alloc(1254 * 1254 * 3, 40);
  const context = (i = 0) => {
    const row = structuredClone(recipeReviews.recipes[i]!),
      cohort = structuredClone(bindingEvidence),
      proposal = structuredClone(sourceExtension),
      output = Buffer.from('synthetic extension receipt ' + i),
      e = traitBindingSchema.parse(cohort.records[i]!.evidence);
    row.request.expectedOutputSha256 = sha256Bytes(output);
    row.review.requestSha256 = canonicalSha256(row.request);
    row.reviewSha256 = canonicalSha256(row.review);
    e.outputSha256 = sha256Bytes(output);
    e.requestSha256 = canonicalSha256(row.request);
    e.reviewSha256 = row.reviewSha256;
    e.decodedSourcePixelSha256 = sha256Bytes(raw);
    for (const r of [...e.eyes.regions, ...e.background.regions])
      r.pixelSha256 = measureNativeRegion(raw, 1254, 1254, r.roi).pixelSha256;
    cohort.records[i] = {
      ...cohort.records[i]!,
      evidence: e,
      evidenceSha256: canonicalSha256(e),
    };
    proposal.priorEvidenceCohortSha256 = canonicalSha256(cohort);
    proposal.bindings[i]!.outputSha256 = e.outputSha256;
    proposal.bindings[i]!.evidenceSha256 = canonicalSha256(e);
    const args: Parameters<typeof assessRegistrationReadiness> = [
      e,
      row,
      spec,
      raw,
      output,
      canonicalSha256(e),
    ];
    return { row, e, cohort, proposal, args };
  };
  const create = (
    c: ReturnType<typeof context>,
    pin = canonicalSha256(c.proposal),
  ) => createSourceBoundMetadataProposal(c.proposal, c.cohort, pin, c.args);
  it('pins both proposal definitions and preserves the old unresolved cohort', () => {
    expect(canonicalSha256(sourceExtension)).toBe(
      '21dd4985b4d449acf80954b843376e989e1e0d7c89b9ffe3e0852153b03baedc',
    );
    expect(() =>
      validateSourceTraitExtension(
        sourceExtension,
        spec,
        bindingEvidence,
        canonicalSha256(sourceExtension),
      ),
    ).not.toThrow();
    expect(sourceExtension.priorEvidenceCohortSha256).toBe(
      canonicalSha256(bindingEvidence),
    );
    expect(spec.traits).toHaveLength(66);
    expect(
      spec.traits.some((t) =>
        sourceExtension.definitions.some((d) => d.id === t.id),
      ),
    ).toBe(false);
    for (const r of bindingEvidence.records) {
      expect(r.evidence.eyes.bindingTraitId).toBeNull();
      expect(r.evidence.background.bindingTraitId).toBeNull();
    }
  });
  it('binds the four saved development vectors to the historical evidence and exact output hashes', () => {
    expect(metadataProposals.records).toHaveLength(4);
    for (const [i, record] of metadataProposals.records.entries()) {
      const evidence = bindingEvidence.records[i]!;
      expect(record.proposalSha256).toBe(canonicalSha256(sourceExtension));
      expect(record.evidenceSha256).toBe(evidence.evidenceSha256);
      expect(record.outputSha256).toBe(evidence.evidence.outputSha256);
      expect(record.sourceHashes.base).toBe(evidence.evidence.sourceSha256);
      expect(record.metadataSha256).toBe(canonicalSha256(record.metadata));
      expect(openSeaMetadataSchema.safeParse(record.metadata).success).toBe(
        true,
      );
      expect(
        record.metadata.attributes.filter((a) =>
          ['Eyes', 'Background'].includes(a.trait_type),
        ),
      ).toEqual(sourceExtension.definitions.map((d) => d.metadata));
      expect(record.metadata.image).toBe(
        'https://artwork.invalid/lammb/' + record.outputSha256 + '.png',
      );
      expect(record.traitVector.map((v) => v.category)).toEqual(
        recipeReviews.recipes[i]!.review.slots.map((s) => s.category),
      );
      expect(record.completeApprovedCatalogMetadata).toBe(false);
      expect(record.productionRegistered).toBe(false);
    }
    expect(() =>
      requireUniqueRegistrationOutputs(metadataProposals.records),
    ).not.toThrow();
  });
  it.each([0, 1, 2, 3])(
    'proposes complete source metadata for recipe %i without approving a new catalog',
    (i) => {
      const c = context(i),
        r = create(c);
      expect(r.metadata.attributes).toHaveLength(8);
      expect(r.metadata.attributes).toContainEqual({
        trait_type: 'Eyes',
        value: 'Olive Green',
      });
      expect(r.metadata.attributes).toContainEqual({
        trait_type: 'Background',
        value: 'Charcoal Studio Gradient',
      });
      expect(r.metadata.attributes).toContainEqual({
        trait_type: 'Wool',
        value: ['Ivory Curls', 'Ash Curls', 'Rolled Locks', 'Ivory Curls'][i],
      });
      expect(r.metadata.attributes).toContainEqual({
        trait_type: 'Ear Tag',
        value: '5280',
      });
      expect(r.metadata.attributes).toContainEqual({
        trait_type: 'Pixel Corruption',
        value: 'NONE',
      });
      expect(
        r.metadata.attributes.some((a) =>
          ['Mutation', 'Material', 'Pose', 'Rarity'].includes(a.trait_type),
        ),
      ).toBe(false);
      expect(r.traitVector).toHaveLength(9);
      expect(
        r.traitVector.filter((v) => v.state === 'PROPOSED_SOURCE_BINDING'),
      ).toHaveLength(2);
      expect(r.completeProposedMetadata).toBe(true);
      expect(r.completeApprovedCatalogMetadata).toBe(false);
      expect(r.registrationCandidate).toBe(false);
      expect(r.productionRegistered).toBe(false);
      expect(r.generatorEnabled).toBe(false);
      expect(r.pendingDefinitionApprovals).toHaveLength(2);
      expect(r.metadata.image).toBe(
        'https://artwork.invalid/lammb/' + sha256Bytes(c.args[4]) + '.png',
      );
      expect(r.tokenAssignment).toBeNull();
      expect(openSeaMetadataSchema.safeParse(r.metadata).success).toBe(true);
      expect(
        validateSourceBoundMetadataProposal(
          r,
          c.proposal,
          c.cohort,
          canonicalSha256(c.proposal),
          c.args,
        ),
      ).toEqual(r);
    },
  );
  it('rejects altered definition text under the preserved proposal digest', () => {
    const c = context(),
      pin = canonicalSha256(c.proposal);
    c.proposal.definitions[0]!.visualDefinition += ' edited';
    expect(() => create(c, pin)).toThrow('EXTENSION_PROPOSAL_SHA256');
  });
  it.each([
    'weight',
    'count',
    'generator',
    'owner',
    'production',
    'existing-eye',
    'wrong-background',
    'interchangeable',
  ])('rejects unauthorized proposal change: %s', (scenario) => {
    const p: Record<string, unknown> = structuredClone(sourceExtension),
      defs = p.definitions as Record<string, unknown>[];
    if (scenario === 'weight') defs[0]!.selectionWeight = 1;
    if (scenario === 'count') defs[0]!.proposedTotalCount = 5280;
    if (scenario === 'generator') p.generatorEnabled = true;
    if (scenario === 'owner') p.ownerDefinitionApproval = 'APPROVED';
    if (scenario === 'production') p.productionRegistered = true;
    if (scenario === 'existing-eye') defs[0]!.id = 'lammb-eyes-radioactive';
    if (scenario === 'wrong-background')
      defs[1]!.metadata = { trait_type: 'Background', value: 'Graphite' };
    if (scenario === 'interchangeable')
      (p.bindings as Record<string, unknown>[])[0]!.backgroundInterchangeable =
        true;
    expect(sourceTraitExtensionSchema.safeParse(p).success).toBe(false);
  });
  it.each([
    'source',
    'output',
    'evidence',
    'history',
    'spec',
    'duplicate-source',
    'duplicate-output',
  ])('rejects repinned invalid provenance: %s', (scenario) => {
    const c = context();
    if (scenario === 'source')
      c.proposal.bindings[0]!.sourceSha256 = 'a'.repeat(64);
    if (scenario === 'output')
      c.proposal.bindings[0]!.outputSha256 = 'a'.repeat(64);
    if (scenario === 'evidence')
      c.proposal.bindings[0]!.evidenceSha256 = 'a'.repeat(64);
    if (scenario === 'history')
      c.proposal.priorEvidenceCohortSha256 = 'a'.repeat(64);
    if (scenario === 'spec') c.proposal.specSha256 = 'a'.repeat(64);
    if (scenario === 'duplicate-source')
      c.proposal.bindings[1] = structuredClone(c.proposal.bindings[0]!);
    if (scenario === 'duplicate-output')
      c.proposal.bindings[1]!.outputSha256 =
        c.proposal.bindings[0]!.outputSha256;
    expect(() => create(c)).toThrow();
  });
  it('rejects cross-source evidence, missing approval and missing provenance', () => {
    const c = context();
    c.args[0] = bindingEvidence.records[1]!.evidence;
    expect(() => create(c)).toThrow();
    const d = context();
    d.row.request.base.approval.state = 'VALIDATED_RECONSTRUCTION_INPUT';
    expect(() => create(d)).toThrow();
    const f = context();
    f.e.provenance = [];
    expect(() => create(f)).toThrow();
  });
  it('rejects a repinned cohort that omits a reviewed source by duplication', () => {
    const c = context();
    c.cohort.records[1] = structuredClone(c.cohort.records[0]!);
    c.proposal.priorEvidenceCohortSha256 = canonicalSha256(c.cohort);
    expect(() => create(c)).toThrow('EXTENSION_COHORT');
  });
  it.each([
    'eye',
    'background',
    'uri',
    'duplicate-facet',
    'rare',
    'incomplete',
    'promotion',
    'activation',
    'approved-catalog',
  ])('rejects forged final metadata record: %s', (scenario) => {
    const c = context(),
      r = create(c),
      bad: Record<string, unknown> = structuredClone(r);
    const metadata = bad.metadata as {
      image: string;
      attributes: { trait_type: string; value: string }[];
    };
    if (scenario === 'eye')
      metadata.attributes.find((a) => a.trait_type === 'Eyes')!.value =
        'Radioactive Green';
    if (scenario === 'background')
      metadata.attributes.find((a) => a.trait_type === 'Background')!.value =
        'Event Horizon';
    if (scenario === 'uri')
      metadata.image = 'https://artwork.invalid/wrong.png';
    if (scenario === 'duplicate-facet')
      metadata.attributes.push(metadata.attributes[0]!);
    if (scenario === 'rare')
      metadata.attributes.push({ trait_type: 'Rarity', value: 'Legendary' });
    if (scenario === 'incomplete') metadata.attributes.pop();
    if (scenario === 'promotion') bad.productionRegistered = true;
    if (scenario === 'activation') bad.generatorEnabled = true;
    if (scenario === 'approved-catalog')
      bad.completeApprovedCatalogMetadata = true;
    expect(() =>
      validateSourceBoundMetadataProposal(
        bad,
        c.proposal,
        c.cohort,
        canonicalSha256(c.proposal),
        c.args,
      ),
    ).toThrow('EXTENSION_METADATA_RECORD');
  });
  it.each([
    'http://example.com/a.png',
    'javascript:alert(1)',
    'https://user:secret@example.com/a.png',
    'https://example.com/a.png#fragment',
    'https://example.com/a b.png',
  ])('retains the narrower internal media URI rule: %s', (image) => {
    const r = create(context());
    expect(
      openSeaMetadataSchema.safeParse({ ...r.metadata, image }).success,
    ).toBe(false);
  });
});

describe('Stage31 source-bound observations and registration gates', () => {
  // Synthetic RGB and receipt bytes exercise gate logic only. Real immutable
  // artwork decoding/replay is independently verified in the private acceptance.
  const raw = Buffer.alloc(1254 * 1254 * 3, 40),
    out = Buffer.from('synthetic receipt only, not native artwork');
  const context = (index = 0) => {
    const row = structuredClone(recipeReviews.recipes[index]!);
    row.request.expectedOutputSha256 = sha256Bytes(out);
    row.review.requestSha256 = canonicalSha256(row.request);
    row.reviewSha256 = canonicalSha256(row.review);
    const e = traitBindingSchema.parse(
      structuredClone(bindingEvidence.records[index]!.evidence),
    );
    e.outputSha256 = sha256Bytes(out);
    e.requestSha256 = canonicalSha256(row.request);
    e.reviewSha256 = row.reviewSha256;
    e.decodedSourcePixelSha256 = sha256Bytes(raw);
    for (const r of [...e.eyes.regions, ...e.background.regions])
      r.pixelSha256 = measureNativeRegion(raw, 1254, 1254, r.roi).pixelSha256;
    return { e, row };
  };
  const assess = (
    { e, row }: ReturnType<typeof context>,
    pin = canonicalSha256(e),
  ) => assessRegistrationReadiness(e, row, spec, raw, out, pin);
  const args = (
    c: ReturnType<typeof context>,
  ): Parameters<typeof assessRegistrationReadiness> => [
    c.e,
    c.row,
    spec,
    raw,
    out,
    canonicalSha256(c.e),
  ];
  it('keeps native receipts pinned to the unchanged Stage30 context', () => {
    expect(bindingEvidence.records).toHaveLength(4);
    expect(bindingEvidence.stage30FixtureSha256).toBe(
      canonicalSha256(recipeReviews),
    );
    expect(bindingEvidence.registrationProposals).toEqual([]);
    for (const [i, r] of bindingEvidence.records.entries()) {
      expect(r.evidenceSha256).toBe(canonicalSha256(r.evidence));
      expect(r.evidence.sourceSha256).toBe(
        recipeReviews.recipes[i]!.request.base.sha256,
      );
      expect(r.evidence.outputSha256).toBe(
        recipeReviews.recipes[i]!.request.expectedOutputSha256,
      );
      expect(traitBindingSchema.safeParse(r.evidence).success).toBe(true);
    }
  });
  it.each([0, 1, 2, 3])(
    'blocks recipe %i without fabricating missing metadata',
    (i) => {
      const c = context(i),
        r = assess(c);
      expect(r.status).toBe('BLOCKED_INCOMPLETE_METADATA');
      expect(r.registrationCandidate).toBe(false);
      expect(r.completeMetadata).toBe(false);
      expect(r.productionRegistered).toBe(false);
      expect(r.unresolved).toEqual(['eyes', 'environments']);
      expect(r.traitVector).toHaveLength(9);
      expect(
        r.traitVector
          .filter((v) => v.state === 'VERIFIED_ABSENT')
          .map((v) => v.category),
      ).toEqual(['mutations', 'pixel_corruption']);
      expect(r.promotionGate).toBe(
        'SEPARATE_EXPLICIT_OWNER_PRODUCTION_APPROVAL_REQUIRED',
      );
      expect(r.metadata.attributes).toHaveLength(6);
      expect(r.metadata.attributes).toContainEqual({
        trait_type: 'Pixel Corruption',
        value: 'NONE',
      });
      expect(
        r.metadata.attributes.some((x) =>
          [
            'Eyes',
            'Background',
            'Mutation',
            'Pose',
            'Material',
            'Rarity',
          ].includes(x.trait_type),
        ),
      ).toBe(false);
      expect(validateRegistrationExample(r, args(c))).toEqual(r);
    },
  );
  it('checks exact RGB layout, bounds and reproducible cropped-pixel measurements', () => {
    const pixels = Buffer.from([1, 2, 3, 204, 255, 0]);
    expect(
      measureNativeRegion(pixels, 2, 1, { x: 0, y: 0, width: 2, height: 1 }),
    ).toMatchObject({
      pixels: 2,
      uniqueRgbColors: 2,
      minimumRgb: [1, 2, 0],
      maximumRgb: [204, 255, 3],
      exactCcff00Pixels: 1,
      pixelSha256: sha256Bytes(pixels),
    });
    expect(() =>
      measureNativeRegion(pixels, 2, 1, { x: 1, y: 0, width: 2, height: 1 }),
    ).toThrow('BINDING_REGION_BOUNDS');
    expect(() =>
      measureNativeRegion(pixels, 3, 1, { x: 0, y: 0, width: 1, height: 1 }),
    ).toThrow('BINDING_RGB_LAYOUT');
  });
  it('rejects stale evidence and full decoded-pixel mutation', () => {
    const c = context(),
      pin = canonicalSha256(c.e);
    c.e.eyes.appearance += ' altered';
    expect(() => assess(c, pin)).toThrow('BINDING_EVIDENCE_SHA256');
    const d = context();
    d.e.decodedSourcePixelSha256 = 'a'.repeat(64);
    expect(() => assess(d)).toThrow('BINDING_SOURCE_PIXELS');
  });
  it('rejects incorrect source/output hashes even if evidence is repinned', () => {
    const c = context();
    c.e.sourceSha256 = 'a'.repeat(64);
    expect(() => assess(c)).toThrow('BINDING_SOURCE_CONTEXT');
    const d = context();
    d.e.outputSha256 = 'a'.repeat(64);
    expect(() => assess(d)).toThrow('BINDING_SOURCE_CONTEXT');
  });
  it.each(['eyes', 'background'] as const)(
    'rejects incorrect or invented %s bindings',
    (category) => {
      const c = context();
      expect(() =>
        traitBindingSchema.parse({
          ...c.e,
          [category]: {
            ...c.e[category],
            bindingTraitId:
              category === 'eyes'
                ? 'lammb-eyes-radioactive'
                : 'lammb-environments-graphite',
          },
        }),
      ).toThrow();
      expect(() =>
        traitBindingSchema.parse({
          ...c.e,
          [category]: { ...c.e[category], bindingTraitId: 'invented-trait' },
        }),
      ).toThrow();
    },
  );
  it('rejects wrong definition IDs, hashes, evidence regions and pose', () => {
    const c = context();
    c.e.eyes.comparedTraitDefinitions[0]!.traitId = 'invented-eye';
    expect(() => assess(c)).toThrow('BINDING_TRAIT_DEFINITIONS');
    const d = context();
    d.e.background.regions[0]!.pixelSha256 = 'a'.repeat(64);
    expect(() => assess(d)).toThrow('BINDING_REGION_PIXELS');
    const f = context();
    f.e.pose.registrationFamily = 'FRONT';
    expect(() => assess(f)).toThrow('BINDING_POSE');
    const h = context();
    h.e.eyes.regions[0]!.roi.x = 1254;
    expect(() => assess(h)).toThrow('BINDING_REGION_BOUNDS');
  });
  it('rejects missing or mismatched provenance', () => {
    const c = context();
    expect(() =>
      traitBindingSchema.parse({ ...c.e, provenance: [] }),
    ).toThrow();
    c.e.provenance[0]!.sha256 = 'a'.repeat(64);
    expect(() => assess(c)).toThrow('BINDING_PROVENANCE');
  });
  it('rejects missing source approval, incompatible wool/clothing and invalid contact', () => {
    const c = context();
    const p = structuredClone(c.row.request);
    p.base.approval.state = 'VALIDATED_RECONSTRUCTION_INPUT';
    expect(() =>
      validateTraitBinding(
        c.e,
        { ...c.row, request: p },
        spec,
        raw,
        canonicalSha256(c.e),
      ),
    ).toThrow('Base needs explicit artistic approval');
    const d = context();
    d.row.review.slots.find((x) => x.category === 'wool')!.traitId =
      'lammb-wool-ash';
    d.row.reviewSha256 = canonicalSha256(d.row.review);
    d.e.reviewSha256 = d.row.reviewSha256;
    expect(() => assess(d)).toThrow('RECIPE_SOURCE_FACETS');
    const f = context();
    f.row.review.slots.find((x) => x.category === 'clothing')!.traitId =
      'lammb-clothing-lab-jacket';
    f.row.reviewSha256 = canonicalSha256(f.row.review);
    f.e.reviewSha256 = f.row.reviewSha256;
    expect(() => assess(f)).toThrow('RECIPE_SOURCE_FACETS');
    const h = context();
    h.row.request.registration.roi.x = 1254;
    expect(() => assess(h)).toThrow('Joint would clip or resample');
  });
  it('rejects duplicate output hashes and invalid cohort declarations', () => {
    const c = recipeReviews.recipes.map((x) => ({
      outputSha256: x.request.expectedOutputSha256,
    }));
    expect(() => requireUniqueRegistrationOutputs(c)).not.toThrow();
    expect(() => requireUniqueRegistrationOutputs([c[0]!, c[0]!])).toThrow(
      'BINDING_DUPLICATE_OUTPUT',
    );
    expect(() => requireUniqueRegistrationOutputs([])).toThrow(
      'BINDING_COHORT_SIZE',
    );
    expect(() =>
      requireUniqueRegistrationOutputs([{ outputSha256: 'not-a-hash' }]),
    ).toThrow('BINDING_OUTPUT_HASH');
  });
  it.each([
    'eye',
    'background',
    'pose',
    'malformed',
    'promotion',
    'candidate',
    'complete',
  ] as const)('rejects forged registration example: %s', (scenario) => {
    const c = context(),
      r = assess(c),
      bad = structuredClone(r);
    if (scenario === 'eye')
      bad.metadata.attributes.push({
        trait_type: 'Eyes',
        value: 'Radioactive Green',
      });
    if (scenario === 'background')
      bad.metadata.attributes.push({
        trait_type: 'Background',
        value: 'Graphite',
      });
    if (scenario === 'pose')
      return expect(() =>
        validateRegistrationExample(
          {
            ...bad,
            metadata: {
              ...bad.metadata,
              attributes: [
                ...bad.metadata.attributes,
                { trait_type: 'Pose', value: 'Front' },
              ],
            },
          },
          args(c),
        ),
      ).toThrow('BINDING_REGISTRATION_RECORD');
    if (scenario === 'malformed') bad.metadata.image = '';
    if (scenario === 'promotion') bad.productionRegistered = true;
    if (scenario === 'candidate') bad.registrationCandidate = true;
    if (scenario === 'complete') bad.completeMetadata = true;
    expect(() => validateRegistrationExample(bad, args(c))).toThrow(
      'BINDING_REGISTRATION_RECORD',
    );
  });
});

describe('source-bound development recipe reconciliation', () => {
  // These test bytes exercise receipt/metadata logic only. The decoder and
  // renderer tests below use actual synthetic PNGs; native artwork is private.
  // Stage30's private acceptance receipt independently renders all four natives.
  const bytes = Buffer.from('receipt-only unit test; not a rendered PNG');
  const context = (index = 0) => {
    const row = recipeReviews.recipes[index]!;
    const p = pngProofSchema.parse(structuredClone(row.request));
    p.expectedOutputSha256 = sha256Bytes(bytes);
    const r = recipeReviewSchema.parse(structuredClone(row.review));
    r.requestSha256 = canonicalSha256(p);
    return { p, r };
  };
  const reconcile = (
    { p, r }: ReturnType<typeof context>,
    pin = canonicalSha256(r),
  ) => reconcileRecipeAcceptance(r, p, spec, bytes, pin);

  it('pins the four saved requests, source evidence and reviewed observations', () => {
    expect(recipeReviews.recipes).toHaveLength(4);
    expect(recipeReviews.specSha256).toBe(canonicalSha256(spec));
    expect(recipeReviews.registrySha256).toBe(canonicalSha256(stage17Registry));
    for (const row of recipeReviews.recipes) {
      expect(row.reviewSha256).toBe(canonicalSha256(row.review));
      expect(row.review.requestSha256).toBe(canonicalSha256(row.request));
      expect(row.provenance.every((e) => /^[0-9a-f]{64}$/.test(e.sha256))).toBe(
        true,
      );
      expect(row.request).toEqual(
        row.id === 'proof-front-stage16'
          ? stage16Request
          : resolveRegisteredProof(stage17Registry, row.id).request,
      );
    }
    expect(
      new Set(recipeReviews.recipes.map((x) => x.request.expectedOutputSha256))
        .size,
    ).toBe(4);
  });
  it.each([0, 1, 2, 3])(
    'keeps recipe %i incomplete and emits only supported visible facets',
    (index) => {
      const result = reconcile(context(index));
      expect(result.status).toBe('INCOMPLETE');
      expect(result.completeMetadataVector).toBe(false);
      expect(result.unresolved.map((x) => x.category)).toEqual([
        'eyes',
        'environments',
      ]);
      expect(result.supportedTraitIds).toHaveLength(7);
      expect(result.metadata.attributes).toHaveLength(5);
      expect(result.metadata.attributes).toContainEqual({
        trait_type: 'Wool',
        value: ['Ivory Curls', 'Ash Curls', 'Rolled Locks', 'Ivory Curls'][
          index
        ],
      });
      expect(result.metadata.attributes).toContainEqual({
        trait_type: 'Ear Tag',
        value: '5280',
      });
      expect(
        result.metadata.attributes.some(
          (x) =>
            x.value === 'NONE' || ['Eyes', 'Background'].includes(x.trait_type),
        ),
      ).toBe(false);
      expect(result.metadata.image).toContain(sha256Bytes(bytes));
      expect(result.productionRegistered).toBe(false);
      expect(result.tokenAssignment).toBeNull();
      expect(result).not.toHaveProperty('technicallyRenderable');
    },
  );
  it('rejects silent eye/background completion against the reviewed pin', () => {
    const c = context(),
      pin = canonicalSha256(c.r);
    const eye = c.r.slots.find((x) => x.category === 'eyes')!;
    eye.status = 'SUPPORTED_VISIBLE';
    eye.traitId = 'lammb-eyes-radioactive';
    eye.missingEvidence = [];
    expect(() => reconcile(c, pin)).toThrow('RECIPE_REVIEW_SHA256');
  });
  it('rejects changed source/contact declarations and altered specifications', () => {
    const c = context();
    c.p.registration.roi.x++;
    expect(() => reconcile(c)).toThrow('RECIPE_REQUEST_BINDING');
    const d = context(),
      changed = structuredClone(spec);
    changed.referenceEvidence[0]!.note += ' changed review';
    expect(() =>
      reconcileRecipeAcceptance(d.r, d.p, changed, bytes, canonicalSha256(d.r)),
    ).toThrow('RECIPE_SPEC_BINDING');
  });
  it('rejects a changed final output even if declarations are unchanged', () => {
    const c = context();
    expect(() =>
      reconcileRecipeAcceptance(
        c.r,
        c.p,
        spec,
        Buffer.from('different bytes'),
        canonicalSha256(c.r),
      ),
    ).toThrow('RECIPE_OUTPUT_BINDING');
  });
  it('rejects source family and pose mislabeling', () => {
    const c = context(1);
    c.r.sourceFamily.woolTraitId = 'lammb-wool-ivory';
    expect(() => reconcile(c)).toThrow('RECIPE_KNOWN_SOURCE_FAMILY');
    const d = context();
    d.r.sourceFamily.pose = 'FRONT';
    expect(() => reconcile(d)).toThrow('RECIPE_POSE');
  });
  it('rejects an unrecognized native source even with mutually consistent declared hashes', () => {
    const c = context();
    c.p.base.sha256 = 'a'.repeat(64);
    c.p.base.approval.sha256 = c.p.base.sha256;
    c.p.registration.baseSha256 = c.p.base.sha256;
    c.r.requestSha256 = canonicalSha256(c.p);
    expect(() => reconcile(c)).toThrow('RECIPE_KNOWN_SOURCE_FAMILY');
  });
  it('rejects missing approval and production promotion', () => {
    const c = context();
    c.p.base.approval.state = 'VALIDATED_RECONSTRUCTION_INPUT';
    c.r.requestSha256 = canonicalSha256(c.p);
    expect(() => reconcile(c)).toThrow('Base needs explicit artistic approval');
    expect(() =>
      recipeReviewSchema.parse({ ...context().r, productionRegistered: true }),
    ).toThrow();
    expect(() =>
      pngProofSchema.parse({ ...context().p, productionRegistered: true }),
    ).toThrow();
  });
  it('rejects duplicate/missing categories', () => {
    const c = context();
    c.r.slots[1] = structuredClone(c.r.slots[0]!);
    expect(() => reconcile(c)).toThrow('RECIPE_CATEGORY_COVERAGE');
  });
  it('requires explicit unresolved evidence and prohibits filled unresolved slots', () => {
    const c = context();
    c.r.slots.find((x) => x.category === 'eyes')!.missingEvidence = [];
    expect(() => reconcile(c)).toThrow('RECIPE_UNRESOLVED_VALUE');
    const d = context();
    d.r.slots.find((x) => x.category === 'environments')!.traitId =
      'lammb-environments-graphite';
    expect(() => reconcile(d)).toThrow('RECIPE_UNRESOLVED_VALUE');
  });
  it('rejects wrong facets, category substitutions and invented absences', () => {
    const c = context();
    c.r.slots.find((x) => x.category === 'wool')!.traitId = 'lammb-wool-ash';
    expect(() => reconcile(c)).toThrow('RECIPE_SOURCE_FACETS');
    const d = context();
    d.r.slots.find((x) => x.category === 'wool')!.traitId =
      'lammb-clothing-hoodie';
    expect(() => reconcile(d)).toThrow('RECIPE_TRAIT_CATEGORY');
    const e = context();
    e.r.slots.find((x) => x.category === 'wool')!.status = 'SUPPORTED_ABSENT';
    expect(() => reconcile(e)).toThrow('RECIPE_ABSENCE');
  });
  it('omits absence facets without altering the internal collection IDs', () => {
    const c = context();
    c.r.slots.find((x) => x.category === 'mutations')!.status =
      'SUPPORTED_VISIBLE';
    expect(() => reconcile(c)).toThrow('RECIPE_ABSENT_FACET');
    const result = reconcile(context());
    expect(result.supportedTraitIds).toContain('lammb-mutations-none');
    expect(result.supportedTraitIds).toContain('lammb-pixel-corruption-none');
    expect(
      result.metadata.attributes.some(
        (x) => x.trait_type === 'Pixel Corruption',
      ),
    ).toBe(false);
  });
});

function crc(data: Uint8Array) {
  let c = 0xffffffff;
  for (const b of data) {
    c ^= b;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  }
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(name: string, data: Buffer) {
  const c = Buffer.alloc(data.length + 12);
  c.writeUInt32BE(data.length);
  c.write(name, 4, 'ascii');
  data.copy(c, 8);
  c.writeUInt32BE(crc(c.subarray(4, c.length - 4)), c.length - 4);
  return c;
}
function tinyPng({
  width = 1,
  height = 1,
  depth = 8,
  type = 2,
  interlace = 0,
  scan = Buffer.from([0, 1, 2, 3]),
  extras = [] as Buffer[],
} = {}) {
  const h = Buffer.alloc(13);
  h.writeUInt32BE(width);
  h.writeUInt32BE(height, 4);
  h[8] = depth;
  h[9] = type;
  h[12] = interlace;
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', h),
    ...extras,
    chunk('IDAT', deflateSync(scan)),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}
const rebound = (
  p: PngProofRequest,
  b: Buffer,
  role: 'base' | 'joint' | 'mask',
) => {
  const q = structuredClone(p);
  q[role].sha256 = sha256Bytes(b);
  q[role].approval.sha256 = q[role].sha256;
  q.registration[`${role === 'joint' ? 'joint' : role}Sha256`] = q[role].sha256;
  return q;
};

describe('bounded PNG ingestion', () => {
  it('actually decodes approved RGB and RGBA bytes', async () => {
    for (const s of [request.base, request.joint, request.mask]) {
      const d = await decodeApprovedPng(sources.get(s.id)!, s);
      expect(d.bytes.length).toBe(
        s.dimensions.width * s.dimensions.height * s.channels,
      );
    }
  });
  it('checks digest before decoding', async () => {
    await expect(
      decodeApprovedPng(sources.get(request.base.id)!, {
        ...request.base,
        sha256: 'a'.repeat(64),
      }),
    ).rejects.toThrow('SOURCE_SHA256');
  });
  it('invalidates an approval whose digest changed', async () => {
    await expect(
      decodeApprovedPng(sources.get(request.base.id)!, {
        ...request.base,
        approval: { ...request.base.approval, sha256: 'a'.repeat(64) },
      }),
    ).rejects.toThrow('SOURCE_SHA256');
  });
  it.each(['REJECTED', 'DRAFT', 'PRODUCTION_REGISTERED', 'MISSING'])(
    'rejects unsupported approval state %s',
    async (state) => {
      await expect(
        decodeApprovedPng(sources.get(request.base.id)!, {
          ...request.base,
          approval: { ...request.base.approval, state },
        }),
      ).rejects.toThrow('SOURCE_DECLARATION');
    },
  );
  it('retains a hard encoded-byte limit', () => {
    expect(() =>
      inspectPng(Buffer.alloc(pngProofBudget.maxSourceBytes + 1)),
    ).toThrow('SOURCE_BYTES');
  });
  it('rejects wrong declared dimensions', async () => {
    await expect(
      decodeApprovedPng(sources.get(request.base.id)!, {
        ...request.base,
        dimensions: { width: 4, height: 5 },
      }),
    ).rejects.toThrow('SOURCE_DIMENSIONS');
  });
  it('rejects wrong declared channels', async () => {
    await expect(
      decodeApprovedPng(sources.get(request.base.id)!, {
        ...request.base,
        channels: 4,
      }),
    ).rejects.toThrow('SOURCE_DIMENSIONS');
  });
  it.each([
    ['signature', () => Buffer.alloc(50), 'PNG_SIGNATURE'],
    ['truncated', () => tinyPng().subarray(0, -4), 'PNG_TRUNCATED'],
    [
      'CRC',
      () => {
        const b = tinyPng();
        b[29] = b[29]! ^ 1;
        return b;
      },
      'PNG_CRC',
    ],
    [
      'pixel bomb',
      () => tinyPng({ width: 32768, height: 32768 }),
      'PIXEL_BUDGET',
    ],
    ['16-bit', () => tinyPng({ depth: 16 }), 'COLOR_MODE'],
    ['palette', () => tinyPng({ type: 3 }), 'COLOR_MODE'],
    ['interlace', () => tinyPng({ interlace: 1 }), 'COLOR_MODE'],
    [
      'APNG',
      () => tinyPng({ extras: [chunk('acTL', Buffer.alloc(8))] }),
      'UNSUPPORTED_PNG_FEATURE',
    ],
    [
      'ICC',
      () => tinyPng({ extras: [chunk('iCCP', Buffer.from('fake'))] }),
      'UNSUPPORTED_PNG_FEATURE',
    ],
    [
      'EXIF',
      () => tinyPng({ extras: [chunk('eXIf', Buffer.alloc(8))] }),
      'UNSUPPORTED_PNG_FEATURE',
    ],
    [
      'non-sRGB gamma',
      () => tinyPng({ extras: [chunk('gAMA', Buffer.from([0, 0, 0, 1]))] }),
      'COLOR_PROFILE',
    ],
    [
      'unknown critical',
      () => tinyPng({ extras: [chunk('ABCD', Buffer.alloc(0))] }),
      'UNKNOWN_CRITICAL_CHUNK',
    ],
    [
      'compressed text',
      () =>
        tinyPng({
          extras: [
            chunk(
              'zTXt',
              Buffer.concat([
                Buffer.from([120, 0, 0]),
                deflateSync(Buffer.alloc(1024 * 1024)),
              ]),
            ),
          ],
        }),
      'UNSUPPORTED_ANCILLARY_CHUNK',
    ],
    [
      'international text',
      () => tinyPng({ extras: [chunk('iTXt', Buffer.alloc(12))] }),
      'UNSUPPORTED_ANCILLARY_CHUNK',
    ],
    [
      'unknown ancillary',
      () => tinyPng({ extras: [chunk('abCd', Buffer.alloc(0))] }),
      'UNSUPPORTED_ANCILLARY_CHUNK',
    ],
    [
      'duplicate color declaration',
      () =>
        tinyPng({
          extras: [
            chunk('sRGB', Buffer.from([0])),
            chunk('sRGB', Buffer.from([0])),
          ],
        }),
      'DUPLICATE_ANCILLARY_CHUNK',
    ],
    [
      'invalid physical dimensions',
      () => tinyPng({ extras: [chunk('pHYs', Buffer.alloc(8))] }),
      'PNG_PHYSICAL_DIMENSIONS',
    ],
    [
      'over-expansion',
      () => tinyPng({ scan: Buffer.alloc(1024 * 1024) }),
      'PNG_DEFLATE',
    ],
    [
      'short scanline',
      () => tinyPng({ scan: Buffer.alloc(3) }),
      'PNG_SCANLINE_SIZE',
    ],
    [
      'invalid filter',
      () => tinyPng({ scan: Buffer.from([5, 1, 2, 3]) }),
      'PNG_FILTER',
    ],
    [
      'trailing data',
      () => Buffer.concat([tinyPng(), Buffer.alloc(1)]),
      'PNG_END',
    ],
  ] as const)('rejects %s', (_name, create, code) => {
    expect(() => inspectPng(create())).toThrow(code);
  });
  it('does not leak local paths on file errors', async () => {
    await expect(
      readProofSource(
        join(tmpdir(), 'nonexistent-stage16-private'),
        request.base,
      ),
    ).rejects.toThrow('SOURCE_IO');
  });
  it('rejects traversal and URL source declarations', async () => {
    for (const path of [
      '../escape.png',
      'https://example.com/a.png',
      '/absolute.png',
    ])
      await expect(
        readProofSource(tmpdir(), { ...request.base, path }),
      ).rejects.toThrow('SOURCE_DECLARATION');
  });
  it('reads confined originals and refuses directory links', async () => {
    const root = await mkdtemp(join(tmpdir(), 'lammb-png-proof-'));
    try {
      await mkdir(join(root, 'real'));
      await writeFile(
        join(root, 'real', 'base.png'),
        sources.get(request.base.id)!,
      );
      expect(
        await readProofSource(root, { ...request.base, path: 'real/base.png' }),
      ).toEqual(sources.get(request.base.id));
      await symlink(
        join(root, 'real'),
        join(root, 'linked'),
        process.platform === 'win32' ? 'junction' : 'dir',
      );
      await expect(
        readProofSource(root, { ...request.base, path: 'linked/base.png' }),
      ).rejects.toThrow('SOURCE_LINK');
    } finally {
      expect(dirname(resolve(root))).toBe(resolve(tmpdir()));
      expect(basename(root)).toMatch(/^lammb-png-proof-/);
      await rm(root, { recursive: true, force: true });
    }
  });
});

describe('registered contact proof', () => {
  it('reconstructs exact pixels and encoded bytes twice without mutating sources', async () => {
    const before = [...sources].map(([id, b]) => [id, sha256Bytes(b)]);
    const first = await pngContactRenderer.render(request, sources),
      second = await pngContactRenderer.render(
        structuredClone(request),
        new Map([...sources].map(([id, b]) => [id, Buffer.from(b)])),
      );
    expect(first.raw).toEqual(expectedRaw);
    expect(second.output).toEqual(first.output);
    expect(first.receipt.pixelPreservation).toEqual({
      totalPixels: 25,
      changedPixels: 1,
      maskPixels: 1,
      semiTransparentPixels: 1,
      outsideMaskChangedPixels: 0,
    });
    expect([...sources].map(([id, b]) => [id, sha256Bytes(b)])).toEqual(before);
  });
  it('rejects production promotion', async () => {
    await expect(
      pngContactRenderer.render({ ...request, purpose: 'PRODUCTION' }, sources),
    ).rejects.toThrow('REGISTRATION_DECLARATION');
  });
  it('rejects receiver substitution and clipping', async () => {
    const p = structuredClone(request);
    p.registration.baseSha256 = 'a'.repeat(64);
    await expect(pngContactRenderer.render(p, sources)).rejects.toThrow(
      'REGISTRATION_DECLARATION',
    );
    p.registration.baseSha256 = p.base.sha256;
    p.registration.roi.x = 4;
    await expect(pngContactRenderer.render(p, sources)).rejects.toThrow(
      'REGISTRATION_DECLARATION',
    );
  });
  it('rejects missing and extra inputs', async () => {
    await expect(pngContactRenderer.render(request, new Map())).rejects.toThrow(
      'SOURCE_SET',
    );
    const extras = new Map(sources);
    extras.set('unexpected', Buffer.alloc(0));
    await expect(pngContactRenderer.render(request, extras)).rejects.toThrow(
      'SOURCE_SET',
    );
  });
  it('checks source byte budget before hashing or cloning', async () => {
    const s = new Map(sources);
    s.set(request.base.id, Buffer.alloc(pngProofBudget.maxSourceBytes + 1));
    await expect(pngContactRenderer.render(request, s)).rejects.toThrow(
      'SOURCE_BYTES',
    );
  });
  it('checks aggregate byte budget before decoding', async () => {
    let p = structuredClone(request);
    const s = new Map(sources);
    for (const [i, role] of (['base', 'joint', 'mask'] as const).entries()) {
      const b = Buffer.alloc(pngProofBudget.maxSourceBytes, i);
      p = rebound(p, b, role);
      s.set(p[role].id, b);
    }
    await expect(pngContactRenderer.render(p, s)).rejects.toThrow(
      'TOTAL_SOURCE_BYTES',
    );
  });
  it('rejects alpha-mask mismatch', async () => {
    const d = Buffer.alloc(5 * 5 * 3);
    d.set([129, 129, 129], (2 * 5 + 2) * 3);
    const b = await encode(d, 5, 5, 3),
      p = rebound(request, b, 'mask'),
      input = new Map(sources);
    input.set(p.mask.id, b);
    await expect(pngContactRenderer.render(p, input)).rejects.toThrow(
      'ALPHA_MASK_MISMATCH',
    );
  });
  it('rejects contaminated RGB under zero alpha', async () => {
    const j = Buffer.alloc(3 * 3 * 4);
    j.set([200, 50, 20, 128], 16);
    j[0] = 255;
    const b = await encode(j, 3, 3, 4),
      p = rebound(request, b, 'joint'),
      input = new Map(sources);
    input.set(p.joint.id, b);
    await expect(pngContactRenderer.render(p, input)).rejects.toThrow(
      'ZERO_ALPHA_RGB',
    );
  });
  it('rejects an effect outside the saved polygon', async () => {
    const p = structuredClone(request);
    p.registration.polygon = [
      [1, 1],
      [2, 1],
      [2, 2],
      [1, 2],
    ];
    await expect(pngContactRenderer.render(p, sources)).rejects.toThrow(
      'MASK_OUTSIDE_DOMAIN',
    );
  });
  it('rejects an unexpected final hash', async () => {
    await expect(
      pngContactRenderer.render(
        { ...request, expectedOutputSha256: 'a'.repeat(64) },
        sources,
      ),
    ).rejects.toThrow('OUTPUT_RECONSTRUCTION_SHA256');
  });
  it('binds four visible metadata facets to exact image and unchanged Trait Bible', async () => {
    const rendered = await pngContactRenderer.render(request, sources),
      m = createPngProofMetadata(
        spec,
        rendered.output,
        request.expectedOutputSha256,
      );
    expect(m.metadata.attributes).toEqual([
      { trait_type: 'Species', value: 'Sheep' },
      { trait_type: 'Wool', value: 'Ivory Curls' },
      { trait_type: 'Clothing', value: 'Black Hoodie' },
      { trait_type: 'Ear Tag', value: '5280' },
    ]);
    expect(m.binding.tokenAssignment).toBeNull();
    expect(m.metadata.image).toContain(request.expectedOutputSha256);
    expect(Object.keys(m.metadata)).toEqual([
      'name',
      'description',
      'image',
      'external_url',
      'attributes',
    ]);
    expect(() =>
      createPngProofMetadata(spec, rendered.output, 'a'.repeat(64)),
    ).toThrow('METADATA_IMAGE_SHA256');
  });
});
