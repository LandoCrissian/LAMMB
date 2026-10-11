import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import backlog from '../docs/art-production/ARTWORK_BACKLOG_v1.json';
import spec from '../packages/art-generator/specs/lammb-traits-v1.json';
import { sha256Bytes } from '../packages/art-generator/src/canonical.ts';
import { validateArtworkBacklog } from '../packages/art-generator/tooling/artwork-backlog.ts';
import { developmentCatalog } from '@lammb/art-generator/fixtures';
import {
  generationRecipeSchema,
  provenanceManifestSchema,
  traitCatalogSchema,
  traitSchema,
} from '@lammb/art-generator/schema';

// Synthetic fixtures for validation; no fixture here is an approved LAMMB trait.
const digest = 'a'.repeat(64);
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
