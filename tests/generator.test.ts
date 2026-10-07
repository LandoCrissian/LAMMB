import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  canonicalJson,
  canonicalSha256,
} from '../packages/art-generator/src/canonical.ts';
import {
  evaluateComposition,
  specimenFingerprint,
} from '../packages/art-generator/src/constraints.ts';
import {
  generateCollection,
  verifyCollection,
} from '@lammb/art-generator/engine';
import {
  assetManifestSchema,
  corruptionLevelSchema,
  developmentMetadataSchema,
  engineCatalogSchema,
  engineRequestSchema,
} from '@lammb/art-generator/engine-schema';
import type { EngineCatalog } from '@lammb/art-generator/engine-schema';
import { Pcg32 } from '../packages/art-generator/src/prng.ts';
import { traitCategorySchema } from '@lammb/art-generator/schema';

const fixture = (name: string): unknown =>
  JSON.parse(
    readFileSync(
      new URL(`../packages/art-generator/fixtures/${name}`, import.meta.url),
      'utf8',
    ),
  );
const catalog = engineCatalogSchema.parse(fixture('stress-catalog.json'));
const manifest = assetManifestSchema.parse(fixture('stress-assets.json'));
const request = engineRequestSchema.parse(fixture('stress-request.json'));
const assetBytes = new Map(
  manifest.assets.map((asset) => [
    asset.id,
    readFileSync(
      new URL(
        `../packages/art-generator/fixtures/assets/${asset.path}`,
        import.meta.url,
      ),
    ),
  ]),
);
const inputs = () => ({
  catalog: structuredClone(catalog),
  manifest: structuredClone(manifest),
  request: structuredClone(request),
  assetBytes,
});
const baselineResult = generateCollection(inputs());
if (!baselineResult.ok) throw new Error(JSON.stringify(baselineResult.error));
const baseline = baselineResult.artifacts;
const assets = new Map(manifest.assets.map((asset) => [asset.id, asset]));
const byId = new Map(catalog.traits.map((trait) => [trait.id, trait]));
const selected = (ids: string[]) => ids.map((id) => byId.get(id)!);
const firstGrail = catalog.grails[0]!.reservations[0]!.traitIds;
const evaluate = (ids: string[]) =>
  evaluateComposition(selected(ids), catalog, assets);
const replaceCategory = (
  ids: string[],
  category: string,
  replacement: string,
) => ids.map((id) => (byId.get(id)!.category === category ? replacement : id));

describe('integer construction PRNG and canonical bytes', () => {
  it('matches the independent published PCG32 reference vector', () => {
    const vectors = fixture('pcg32-vectors.json') as {
      initialState: string;
      sequence: string;
      nextUint32Hex: string[];
    };
    const generator = new Pcg32(
      BigInt(vectors.initialState),
      BigInt(vectors.sequence),
    );
    expect(
      vectors.nextUint32Hex.map(() =>
        generator.next().toString(16).padStart(8, '0'),
      ),
    ).toEqual(vectors.nextUint32Hex);
    for (const bound of [1, 3, 1000, 0x100000000])
      for (let index = 0; index < 100; index++) {
        const value = generator.bounded(bound);
        expect(Number.isInteger(value) && value >= 0 && value < bound).toBe(
          true,
        );
      }
    expect(() => generator.bounded(0)).toThrow();
    expect(() => new Pcg32(-1n, 54n)).toThrow();
    expect(() => new Pcg32(42n, 1n << 64n)).toThrow();
  });

  it('canonicalizes key order, Unicode and line endings but preserves meaningful array order', () => {
    expect(canonicalJson({ z: 1, a: { c: 2, b: true } })).toBe(
      '{"a":{"b":true,"c":2},"z":1}',
    );
    expect(canonicalSha256({ text: 'e\u0301\r\nline\r', n: -0 })).toBe(
      canonicalSha256({ n: 0, text: 'é\nline\n' }),
    );
    expect(canonicalSha256([1, 2])).not.toBe(canonicalSha256([2, 1]));
    expect(canonicalSha256(JSON.parse('{\r\n "b": 2, "a": 1\r\n}'))).toBe(
      canonicalSha256({ a: 1, b: 2 }),
    );
  });

  it('rejects ambiguous and non-JSON values without invoking accessors', () => {
    const cyclic: Record<string, unknown> = {};
    cyclic.self = cyclic;
    let invoked = false;
    const accessor = Object.defineProperty({}, 'secret', {
      enumerable: true,
      get: () => {
        invoked = true;
        return 'private';
      },
    });
    for (const value of [
      undefined,
      1.2,
      Number.MAX_SAFE_INTEGER + 1,
      NaN,
      Infinity,
      1n,
      new Date(0),
      cyclic,
      Array(2),
      accessor,
      { 'e\u0301': 1, é: 2 },
      '\ud800',
    ])
      expect(() => canonicalJson(value)).toThrow();
    expect(invoked).toBe(false);
  });
});

describe('complete input and asset validation', () => {
  it('keeps all synthetic inputs obviously development-only with no production traits', () => {
    expect(catalog.purpose).toBe('DEVELOPMENT_ONLY');
    expect(manifest.purpose).toBe('DEVELOPMENT_ONLY');
    expect(new Set(catalog.traits.map((trait) => trait.category))).toEqual(
      new Set(traitCategorySchema.options),
    );
    for (const record of [...catalog.traits, ...catalog.grails]) {
      expect(record.id).toMatch(/^dev-/);
      expect(record.label).toMatch(/^Development /);
    }
    for (const asset of manifest.assets)
      expect(asset.purpose).toBe('DEVELOPMENT_ONLY');
  });

  it.each([
    'duplicate-traits',
    'unresolved-trait',
    'invalid-category',
    'unknown-field',
    'duplicate-tags',
    'wrong-mutation-category',
    'missing-corruption',
    'invalid-grail',
    'duplicate-grail-slots',
    'zero-weight',
    'quota-overflow',
  ])('rejects invalid catalog: %s', (scenario) => {
    const data = inputs();
    if (scenario === 'duplicate-traits')
      data.catalog.traits.push(data.catalog.traits[0]!);
    if (scenario === 'unresolved-trait')
      data.catalog.traits[0]!.requiresTraitIds.push('dev-missing');
    if (scenario === 'invalid-category')
      (data.catalog.traits[0] as unknown as { category: string }).category =
        'invented';
    if (scenario === 'unknown-field')
      Object.assign(data.catalog.traits[0]!, { finalRarity: 'unapproved' });
    if (scenario === 'duplicate-tags')
      data.catalog.traits[0]!.tags = ['dev-same', 'dev-same'];
    if (scenario === 'wrong-mutation-category')
      data.catalog.traits[0]!.mutation = data.catalog.traits.find(
        (trait) => trait.mutation,
      )!.mutation!;
    if (scenario === 'missing-corruption')
      delete data.catalog.traits.find((trait) => trait.corruption)!.corruption;
    if (scenario === 'invalid-grail')
      data.catalog.grails[0]!.reservations[0]!.traitIds = replaceCategory(
        firstGrail,
        'base_anatomy',
        'dev-base-d',
      );
    if (scenario === 'duplicate-grail-slots')
      data.catalog.grails[1]!.reservations[0]!.index = 0;
    if (scenario === 'zero-weight')
      data.catalog.traits[0]!.frequency.weight = 0;
    if (scenario === 'quota-overflow')
      data.catalog.traits.find(
        (trait) => trait.corruption,
      )!.frequency.plannedCount = 101;
    const result = generateCollection(data);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.requestedOutputCount).toBe(100);
  });

  it.each([
    '../escape',
    '/absolute',
    'C:/absolute',
    'https://remote.test/asset',
    'a\\b',
    'a//b',
    'a/./b',
    'a/b.',
    'NUL.txt',
    'dev/CON/asset',
    'dev/%2e%2e/file',
  ])('rejects unsafe source asset path %s', (path) => {
    const data = inputs();
    data.manifest.assets[0]!.path = path;
    expect(generateCollection(data).ok).toBe(false);
  });

  it('rejects duplicate IDs/paths, case aliases, malformed hashes and changed source bytes', () => {
    for (const mode of [
      'id',
      'path',
      'case',
      'digest',
      'bytes',
      'dimension',
      'category',
      'manifest-version',
    ]) {
      const data = inputs();
      if (mode === 'id')
        data.manifest.assets[1]!.id = data.manifest.assets[0]!.id;
      if (mode === 'path')
        data.manifest.assets[1]!.path = data.manifest.assets[0]!.path;
      if (mode === 'case')
        data.manifest.assets[1]!.path =
          data.manifest.assets[0]!.path.toUpperCase();
      if (mode === 'digest') data.manifest.assets[0]!.sha256 = 'not-a-hash';
      if (mode === 'bytes')
        data.assetBytes = new Map(assetBytes).set(
          data.manifest.assets[0]!.id,
          Buffer.from('changed'),
        );
      if (mode === 'dimension')
        data.manifest.assets[0]!.dimensions = { width: 0, height: 1 };
      if (mode === 'category')
        data.manifest.assets[0]!.category = 'environments';
      if (mode === 'manifest-version')
        Object.assign(data.manifest, { schemaVersion: 99 });
      expect(generateCollection(data).ok).toBe(false);
    }
  });
});

describe('constraints and structural systems', () => {
  it('enforces exclusions, trait requirements and tag requirements with explanations', () => {
    let ids = replaceCategory(firstGrail, 'base_anatomy', 'dev-base-c');
    ids = replaceCategory(ids, 'accessories', 'dev-accessory-d');
    expect(
      evaluate(ids).rejections.some(
        (reason) => reason.code === 'RULE:dev-base-accessory-exclusion',
      ),
    ).toBe(true);
    ids = replaceCategory(firstGrail, 'accessories', 'dev-accessory-b');
    expect(
      evaluate(ids).rejections.some(
        (reason) => reason.code === 'RULE:dev-accessory-clothing-requirement',
      ),
    ).toBe(true);
    ids = replaceCategory(firstGrail, 'eyes', 'dev-eye-c');
    expect(
      evaluate(ids).rejections.some((reason) =>
        reason.code.includes('REQUIRES_TAG'),
      ),
    ).toBe(true);
    ids = replaceCategory(firstGrail, 'environments', 'dev-environment-c');
    ids = replaceCategory(ids, 'clothing', 'dev-clothing-d');
    expect(
      evaluate(ids).rejections.some(
        (reason) => reason.code === 'RULE:dev-scene-clothing-exclusion',
      ),
    ).toBe(true);
  });

  it('applies multi-category mutation replacements and rejects incompatible category selections', () => {
    const valid = evaluate(firstGrail);
    expect(valid.rejections).toEqual([]);
    expect(
      valid.composition.find((node) => node.category === 'wool')!.assetIds,
    ).toEqual(['dev-asset-mutation-wool']);
    expect(
      valid.composition.find((node) => node.category === 'clothing')!.assetIds,
    ).toEqual(['dev-asset-mutation-clothing']);
    for (const [category, id] of [
      ['wool', 'dev-wool-d'],
      ['clothing', 'dev-clothing-c'],
      ['accessories', 'dev-accessory-b'],
    ]) {
      expect(
        evaluate(replaceCategory(firstGrail, category!, id!)).rejections.some(
          (reason) => reason.code === `STRUCTURE:dev-mutation-b:${category}`,
        ),
      ).toBe(true);
    }
  });

  it('keeps corruption distinct and enforces corruption/scene constraints', () => {
    expect(
      new Set(
        baseline.logicalCollection.specimens.map(
          (specimen) => specimen.corruptionLevel,
        ),
      ),
    ).toEqual(new Set(corruptionLevelSchema.options));
    const corrupted = evaluate(
      replaceCategory(firstGrail, 'wool', 'dev-wool-d'),
    );
    expect(
      corrupted.rejections.some(
        (reason) => reason.code === 'RULE:dev-pixel-wool-exclusion',
      ),
    ).toBe(true);
    const scene = evaluate(
      replaceCategory(firstGrail, 'base_anatomy', 'dev-base-d'),
    );
    expect(
      scene.rejections.some(
        (reason) => reason.code === 'STRUCTURE:dev-environment-b:base_anatomy',
      ),
    ).toBe(true);
  });

  it('rejects conflicting structural replacements rather than selecting an override', () => {
    const changed = structuredClone(catalog);
    const environment = changed.traits.find(
      (trait) => trait.id === 'dev-environment-b',
    )!;
    environment.scene!.constraints.push({
      category: 'wool',
      allowedTraitIds: ['dev-wool-a'],
      replacementAssetIds: ['dev-asset-wool'],
    });
    const selectedChanged = firstGrail.map((id) =>
      changed.traits.find((trait) => trait.id === id)!,
    );
    expect(
      evaluateComposition(selectedChanged, changed, assets).rejections.some(
        (reason) => reason.code === 'STRUCTURE_CONFLICT:wool',
      ),
    ).toBe(true);
  });
});

describe('identity, quotas, grails and bounded construction', () => {
  it('fingerprints ignore ordering and non-identity metadata', () => {
    const traits = selected(firstGrail);
    const composition = evaluate(firstGrail).composition;
    const original = specimenFingerprint(traits, composition);
    const changed = structuredClone(traits);
    changed[0]!.label = 'Different development label';
    changed[0]!.frequency.weight = 999;
    expect(
      specimenFingerprint(changed.reverse(), [...composition].reverse()),
    ).toBe(original);
    expect(specimenFingerprint(traits, composition)).toBe(original);
  });

  it('reserves explicit grails, excludes reserved identities from ordinary selection and honors exact ordinary counts', () => {
    expect(baseline.logicalCollection.specimens[0]!.grailId).toBe(
      'dev-grail-a',
    );
    expect(baseline.logicalCollection.specimens[99]!.grailId).toBe(
      'dev-grail-b',
    );
    const grailIds = new Set([
      baseline.logicalCollection.specimens[0]!.fingerprint,
      baseline.logicalCollection.specimens[99]!.fingerprint,
    ]);
    expect(
      baseline.logicalCollection.specimens
        .filter((specimen) => specimen.grailId === null)
        .every((specimen) => !grailIds.has(specimen.fingerprint)),
    ).toBe(true);
    expect(
      baseline.summary.rejectionCounts.RESERVED_GRAIL_IDENTITY,
    ).toBeGreaterThan(0);
    expect(baseline.summary.rejectionCounts.DUPLICATE_IDENTITY).toBeGreaterThan(
      0,
    );
    for (const trait of catalog.traits.filter(
      (trait) => trait.frequency.plannedCount !== undefined,
    ))
      expect(baseline.summary.ordinaryTraitFrequencies[trait.id]).toBe(
        trait.frequency.plannedCount,
      );
  });

  it('permits one grail ID to reserve multiple distinct curated slots but rejects duplicate grail identity', () => {
    const data = inputs();
    data.catalog.grails[0]!.reservations.push(
      data.catalog.grails[1]!.reservations[0]!,
    );
    data.catalog.grails.pop();
    const result = generateCollection(data);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.artifacts.summary.grailCount).toBe(2);
    data.catalog.grails[0]!.reservations[1]!.traitIds = [
      ...data.catalog.grails[0]!.reservations[0]!.traitIds,
    ];
    const duplicate = generateCollection(data);
    expect(duplicate.ok).toBe(false);
    if (!duplicate.ok) expect(duplicate.error.code).toBe('DUPLICATE_GRAIL');
  });

  it('fails an impossible 100-specimen request with bounded duplicate diagnostics and no partial collection', () => {
    const data = inputs();
    const small: EngineCatalog = {
      ...data.catalog,
      grails: [],
      rules: [],
      traits: traitCategorySchema.options.map((category) =>
        data.catalog.traits.find((trait) => trait.category === category)!,
      ),
    };
    for (const trait of small.traits) {
      trait.requiresTags = [];
      trait.requiresTraitIds = [];
      trait.incompatibleTraitIds = [];
      delete trait.frequency.plannedCount;
    }
    data.catalog = small;
    data.request.maxAttemptsPerSpecimen = 5;
    const result = generateCollection(data);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toMatchObject({
        code: 'SPECIMEN_ATTEMPT_BOUND',
        specimenIndex: 1,
        attemptedCandidates: 5,
        totalAttemptedCandidates: 6,
        requestedOutputCount: 100,
      });
      expect(result.error.dominantRejections).toContainEqual({
        code: 'DUPLICATE_IDENTITY',
        message: 'Logical specimen fingerprint already exists',
        count: 5,
      });
      expect(result).not.toHaveProperty('artifacts');
    }
  });

  it('enforces the total budget and rejects unknown/unbounded attempt configuration', () => {
    const data = inputs();
    data.request.maxTotalAttempts = 1;
    const result = generateCollection(data);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('TOTAL_ATTEMPT_BOUND');
    expect(
      generateCollection({
        ...inputs(),
        request: { ...request, maxAttemptsPerSpecimen: Infinity },
      }).ok,
    ).toBe(false);
  });
});

describe('stress determinism and independent provenance verification', () => {
  it('reproduces exactly 100 unique specimens and the committed golden summary', () => {
    const next = generateCollection(inputs());
    expect(next.ok).toBe(true);
    if (!next.ok) return;
    expect(canonicalJson(next.artifacts)).toBe(canonicalJson(baseline));
    expect(baseline.logicalCollection.specimens).toHaveLength(100);
    expect(
      new Set(
        baseline.logicalCollection.specimens.map(
          (specimen) => specimen.fingerprint,
        ),
      ).size,
    ).toBe(100);
    const golden = fixture('stress-golden.json') as {
      attemptStatistics: Record<string, unknown>;
    };
    const { ordinaryTraitFrequencies, attemptStatistics, ...rest } =
      baseline.summary;
    const { perSpecimenAttempts, ...statistics } = attemptStatistics;
    expect(
      Object.values(ordinaryTraitFrequencies).reduce(
        (sum, count) => sum + count,
        0,
      ),
    ).toBe(98 * traitCategorySchema.options.length);
    expect(perSpecimenAttempts).toHaveLength(100);
    expect(perSpecimenAttempts.reduce((sum, count) => sum + count, 0)).toBe(
      statistics.totalCandidates,
    );
    expect({ ...rest, attemptStatistics: statistics }).toEqual(golden);
  });

  it('normalizes unordered catalog/manifest collections, while a different seed changes non-grail identities', () => {
    const data = inputs();
    data.catalog.traits.reverse();
    data.catalog.rules.reverse();
    data.catalog.categories.reverse();
    data.manifest.assets.reverse();
    for (const grail of data.catalog.grails)
      for (const reservation of grail.reservations)
        reservation.traitIds.reverse();
    const reordered = generateCollection(data);
    expect(reordered.ok).toBe(true);
    if (reordered.ok)
      expect(canonicalJson(reordered.artifacts)).toBe(canonicalJson(baseline));
    data.request.seedHex = `${request.seedHex.slice(0, -2)}ff`;
    const different = generateCollection(data);
    expect(different.ok).toBe(true);
    if (different.ok) {
      const changed = different.artifacts.logicalCollection.specimens.filter(
        (specimen) =>
          specimen.grailId === null &&
          specimen.fingerprint !==
            baseline.logicalCollection.specimens[specimen.index]!.fingerprint,
      );
      expect(changed.length).toBeGreaterThan(80);
      expect(
        different.artifacts.logicalCollection.specimens[0]!.fingerprint,
      ).toBe(baseline.logicalCollection.specimens[0]!.fingerprint);
    }
  });

  it('independently recomputes every output and collection digest', () => {
    expect(verifyCollection(inputs(), baseline)).toEqual({
      ok: true,
      logicalCollectionSha256: canonicalSha256(baseline.logicalCollection),
    });
    for (const [index, output] of baseline.provenance.outputs.entries()) {
      expect(output.logicalSha256).toBe(
        canonicalSha256(baseline.logicalCollection.specimens[index]),
      );
      expect(output.metadataSha256).toBe(
        canonicalSha256(baseline.publicMetadata.specimens[index]),
      );
    }
  });

  it('rejects a changed public output even when all supplied related hashes are recomputed', () => {
    const forged = structuredClone(baseline);
    forged.publicMetadata.specimens[1]!.name = 'Development forged name';
    forged.provenance.outputs[1]!.metadataSha256 = canonicalSha256(
      forged.publicMetadata.specimens[1],
    );
    const digest = canonicalSha256(forged.publicMetadata);
    forged.provenance.publicMetadataSha256 = digest;
    forged.summary.publicMetadataSha256 = digest;
    expect(verifyCollection(inputs(), forged).ok).toBe(false);
  });

  it('requires complete actual asset evidence and no networking or blockchain dependency', () => {
    const missing = new Map(assetBytes);
    missing.delete(manifest.assets[0]!.id);
    expect(generateCollection({ ...inputs(), assetBytes: missing }).ok).toBe(
      false,
    );
    const extra = new Map(assetBytes).set(
      'dev-unlisted',
      Buffer.from('unlisted'),
    );
    expect(generateCollection({ ...inputs(), assetBytes: extra }).ok).toBe(
      false,
    );
    const packageJson = JSON.parse(
      readFileSync(
        new URL('../packages/art-generator/package.json', import.meta.url),
        'utf8',
      ),
    ) as { dependencies: Record<string, string> };
    expect(packageJson.dependencies).toEqual({
      '@lammb/collection': '0.0.0',
      zod: '4.6.5',
    });
  });

  it.each([
    'catalog',
    'seed',
    'source',
    'output',
    'missing-output',
    'forged-digest',
    'unknown-field',
  ])('rejects changed verification evidence: %s', (scenario) => {
    const data = inputs();
    const artifacts = structuredClone(baseline);
    if (scenario === 'catalog') data.catalog.traits[0]!.frequency.weight++;
    if (scenario === 'seed') data.request.seedHex = '01'.repeat(32);
    if (scenario === 'source')
      data.request.sourceReference = 'urn:lammb:development:other-source';
    if (scenario === 'output')
      artifacts.logicalCollection.specimens[1]!.traitIds[0] = 'dev-changed';
    if (scenario === 'missing-output')
      artifacts.logicalCollection.specimens.pop();
    if (scenario === 'forged-digest')
      artifacts.provenance.logicalCollectionSha256 = '0'.repeat(64);
    if (scenario === 'unknown-field')
      Object.assign(artifacts.provenance, { verified: true });
    expect(verifyCollection(data, artifacts).ok).toBe(false);
  });

  it('public metadata admits only approved public fields and contains no construction secrets/debug data', () => {
    for (const metadata of baseline.publicMetadata.specimens) {
      expect(developmentMetadataSchema.safeParse(metadata).success).toBe(true);
      for (const field of [
        'seedHex',
        'retryHistory',
        'weights',
        'compatibility',
        'grailId',
        'assignment',
        'generationIndex',
      ])
        expect(
          developmentMetadataSchema.safeParse({
            ...metadata,
            [field]: 'unapproved',
          }).success,
        ).toBe(false);
    }
    expect(canonicalJson(baseline.publicMetadata)).not.toMatch(
      /seedHex|plannedCount|weight|rejection|requiresTag|sourceReference|assignment/,
    );
  });
});
