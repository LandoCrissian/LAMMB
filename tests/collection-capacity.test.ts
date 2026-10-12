import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import spec from '../packages/art-generator/specs/lammb-traits-v1.json';
import stored from '../packages/art-generator/fixtures/stage29-logical-capacity.json';
import audit from '../docs/art-production/STAGE29_CAPACITY_AUDIT.json';
import before from '../docs/art-production/ARTWORK_BACKLOG_v0.8.0.json';
import after from '../docs/art-production/ARTWORK_BACKLOG_v1.json';
import studies from '../packages/art-generator/fixtures/stage29-character-studies.json';
import {
  measureStructuralCapacity,
  countCatalogSpace,
} from '../packages/art-generator/tooling/collection-capacity.ts';
import { simulationInputs } from '../packages/art-generator/src/production-spec.ts';
import { evaluateComposition } from '../packages/art-generator/src/constraints.ts';
import {
  canonicalSha256,
  sha256Bytes,
} from '../packages/art-generator/src/canonical.ts';
import {
  validateArtworkBacklog,
  validateArtworkStudyAppend,
} from '../packages/art-generator/tooling/artwork-backlog.ts';
import { openSeaMetadataSchema } from '../packages/art-generator/src/opensea-metadata.ts';

describe('Stage29 compatibility-aware capacity', () => {
  it('reconstructs exact static counts without claiming PNG or frequency capacity', () => {
    const { runtimeMs, peakRssMiB, ...expected } = stored;
    void runtimeMs;
    void peakRssMiB;
    const result = measureStructuralCapacity(spec);
    expect(result).toEqual(expected);
    expect(result.allValues.theoretical).toBe(13271040);
    expect(result.allValues.structural).toBe(5907744);
    expect(result.constructorSelectableVectors).toBe(5852449);
    expect(result.reservedOutsideOrdinary).toBe(1);
    expect(result.artworkCapacityClaimed).toBe(false);
    expect(result.visualUniquenessClaimed).toBe(false);
    expect(result.frequencyFeasibleCapacityClaimed).toBe(false);
  });
  it('matches independent full-vector brute force across wool/headwear and magma constraints', () => {
    const inputs = simulationInputs(spec),
      allowed = new Set<string>();
    for (const [category, keys] of Object.entries({
      base_anatomy: ['sheep'],
      wool: ['ivory', 'locks'],
      eyes: ['radioactive'],
      expressions: ['heavy-lidded', 'smirk'],
      clothing: ['hoodie', 'lab-jacket'],
      accessories: ['none', 'beanie'],
      mutations: ['none', 'magma'],
      pixel_corruption: ['none'],
      environments: ['chartreuse'],
    }))
      for (const key of keys)
        allowed.add('dev-lammb-' + category.replaceAll('_', '-') + '-' + key);
    const excluded = new Set(
      inputs.catalog.traits.filter((t) => !allowed.has(t.id)).map((t) => t.id),
    );
    const assets = new Map(inputs.manifest.assets.map((a) => [a.id, a]));
    const pools = inputs.catalog.categories.map((c) =>
      inputs.catalog.traits.filter(
        (t) => t.category === c.category && !excluded.has(t.id),
      ),
    );
    let total = 0,
      valid = 0;
    const selected: typeof inputs.catalog.traits = [];
    function visit(depth: number) {
      if (depth === pools.length) {
        total++;
        if (
          !evaluateComposition(selected, inputs.catalog, assets).rejections
            .length
        )
          valid++;
        return;
      }
      for (const t of pools[depth]!) {
        selected.push(t);
        visit(depth + 1);
        selected.pop();
      }
    }
    visit(0);
    const result = countCatalogSpace(inputs.catalog, inputs.manifest, excluded);
    expect(result.theoretical).toBe(total);
    expect(result.structural).toBe(valid);
    expect(valid).toBeGreaterThan(0);
    expect(valid).toBeLessThan(total);
  });
  it('connects asset-produced tags instead of multiplying interacting categories', () => {
    const inputs = simulationInputs(spec),
      catalog = structuredClone(inputs.catalog),
      manifest = structuredClone(inputs.manifest);
    const only = catalog.categories.map((c) =>
      catalog.traits.find((t) => t.category === c.category)!,
    );
    const ids = new Set(only.map((t) => t.id));
    catalog.rules = [];
    catalog.traits = only.map((t) => ({
      ...t,
      requiresTraitIds: [],
      incompatibleTraitIds: [],
      requiresTags: [],
      excludesTags: [],
      tags: [],
      mutation: undefined,
      scene: undefined,
    }));
    for (const a of manifest.assets) a.compatibilityTags = [];
    const wool = catalog.traits.find((t) => t.category === 'wool')!,
      eyes = catalog.traits.find((t) => t.category === 'eyes')!;
    manifest.assets.find((a) => a.id === wool.assetIds[0])!.compatibilityTags =
      ['test-contact'];
    eyes.excludesTags = ['test-contact'];
    const result = countCatalogSpace(catalog, manifest);
    expect(
      result.components.some(
        (c) => c.categories.includes('wool') && c.categories.includes('eyes'),
      ),
    ).toBe(true);
    expect(result.structural).toBe(0);
    expect(ids.size).toBe(9);
  });
  it.each([0, -1, 1.5, NaN])('rejects invalid work budget %s', (budget) => {
    const inputs = simulationInputs(spec);
    expect(() =>
      countCatalogSpace(inputs.catalog, inputs.manifest, new Set(), budget),
    ).toThrow('CAPACITY_BUDGET');
  });
  it('fails closed on an excessive component and an unresolved dependency', () => {
    const inputs = simulationInputs(spec);
    expect(() =>
      countCatalogSpace(inputs.catalog, inputs.manifest, new Set(), 10),
    ).toThrow('CAPACITY_COMPONENT_BUDGET');
    const c = structuredClone(inputs.catalog);
    c.traits[0]!.requiresTraitIds.push('missing');
    expect(() => countCatalogSpace(c, inputs.manifest)).toThrow(
      'CAPACITY_UNKNOWN_DEPENDENCY',
    );
  });
  it('retains finite proof capacity, incomplete metadata and known magma conflict', () => {
    expect(audit.capacity.provenDeterministicContactRecipes).toBe(4);
    expect(
      audit.proofs.every(
        (p) => p.bytesEqual && p.outsideMaskChangedPixels === 0,
      ),
    ).toBe(true);
    expect(audit.capacity.uniqueDevelopmentNativeOutputs).toBe(34);
    expect(new Set(audit.records.map((r) => r.source.sha256)).size).toBe(34);
    expect(new Set(audit.records.map((r) => r.pixelSha256)).size).toBe(34);
    expect(
      audit.records.every(
        (r) => !r.productionRegistered && !r.completeCollectionVector,
      ),
    ).toBe(true);
    expect(audit.capacity.fullyReconciledRenderableCollectionVectors).toBe(0);
    expect(audit.capacity.artisticallyDistinctCount).toBeNull();
    expect(
      audit.records.find((r) => r.id === 'backlog-study21-magma-hoodie')!
        .knownCollectionConflict,
    ).toBe('MAGMA_CLOTHING_WHITELIST_EXCLUDES_HOODIE');
    expect(audit.simulation.count).toBe(5280);
    expect(audit.simulation.uniqueFingerprints).toBe(5280);
    expect(audit.proposals.every((p) => !p.additiveCapacity)).toBe(true);
    for (const row of audit.records)
      openSeaMetadataSchema.parse(row.metadata.metadata);
  });
  it('appends three pending studies without changing 118 prior records or owner decisions', () => {
    const validated = validateArtworkStudyAppend(before, after);
    expect(validated.items).toHaveLength(121);
    expect(validated.items.slice(0, 118)).toEqual(before.items);
    expect(
      validated.items.slice(118).map((i) => i.studyReview?.qaClassification),
    ).toEqual([
      'PRODUCTION_CANDIDATE',
      'PRODUCTION_CANDIDATE',
      'NEEDS_REFINEMENT',
    ]);
    expect(
      validated.items
        .slice(118)
        .every(
          (i) =>
            i.artisticApproval === 'UNREVIEWED' &&
            i.studyReview?.ownerReviewStatus === 'PENDING',
        ),
    ).toBe(true);
    const hash = sha256Bytes(
      readFileSync(
        new URL(
          '../packages/art-generator/specs/lammb-traits-v1.json',
          import.meta.url,
        ),
      ),
    );
    validateArtworkBacklog(after, spec, hash);
    expect(canonicalSha256(after)).toBe(audit.backlogSha256);
    expect(hash).toBe(studies.specRawSha256);
    expect(studies.studies[2]!.metadata.attributes).toContainEqual({
      trait_type: 'Clothing',
      value: 'Black Hoodie',
    });
    expect(studies.studies[2]!.metadata.attributes).not.toContainEqual({
      trait_type: 'Clothing',
      value: 'Black Crewneck',
    });
    for (const m of studies.studies) {
      expect(canonicalSha256(m.metadata)).toBe(m.binding.metadataSha256);
      openSeaMetadataSchema.parse(m.metadata);
      expect(m.binding.completeCollectionVector).toBe(false);
      expect(m.binding.tokenAssignment).toBeNull();
    }
  });
  it.each([
    'promotion',
    'old history',
    'new art approval',
    'rejected reference',
  ])('rejects unauthorized append change: %s', (scenario) => {
    const bad = structuredClone(after);
    if (scenario === 'promotion') bad.productionPromotionAuthorized = true;
    if (scenario === 'old history')
      bad.items[0]!.ownerDecisionHistory[0]!.scope = 'rewritten';
    if (scenario === 'new art approval')
      bad.items[118]!.artisticApproval = 'ART_DIRECTION_APPROVED';
    if (scenario === 'rejected reference')
      bad.items[118]!.sources[0]!.sha256 = '0'.repeat(64);
    expect(() => validateArtworkStudyAppend(before, bad)).toThrow();
  });
});
