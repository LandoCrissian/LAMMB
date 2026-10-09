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
  validateArtworkPilot,
  validateProposalComposition,
} from '../packages/art-generator/src/production-spec.ts';
import type { ProductionSpec } from '../packages/art-generator/src/production-spec.ts';
import { adversarialAudit } from '../packages/art-generator/tooling/task-015a.ts';

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

describe('Task 015A adversarial evidence', () => {
  it('removes the unreachable Void dental binding without admitting a new composition', () => {
    expect(
      spec.variantRequirements.some(
        (v) => v.id === 'variant-lammb-accessories-gold-tooth-void',
      ),
    ).toBe(false);
    const oldCatalog = structuredClone(inputs.catalog);
    oldCatalog.rules = oldCatalog.rules.filter(
      (r) => r.id !== 'dev-lammb-void-dental-visibility',
    );
    const assets = new Map(inputs.manifest.assets.map((a) => [a.id, a]));
    for (const expression of spec.traits.filter(
      (t) => t.category === 'expressions',
    )) {
      const ids = composition({
        mutations: 'void',
        accessories: 'gold-tooth',
      }).filter((id) => !id.startsWith('lammb-expressions-'));
      ids.push(expression.id);
      const selected = ids.map((id) =>
        inputs.catalog.traits.find((t) => t.id === `dev-${id}`)!,
      );
      expect(
        evaluateComposition(selected, oldCatalog, assets).rejections.length,
      ).toBeGreaterThan(0);
      expect(
        evaluateComposition(selected, inputs.catalog, assets).rejections.length,
      ).toBeGreaterThan(0);
    }
    const extra = structuredClone(spec);
    extra.variantRequirements.push({
      id: 'variant-lammb-accessories-gold-tooth-void',
      assetRequirementId: 'asset-lammb-accessories-gold-tooth',
      mutationTraitId: 'lammb-mutations-void',
      status: 'MISSING',
      reason: 'Unreachable binding',
    });
    expect(productionSpecSchema.safeParse(extra).success).toBe(false);
  });

  it('reconstructs the adversarial evidence and rejects forged attempt/identity records', () => {
    const result = generateCollection(inputs);
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error(result.error.message);
    const report = adversarialAudit(spec, result.artifacts);
    const stored = JSON.parse(
      readFileSync(
        new URL('../docs/trait-bible/ADVERSARIAL_015B.json', import.meta.url),
        'utf8',
      ),
    );
    expect(report).toEqual(stored);
    expect(report.trace.gold.drawn).toBe(
      report.trace.gold.accepted + report.trace.gold.rejected,
    );
    expect(report.trace.gold.accepted).toBe(119);
    const goldIds = spec.traits
      .filter((t) => t.metadata.some((a) => a.trait_type === 'Dental Accent'))
      .map((t) => `dev-${t.id}`);
    expect(goldIds).toHaveLength(2);
    expect(
      result.artifacts.logicalCollection.specimens.filter((s) =>
        s.traitIds.some((id) => goldIds.includes(id)),
      ),
    ).toHaveLength(report.trace.gold.accepted);
    expect(
      report.diversity.ignoringBackgroundAndPixel.distinctSignatures,
    ).toBeLessThan(5280);
    for (const forge of ['attempts', 'identity'] as const) {
      const fake = structuredClone(result.artifacts);
      if (forge === 'attempts')
        fake.summary.attemptStatistics.perSpecimenAttempts[1]!++;
      else
        fake.logicalCollection.specimens[1]!.traitIds[0] =
          'dev-lammb-accessories-gold-tooth';
      expect(() => adversarialAudit(spec, fake)).toThrow(
        'Audit input fails engine reconstruction',
      );
    }
  }, 20000);
});

describe('Task 015B owner-authorized refinement', () => {
  it('preserves eight canonical wool values with three meaningful geometry profiles', () => {
    const expected = {
      ivory: 'COMPACT_CROWN',
      charcoal: 'COMPACT_CROWN',
      frosted: 'COMPACT_CROWN',
      singed: 'COMPACT_CROWN',
      ash: 'BROAD_OFFSET_CROWN',
      pink: 'BROAD_OFFSET_CROWN',
      chartreuse: 'BROAD_OFFSET_CROWN',
      locks: 'ROLLED_LOCKS',
    };
    expect(
      spec.traits
        .filter((t) => t.category === 'wool')
        .map((t) => [t.id, t.woolSpecification!.silhouette])
        .sort(),
    ).toEqual(
      Object.entries(expected)
        .map(([key, profile]) => [id('wool', key), profile])
        .sort(),
    );
    for (const wool of spec.traits.filter((t) => t.category === 'wool')) {
      expect(wool.woolSpecification!.preservedLandmarks).toEqual(
        expect.arrayContaining(spec.species.landmarks),
      );
      expect(wool.woolSpecification!.sourceRequirements.length).toBeGreaterThan(
        0,
      );
    }
    expect(inputs.catalog.categories.every((c) => c.selectionCount === 1)).toBe(
      true,
    );
    expect(
      spec.traits.filter((t) => t.category === 'accessories'),
    ).toHaveLength(15);
  });

  it.each([
    { accessories: 'cap-tag', wool: 'ivory' },
    { accessories: 'cap-tag', wool: 'ash' },
    { accessories: 'cap-tag', wool: 'locks' },
    { accessories: 'beanie-chain' },
    { accessories: 'beanie-chain', clothing: 'utility-vest' },
    { accessories: 'shades-gold', expressions: 'smirk' },
    { accessories: 'shades-gold', expressions: 'amused' },
    { accessories: 'shades-gold', expressions: 'defiant' },
    {
      accessories: 'shades-gold',
      expressions: 'defiant',
      mutations: 'skeletal',
    },
    {
      accessories: 'beanie-chain',
      expressions: 'defiant',
      mutations: 'magma',
      wool: 'singed',
      eyes: 'amber',
      clothing: 'utility-vest',
    },
  ])('accepts deliberate supported bundle fit %j', (changes) => {
    expect(() =>
      validateProposalComposition(spec, composition(changes)),
    ).not.toThrow();
  });

  it.each([
    ...['ash', 'pink', 'chartreuse', 'locks'].flatMap((wool) =>
      ['beanie', 'beanie-chain'].map((accessories) => ({ accessories, wool })),
    ),
    ...['lab-jacket', 'long-coat', 'shell', 'none'].map((clothing) => ({
      accessories: 'beanie-chain',
      clothing,
    })),
    ...['heavy-lidded', 'side-eye', 'stoic'].map((expressions) => ({
      accessories: 'shades-gold',
      expressions,
    })),
    { accessories: 'beanie-chain', mutations: 'botanical' },
    { accessories: 'shades-gold', expressions: 'smirk', mutations: 'skeletal' },
    {
      accessories: 'shades-gold',
      expressions: 'stoic',
      mutations: 'crystalline',
      eyes: 'ice',
    },
    { accessories: 'shades-gold', mutations: 'void' },
    ...['cap-tag', 'beanie-chain', 'shades-gold'].map((accessories) => ({
      accessories,
      mutations: 'multi-eye',
      eyes: 'compound',
      clothing: 'lab-jacket',
    })),
  ])('rejects hidden anatomy and unsafe bundle contacts %j', (changes) => {
    expect(() =>
      validateProposalComposition(spec, composition(changes)),
    ).toThrow();
  });

  it.each(['cap-tag', 'beanie-chain', 'shades-gold'])(
    'publishes exactly the visible bundle facets: %s',
    (accessories) => {
      const trait = spec.traits.find(
        (t) => t.id === id('accessories', accessories),
      )!;
      const metadata = adapter.revealed(
        'SIM-0000',
        composition({ accessories, expressions: 'defiant' }),
        'https://example.invalid/art.png',
      );
      const facets = [
        'Headwear',
        'Eyewear',
        'Jewelry',
        'Ear Tag',
        'Dental Accent',
        'Equipment',
      ];
      expect(
        metadata.attributes.filter((a) => facets.includes(a.trait_type)),
      ).toEqual(trait.metadata);
      expect(trait.metadata).toHaveLength(2);
    },
  );

  it('preserves the six pre-refinement reservation recipes and adds visibility gates without approval', () => {
    const baseline = [
      [
        'event-horizon',
        0,
        {
          eyes: 'violet',
          expressions: 'stoic',
          clothing: 'long-coat',
          mutations: 'void',
          pixel_corruption: 'reality-failure',
          environments: 'event-horizon',
        },
      ],
      [
        'recursion',
        1055,
        {
          wool: 'ash',
          expressions: 'side-eye',
          clothing: 'lab-jacket',
          mutations: 'cybernetic',
          pixel_corruption: 'fracture',
          environments: 'lab',
        },
      ],
      [
        'cooled-core',
        2111,
        {
          wool: 'singed',
          eyes: 'amber',
          expressions: 'defiant',
          clothing: 'utility-vest',
          mutations: 'magma',
          pixel_corruption: 'touch',
          environments: 'near-black',
        },
      ],
      [
        'refraction',
        3167,
        {
          wool: 'frosted',
          eyes: 'ice',
          expressions: 'stoic',
          clothing: 'crewneck',
          mutations: 'crystalline',
          pixel_corruption: 'bleed',
          environments: 'graphite',
        },
      ],
      [
        'seed-vault',
        4223,
        {
          wool: 'locks',
          eyes: 'onyx',
          clothing: 'long-coat',
          mutations: 'botanical',
        },
      ],
      [
        'observer-array',
        5279,
        {
          eyes: 'compound',
          clothing: 'lab-jacket',
          mutations: 'multi-eye',
          pixel_corruption: 'glitched',
          environments: 'near-black',
        },
      ],
    ] as const;
    for (const [key, index, changes] of baseline) {
      const grail = spec.grails.find((g) => g.id === `lammb-grail-${key}`)!;
      expect(grail.index).toBe(index);
      expect(grail.traitIds).toEqual(composition(changes));
      expect(grail.approval.status).toBe('PROPOSED');
      expect(grail.visibilitySpecification!.reviewSizes).toEqual([64, 128]);
      expect(grail.visibilitySpecification!.approvalGate).toBe(
        'OWNER_ART_REVIEW_REQUIRED',
      );
    }
  });

  it('proves the declared pilot covers each context with no unused sources and no generation permission', () => {
    expect(validateArtworkPilot(spec)).toMatchObject({
      status: 'NOT_EXECUTED',
      generationAuthorized: false,
      sourceBindings: 38,
      imagegenOrAlignmentBindings: 32,
      deterministicBindings: 6,
      reviewCompositions: 18,
      derivativeRequirements: 24,
      compatibilityFailures: 0,
    });
    const missing = structuredClone(spec);
    missing.artworkPilot!.sourceBindings.shift();
    expect(() => validateArtworkPilot(missing)).toThrow('lacks source binding');
    const badFit = structuredClone(spec);
    const review = badFit.artworkPilot!.reviewCompositions.find(
      (c) => c.id === 'pilot-review-beanie-chain-hoodie',
    )!;
    review.traitIds = composition({ wool: 'ash', accessories: 'beanie-chain' });
    expect(() => validateArtworkPilot(badFit)).toThrow(
      'Pilot pilot-review-beanie-chain-hoodie',
    );
  });

  it.each([
    [
      'missing silhouette',
      (s: ProductionSpec) => {
        delete s.traits.find((t) => t.category === 'wool')!.woolSpecification;
      },
    ],
    [
      'wrong bundle facet',
      (s: ProductionSpec) => {
        s.traits.find((t) => t.accessoryBundle)!.metadata[0]!.value = 'Crown';
      },
    ],
    [
      'hidden dental permission',
      (s: ProductionSpec) => {
        s.traits.find((t) =>
          t.id.endsWith('shades-gold'),
        )!.accessoryBundle!.mouthVisibility = 'NOT_REQUIRED';
      },
    ],
    [
      'missing visibility gate',
      (s: ProductionSpec) => {
        delete s.grails[0]!.visibilitySpecification;
      },
    ],
    [
      'duplicate source binding',
      (s: ProductionSpec) => {
        s.artworkPilot!.sourceBindings.push(s.artworkPilot!.sourceBindings[0]!);
      },
    ],
    [
      'unsupported family binding',
      (s: ProductionSpec) => {
        s.artworkPilot!.sourceBindings.find((b) =>
          b.assetRequirementId.endsWith('shades-gold'),
        )!.mutationTraitId = id('mutations', 'void');
      },
    ],
    [
      'changed grail pilot recipe',
      (s: ProductionSpec) => {
        s.artworkPilot!.reviewCompositions.find((c) => c.grailId)!.traitIds[1] =
          id('wool', 'ivory');
      },
    ],
    [
      'generation authorization',
      (s: ProductionSpec) => {
        Object.assign(s.artworkPilot!, { generationAuthorized: true });
      },
    ],
  ])('rejects forged refinement: %s', (_label, alter) => {
    const changed = structuredClone(spec);
    alter(changed);
    expect(productionSpecSchema.safeParse(changed).success).toBe(false);
  });
});

describe('Task 015 collection specification boundaries', () => {
  it('covers all existing categories and keeps all artistic decisions unapproved', () => {
    expect(spec.categories).toHaveLength(9);
    expect(spec.editorialSections).toHaveLength(12);
    expect(spec.traits).toHaveLength(66);
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
    expect(spec.assetRequirements).toHaveLength(79);
    expect(spec.variantRequirements).toHaveLength(284);
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
