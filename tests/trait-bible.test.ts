import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { z } from 'zod';
import { canonicalJson } from '../packages/art-generator/src/canonical.ts';
import { evaluateComposition } from '../packages/art-generator/src/constraints.ts';
import { generateCollection } from '../packages/art-generator/src/engine.ts';
import { validateInputs } from '../packages/art-generator/src/inputs.ts';
import {
  createProposalMetadataAdapter,
  openSeaMetadataSchema,
} from '../packages/art-generator/src/opensea-metadata.ts';
import {
  productionSpecSchema,
  simulationInputs,
  validateProposalComposition,
} from '../packages/art-generator/src/production-spec.ts';
import type { ProductionSpec } from '../packages/art-generator/src/production-spec.ts';

const spec = productionSpecSchema.parse(
  JSON.parse(
    readFileSync(
      new URL(
        '../packages/art-generator/specs/lammb-traits-v1.json',
        import.meta.url,
      ),
      'utf8',
    ),
  ),
);
const inputs = simulationInputs(spec);
const adapter = createProposalMetadataAdapter(spec);
const id = (category: string, key: string) =>
  `lammb-${category.replaceAll('_', '-')}-${key}`;
const composition = (changes: Record<string, string> = {}) =>
  Object.entries({
    base_anatomy: 'sheep',
    wool: 'ivory',
    eyes: 'radioactive',
    expressions: 'heavy-lidded',
    clothing: 'hoodie',
    accessories: 'none',
    mutations: 'none',
    pixel_corruption: 'none',
    environments: 'chartreuse',
    ...changes,
  }).map(([category, key]) => id(category, key));

describe('Task 015 collection specification boundaries', () => {
  it('covers all existing categories and keeps all artistic decisions unapproved', () => {
    expect(spec.categories).toHaveLength(9);
    expect(spec.editorialSections).toHaveLength(12);
    expect(spec.traits).toHaveLength(63);
    expect(spec.mutationSpecifications).toHaveLength(7);
    expect(spec.grails).toHaveLength(6);
    for (const category of spec.categories)
      expect(
        spec.traits
          .filter((t) => t.category === category.category)
          .reduce((n, t) => n + t.proposedTotalCount, 0),
      ).toBe(5280);
    expect(
      spec.traits.every(
        (t) =>
          t.approval.status === 'PROPOSED' && t.approvedTotalCount === null,
      ),
    ).toBe(true);
    expect(
      spec.assetRequirements.every(
        (a) => a.status === 'MISSING' && a.sha256 === null,
      ),
    ).toBe(true);
    expect(spec.variantRequirements).toHaveLength(267);
    expect(
      validateInputs(
        inputs.catalog,
        inputs.manifest,
        inputs.request,
        inputs.assetBytes,
      ).catalog.purpose,
    ).toBe('DEVELOPMENT_ONLY');
  });

  it.each([
    [
      'wrong supply',
      (s: ProductionSpec) => {
        Object.assign(s, { supply: 5279 });
      },
    ],
    [
      'new cardinality',
      (s: ProductionSpec) => {
        Object.assign(s, { constructorPolicy: 'TWO_ACCESSORIES' });
      },
    ],
    [
      'forged approval',
      (s: ProductionSpec) => {
        Object.assign(s.traits[0]!.approval, { status: 'APPROVED' });
      },
    ],
    [
      'bad totals',
      (s: ProductionSpec) => {
        s.traits[0]!.proposedTotalCount--;
      },
    ],
    [
      'duplicate trait',
      (s: ProductionSpec) => {
        s.traits.push(s.traits[0]!);
      },
    ],
    [
      'missing category',
      (s: ProductionSpec) => {
        s.categories[0] = s.categories[1]!;
      },
    ],
    [
      'orphan source',
      (s: ProductionSpec) => {
        s.assetRequirements.push({
          ...s.assetRequirements[0]!,
          id: 'unreferenced-source',
        });
      },
    ],
    [
      'missing source',
      (s: ProductionSpec) => {
        s.traits[0]!.assetRequirementIds = ['missing'];
      },
    ],
    [
      'wrong source category',
      (s: ProductionSpec) => {
        s.traits[0]!.assetRequirementIds = s.traits[1]!.assetRequirementIds;
      },
    ],
    [
      'unresolved trait',
      (s: ProductionSpec) => {
        s.traits[0]!.requiresTraitIds = ['missing'];
      },
    ],
    [
      'unknown reference',
      (s: ProductionSpec) => {
        s.traits[0]!.referenceIds = ['missing'];
      },
    ],
    [
      'duplicate grail slot',
      (s: ProductionSpec) => {
        s.grails[0]!.index = s.grails[1]!.index;
      },
    ],
    [
      'incomplete grail',
      (s: ProductionSpec) => {
        s.grails[0]!.traitIds.pop();
      },
    ],
    [
      'missing mutation specification',
      (s: ProductionSpec) => {
        s.mutationSpecifications.pop();
      },
    ],
    [
      'category effect mismatch',
      (s: ProductionSpec) => {
        s.traits.find(
          (t) => t.mutation,
        )!.mutation!.categoryEffects[0]!.allowedTraitIds = [
          id('wool', 'ivory'),
        ];
      },
    ],
    [
      'invalid variant',
      (s: ProductionSpec) => {
        s.variantRequirements[0]!.mutationTraitId = 'missing';
      },
    ],
    [
      'missing variant',
      (s: ProductionSpec) => {
        s.variantRequirements.pop();
      },
    ],
    [
      'invalid corruption coverage',
      (s: ProductionSpec) => {
        s.traits.find(
          (t) => t.corruption,
        )!.corruptionSpecification!.maskCoverageBasisPoints = {
          minimum: 100,
          maximum: 0,
        };
      },
    ],
    [
      'invented rarity',
      (s: ProductionSpec) => {
        Object.assign(s.traits[0]!, {
          metadata: [
            ...s.traits[0]!.metadata,
            { trait_type: 'Rarity', value: 'Legendary' },
          ],
        });
      },
    ],
    [
      'inaccurate primary metadata',
      (s: ProductionSpec) => {
        s.traits[0]!.metadata[0]!.value = 'Rabbit';
      },
    ],
    [
      'missing sheep landmark',
      (s: ProductionSpec) => {
        s.mutationSpecifications[0]!.preservedLandmarks.pop();
      },
    ],
    [
      'undeclared field',
      (s: ProductionSpec) => {
        Object.assign(s, { rendererReady: true });
      },
    ],
  ])('rejects %s', (_label, alter) => {
    const changed = structuredClone(spec);
    alter(changed);
    expect(productionSpecSchema.safeParse(changed).success).toBe(false);
  });

  it('cannot turn proposal descriptor bytes into production source approval', () => {
    const changed = structuredClone(inputs);
    changed.catalog.purpose = 'PRODUCTION';
    changed.manifest.purpose = 'PRODUCTION';
    expect(generateCollection(changed).ok).toBe(false);
    expect(canonicalJson(inputs.manifest)).not.toContain('.png');
  });

  it('subtracts reserved contributions from exact ordinary quotas and disables the multi-eye ordinary pool', () => {
    const mutations = inputs.catalog.traits.filter(
      (t) => t.category === 'mutations',
    );
    expect(mutations.reduce((n, t) => n + t.frequency.plannedCount!, 0)).toBe(
      5274,
    );
    expect(
      mutations.find((t) => t.id.endsWith('multi-eye'))!.frequency.plannedCount,
    ).toBe(0);
    expect(
      inputs.catalog.traits.find((t) => t.id.endsWith('eyes-compound'))!
        .frequency.plannedCount,
    ).toBe(0);
  });

  it.each([
    { mutations: 'magma' },
    { mutations: 'void', wool: 'charcoal' },
    { eyes: 'compound' },
    { mutations: 'skeletal', expressions: 'amused' },
    { accessories: 'gold-tooth' },
    { mutations: 'cybernetic', accessories: 'headset' },
    { mutations: 'botanical', accessories: 'beanie' },
  ])('rejects incoherent anatomy/accessory combinations %j', (changes) => {
    expect(() =>
      validateProposalComposition(spec, composition(changes)),
    ).toThrow();
  });

  it('replaces skeletal anatomy while retaining the selected wool rather than stacking a skull onto normal skin', () => {
    const ids = composition({ mutations: 'skeletal' });
    const selected = ids.map((id) =>
      inputs.catalog.traits.find((t) => t.id === `dev-${id}`)!,
    );
    const result = evaluateComposition(
      selected,
      inputs.catalog,
      new Map(inputs.manifest.assets.map((a) => [a.id, a])),
    );
    expect(result.rejections).toEqual([]);
    expect(
      result.composition.find((c) => c.category === 'base_anatomy')!.assetIds,
    ).toEqual(['dev-asset-lammb-anatomy-skeletal']);
    expect(
      result.composition.find((c) => c.category === 'wool')!.assetIds,
    ).toEqual(['dev-asset-lammb-wool-ivory']);
  });

  it('keeps curated compositions compatible and binds each metadata phenomenon to the exact composition', () => {
    for (const grail of spec.grails) {
      expect(() =>
        validateProposalComposition(spec, grail.traitIds),
      ).not.toThrow();
      const record = adapter.revealed(
        'SIM-0000',
        grail.traitIds,
        'https://example.invalid/art.png',
        grail.id,
      );
      expect(record.attributes).toContainEqual(grail.metadata[0]);
      expect(() =>
        adapter.revealed(
          'SIM-0000',
          grail.traitIds,
          'https://example.invalid/art.png',
        ),
      ).toThrow();
    }
  });

  it('expands accessory configurations into accurate visible facets and omits absent accessories/mutations', () => {
    const empty = adapter.revealed(
      'SIM-0000',
      composition(),
      'https://example.invalid/art.png',
    );
    expect(
      empty.attributes.some((a) =>
        ['Headwear', 'Eyewear', 'Jewelry', 'Mutation'].includes(a.trait_type),
      ),
    ).toBe(false);
    const cap = adapter.revealed(
      'SIM-0001',
      composition({ accessories: 'cap-shades' }),
      'ipfs://bafyexample/art.png',
    );
    expect(cap.attributes).toContainEqual({
      trait_type: 'Headwear',
      value: 'Backward Cap',
    });
    expect(cap.attributes).toContainEqual({
      trait_type: 'Eyewear',
      value: 'Dark Shades',
    });
    expect(canonicalJson(cap)).not.toMatch(
      /seedHex|plannedCount|weight|fingerprint|grailId|rank|rarity|tier/,
    );
  });

  it('sealed metadata contains no future traits or internal construction information', () => {
    const sealed = adapter.sealed('https://example.invalid/sealed.png');
    expect(sealed.attributes).toEqual([]);
    expect(Object.keys(sealed).sort()).toEqual([
      'attributes',
      'description',
      'external_url',
      'image',
      'name',
    ]);
    expect(canonicalJson(sealed)).not.toMatch(
      /Skeletal|Observer Array|seed|fingerprint|grail/,
    );
  });

  it.each([
    'javascript:alert(1)',
    '/relative.png',
    'http://example.invalid/a.png',
    'https://user:secret@example.invalid/a.png',
    'urn:lammb:logical:a',
    'https://example.invalid/a\n.png',
  ])('rejects unsafe/unpublishable media reference %s', (image) => {
    expect(() => adapter.sealed(image)).toThrow();
  });

  it('rejects metadata leaks, hidden ranking fields and guessed token assignments', () => {
    const sealed = adapter.sealed('https://example.invalid/sealed.png');
    expect(
      openSeaMetadataSchema.safeParse({ ...sealed, seedHex: 'secret' }).success,
    ).toBe(false);
    expect(
      openSeaMetadataSchema.safeParse({
        ...sealed,
        attributes: [{ trait_type: 'Rank', value: '1' }],
      }).success,
    ).toBe(false);
    expect(() =>
      adapter.revealed('1', composition(), 'https://example.invalid/art.png'),
    ).toThrow();
  });

  it.each([
    ['lammb-traits-v1.schema.json', productionSpecSchema],
    ['opensea-metadata-v1.schema.json', openSeaMetadataSchema],
  ] as const)('keeps portable JSON Schema synchronized: %s', (name, schema) => {
    const stored = JSON.parse(
      readFileSync(
        new URL(`../packages/art-generator/specs/${name}`, import.meta.url),
        'utf8',
      ),
    );
    expect(stored).toEqual(z.toJSONSchema(schema, { target: 'draft-2020-12' }));
  });
});
