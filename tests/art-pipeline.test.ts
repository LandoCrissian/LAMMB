import { describe, expect, it } from 'vitest';
import { developmentCatalog } from '@lammb/art-generator/fixtures';
import {
  generationRecipeSchema,
  provenanceManifestSchema,
  traitCatalogSchema,
  traitSchema,
} from '@lammb/art-generator/schema';

// Synthetic fixtures for validation; no fixture here is an approved LAMMB trait.
const digest = 'a'.repeat(64);
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
