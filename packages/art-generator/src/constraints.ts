import type {
  AssetManifest,
  EngineCatalog,
  EngineTrait,
} from './engine-schema.ts';
import { compareText, canonicalSha256 } from './canonical.ts';
import type { TraitCategory } from './schema.ts';

export type Rejection = { code: string; message: string };
export type CompositionNode = {
  category: TraitCategory;
  traitId: string;
  assetIds: string[];
  modifierTraitIds: string[];
};

export function evaluateComposition(
  traits: EngineTrait[],
  catalog: EngineCatalog,
  assets: Map<string, AssetManifest['assets'][number]>,
): { composition: CompositionNode[]; rejections: Rejection[] } {
  const selected = new Set(traits.map((trait) => trait.id));
  const rejections: Rejection[] = [];
  const reject = (code: string, message: string) =>
    rejections.push({ code, message });
  const composition: CompositionNode[] = traits
    .map((trait) => ({
      category: trait.category,
      traitId: trait.id,
      assetIds: [...trait.assetIds].sort(compareText),
      modifierTraitIds: [],
    }))
    .sort(
      (a, b) =>
        compareText(a.category, b.category) ||
        compareText(a.traitId, b.traitId),
    );
  const replacements = new Map<string, string>();
  for (const source of traits) {
    const effects = [
      ...(source.mutation?.categoryEffects ?? []),
      ...(source.scene?.constraints ?? []),
    ];
    for (const effect of effects) {
      const node = composition.find(
        (node) => node.category === effect.category,
      );
      if (!node || !effect.allowedTraitIds.includes(node.traitId))
        reject(
          `STRUCTURE:${source.id}:${effect.category}`,
          `${source.id} constrains ${effect.category} to its declared compatible set`,
        );
      if (node && effect.replacementAssetIds !== null) {
        const replacement = [...effect.replacementAssetIds].sort(compareText);
        const signature = replacement.join('|');
        if (
          replacements.has(node.category) &&
          replacements.get(node.category) !== signature
        )
          reject(
            `STRUCTURE_CONFLICT:${node.category}`,
            'Competing category asset replacements',
          );
        replacements.set(node.category, signature);
        node.assetIds = replacement;
        node.modifierTraitIds.push(source.id);
      }
    }
  }
  const tags = new Set(traits.flatMap((trait) => trait.tags));
  for (const node of composition) {
    node.modifierTraitIds.sort(compareText);
    for (const id of node.assetIds)
      for (const tag of assets.get(id)!.compatibilityTags) tags.add(tag);
  }
  for (const trait of traits) {
    for (const id of trait.requiresTraitIds)
      if (!selected.has(id))
        reject(
          `TRAIT_REQUIRES:${trait.id}:${id}`,
          `${trait.id} requires ${id}`,
        );
    for (const id of trait.incompatibleTraitIds)
      if (selected.has(id))
        reject(
          `TRAIT_INCOMPATIBLE:${trait.id}:${id}`,
          `${trait.id} excludes ${id}`,
        );
    for (const tag of trait.requiresTags)
      if (!tags.has(tag))
        reject(
          `TRAIT_REQUIRES_TAG:${trait.id}:${tag}`,
          `${trait.id} requires tag ${tag}`,
        );
    for (const tag of trait.excludesTags)
      if (tags.has(tag))
        reject(
          `TRAIT_EXCLUDES_TAG:${trait.id}:${tag}`,
          `${trait.id} excludes tag ${tag}`,
        );
  }
  for (const rule of catalog.rules) {
    switch (rule.type) {
      case 'INCOMPATIBLE':
        if (rule.traitIds.every((id) => selected.has(id)))
          reject(`RULE:${rule.id}`, rule.reason);
        break;
      case 'REQUIRES':
        if (
          selected.has(rule.whenTraitId) &&
          rule.requiredTraitIds.some((id) => !selected.has(id))
        )
          reject(`RULE:${rule.id}`, rule.reason);
        break;
      case 'EXCLUDES_TAG':
        if (selected.has(rule.whenTraitId) && tags.has(rule.tag))
          reject(`RULE:${rule.id}`, rule.reason);
        break;
      case 'REQUIRES_TAG':
        if (selected.has(rule.whenTraitId) && !tags.has(rule.tag))
          reject(`RULE:${rule.id}`, rule.reason);
        break;
    }
  }
  return { composition, rejections };
}

// Slot, label, grail label, public metadata, weights and attempts are excluded.
export function specimenFingerprint(
  traits: EngineTrait[],
  composition: CompositionNode[],
): string {
  const identityIds = new Set(
    traits.filter((trait) => trait.identityAffecting).map((trait) => trait.id),
  );
  return canonicalSha256({
    version: 1,
    identity: composition
      .filter((node) => identityIds.has(node.traitId))
      .map((node) => ({
        category: node.category,
        traitId: node.traitId,
        assetIds: [...node.assetIds].sort(compareText),
      }))
      .sort(
        (a, b) =>
          compareText(a.category, b.category) ||
          compareText(a.traitId, b.traitId),
      ),
  });
}
