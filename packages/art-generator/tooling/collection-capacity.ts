import type { EngineCatalog, AssetManifest } from '../src/engine-schema.ts';
import { evaluateComposition } from '../src/constraints.ts';
import { canonicalSha256 } from '../src/canonical.ts';
import {
  productionSpecSchema,
  simulationInputs,
} from '../src/production-spec.ts';

// Count static trait vectors, not artwork, frequency-feasible collection runs,
// owner approval or perceptual uniqueness. Every leaf uses the existing engine.
// Disconnected constraint components may be multiplied ONLY after building a
// complete graph of trait, tag, scene, replacement and catalog-rule dependencies.
export function countCatalogSpace(
  catalog: EngineCatalog,
  manifest: AssetManifest,
  excludedIds: ReadonlySet<string> = new Set(),
  maxComponentLeaves = 1_000_000,
) {
  if (!Number.isSafeInteger(maxComponentLeaves) || maxComponentLeaves < 1)
    throw new Error('CAPACITY_BUDGET');
  const categories = catalog.categories.map((c) => c.category);
  if (new Set(categories).size !== categories.length)
    throw new Error('CAPACITY_DUPLICATE_CATEGORY');
  const traits = new Map(catalog.traits.map((t) => [t.id, t]));
  if (
    traits.size !== catalog.traits.length ||
    catalog.traits.some((t) => !categories.includes(t.category))
  )
    throw new Error('CAPACITY_INVALID_TRAIT');
  const assets = new Map(manifest.assets.map((a) => [a.id, a]));
  const edges = new Map(categories.map((c) => [c, new Set([c])]));
  const connect = (
    a: (typeof categories)[number],
    b: (typeof categories)[number],
  ) => {
    if (!edges.has(a) || !edges.has(b))
      throw new Error('CAPACITY_UNKNOWN_CATEGORY');
    edges.get(a)!.add(b);
    edges.get(b)!.add(a);
  };
  const categoryFor = (id: string) => {
    const trait = traits.get(id);
    if (!trait) throw new Error('CAPACITY_UNKNOWN_DEPENDENCY');
    return trait.category;
  };
  const producers = new Map<string, Set<(typeof categories)[number]>>();
  const addTag = (tag: string, category: (typeof categories)[number]) => {
    const set = producers.get(tag) ?? new Set();
    set.add(category);
    producers.set(tag, set);
  };
  for (const trait of catalog.traits) {
    for (const tag of trait.tags) addTag(tag, trait.category);
    const sourceIds = [
      ...trait.assetIds,
      ...(trait.mutation?.categoryEffects ?? []).flatMap(
        (e) => e.replacementAssetIds ?? [],
      ),
    ];
    for (const id of sourceIds) {
      const asset = assets.get(id);
      if (!asset) throw new Error('CAPACITY_MISSING_ASSET');
      for (const tag of asset.compatibilityTags) addTag(tag, trait.category);
    }
  }
  const connectTag = (category: (typeof categories)[number], tag: string) => {
    for (const producer of producers.get(tag) ?? [])
      connect(category, producer);
  };
  for (const trait of catalog.traits) {
    for (const id of [...trait.requiresTraitIds, ...trait.incompatibleTraitIds])
      connect(trait.category, categoryFor(id));
    for (const tag of [...trait.requiresTags, ...trait.excludesTags])
      connectTag(trait.category, tag);
    for (const effect of [
      ...(trait.mutation?.categoryEffects ?? []),
      ...(trait.scene?.constraints ?? []),
    ]) {
      connect(trait.category, effect.category);
      for (const id of effect.allowedTraitIds)
        connect(effect.category, categoryFor(id));
    }
  }
  for (const rule of catalog.rules) {
    if (rule.type === 'INCOMPATIBLE') {
      const scoped = rule.traitIds.map(categoryFor);
      for (const category of scoped) connect(scoped[0]!, category);
    } else if (rule.type === 'REQUIRES') {
      for (const id of rule.requiredTraitIds)
        connect(categoryFor(rule.whenTraitId), categoryFor(id));
    } else connectTag(categoryFor(rule.whenTraitId), rule.tag);
  }
  const seen = new Set<(typeof categories)[number]>(),
    components: (typeof categories)[] = [];
  for (const root of categories)
    if (!seen.has(root)) {
      const component: typeof categories = [],
        queue = [root];
      seen.add(root);
      for (let index = 0; index < queue.length; index++) {
        const category = queue[index]!;
        component.push(category);
        for (const next of edges.get(category)!)
          if (!seen.has(next)) {
            seen.add(next);
            queue.push(next);
          }
      }
      components.push(component);
    }
  const multiply = (values: number[]) =>
    values.reduce((a, b) => {
      const result = a * b;
      if (!Number.isSafeInteger(result))
        throw new Error('CAPACITY_INTEGER_OVERFLOW');
      return result;
    }, 1);
  const results = components.map((component) => {
    const pools = component.map((category) =>
      catalog.traits.filter(
        (t) => t.category === category && !excludedIds.has(t.id),
      ),
    );
    const theoretical = multiply(pools.map((p) => p.length));
    if (theoretical > maxComponentLeaves)
      throw new Error('CAPACITY_COMPONENT_BUDGET');
    const localCatalog = {
      ...catalog,
      rules: catalog.rules.filter((r) =>
        component.includes(
          categoryFor(
            r.type === 'INCOMPATIBLE' ? r.traitIds[0]! : r.whenTraitId,
          ),
        ),
      ),
    };
    let evaluated = 0,
      valid = 0;
    const mutationCounts: Record<string, number> = {};
    const selected: EngineCatalog['traits'] = [];
    function visit(depth: number) {
      if (depth === pools.length) {
        evaluated++;
        if (
          evaluateComposition(selected, localCatalog, assets).rejections
            .length === 0
        ) {
          valid++;
          const mutation = selected.find((t) => t.category === 'mutations');
          if (mutation)
            mutationCounts[mutation.id] =
              (mutationCounts[mutation.id] ?? 0) + 1;
        }
        return;
      }
      for (const trait of pools[depth]!) {
        selected.push(trait);
        visit(depth + 1);
        selected.pop();
      }
    }
    visit(0);
    return {
      categories: component,
      theoretical,
      evaluated,
      valid,
      mutationCounts,
    };
  });
  const structural = multiply(results.map((r) => r.valid));
  const mutationComponent = results.find((r) =>
    r.categories.includes('mutations'),
  );
  const otherFactor = multiply(
    results.filter((r) => r !== mutationComponent).map((r) => r.valid),
  );
  return {
    theoretical: multiply(results.map((r) => r.theoretical)),
    structural,
    evaluatedLeaves: results.reduce((n, r) => n + r.evaluated, 0),
    components: results,
    byMutation: Object.fromEntries(
      Object.entries(mutationComponent?.mutationCounts ?? {}).map(([id, n]) => [
        id,
        n * otherFactor,
      ]),
    ),
    method: 'EXACT_CONSTRAINT_COMPONENT_ENUMERATION_EXISTING_ENGINE' as const,
  };
}

export function measureStructuralCapacity(input: unknown) {
  const spec = productionSpecSchema.parse(input),
    inputs = simulationInputs(spec);
  const allValues = countCatalogSpace(inputs.catalog, inputs.manifest);
  const excluded = new Set(
    spec.traits.filter((t) => t.ordinaryDisabled).map((t) => `dev-${t.id}`),
  );
  const ordinary = countCatalogSpace(inputs.catalog, inputs.manifest, excluded);
  const assets = new Map(inputs.manifest.assets.map((a) => [a.id, a]));
  const traits = new Map(inputs.catalog.traits.map((t) => [t.id, t]));
  const reservedKeys = new Set<string>();
  let reservedOutsideOrdinary = 0;
  for (const grail of inputs.catalog.grails)
    for (const reservation of grail.reservations) {
      const selected = reservation.traitIds.map((id) => traits.get(id)!);
      if (
        evaluateComposition(selected, inputs.catalog, assets).rejections.length
      )
        throw new Error('CAPACITY_INVALID_RESERVATION');
      const key = [...reservation.traitIds].sort().join('|');
      if (reservedKeys.has(key))
        throw new Error('CAPACITY_DUPLICATE_RESERVATION');
      reservedKeys.add(key);
      if (reservation.traitIds.some((id) => excluded.has(id)))
        reservedOutsideOrdinary++;
    }
  return {
    schemaVersion: 'lammb-logical-capacity/1.0.0',
    purpose: 'DEVELOPMENT_ONLY',
    specSha256: canonicalSha256(spec),
    supply: 5280,
    allValues,
    ordinary,
    reservedVectors: reservedKeys.size,
    reservedOutsideOrdinary,
    constructorSelectableVectors: ordinary.structural + reservedOutsideOrdinary,
    productionRegisteredCount: 0,
    artworkCapacityClaimed: false,
    frequencyFeasibleCapacityClaimed: false,
    visualUniquenessClaimed: false,
  };
}
