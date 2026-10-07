import { validateArt } from './art-inputs.ts';
import {
  assetManifestSchema,
  engineCatalogSchema,
  engineRequestSchema,
} from './engine-schema.ts';
import type {
  EngineCatalog,
  AssetManifest,
  EngineRequest,
} from './engine-schema.ts';
import { canonicalJson, compareText, sha256Bytes } from './canonical.ts';
import { traitCategorySchema } from './schema.ts';

export class InputError extends Error {}
const unique = (ids: string[], label: string) => {
  if (new Set(ids).size !== ids.length)
    throw new InputError(`Duplicate ${label}`);
};

export function validateInputs(
  catalogInput: unknown,
  manifestInput: unknown,
  requestInput: unknown,
  bytes: ReadonlyMap<string, Uint8Array>,
  approvals?: unknown,
): { catalog: EngineCatalog; manifest: AssetManifest; request: EngineRequest } {
  // Normalize JSON strings before validating/hashing; do not normalize raw assets.
  const catalog = engineCatalogSchema.parse(
    JSON.parse(canonicalJson(catalogInput)),
  );
  let manifest = assetManifestSchema.parse(
    JSON.parse(canonicalJson(manifestInput)),
  );
  if (manifest.schemaVersion === 2)
    manifest = validateArt(manifest, approvals, bytes).manifest;
  else if (manifest.purpose === 'PRODUCTION')
    throw new InputError(
      'Production construction requires V2 artwork and approvals',
    );
  const request = engineRequestSchema.parse(requestInput);
  if (catalog.purpose !== manifest.purpose)
    throw new InputError('Catalog/manifest environment mismatch');
  unique(
    catalog.traits.map((trait) => trait.id),
    'trait IDs',
  );
  unique(
    catalog.rules.map((rule) => rule.id),
    'rule IDs',
  );
  unique(
    catalog.grails.map((grail) => grail.id),
    'grail IDs',
  );
  unique(
    manifest.assets.map((asset) => asset.id),
    'asset IDs',
  );
  unique(
    manifest.assets.map((asset) => asset.path.toLowerCase()),
    'portable asset paths',
  );
  unique(
    catalog.categories.map((item) => item.category),
    'categories',
  );
  if (
    catalog.categories.some(
      (category) => !traitCategorySchema.options.includes(category.category),
    )
  )
    throw new InputError('Invalid category');
  const assets = new Map(manifest.assets.map((asset) => [asset.id, asset]));
  const traits = new Map(catalog.traits.map((trait) => [trait.id, trait]));
  if (bytes.size !== assets.size)
    throw new InputError('Asset evidence does not cover exactly the manifest');
  for (const asset of manifest.assets) {
    unique(asset.compatibilityTags, 'asset tags');
    if (asset.purpose !== manifest.purpose)
      throw new InputError('Asset environment mismatch');
    const actual = bytes.get(asset.id);
    if (!actual || sha256Bytes(actual) !== asset.sha256)
      throw new InputError(`Asset digest mismatch: ${asset.id}`);
  }
  const knownTags = new Set([
    ...catalog.traits.flatMap((trait) => trait.tags),
    ...manifest.assets.flatMap((asset) => asset.compatibilityTags),
  ]);
  const requireTraits = (ids: string[]) => {
    unique(ids, 'trait references');
    if (ids.some((id) => !traits.has(id)))
      throw new InputError('Unresolved trait reference');
  };
  const requireTags = (tags: string[]) => {
    unique(tags, 'tag references');
    if (tags.some((tag) => !knownTags.has(tag)))
      throw new InputError('Unresolved compatibility tag');
  };
  for (const trait of catalog.traits) {
    unique(trait.assetIds, 'trait asset references');
    unique(trait.tags, 'trait tags');
    if (
      trait.assetIds.some((id) => assets.get(id)?.category !== trait.category)
    )
      throw new InputError(
        'Unresolved or category-incompatible asset reference',
      );
    requireTraits(trait.requiresTraitIds);
    requireTraits(trait.incompatibleTraitIds);
    if (trait.incompatibleTraitIds.includes(trait.id))
      throw new InputError('A trait cannot exclude itself');
    requireTags(trait.requiresTags);
    requireTags(trait.excludesTags);
    if (trait.mutation && trait.category !== 'mutations')
      throw new InputError('Structural mutation belongs only to mutations');
    if (trait.scene && trait.category !== 'environments')
      throw new InputError('Scene behavior belongs only to environments');
    if ((trait.category === 'pixel_corruption') !== Boolean(trait.corruption))
      throw new InputError('Pixel corruption requires a distinct level');
    if (trait.corruption && !trait.identityAffecting)
      throw new InputError('Corruption levels must participate in identity');
    for (const effects of [
      trait.mutation?.categoryEffects ?? [],
      trait.scene?.constraints ?? [],
    ]) {
      unique(
        effects.map((effect) => effect.category),
        'structural category effects',
      );
      for (const effect of effects) {
        requireTraits(effect.allowedTraitIds);
        if (
          effect.allowedTraitIds.some(
            (id) => traits.get(id)!.category !== effect.category,
          )
        )
          throw new InputError('Structural constraint category mismatch');
        if (effect.replacementAssetIds !== null) {
          unique(effect.replacementAssetIds, 'replacement asset references');
          if (
            effect.replacementAssetIds.some(
              (id) => assets.get(id)?.category !== effect.category,
            )
          )
            throw new InputError('Invalid structural replacement asset');
        }
      }
    }
  }
  for (const category of catalog.categories) {
    if (!catalog.traits.some((trait) => trait.category === category.category))
      throw new InputError(`Exhausted category: ${category.category}`);
  }
  for (const rule of catalog.rules) {
    if (rule.type === 'INCOMPATIBLE') requireTraits(rule.traitIds);
    else {
      requireTraits([rule.whenTraitId]);
      if (rule.type === 'REQUIRES') requireTraits(rule.requiredTraitIds);
      else requireTags([rule.tag]);
    }
  }
  const slots: number[] = [];
  for (const grail of catalog.grails)
    for (const reservation of grail.reservations) {
      requireTraits(reservation.traitIds);
      slots.push(reservation.index);
      if (reservation.index >= request.outputCount)
        throw new InputError('Grail slot outside requested output');
      if (
        reservation.traitIds.length !== catalog.categories.length ||
        new Set(reservation.traitIds.map((id) => traits.get(id)!.category))
          .size !== catalog.categories.length
      )
        throw new InputError('Grail must explicitly fill each category once');
    }
  unique(slots.map(String), 'grail slots');
  const ordinaryCount = request.outputCount - slots.length;
  for (const category of catalog.categories) {
    const quota = catalog.traits
      .filter((trait) => trait.category === category.category)
      .reduce((sum, trait) => sum + (trait.frequency.plannedCount ?? 0), 0);
    if (quota > ordinaryCount)
      throw new InputError(`Impossible ordinary quota: ${category.category}`);
    if (
      catalog.traits
        .filter((trait) => trait.category === category.category)
        .every((trait) => trait.frequency.plannedCount !== undefined) &&
      quota !== ordinaryCount
    )
      throw new InputError(
        `Fully planned category must exactly cover ordinary slots: ${category.category}`,
      );
  }
  if (catalog.purpose === 'DEVELOPMENT_ONLY') {
    const ids = [
      ...catalog.traits,
      ...catalog.rules,
      ...catalog.grails,
      ...manifest.assets,
    ].map((record) => record.id);
    if (ids.some((id) => !id.startsWith('dev-')))
      throw new InputError('Development input IDs require dev- prefix');
  }
  const byId = <T extends { id: string }>(a: T, b: T) =>
    compareText(a.id, b.id);
  catalog.categories.sort((a, b) => compareText(a.category, b.category));
  catalog.traits.sort(byId);
  catalog.rules.sort(byId);
  catalog.grails.sort(byId);
  manifest.assets.sort(byId);
  for (const asset of manifest.assets)
    asset.compatibilityTags.sort(compareText);
  for (const trait of catalog.traits) {
    for (const values of [
      trait.assetIds,
      trait.tags,
      trait.requiresTraitIds,
      trait.incompatibleTraitIds,
      trait.requiresTags,
      trait.excludesTags,
    ])
      values.sort(compareText);
    for (const effects of [
      trait.mutation?.categoryEffects ?? [],
      trait.scene?.constraints ?? [],
    ]) {
      effects.sort((a, b) => compareText(a.category, b.category));
      for (const effect of effects) {
        effect.allowedTraitIds.sort(compareText);
        effect.replacementAssetIds?.sort(compareText);
      }
    }
  }
  for (const rule of catalog.rules) {
    if (rule.type === 'INCOMPATIBLE') rule.traitIds.sort(compareText);
    if (rule.type === 'REQUIRES') rule.requiredTraitIds.sort(compareText);
  }
  for (const grail of catalog.grails) {
    grail.reservations.sort((a, b) => a.index - b.index);
    for (const reservation of grail.reservations)
      reservation.traitIds.sort(compareText);
  }
  return { catalog, manifest, request };
}
