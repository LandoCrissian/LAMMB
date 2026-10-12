import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve as resolvePath } from 'node:path';
import sharp from 'sharp';
// Keep Stage 22's pinned registration evidence on its immutable snapshot.
import backlog from '../docs/art-production/ARTWORK_BACKLOG_v0.2.0.json';
import currentBacklog from '../docs/art-production/ARTWORK_BACKLOG_v0.3.0.json';
import reviewedBacklog from '../docs/art-production/ARTWORK_BACKLOG_v0.4.0.json';
import expandedBacklog from '../docs/art-production/ARTWORK_BACKLOG_v0.5.0.json';
import stage26Backlog from '../docs/art-production/ARTWORK_BACKLOG_v1.json';
import stage26OwnerDecisions from '../docs/art-production/STAGE26_OWNER_DECISIONS.json';
import stage26Proposals from '../packages/art-generator/fixtures/stage26-authored-proposals.json';
import stage26NextStudies from '../docs/art-production/STAGE26_NEXT_STUDIES.json';
import {
  resolveAuthoredSourceProposals,
  createAuthoredProposalMetadata,
  validateAuthoredSourceProposals,
} from '../packages/art-generator/tooling/authored-source-proposal.ts';
import stage24OwnerDecisions from '../docs/art-production/STAGE24_OWNER_DECISIONS.json';
import spec from '../packages/art-generator/specs/lammb-traits-v1.json';
import { sha256Bytes } from '../packages/art-generator/src/canonical.ts';
import {
  validateArtworkBacklog,
  validateArtworkBacklogUpdate,
  validateArtworkStudyAppend,
  validateArtworkOwnerDecisionUpdate,
} from '../packages/art-generator/tooling/artwork-backlog.ts';
import ownerDecisions from '../docs/art-production/STAGE22_OWNER_DECISIONS.json';
import authoredRegistry from '../packages/art-generator/fixtures/stage22-authored-mutations.json';
import {
  authoredMutationRegistrySchema,
  createAuthoredDevelopmentMetadata,
  resolveAuthoredMutations,
  validateAuthoredMutationSources,
} from '../packages/art-generator/tooling/mutation-registration.ts';
import { canonicalSha256 } from '../packages/art-generator/src/canonical.ts';
import { developmentCatalog } from '@lammb/art-generator/fixtures';
import {
  generationRecipeSchema,
  provenanceManifestSchema,
  traitCatalogSchema,
  traitSchema,
} from '@lammb/art-generator/schema';

// Synthetic fixtures for validation; no fixture here is an approved LAMMB trait.
const digest = 'a'.repeat(64);
describe('Stage 26 owner review and authored-source proposals', () => {
  const specRaw = sha256Bytes(
    readFileSync(
      new URL(
        '../packages/art-generator/specs/lammb-traits-v1.json',
        import.meta.url,
      ),
    ),
  );
  const ownerRaw = sha256Bytes(
    readFileSync(
      new URL(
        '../docs/art-production/STAGE26_OWNER_DECISIONS.json',
        import.meta.url,
      ),
    ),
  );
  const resolveProposal = (
    p: unknown = stage26Proposals,
    b: unknown = stage26Backlog,
    owner: unknown = stage26OwnerDecisions,
  ) => resolveAuthoredSourceProposals(p, b, spec, specRaw, owner);

  it('plans exactly three studies with approved native references and no generation or frequency authorization', () => {
    expect(stage26NextStudies.studies).toHaveLength(3);
    expect(stage26NextStudies.generationAuthorized).toBe(false);
    expect(stage26NextStudies.imagegenCallsThisTask).toBe(0);
    expect(stage26NextStudies.productionPromotionAuthorized).toBe(false);
    expect(stage26NextStudies.collectionSupply).toBe(5280);
    expect(stage26NextStudies.traitFrequenciesChanged).toBe(false);
    expect(stage26NextStudies.grailReservationsChanged).toBe(false);
    for (const study of stage26NextStudies.studies) {
      expect(
        study.references.filter((r) => r.role.startsWith('PRIMARY_')),
      ).toHaveLength(1);
      expect(study.prompt.length).toBeGreaterThan(600);
      for (const ref of study.references) {
        const item = stage26Backlog.items.find((i) => i.id === ref.backlogId)!;
        expect(item.artisticApproval).toBe('ART_DIRECTION_APPROVED');
        const source = item.sources.find((s) => s.id === ref.sourceId)!;
        expect(source.sha256).toBe(ref.sha256);
        expect(source.path).toBe(ref.path);
        expect(source.dimensions).toEqual(ref.dimensions);
        expect(['SOURCE_ARTWORK', 'GENERATED_NATIVE_STUDY']).toContain(
          source.role,
        );
      }
      for (const traitId of study.proposedExistingTraitIds)
        expect(spec.traits.some((t) => t.id === traitId)).toBe(true);
    }
  });

  it('preserves 115 sources and history prefixes while appending only the three owner decisions', () => {
    const b = validateArtworkOwnerDecisionUpdate(
      expandedBacklog,
      stage26Backlog,
      stage26OwnerDecisions,
      ownerRaw,
    );
    expect(b.backlogVersion).toBe('0.6.0');
    expect(b.items).toHaveLength(115);
    expect(b.evidence.slice(0, expandedBacklog.evidence.length)).toEqual(
      expandedBacklog.evidence,
    );
    for (const [index, after] of b.items.entries()) {
      const before = expandedBacklog.items[index]!;
      expect(after.sources).toEqual(before.sources);
      expect(after.technicalStatus).toEqual(before.technicalStatus);
      expect(
        after.ownerDecisionHistory.slice(0, before.ownerDecisionHistory.length),
      ).toEqual(before.ownerDecisionHistory);
      expect(after.productionRegistration).toBe('NOT_PRODUCTION_REGISTERED');
      expect(after.finalProductionApproval).toBeNull();
    }
    for (const decision of stage26OwnerDecisions.decisions) {
      const after = b.items.find((i) => i.id === decision.backlogId)!;
      expect(after.artisticApproval).toBe(decision.decision);
      expect(after.studyReview?.ownerReviewStatus).toBe(decision.decision);
    }
    expect(
      b.items.find((i) => i.id === 'backlog-study21-skeletal-correction')!
        .artisticApproval,
    ).toBe('REJECTED');
    expect(
      b.items.find((i) => i.id === 'backlog-study23-ovine-skeletal')!
        .artisticApproval,
    ).toBe('NEEDS_REFINEMENT');
    expect(ownerRaw).toBe(stage26Proposals.ownerEvidence.sha256);
  });
  it.each([
    'history rewrite',
    'source rewrite',
    'wrong decision hash',
    'unknown item',
    'duplicate decision',
    'undated event',
    'missing event',
    'compatibility rewrite',
    'technical QA rewrite',
    'production promotion',
    'unsupported transition',
    'changed evidence',
  ])('owner update rejects %s', (mode) => {
    const b = structuredClone(stage26Backlog),
      owner = structuredClone(stage26OwnerDecisions);
    const item = b.items.find((i) => i.id === 'backlog-study25-amused')!;
    if (mode === 'history rewrite')
      item.ownerDecisionHistory[0]!.scope = 'rewritten';
    if (mode === 'source rewrite') item.sources[0]!.sha256 = digest;
    if (mode === 'wrong decision hash')
      owner.decisions[0]!.sourceSha256 = digest;
    if (mode === 'unknown item') owner.decisions[0]!.backlogId = 'absent';
    if (mode === 'duplicate decision')
      owner.decisions.push(owner.decisions[0]!);
    if (mode === 'undated event') item.ownerDecisionHistory.at(-1)!.date = null;
    if (mode === 'missing event') item.ownerDecisionHistory.pop();
    if (mode === 'compatibility rewrite')
      item.studyReview!.compatibilityRestrictions.push('UNAUTHORIZED_CONTACT');
    if (mode === 'technical QA rewrite')
      item.technicalStatus = 'NEEDS_REFINEMENT';
    if (mode === 'production promotion')
      item.productionRegistration = 'PRODUCTION_REGISTERED';
    if (mode === 'unsupported transition') b.backlogVersion = '0.4.0';
    if (mode === 'changed evidence') b.evidence.at(-1)!.sha256 = digest;
    expect(() =>
      validateArtworkOwnerDecisionUpdate(expandedBacklog, b, owner, ownerRaw),
    ).toThrow();
  });
  it('resolves only the two approved full frames and emits partial visible metadata', () => {
    const result = resolveProposal();
    expect(result.resolved.map((f) => f.asset.family)).toEqual([
      'AMUSED_HOODIE',
      'LAB_COAT',
    ]);
    const bytes = Buffer.from('synthetic metadata input, never artwork');
    const facets = result.resolved.map((frame) => {
      expect(frame.asset.productionRegistered).toBe(false);
      expect(() => createAuthoredProposalMetadata(frame, bytes)).toThrow(
        'PROPOSAL_METADATA_IMAGE',
      );
      const synthetic = {
        ...frame,
        source: { ...frame.source, sha256: sha256Bytes(bytes) },
      };
      const { metadata, binding } = createAuthoredProposalMetadata(
        synthetic,
        bytes,
      );
      expect(binding.productionRegistered).toBe(false);
      expect(binding.completeCollectionVector).toBe(false);
      expect(binding.tokenAssignment).toBeNull();
      expect(binding.imageSha256).toBe(sha256Bytes(bytes));
      expect(metadata.attributes.map((a) => a.trait_type)).not.toContain(
        'Eyes',
      );
      expect(metadata.attributes.map((a) => a.trait_type)).not.toContain(
        'Wool',
      );
      expect(metadata.attributes.map((a) => a.trait_type)).not.toContain(
        'Background',
      );
      return metadata.attributes;
    });
    expect(facets[0]).toEqual([
      { trait_type: 'Species', value: 'Sheep' },
      { trait_type: 'Expression', value: 'Amused' },
      { trait_type: 'Clothing', value: 'Black Hoodie' },
    ]);
    expect(facets[1]).toEqual([
      { trait_type: 'Species', value: 'Sheep' },
      { trait_type: 'Clothing', value: 'Lab Coat' },
    ]);
  });
  it.each([
    'duplicate source',
    'production promotion',
    'contact claim',
    'extracted layers',
    'token assignment',
    'wrong family',
    'invented wool',
    'invented eyes',
    'source hash',
    'missing approval',
    'refinement source',
    'wrong owner hash',
    'wrong owner date',
    'unbound evidence',
    'spec content',
    'backlog content',
    'unsafe path',
  ])('proposal rejects %s', (mode) => {
    const p = structuredClone(stage26Proposals),
      b = structuredClone(stage26Backlog),
      owner = structuredClone(stage26OwnerDecisions);
    const item = b.items.find((i) => i.id === 'backlog-study25-amused')!;
    if (mode === 'duplicate source')
      p.assets[1]!.sourceSha256 = p.assets[0]!.sourceSha256;
    if (mode === 'production promotion')
      Object.assign(p.assets[0]!, { productionRegistered: true });
    if (mode === 'contact claim')
      p.assets[0]!.poseContactRegistration = 'REGISTERED';
    if (mode === 'extracted layers')
      Object.assign(p.assets[0]!, { extractedLayers: true });
    if (mode === 'token assignment')
      Object.assign(p.assets[0]!, { tokenId: 1 });
    if (mode === 'wrong family') p.assets[0]!.family = 'LAB_COAT';
    if (mode === 'invented wool')
      p.assets[0]!.visibleTraitIds.push('lammb-wool-ivory');
    if (mode === 'invented eyes')
      p.assets[1]!.visibleTraitIds.push('lammb-eyes-radioactive');
    if (mode === 'source hash') p.assets[0]!.sourceSha256 = digest;
    if (mode === 'missing approval') {
      item.artisticApproval = 'UNREVIEWED';
      p.backlogSha256 = canonicalSha256(b);
    }
    if (mode === 'refinement source')
      p.assets[0]!.backlogId = 'backlog-study25-rolled-locks-evolution';
    if (mode === 'wrong owner hash') owner.decisions[0]!.sourceSha256 = digest;
    if (mode === 'wrong owner date')
      owner.recordedAt = '2026-01-01T00:00:00.000Z';
    if (mode === 'unbound evidence') p.ownerEvidence.sha256 = digest;
    if (mode === 'spec content') p.specCanonicalSha256 = digest;
    if (mode === 'backlog content') p.backlogSha256 = digest;
    if (mode === 'unsafe path') p.ownerEvidence.path = '../owner.json';
    expect(() => resolveProposal(p, b, owner)).toThrow();
  });
  it('does not rehabilitate a quarantined hash through a forged approved declaration', () => {
    const p = structuredClone(stage26Proposals),
      b = structuredClone(stage26Backlog),
      owner = structuredClone(stage26OwnerDecisions);
    const item = b.items.find((i) => i.id === 'backlog-study25-amused')!,
      rejected = b.items
        .find((i) => i.id === 'backlog-study21-skeletal-correction')!
        .sources.find((s) => s.role === 'NEGATIVE_QA_ONLY')!;
    item.sources.find((s) => s.role === 'GENERATED_NATIVE_STUDY')!.sha256 =
      rejected.sha256;
    p.assets[0]!.sourceSha256 = rejected.sha256;
    owner.decisions[0]!.sourceSha256 = rejected.sha256;
    p.backlogSha256 = canonicalSha256(b);
    expect(() => resolveProposal(p, b, owner)).toThrow(
      'PROPOSAL_NATIVE_SOURCE',
    );
  });
  it('pins the proposal before filesystem access', async () => {
    await expect(
      validateAuthoredSourceProposals(
        'nonexistent',
        stage26Proposals,
        stage26Backlog,
        spec,
        specRaw,
        digest,
      ),
    ).rejects.toThrow('PROPOSAL_SHA256');
  });
  it.each([
    'valid',
    'malformed native',
    'native tampering',
    'dimension mismatch',
    'oversized native',
    'missing generation',
    'wrong reference',
    'missing reference',
    'owner tampering',
    'mutated proposal',
    'mutated context',
  ])('bounded proposal I/O: %s', async (scenario) => {
    // Synthetic test pixels and operator records, never approved LAMMB assets.
    const parent = resolvePath(tmpdir()),
      root = await mkdtemp(join(parent, 'lammb-stage26-test-'));
    try {
      const p = structuredClone(stage26Proposals),
        b = structuredClone(stage26Backlog),
        owner = structuredClone(stage26OwnerDecisions),
        generations = [];
      for (const [index, asset] of p.assets.entries()) {
        const item = b.items.find((i) => i.id === asset.backlogId)!,
          target = item.sources.find((s) => s.id === asset.sourceId)!;
        const png = await sharp({
          create: {
            width: 8,
            height: 8,
            channels: 3,
            background: index ? '#345678' : '#123456',
          },
        })
          .png()
          .toBuffer();
        let bytes = png;
        if (index === 0 && scenario === 'malformed native') {
          bytes = Buffer.from(png);
          bytes[0] = 0;
        }
        if (index === 0 && scenario === 'oversized native')
          bytes = Buffer.alloc(4 * 1024 * 1024 + 1);
        target.path = `native-${index}.png`;
        target.sha256 = sha256Bytes(bytes);
        target.dimensions = { width: 8, height: 8 };
        if (index === 0 && scenario === 'dimension mismatch')
          target.dimensions.width = 7;
        asset.sourceSha256 = target.sha256;
        owner.decisions.find((d) => d.backlogId === item.id)!.sourceSha256 =
          target.sha256;
        const refs = item.sources.filter((s) =>
          [
            'PRIMARY_RASTER_REFERENCE',
            'SUPPORTING_APPROVED_RASTER_REFERENCE',
          ].includes(s.role),
        );
        for (const [ri, ref] of refs.entries()) {
          ref.path = `ref-${index}-${ri}.png`;
          ref.sha256 = sha256Bytes(png);
          if (!(index === 0 && ri === 0 && scenario === 'missing reference'))
            await writeFile(join(root, ref.path), png);
        }
        generations.push({
          tool: 'image_gen.imagegen',
          outputSha256: target.sha256,
          actualNativeDimensions: target.dimensions,
          references: refs.map((ref) => ({
            sha256: ref.sha256,
            role: ref.role,
          })),
        });
        await writeFile(
          join(root, target.path),
          index === 0 && scenario === 'native tampering'
            ? Buffer.from('changed')
            : bytes,
        );
      }
      if (scenario === 'missing generation')
        generations[0]!.outputSha256 = digest;
      if (scenario === 'wrong reference')
        generations[0]!.references[0]!.sha256 = digest;
      const ownerBytes = Buffer.from(JSON.stringify(owner)),
        genBytes = Buffer.from(JSON.stringify(generations));
      const oe = b.evidence.find(
          (e) => e.id === 'evidence-stage26-owner-decisions',
        )!,
        ge = b.evidence.find((e) => e.id === 'evidence-stage25-generation')!;
      Object.assign(oe, {
        path: 'owner.json',
        sha256: sha256Bytes(ownerBytes),
        bytes: ownerBytes.length,
      });
      Object.assign(ge, {
        path: 'provenance.json',
        sha256: sha256Bytes(genBytes),
        bytes: genBytes.length,
      });
      p.ownerEvidence = { path: oe.path, sha256: oe.sha256 };
      p.provenanceEvidence = { path: ge.path, sha256: ge.sha256 };
      p.backlogSha256 = canonicalSha256(b);
      await writeFile(
        join(root, 'owner.json'),
        scenario === 'owner tampering' ? Buffer.from('{}') : ownerBytes,
      );
      await writeFile(join(root, 'provenance.json'), genBytes);
      const validation = validateAuthoredSourceProposals(
        root,
        p,
        b,
        spec,
        specRaw,
        canonicalSha256(p),
      );
      if (scenario === 'mutated proposal') p.assets[0]!.sourceSha256 = digest;
      if (scenario === 'mutated context')
        b.items[0]!.nextAction = 'Mutated after validation began';
      if (scenario === 'valid') {
        const receipt = await validation;
        expect(receipt.verified).toHaveLength(2);
        expect(receipt.productionRegistered).toBe(false);
        expect(receipt.verified.map((v) => v.decodedBytes)).toEqual([192, 192]);
      } else await expect(validation).rejects.toThrow();
    } finally {
      if (dirname(resolvePath(root)) !== parent)
        throw new Error('Unsafe test cleanup path');
      await rm(root, { recursive: true, force: true });
    }
  });
});
describe('Stage 25 append after source-bound owner review', () => {
  it('preserves all 112 reviewed records and appends exactly three pending studies', () => {
    const b = validateArtworkStudyAppend(reviewedBacklog, expandedBacklog);
    expect(b.backlogVersion).toBe('0.5.0');
    expect(b.items).toHaveLength(115);
    expect(b.items.slice(0, 112)).toEqual(reviewedBacklog.items);
    expect(b.evidence.slice(0, reviewedBacklog.evidence.length)).toEqual(
      reviewedBacklog.evidence,
    );
    expect(b.items.slice(112).map((i) => i.technicalStatus)).toEqual([
      'PRODUCTION_CANDIDATE',
      'NEEDS_REFINEMENT',
      'PRODUCTION_CANDIDATE',
    ]);
    for (const i of b.items.slice(112)) {
      expect(i.artisticApproval).toBe('UNREVIEWED');
      expect(i.studyReview?.ownerReviewStatus).toBe('PENDING');
      expect(i.productionRegistration).toBe('NOT_PRODUCTION_REGISTERED');
      expect(i.finalProductionApproval).toBeNull();
    }
    expect(
      b.items.find((i) => i.id === 'backlog-study23-ovine-skeletal')!
        .artisticApproval,
    ).toBe('NEEDS_REFINEMENT');
    expect(
      b.items.find((i) => i.id === 'backlog-study23-pixel-drip-evolution')!
        .artisticApproval,
    ).toBe('ART_DIRECTION_APPROVED');
  });
  it.each([
    'old owner history rewrite',
    'old source replacement',
    'unapproved raster',
    'reference dimensions',
    'duplicate native output',
    'missing primary raster',
    'second primary raster',
    'missing provenance',
    'four studies',
    'owner approval claim',
    'production promotion',
    'unsupported version transition',
  ])('rejects %s', (mode) => {
    const b = structuredClone(expandedBacklog),
      study = b.items[112]!;
    if (mode === 'old owner history rewrite')
      b.items[111]!.ownerDecisionHistory.at(-1)!.scope = 'rewritten';
    if (mode === 'old source replacement')
      b.items[0]!.sources[0]!.sha256 = digest;
    if (mode === 'unapproved raster') study.sources[0]!.sha256 = digest;
    if (mode === 'reference dimensions')
      study.sources[0]!.dimensions.width = 1200;
    if (mode === 'duplicate native output')
      study.sources.at(-1)!.sha256 = b.items[113]!.sources.at(-1)!.sha256;
    if (mode === 'missing primary raster')
      study.sources = study.sources.filter(
        (s) => s.role !== 'PRIMARY_RASTER_REFERENCE',
      );
    if (mode === 'second primary raster')
      study.sources[1]!.role = 'PRIMARY_RASTER_REFERENCE';
    if (mode === 'missing provenance')
      study.studyReview!.provenanceEvidence = 'absent-generation';
    if (mode === 'four studies')
      b.items.push({
        ...structuredClone(study),
        id: 'unauthorized-fourth-study',
      });
    if (mode === 'owner approval claim')
      study.artisticApproval = 'ART_DIRECTION_APPROVED';
    if (mode === 'production promotion')
      study.productionRegistration = 'PRODUCTION_REGISTERED';
    if (mode === 'unsupported version transition') b.backlogVersion = '0.3.0';
    expect(() => validateArtworkStudyAppend(reviewedBacklog, b)).toThrow();
  });
});
describe('source-bound Stage 24 owner art review', () => {
  const ownerRawSha = sha256Bytes(
    readFileSync(
      new URL(
        '../docs/art-production/STAGE24_OWNER_DECISIONS.json',
        import.meta.url,
      ),
    ),
  );
  it('appends two art approvals and one refinement without production promotion', () => {
    const b = validateArtworkOwnerDecisionUpdate(
      currentBacklog,
      reviewedBacklog,
      stage24OwnerDecisions,
      ownerRawSha,
    );
    expect(b.items).toHaveLength(112);
    for (const d of stage24OwnerDecisions.decisions) {
      const before = currentBacklog.items.find((i) => i.id === d.backlogId)!;
      const after = b.items.find((i) => i.id === d.backlogId)!;
      expect(after.sources).toEqual(before.sources);
      expect(after.artisticApproval).toBe(d.decision);
      expect(after.studyReview?.ownerReviewStatus).toBe(d.decision);
      expect(
        after.ownerDecisionHistory.slice(0, before.ownerDecisionHistory.length),
      ).toEqual(before.ownerDecisionHistory);
      expect(after.productionRegistration).toBe('NOT_PRODUCTION_REGISTERED');
      expect(after.finalProductionApproval).toBeNull();
    }
    expect(
      b.items.find((i) => i.id === 'backlog-study21-skeletal-correction')!
        .artisticApproval,
    ).toBe('REJECTED');
    expect(
      b.items.find((i) => i.id === 'backlog-stage12-03-magma')!
        .artisticApproval,
    ).toBe('ART_DIRECTION_APPROVED');
  });
  it.each([
    'wrong output hash',
    'unknown item',
    'duplicate decision',
    'fake evidence hash',
    'missing decision',
    'undated decision',
    'edited old history',
    'modified provenance',
    'changed compatibility',
    'unrequested item change',
    'production promotion',
  ])('rejects %s', (mode) => {
    const b = structuredClone(reviewedBacklog),
      owner = structuredClone(stage24OwnerDecisions);
    const pixel = b.items.find(
      (i) => i.id === 'backlog-study23-pixel-drip-evolution',
    )!;
    if (mode === 'wrong output hash') owner.decisions[0]!.sourceSha256 = digest;
    if (mode === 'unknown item') owner.decisions[0]!.backlogId = 'missing-item';
    if (mode === 'duplicate decision')
      owner.decisions.push(owner.decisions[0]!);
    if (mode === 'fake evidence hash') b.evidence.at(-1)!.sha256 = digest;
    if (mode === 'missing decision') pixel.ownerDecisionHistory.pop();
    if (mode === 'undated decision')
      pixel.ownerDecisionHistory.at(-1)!.date = null;
    if (mode === 'edited old history')
      pixel.ownerDecisionHistory[0]!.scope = 'rewritten';
    if (mode === 'modified provenance')
      pixel.studyReview!.provenanceEvidence = 'evidence-stage23-native-decode';
    if (mode === 'changed compatibility')
      pixel.studyReview!.compatibilityRestrictions = ['arbitrary layering'];
    if (mode === 'unrequested item change')
      b.items[0]!.nextAction = 'unauthorized';
    if (mode === 'production promotion')
      pixel.productionRegistration = 'PRODUCTION_REGISTERED';
    expect(() =>
      validateArtworkOwnerDecisionUpdate(currentBacklog, b, owner, ownerRawSha),
    ).toThrow();
  });
});
describe('bounded new-study append and immutable registration snapshots', () => {
  it('preserves the exact Stage 22 binding and all 109 historical records', () => {
    expect(canonicalSha256(backlog)).toBe(authoredRegistry.backlogSha256);
    const b = validateArtworkStudyAppend(backlog, currentBacklog);
    expect(b.items).toHaveLength(112);
    expect(b.items.slice(0, 109)).toEqual(backlog.items);
    expect(b.evidence.slice(0, backlog.evidence.length)).toEqual(
      backlog.evidence,
    );
    const added = b.items.slice(109);
    expect(added.map((i) => i.studyReview?.qaClassification)).toEqual([
      'NEEDS_REFINEMENT',
      'PRODUCTION_CANDIDATE',
      'PRODUCTION_CANDIDATE',
    ]);
    expect(added.every((i) => i.artisticApproval === 'UNREVIEWED')).toBe(true);
    expect(added.every((i) => i.finalProductionApproval === null)).toBe(true);
  });
  it.each([
    'remove historical item',
    'rewrite rejected history',
    'rewrite historical hash',
    'rewrite evidence',
    'change baseline',
    'no additions',
    'too many additions',
    'unapproved primary',
    'mismatched reference dimensions',
    'duplicate new output',
    'relabel old output',
    'unbound generation evidence',
    'undated QA',
    'false art approval',
    'production promotion',
    'rejected QA positive source',
    'provenance role substitution',
  ])('rejects %s', (mode) => {
    const b = structuredClone(currentBacklog);
    const study = b.items[109]!;
    const output = study.sources.at(-1)!;
    if (mode === 'remove historical item') b.items.splice(0, 1);
    if (mode === 'rewrite rejected history')
      b.items.find(
        (i) => i.id === 'backlog-study21-skeletal-correction',
      )!.ownerDecisionHistory[0]!.scope = 'rewritten';
    if (mode === 'rewrite historical hash')
      b.items[0]!.sources[0]!.sha256 = digest;
    if (mode === 'rewrite evidence') b.evidence[0]!.sha256 = digest;
    if (mode === 'change baseline') b.mainSha = 'a'.repeat(40);
    if (mode === 'no additions') b.items = b.items.slice(0, 109);
    if (mode === 'too many additions') {
      const extra = structuredClone(study);
      extra.id = 'test-extra-study';
      b.items.push(extra);
    }
    if (mode === 'unapproved primary') study.sources[0]!.sha256 = digest;
    if (mode === 'mismatched reference dimensions')
      study.sources[0]!.dimensions.width = 64;
    if (mode === 'duplicate new output')
      output.sha256 = b.items[110]!.sources.at(-1)!.sha256;
    if (mode === 'relabel old output')
      output.sha256 = backlog.items[0]!.sources[0]!.sha256;
    if (mode === 'unbound generation evidence')
      study.studyReview!.provenanceEvidence = 'missing-generation';
    if (mode === 'undated QA') study.ownerDecisionHistory.at(-1)!.date = null;
    if (mode === 'false art approval') {
      study.artisticApproval = 'ART_DIRECTION_APPROVED';
      study.ownerDecisionHistory[0]!.decision = 'ART_DIRECTION_APPROVED';
    }
    if (mode === 'production promotion')
      study.productionRegistration = 'PRODUCTION_REGISTERED';
    if (mode === 'rejected QA positive source') {
      study.technicalStatus = 'REJECTED';
      study.studyReview!.qaClassification = 'REJECTED';
      study.ownerDecisionHistory.at(-1)!.decision = 'REJECTED';
    }
    if (mode === 'provenance role substitution')
      b.evidence.at(-3)!.kind = 'OWNER_APPROVAL';
    expect(() => validateArtworkStudyAppend(backlog, b)).toThrow();
  });
  it('quarantines a newly technically rejected study without changing old owner decisions', () => {
    const b = structuredClone(currentBacklog),
      study = b.items[109]!;
    study.technicalStatus = 'REJECTED';
    study.studyReview!.qaClassification = 'REJECTED';
    study.ownerDecisionHistory.at(-1)!.decision = 'REJECTED';
    study.sources.at(-1)!.role = 'NEGATIVE_QA_ONLY';
    expect(
      validateArtworkStudyAppend(backlog, b).items[109]!.artisticApproval,
    ).toBe('UNREVIEWED');
  });
  it('validates the current specification while refusing it as the historical registry snapshot', () => {
    const rawHash = sha256Bytes(
      readFileSync(
        new URL(
          '../packages/art-generator/specs/lammb-traits-v1.json',
          import.meta.url,
        ),
      ),
    );
    expect(
      validateArtworkBacklog(currentBacklog, spec, rawHash).items,
    ).toHaveLength(112);
    expect(() =>
      resolveAuthoredMutations(
        authoredRegistry,
        currentBacklog,
        spec,
        rawHash,
        ownerDecisions,
      ),
    ).toThrow();
  });
});
describe('durable artwork backlog approval and source boundaries', () => {
  const specHash = sha256Bytes(
    readFileSync(
      new URL(
        '../packages/art-generator/specs/lammb-traits-v1.json',
        import.meta.url,
      ),
    ),
  );
  const clone = () => structuredClone(backlog);
  it('preserves historical rejections and separate owner/production gates', () => {
    const b = validateArtworkBacklog(backlog, spec, specHash);
    expect(b.items.length).toBeGreaterThanOrEqual(105);
    expect(
      b.items.filter((i) => i.kind === 'AUTHORIZED_NEW_STUDY'),
    ).toHaveLength(3);
    expect(
      b.items.every(
        (i) =>
          i.productionRegistration === 'NOT_PRODUCTION_REGISTERED' &&
          i.finalProductionApproval === null,
      ),
    ).toBe(true);
    expect(
      b.items.find((i) => i.id === 'backlog-01-skeletal')!.artisticApproval,
    ).toBe('REJECTED');
    expect(
      b.items.find((i) => i.id === 'backlog-01-skeletal-corrected')!
        .artisticApproval,
    ).toBe('REJECTED');
    expect(
      b.items.find((i) => i.id === 'backlog-01-void')!.artisticApproval,
    ).toBe('CONDITIONAL_ART_APPROVAL');
  });
  it.each([
    'duplicate item',
    'bad hash',
    'path traversal',
    'network path',
    'production promotion',
    'token assignment',
    'missing history evidence',
    'approval from generation authorization',
    'positive rejected reference',
    'quarantine promotion',
    'frequency change',
    'grail change',
    'wrong supply',
    'missing primary raster',
  ])('rejects %s', (test) => {
    const b = clone(),
      s = b.items.find((i) => i.kind === 'AUTHORIZED_NEW_STUDY')!,
      q = b.items.find((i) => i.kind === 'QUARANTINED_REPAIR_EXPERIMENT')!;
    switch (test) {
      case 'duplicate item':
        b.items[1]!.id = b.items[0]!.id;
        break;
      case 'bad hash':
        b.items[0]!.sources[0]!.sha256 = 'bad';
        break;
      case 'path traversal':
        b.items[0]!.sources[0]!.path = '../source.png';
        break;
      case 'network path':
        b.items[0]!.sources[0]!.path = 'https://example.com/source.png';
        break;
      case 'production promotion':
        b.items[0]!.productionRegistration = 'PRODUCTION_REGISTERED';
        break;
      case 'token assignment':
        Object.assign(b.items[0]!, { tokenId: 1 });
        break;
      case 'missing history evidence':
        b.items[0]!.ownerDecisionHistory[0]!.evidence = 'unknown-record';
        break;
      case 'approval from generation authorization':
        s.artisticApproval = 'ART_DIRECTION_APPROVED';
        s.ownerDecisionHistory = s.ownerDecisionHistory.filter(
          (h) => h.decision !== 'ART_DIRECTION_APPROVED',
        );
        break;
      case 'positive rejected reference':
        b.items.find(
          (i) => i.artisticApproval === 'REJECTED',
        )!.sources[0]!.role = 'SOURCE_ARTWORK';
        break;
      case 'quarantine promotion':
        q.sources[0]!.role = 'PRIMARY_RASTER_REFERENCE';
        break;
      case 'frequency change':
        b.frequenciesChanged = true;
        break;
      case 'grail change':
        b.grailReservationsChanged = true;
        break;
      case 'wrong supply':
        b.collectionSupply = 5279;
        break;
      case 'missing primary raster':
        s.sources = s.sources.filter(
          (v) => v.role !== 'PRIMARY_RASTER_REFERENCE',
        );
        break;
    }
    expect(() => validateArtworkBacklog(b, spec, specHash)).toThrow(
      'ARTWORK_BACKLOG_SCHEMA',
    );
  });
  it('rejects specification drift and invented trait IDs', () => {
    const b = clone();
    b.traitBibleSha256 = '0'.repeat(64);
    expect(() => validateArtworkBacklog(b, spec, specHash)).toThrow(
      'ARTWORK_BACKLOG_SPEC_BINDING',
    );
    b.traitBibleSha256 = specHash;
    b.items[0]!.traitIds = ['lammb-new-unapproved-family'];
    expect(() => validateArtworkBacklog(b, spec, specHash)).toThrow(
      'ARTWORK_BACKLOG_UNKNOWN_TRAIT',
    );
  });
});

describe('Stage22 authored mutation declarations and owner transitions', () => {
  const specHash = sha256Bytes(
    readFileSync(
      new URL(
        '../packages/art-generator/specs/lammb-traits-v1.json',
        import.meta.url,
      ),
    ),
  );
  const resolve = (
    r: unknown = authoredRegistry,
    b: unknown = backlog,
    owner: unknown = ownerDecisions,
  ) => resolveAuthoredMutations(r, b, spec, specHash, owner);
  it('keeps two approved frames separate from contact registration and logical eligibility', () => {
    const r = resolve();
    expect(r.resolved).toHaveLength(2);
    expect(r.resolved.map((a) => a.asset.productionRegistered)).toEqual([
      false,
      false,
    ]);
    expect(r.resolved[0]!.compatibility).toBe(
      'BLOCKED_BY_EXISTING_MAGMA_CLOTHING_RULE',
    );
    expect(r.resolved[1]!.compatibility).toBe('INCOMPLETE_TRAIT_VECTOR');
    expect(
      backlog.items.find((i) => i.id === 'backlog-study21-skeletal-correction')!
        .artisticApproval,
    ).toBe('REJECTED');
    expect(
      backlog.items.find((i) => i.id === 'backlog-stage12-03-magma')!
        .artisticApproval,
    ).toBe('ART_DIRECTION_APPROVED');
    expect(
      sha256Bytes(
        readFileSync(
          new URL(
            '../docs/art-production/STAGE22_OWNER_DECISIONS.json',
            import.meta.url,
          ),
        ),
      ),
    ).toBe(authoredRegistry.ownerEvidence.sha256);
  });
  it.each([
    'duplicate source',
    'production promotion',
    'token assignment',
    'contact inheritance',
    'wrong family',
    'wrong wool',
    'unmeasured pixel facet',
    'invented eyes',
    'coverage promotion',
    'wrong source hash',
    'missing provenance',
    'missing owner',
    'rejected source',
    'owner hash mismatch',
    'owner rejection',
  ])('rejects %s', (test) => {
    const r = structuredClone(authoredRegistry),
      b = structuredClone(backlog),
      owner = structuredClone(ownerDecisions);
    switch (test) {
      case 'duplicate source':
        r.assets.push(structuredClone(r.assets[0]!));
        break;
      case 'production promotion':
        Object.assign(r.assets[0]!, { productionRegistered: true });
        break;
      case 'token assignment':
        Object.assign(r.assets[0]!, { tokenId: 1 });
        break;
      case 'contact inheritance':
        r.assets[0]!.contactReuse = 'STAGE17_ANY_CONTACT';
        break;
      case 'wrong family':
        r.assets[0]!.family = 'NORMAL_LOCALIZED_PIXEL_DRIP';
        break;
      case 'wrong wool':
        r.assets[0]!.visibleTraitIds.push('lammb-wool-ivory');
        break;
      case 'unmeasured pixel facet':
        r.assets[1]!.visibleTraitIds.push('lammb-pixel-corruption-touch');
        break;
      case 'invented eyes':
        r.assets[1]!.visibleTraitIds.push('lammb-eyes-radioactive');
        break;
      case 'coverage promotion':
        r.assets[1]!.coverage = 'CERTIFIED_TOUCH';
        break;
      case 'wrong source hash':
        r.assets[0]!.sourceSha256 = '0'.repeat(64);
        break;
      case 'missing provenance':
        r.provenanceEvidence.sha256 = '0'.repeat(64);
        break;
      case 'missing owner':
        b.items
          .find((i) => i.id === r.assets[0]!.backlogId)!
          .ownerDecisionHistory.pop();
        break;
      case 'rejected source':
        r.assets[0]!.backlogId = 'backlog-study21-skeletal-correction';
        break;
      case 'owner hash mismatch':
        owner.decisions[0]!.sourceSha256 = '0'.repeat(64);
        break;
      case 'owner rejection':
        owner.decisions[0]!.decision = 'REJECTED';
        break;
    }
    expect(() => resolve(r, b, owner)).toThrow();
  });
  it('excludes negative hashes even when a forged backlog declares that source approved', () => {
    const r = structuredClone(authoredRegistry),
      b = structuredClone(backlog),
      owner = structuredClone(ownerDecisions);
    const target = b.items
      .find((i) => i.id === r.assets[0]!.backlogId)!
      .sources.find((s) => s.role === 'GENERATED_NATIVE_STUDY')!;
    const rejected = b.items
      .find((i) => i.id === 'backlog-study21-skeletal-correction')!
      .sources.find((s) => s.role === 'NEGATIVE_QA_ONLY')!;
    target.sha256 = rejected.sha256;
    r.assets[0]!.sourceSha256 = rejected.sha256;
    owner.decisions[0]!.sourceSha256 = rejected.sha256;
    r.backlogSha256 = canonicalSha256(b);
    expect(() => resolve(r, b, owner)).toThrow('AUTHORED_SOURCE');
  });
  it('publishes no unsupported or absent facets in development metadata and binds image bytes', () => {
    const resolved = resolve();
    expect(() =>
      createAuthoredDevelopmentMetadata(
        resolved.resolved[0]!,
        Buffer.from('not native'),
      ),
    ).toThrow('AUTHORED_METADATA_IMAGE');
    // Synthetic digest-only input for metadata shape, never a production source.
    const bytes = Buffer.from('synthetic visible metadata fixture');
    for (const asset of resolved.resolved) {
      const synthetic = {
        ...asset,
        source: { ...asset.source, sha256: sha256Bytes(bytes) },
      };
      const result = createAuthoredDevelopmentMetadata(synthetic, bytes);
      const categories = result.metadata.attributes.map((a) => a.trait_type);
      expect(categories).toContain('Clothing');
      expect(categories).not.toContain('Pixel Corruption');
      expect(categories).not.toContain('Eyes');
      expect(categories).not.toContain('Accessories');
      expect(result.binding.productionRegistered).toBe(false);
      expect(result.binding.completeCollectionVector).toBe(false);
      expect(result.binding.imageSha256).toBe(sha256Bytes(bytes));
    }
  });
  it('checks the registry digest before private I/O', async () => {
    await expect(
      validateAuthoredMutationSources(
        'nonexistent',
        authoredRegistry,
        backlog,
        spec,
        specHash,
        '0'.repeat(64),
      ),
    ).rejects.toThrow('AUTHORED_REGISTRY_SHA256');
    expect(authoredMutationRegistrySchema.parse(authoredRegistry).purpose).toBe(
      'DEVELOPMENT_ONLY',
    );
    expect(canonicalSha256(authoredRegistry)).toMatch(/^[a-f0-9]{64}$/);
  });
  it('rejects altered specification or backlog contents even with an unchanged raw-spec claim', () => {
    const changedSpec = structuredClone(spec);
    changedSpec.traits.find(
      (t) => t.id === 'lammb-clothing-hoodie',
    )!.metadata[0]!.value = 'Invented garment';
    expect(() =>
      resolveAuthoredMutations(
        authoredRegistry,
        backlog,
        changedSpec,
        specHash,
        ownerDecisions,
      ),
    ).toThrow('AUTHORED_SPEC_CONTENT');
    const changedBacklog = structuredClone(backlog);
    changedBacklog.items[0]!.nextAction = 'Altered declared context';
    expect(() => resolve(authoredRegistry, changedBacklog)).toThrow(
      'AUTHORED_BACKLOG_CONTENT',
    );
  });
  it.each([
    'valid',
    'malformed native',
    'source byte tampering',
    'dimension mismatch',
    'oversized native',
    'missing generation',
    'wrong raster reference',
    'missing reference file',
    'owner evidence tampering',
  ])('bounded authored I/O: %s', async (scenario) => {
    // Entirely synthetic development files: these are never LAMMB artwork.
    const parent = resolvePath(tmpdir());
    const root = await mkdtemp(join(parent, 'lammb-stage22-test-'));
    try {
      const r = structuredClone(authoredRegistry),
        b = structuredClone(backlog),
        owner = structuredClone(ownerDecisions);
      r.assets = r.assets.slice(0, 1);
      const item = b.items.find((i) => i.id === r.assets[0]!.backlogId)!;
      const target = item.sources.find((s) => s.id === r.assets[0]!.sourceId)!;
      const png = await sharp({
        create: { width: 8, height: 8, channels: 3, background: '#123456' },
      })
        .png()
        .toBuffer();
      let native = png;
      if (scenario === 'malformed native') {
        native = Buffer.from(png);
        native[0] = 0;
      }
      if (scenario === 'oversized native')
        native = Buffer.alloc(4 * 1024 * 1024 + 1);
      target.path = 'native.png';
      target.sha256 = sha256Bytes(native);
      target.dimensions = { width: 8, height: 8 };
      if (scenario === 'dimension mismatch') target.dimensions.width = 7;
      r.assets[0]!.sourceSha256 = target.sha256;
      owner.decisions[0]!.sourceSha256 = target.sha256;
      const refs = item.sources.filter(
        (s) =>
          s.role === 'PRIMARY_RASTER_REFERENCE' ||
          s.role === 'SUPPORTING_APPROVED_RASTER_REFERENCE',
      );
      for (const [index, ref] of refs.entries()) {
        ref.path = `ref-${index}.png`;
        ref.sha256 = sha256Bytes(png);
        if (!(scenario === 'missing reference file' && index === 0))
          await writeFile(join(root, ref.path), png);
      }
      const provenance = [
        {
          tool: 'image_gen.imagegen',
          outputSha256: target.sha256,
          actualNativeDimensions: target.dimensions,
          references: refs.map((ref) => ({
            sha256: ref.sha256,
            role: ref.role,
          })),
        },
      ];
      if (scenario === 'missing generation')
        provenance[0]!.outputSha256 = '0'.repeat(64);
      if (scenario === 'wrong raster reference')
        provenance[0]!.references[0]!.sha256 = '0'.repeat(64);
      const ownerBytes = Buffer.from(JSON.stringify(owner)),
        provenanceBytes = Buffer.from(JSON.stringify(provenance));
      const ownerEvidence = b.evidence.find(
        (e) => e.id === 'evidence-stage22-owner-decisions',
      )!;
      const generationEvidence = b.evidence.find(
        (e) => e.id === 'evidence-stage21-provenance',
      )!;
      Object.assign(ownerEvidence, {
        path: 'owner.json',
        sha256: sha256Bytes(ownerBytes),
        bytes: ownerBytes.length,
      });
      Object.assign(generationEvidence, {
        path: 'provenance.json',
        sha256: sha256Bytes(provenanceBytes),
        bytes: provenanceBytes.length,
      });
      r.ownerEvidence = {
        path: ownerEvidence.path,
        sha256: ownerEvidence.sha256,
      };
      r.provenanceEvidence = {
        path: generationEvidence.path,
        sha256: generationEvidence.sha256,
      };
      await writeFile(
        join(root, 'owner.json'),
        scenario === 'owner evidence tampering'
          ? Buffer.from('{}')
          : ownerBytes,
      );
      await writeFile(join(root, 'provenance.json'), provenanceBytes);
      await writeFile(
        join(root, 'native.png'),
        scenario === 'source byte tampering' ? Buffer.from('tampered') : native,
      );
      r.backlogSha256 = canonicalSha256(b);
      const validation = validateAuthoredMutationSources(
        root,
        r,
        b,
        spec,
        specHash,
        canonicalSha256(r),
      );
      if (scenario === 'valid') {
        const receipt = await validation;
        expect(receipt.verified).toHaveLength(1);
        expect(receipt.verified[0]!.decodedBytes).toBe(8 * 8 * 3);
        expect(receipt.productionRegisteredCount).toBe(0);
      } else await expect(validation).rejects.toThrow();
    } finally {
      if (dirname(resolvePath(root)) !== parent)
        throw new Error('Unsafe test cleanup path');
      await rm(root, { recursive: true, force: true });
    }
  });
  it('requires an append-only dated owner decision and prevents rejection rehabilitation', () => {
    const previous = structuredClone(backlog);
    previous.evidence = previous.evidence.filter(
      (e) => e.id !== 'evidence-stage22-owner-decisions',
    );
    previous.backlogVersion = '0.1.0';
    for (const item of previous.items) {
      item.ownerDecisionHistory = item.ownerDecisionHistory.filter(
        (h) => h.evidence !== 'evidence-stage22-owner-decisions',
      );
      if (item.kind === 'AUTHORIZED_NEW_STUDY')
        item.artisticApproval = 'UNREVIEWED';
    }
    expect(validateArtworkBacklogUpdate(previous, backlog).items).toHaveLength(
      109,
    );
    const edited = structuredClone(backlog);
    edited.items[0]!.ownerDecisionHistory[0]!.scope = 'rewritten';
    expect(() => validateArtworkBacklogUpdate(previous, edited)).toThrow(
      'BACKLOG_HISTORY_REWRITE',
    );
    const noEvent = structuredClone(backlog);
    noEvent.items
      .find((i) => i.id === 'backlog-study21-magma-hoodie')!
      .ownerDecisionHistory.pop();
    expect(() => validateArtworkBacklogUpdate(previous, noEvent)).toThrow(
      'Art approval requires inherited or explicit owner evidence',
    );
    const undated = structuredClone(backlog);
    undated.items
      .find((i) => i.id === 'backlog-study21-magma-hoodie')!
      .ownerDecisionHistory.at(-1)!.date = null;
    expect(() => validateArtworkBacklogUpdate(previous, undated)).toThrow(
      'BACKLOG_OWNER_TRANSITION',
    );
    const restored = structuredClone(backlog);
    const rejected = restored.items.find(
      (i) => i.id === 'backlog-study21-skeletal-correction',
    )!;
    rejected.artisticApproval = 'UNREVIEWED';
    expect(() => validateArtworkBacklogUpdate(backlog, restored)).toThrow(
      'BACKLOG_HISTORY_REWRITE',
    );
    const positive = structuredClone(backlog);
    positive.items
      .find((i) => i.id === 'backlog-study21-skeletal-correction')!
      .sources.find((s) => s.role === 'NEGATIVE_QA_ONLY')!.role =
      'GENERATED_NATIVE_STUDY';
    expect(() => validateArtworkBacklog(positive, spec, specHash)).toThrow(
      'ARTWORK_BACKLOG_SCHEMA',
    );
  });
});
const syntheticTrait = {
  id: 'test_only',
  category: 'eyes',
  label: 'Test only',
  asset: { path: 'test/placeholder.png', sha256: digest },
  frequency: { weight: 1 },
};
const recipe = {
  schemaVersion: 1,
  seedHex: digest,
  generatorVersion: 'test-only',
  sourceCommit: 'b'.repeat(40),
  prngAlgorithm: 'unselected-test-placeholder',
  orderingVersion: 'test-only',
  rendererVersion: 'test-only',
  collectionConfigSha256: digest,
  catalogSha256: digest,
  assetsManifestSha256: digest,
  expectedOutputCount: 2,
};
const output = (index: number) => ({
  index,
  traitIds: ['test_only'],
  art: { path: `art/${index}.png`, sha256: digest },
  metadata: { path: `metadata/${index}.json`, sha256: digest },
});

describe('art pipeline schema foundation', () => {
  it('keeps development fixtures empty and rejects an empty production catalog', () => {
    expect(developmentCatalog.traits).toHaveLength(0);
    expect(
      traitCatalogSchema.safeParse({
        ...developmentCatalog,
        purpose: 'PRODUCTION',
      }).success,
    ).toBe(false);
  });

  it('rejects unsafe asset paths, invalid hashes, and nonpositive weights', () => {
    for (const path of [
      '../secret',
      '/absolute.png',
      'C:\\asset.png',
      'a//b.png',
      './asset.png',
    ]) {
      expect(
        traitSchema.safeParse({
          ...syntheticTrait,
          asset: { path, sha256: digest },
        }).success,
      ).toBe(false);
    }
    expect(
      traitSchema.safeParse({
        ...syntheticTrait,
        asset: { path: 'test.png', sha256: 'invalid' },
      }).success,
    ).toBe(false);
    expect(
      traitSchema.safeParse({ ...syntheticTrait, frequency: { weight: 0 } })
        .success,
    ).toBe(false);
  });

  it('rejects duplicate trait IDs and unresolved rule references', () => {
    expect(
      traitCatalogSchema.safeParse({
        ...developmentCatalog,
        traits: [syntheticTrait, syntheticTrait],
      }).success,
    ).toBe(false);
    expect(
      traitCatalogSchema.safeParse({
        ...developmentCatalog,
        traits: [syntheticTrait],
        incompatibilities: [
          {
            id: 'test_rule',
            traitIds: ['test_only', 'missing'],
            reason: 'Test only',
          },
        ],
      }).success,
    ).toBe(false);
  });

  it('requires reproducibility inputs and a valid seed', () => {
    expect(generationRecipeSchema.safeParse(recipe).success).toBe(true);
    expect(
      generationRecipeSchema.safeParse({ ...recipe, seedHex: 'random' })
        .success,
    ).toBe(false);
    expect(
      generationRecipeSchema.safeParse({ ...recipe, rendererVersion: '' })
        .success,
    ).toBe(false);
  });

  it('requires complete output coverage and distinct paths', () => {
    const manifest = {
      schemaVersion: 1,
      recipe,
      outputs: [output(0), output(1)],
    };
    expect(provenanceManifestSchema.safeParse(manifest).success).toBe(true);
    for (const outputs of [
      [output(0)],
      [output(0), output(0)],
      [output(0), output(2)],
      [output(0), { ...output(1), art: output(0).art }],
    ]) {
      expect(
        provenanceManifestSchema.safeParse({ ...manifest, outputs }).success,
      ).toBe(false);
    }
  });
});
