import { z } from 'zod';
import { collection } from '@lammb/collection/config';
import { canonicalJson, canonicalSha256, sha256Bytes } from './canonical.ts';
import { evaluateComposition } from './constraints.ts';
import { compatibilityRuleSchema, engineTraitSchema } from './engine-schema.ts';
import type { EngineCatalog, AssetManifest } from './engine-schema.ts';
import {
  identifierSchema,
  sha256Schema,
  traitCategorySchema,
} from './schema.ts';

const text = z
  .string()
  .trim()
  .min(1)
  .max(2400)
  .refine((v) => !/[\u0000-\u001f\u007f]/.test(v));
const ids = z.array(identifierSchema).max(2048);
export const visibleAttributeSchema = z.strictObject({
  trait_type: z.enum([
    'Species',
    'Wool',
    'Eyes',
    'Expression',
    'Clothing',
    'Headwear',
    'Eyewear',
    'Ear Tag',
    'Jewelry',
    'Dental Accent',
    'Equipment',
    'Mutation',
    'Material',
    'Pixel Corruption',
    'Background',
    'Phenomenon',
  ]),
  value: text,
});
const proposal = z.strictObject({
  status: z.literal('PROPOSED'),
  ownerApprovalReference: z.null(),
});

export const productionSpecSchema = z
  .strictObject({
    schemaVersion: z.literal(1),
    specVersion: z.literal('1.0.0'),
    id: z.literal('lammb-trait-bible'),
    supply: z.literal(collection.supply),
    status: z.literal('OWNER_REVIEW_REQUIRED'),
    constructorPolicy: z.literal('ONE_TRAIT_PER_EXISTING_CATEGORY'),
    referenceEvidence: z
      .array(
        z.strictObject({
          id: text,
          filename: text,
          sha256: sha256Schema,
          status: z.enum(['REVIEW', 'REJECTED']),
          note: text,
        }),
      )
      .min(1),
    species: z.strictObject({
      definition: text,
      landmarks: z.array(text).min(4),
      prohibited: z.array(text).min(1),
    }),
    editorialSections: z.array(text).length(12),
    categories: z
      .array(
        z.strictObject({
          category: traitCategorySchema,
          displayName: text,
          definition: text,
          frequencyPolicy: z.enum(['EXACT_TOTAL', 'WEIGHTED_TARGET']),
        }),
      )
      .length(9),
    traits: z
      .array(
        z.strictObject({
          id: identifierSchema,
          category: traitCategorySchema,
          displayName: text,
          visualDefinition: text,
          referenceIds: z.array(text),
          approval: proposal,
          proposedTotalCount: z.number().int().min(0).max(collection.supply),
          approvedTotalCount: z.null(),
          selectionWeight: z.number().int().min(1).max(1000000),
          ordinaryDisabled: z.boolean(),
          assetRequirementIds: ids.min(1),
          metadata: z.array(visibleAttributeSchema).max(12),
          tags: ids,
          requiresTraitIds: ids,
          incompatibleTraitIds: ids,
          requiresTags: ids,
          excludesTags: ids,
          mutation: engineTraitSchema.shape.mutation,
          corruption: engineTraitSchema.shape.corruption,
          corruptionSpecification: z
            .strictObject({
              maskCoverageBasisPoints: z.strictObject({
                minimum: z.number().int().min(0).max(4000),
                maximum: z.number().int().min(0).max(4000),
              }),
              protectedLandmarks: z
                .array(
                  z.enum([
                    'primary-eyes',
                    'muzzle-center',
                    'ear-roots',
                    'wool-identity-island',
                  ]),
                )
                .length(4),
              algorithmStatus: z.literal('UNSELECTED'),
              maskStatus: z.literal('OWNER_REVIEW_REQUIRED'),
            })
            .optional(),
        }),
      )
      .min(1)
      .max(2048),
    compatibilityRules: z.array(compatibilityRuleSchema),
    mutationSpecifications: z
      .array(
        z.strictObject({
          traitId: identifierSchema,
          anatomyReplacement: text,
          preservedLandmarks: z.array(text).min(4),
          woolTreatment: text,
          eyesAndExpression: text,
          clothingAndAccessories: text,
          material: text,
          effects: text,
          forbiddenCombinations: z.array(text).min(1),
          approval: proposal,
        }),
      )
      .min(6),
    grails: z
      .array(
        z.strictObject({
          id: identifierSchema,
          displayName: text,
          index: z
            .number()
            .int()
            .min(0)
            .max(collection.supply - 1),
          traitIds: ids.length(9),
          visualDefinition: text,
          silhouetteTest: text,
          materialTest: text,
          assetRequirementIds: ids.min(1),
          metadata: z.array(visibleAttributeSchema),
          approval: proposal,
        }),
      )
      .max(128),
    assetRequirements: z
      .array(
        z.strictObject({
          id: identifierSchema,
          category: traitCategorySchema,
          role: z.enum(['LAYER', 'EFFECT', 'SCENE', 'REFERENCE']),
          definition: text,
          method: z.enum([
            'BUILT_IN_IMAGEGEN_AND_ALIGNMENT',
            'DETERMINISTIC_CLEAR_LAYER',
            'DETERMINISTIC_VECTOR',
          ]),
          status: z.literal('MISSING'),
          sha256: z.null(),
          ownerApprovalReference: z.null(),
          referenceFrame: z.literal('lammb-bust-three-quarter-v1'),
          width: z.literal(3072),
          height: z.literal(3072),
          colorProfile: z.literal('SRGB'),
          alpha: z.enum(['REQUIRED', 'FORBIDDEN']),
          order: z.number().int().min(0),
          slot: identifierSchema,
          acceptance: z.array(text).min(3),
        }),
      )
      .min(1)
      .max(4096),
    variantRequirements: z
      .array(
        z.strictObject({
          id: identifierSchema,
          assetRequirementId: identifierSchema,
          mutationTraitId: identifierSchema,
          status: z.literal('MISSING'),
          reason: text,
        }),
      )
      .max(4096),
    production: z.strictObject({
      masterResolution: z.literal(3072),
      presentationResolution: z.literal(1024),
      assetState: z.literal('NO_APPROVED_PRODUCTION_ASSETS'),
      rendererState: z.literal('NOT_IMPLEMENTED'),
      requirements: z.array(text).min(1),
      blockers: z.array(text).min(1),
    }),
  })
  .superRefine((spec, context) => {
    const issue = (message: string) =>
      context.addIssue({ code: 'custom', message });
    const unique = (values: string[], label: string) => {
      if (new Set(values).size !== values.length) issue(`Duplicate ${label}`);
    };
    unique(
      spec.traits.map((t) => t.id),
      'trait IDs',
    );
    unique(
      spec.categories.map((c) => c.category),
      'categories',
    );
    unique(
      spec.assetRequirements.map((a) => a.id),
      'asset requirements',
    );
    unique(
      spec.grails.map((g) => g.id),
      'grail IDs',
    );
    unique(
      spec.grails.map((g) => String(g.index)),
      'grail slots',
    );
    unique(
      spec.compatibilityRules.map((r) => r.id),
      'rule IDs',
    );
    unique(
      spec.mutationSpecifications.map((m) => m.traitId),
      'mutation specifications',
    );
    unique(
      spec.referenceEvidence.map((r) => r.id),
      'reference IDs',
    );
    unique(
      spec.variantRequirements.map((v) => v.id),
      'variant IDs',
    );
    unique(
      spec.variantRequirements.map(
        (v) => `${v.assetRequirementId}:${v.mutationTraitId}`,
      ),
      'variant bindings',
    );
    const traits = new Map(spec.traits.map((t) => [t.id, t]));
    const assets = new Map(spec.assetRequirements.map((a) => [a.id, a]));
    const references = new Set(spec.referenceEvidence.map((r) => r.id));
    for (const variant of spec.variantRequirements) {
      if (
        !assets.has(variant.assetRequirementId) ||
        traits.get(variant.mutationTraitId)?.category !== 'mutations'
      )
        issue('Unresolved variant binding');
    }
    const requiredVariants: string[] = [];
    for (const trait of spec.traits.filter((t) =>
      ['wool', 'eyes', 'expressions', 'clothing', 'accessories'].includes(
        t.category,
      ),
    )) {
      for (const mutation of spec.traits.filter(
        (t) => t.category === 'mutations',
      )) {
        const effect = mutation.mutation?.categoryEffects.find(
          (e) => e.category === trait.category,
        );
        if (effect && !effect.allowedTraitIds.includes(trait.id)) continue;
        if (
          trait.requiresTraitIds.some(
            (id) =>
              traits.get(id)?.category === 'mutations' && id !== mutation.id,
          )
        )
          continue;
        if (
          trait.incompatibleTraitIds.includes(mutation.id) ||
          mutation.incompatibleTraitIds.includes(trait.id)
        )
          continue;
        if (
          spec.compatibilityRules.some(
            (r) =>
              r.type === 'INCOMPATIBLE' &&
              r.traitIds.length === 2 &&
              r.traitIds.includes(trait.id) &&
              r.traitIds.includes(mutation.id),
          )
        )
          continue;
        for (const assetId of trait.assetRequirementIds)
          if (assets.get(assetId)?.method === 'BUILT_IN_IMAGEGEN_AND_ALIGNMENT')
            requiredVariants.push(`${assetId}:${mutation.id}`);
      }
    }
    if (
      canonicalJson(requiredVariants.sort()) !==
      canonicalJson(
        spec.variantRequirements
          .map((v) => `${v.assetRequirementId}:${v.mutationTraitId}`)
          .sort(),
      )
    )
      issue('Incomplete or unsupported anatomy-family variant matrix');
    const knownTags = new Set(spec.traits.flatMap((t) => t.tags));
    const checkTraits = (values: string[]) => {
      unique(values, 'trait references');
      if (values.some((id) => !traits.has(id)))
        issue('Unresolved trait reference');
    };
    const checkAssets = (values: string[], category?: string) => {
      unique(values, 'asset references');
      if (
        values.some(
          (id) =>
            !assets.has(id) ||
            (category && assets.get(id)?.category !== category),
        )
      )
        issue('Unresolved or category-mismatched asset requirement');
    };
    for (const category of spec.categories) {
      const values = spec.traits.filter(
        (t) => t.category === category.category,
      );
      if (
        !values.length ||
        values.reduce((n, t) => n + t.proposedTotalCount, 0) !==
          collection.supply
      )
        issue(`Proposed totals must cover supply: ${category.category}`);
      unique(
        values.map((t) => t.displayName),
        `display names in ${category.category}`,
      );
    }
    for (const trait of spec.traits) {
      checkAssets(trait.assetRequirementIds, trait.category);
      checkTraits(trait.requiresTraitIds);
      checkTraits(trait.incompatibleTraitIds);
      if (trait.referenceIds.some((id) => !references.has(id)))
        issue('Unresolved source reference');
      if (trait.incompatibleTraitIds.includes(trait.id))
        issue('Trait excludes itself');
      for (const tags of [trait.tags, trait.requiresTags, trait.excludesTags])
        unique(tags, 'tags');
      if (
        [...trait.requiresTags, ...trait.excludesTags].some(
          (tag) => !knownTags.has(tag),
        )
      )
        issue('Unresolved compatibility tag');
      if (Boolean(trait.corruption) !== (trait.category === 'pixel_corruption'))
        issue('Distinct corruption category required');
      if (
        Boolean(trait.corruptionSpecification) !==
        (trait.category === 'pixel_corruption')
      )
        issue(
          'Every corruption level requires a proposed measurable mask specification',
        );
      const coverage = trait.corruptionSpecification?.maskCoverageBasisPoints;
      if (
        coverage &&
        (coverage.minimum > coverage.maximum ||
          (trait.corruption?.level === 'NONE' && coverage.maximum !== 0))
      )
        issue('Invalid corruption mask coverage');
      if (trait.mutation && trait.category !== 'mutations')
        issue('Mutation behavior outside mutation category');
      unique(
        trait.metadata.map((a) => a.trait_type),
        'attribute names',
      );
      const primaryNames = {
        base_anatomy: 'Species',
        wool: 'Wool',
        eyes: 'Eyes',
        expressions: 'Expression',
        clothing: 'Clothing',
        pixel_corruption: 'Pixel Corruption',
        environments: 'Background',
      };
      if (trait.category !== 'accessories' && trait.category !== 'mutations') {
        if (
          trait.metadata.length !== 1 ||
          trait.metadata[0]?.trait_type !== primaryNames[trait.category] ||
          trait.metadata[0]?.value !== trait.displayName
        )
          issue(
            'Primary metadata must match its canonical category and display value',
          );
      } else if (trait.category === 'accessories') {
        if (
          trait.metadata.some(
            (a) =>
              ![
                'Headwear',
                'Eyewear',
                'Ear Tag',
                'Jewelry',
                'Dental Accent',
                'Equipment',
              ].includes(a.trait_type),
          )
        )
          issue(
            'Accessory configuration exposes only visible accessory facets',
          );
      } else {
        const expectedNames = trait.mutation
          ? ['Material', 'Mutation']
          : ['Material'];
        if (
          canonicalJson(trait.metadata.map((a) => a.trait_type).sort()) !==
            canonicalJson(expectedNames.sort()) ||
          (trait.mutation &&
            trait.metadata.find((a) => a.trait_type === 'Mutation')?.value !==
              trait.displayName)
        )
          issue('Mutation metadata does not match the structural family');
      }
      if (
        trait.metadata.some((a) =>
          /^(rarity|rank|tier|grail)$/i.test(a.trait_type),
        )
      )
        issue('Invented rarity metadata is forbidden');
      unique(
        trait.mutation?.categoryEffects.map((e) => e.category) ?? [],
        'mutation category effects',
      );
      for (const effect of trait.mutation?.categoryEffects ?? []) {
        checkTraits(effect.allowedTraitIds);
        if (
          effect.allowedTraitIds.some(
            (id) => traits.get(id)?.category !== effect.category,
          )
        )
          issue('Mutation category mismatch');
        if (effect.replacementAssetIds)
          checkAssets(effect.replacementAssetIds, effect.category);
      }
    }
    for (const rule of spec.compatibilityRules) {
      if (rule.type === 'INCOMPATIBLE') checkTraits(rule.traitIds);
      else {
        checkTraits([rule.whenTraitId]);
        if (rule.type === 'REQUIRES') checkTraits(rule.requiredTraitIds);
        else if (!knownTags.has(rule.tag)) issue('Unresolved rule tag');
      }
    }
    const mutationIds = spec.traits.filter((t) => t.mutation).map((t) => t.id);
    if (
      canonicalJson([...mutationIds].sort()) !==
      canonicalJson(spec.mutationSpecifications.map((m) => m.traitId).sort())
    )
      issue('Every structural mutation needs exactly one specification');
    for (const mutation of spec.mutationSpecifications) {
      if (
        traits
          .get(mutation.traitId)
          ?.metadata.find((a) => a.trait_type === 'Material')?.value !==
          mutation.material ||
        spec.species.landmarks.some(
          (landmark) => !mutation.preservedLandmarks.includes(landmark),
        )
      )
        issue(
          'Mutation specification must preserve species landmarks and declared material',
        );
    }
    const reservedCounts = new Map<string, number>();
    for (const grail of spec.grails) {
      checkTraits(grail.traitIds);
      checkAssets(grail.assetRequirementIds);
      if (
        new Set(grail.traitIds.map((id) => traits.get(id)?.category)).size !== 9
      )
        issue('Grail must fill nine categories once');
      for (const id of grail.traitIds)
        reservedCounts.set(id, (reservedCounts.get(id) ?? 0) + 1);
    }
    for (const trait of spec.traits) {
      const reserved = reservedCounts.get(trait.id) ?? 0;
      if (
        reserved > trait.proposedTotalCount ||
        (trait.ordinaryDisabled && reserved !== trait.proposedTotalCount)
      )
        issue('Reservation / ordinary-disabled frequency mismatch');
    }
    const used = new Set([
      ...spec.traits.flatMap((t) => [
        ...t.assetRequirementIds,
        ...(t.mutation?.categoryEffects.flatMap(
          (e) => e.replacementAssetIds ?? [],
        ) ?? []),
      ]),
      ...spec.grails.flatMap((g) => g.assetRequirementIds),
    ]);
    if (spec.assetRequirements.some((a) => !used.has(a.id)))
      issue('Orphan asset requirement');
  });

export type ProductionSpec = z.infer<typeof productionSpecSchema>;

// This is a proposal simulation adapter, never a production approval or image loader.
export function simulationInputs(input: unknown, seedHex = '0150'.repeat(16)) {
  const spec = productionSpecSchema.parse(input);
  const dev = (id: string) => `dev-${id}`;
  const bytes = new Map(
    spec.assetRequirements.map((asset) => [
      dev(asset.id),
      Buffer.from(
        canonicalJson({ purpose: 'DEVELOPMENT_ONLY', requirement: asset }),
      ),
    ]),
  );
  const manifest: AssetManifest = {
    schemaVersion: 1,
    purpose: 'DEVELOPMENT_ONLY',
    assets: spec.assetRequirements.map((asset) => ({
      id: dev(asset.id),
      category: asset.category,
      path: `task-015/${asset.id}.txt`,
      sha256: sha256Bytes(bytes.get(dev(asset.id))!),
      purpose: 'DEVELOPMENT_ONLY',
      composition: { role: asset.role, order: asset.order, slot: asset.slot },
      compatibilityTags: [],
    })),
  };
  const catalog: EngineCatalog = {
    schemaVersion: 2,
    purpose: 'DEVELOPMENT_ONLY',
    plannedCountScope: 'ORDINARY_ONLY',
    categories: spec.categories.map((c) => ({
      category: c.category,
      selectionCount: 1,
    })),
    traits: spec.traits.map((trait, displayOrder) => {
      const reserved = spec.grails.filter((g) =>
        g.traitIds.includes(trait.id),
      ).length;
      const exact =
        spec.categories.find((c) => c.category === trait.category)!
          .frequencyPolicy === 'EXACT_TOTAL' || trait.ordinaryDisabled;
      return {
        id: dev(trait.id),
        category: trait.category,
        label: trait.displayName,
        assetIds: trait.assetRequirementIds.map(dev),
        frequency: {
          weight: trait.selectionWeight,
          ...(exact
            ? { plannedCount: trait.proposedTotalCount - reserved }
            : {}),
        },
        tags: [...trait.tags],
        requiresTraitIds: trait.requiresTraitIds.map(dev),
        incompatibleTraitIds: trait.incompatibleTraitIds.map(dev),
        requiresTags: [...trait.requiresTags],
        excludesTags: [...trait.excludesTags],
        identityAffecting: true,
        publicMetadata: true,
        displayOrder,
        ...(trait.corruption ? { corruption: trait.corruption } : {}),
        ...(trait.mutation
          ? {
              mutation: {
                categoryEffects: trait.mutation.categoryEffects.map((e) => ({
                  category: e.category,
                  allowedTraitIds: e.allowedTraitIds.map(dev),
                  replacementAssetIds: e.replacementAssetIds?.map(dev) ?? null,
                })),
              },
            }
          : {}),
      };
    }),
    rules: spec.compatibilityRules.map((rule) => {
      if (rule.type === 'INCOMPATIBLE')
        return { ...rule, id: dev(rule.id), traitIds: rule.traitIds.map(dev) };
      if (rule.type === 'REQUIRES')
        return {
          ...rule,
          id: dev(rule.id),
          whenTraitId: dev(rule.whenTraitId),
          requiredTraitIds: rule.requiredTraitIds.map(dev),
        };
      return { ...rule, id: dev(rule.id), whenTraitId: dev(rule.whenTraitId) };
    }),
    grails: spec.grails.map((g) => ({
      id: dev(g.id),
      label: g.displayName,
      frequencyScope: 'EXCLUDE_FROM_ORDINARY',
      reservations: [{ index: g.index, traitIds: g.traitIds.map(dev) }],
    })),
  };
  return {
    catalog,
    manifest,
    assetBytes: bytes,
    request: {
      schemaVersion: 1,
      seedHex,
      sourceReference: `urn:lammb:proposal:task-015-${canonicalSha256(spec)}`,
      outputCount: collection.supply,
      maxAttemptsPerSpecimen: 1000,
      maxTotalAttempts: 1000000,
    },
  };
}

export function validateProposalComposition(
  spec: ProductionSpec,
  traitIds: string[],
) {
  if (
    traitIds.length !== 9 ||
    new Set(traitIds).size !== 9 ||
    new Set(
      traitIds.map((id) => spec.traits.find((t) => t.id === id)?.category),
    ).size !== 9
  )
    throw new Error('Composition must fill nine categories once');
  const inputs = simulationInputs(spec);
  const selected = traitIds.map((id) => {
    const trait = inputs.catalog.traits.find((t) => t.id === `dev-${id}`);
    if (!trait) throw new Error('Unresolved composition trait');
    return trait;
  });
  const result = evaluateComposition(
    selected,
    inputs.catalog,
    new Map(inputs.manifest.assets.map((a) => [a.id, a])),
  );
  if (result.rejections.length)
    throw new Error(result.rejections.map((r) => r.code).join('; '));
}
