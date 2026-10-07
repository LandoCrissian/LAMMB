import { z } from 'zod';

export const sha256Schema = z.string().regex(/^[a-f0-9]{64}$/);
export const identifierSchema = z
  .string()
  .max(128)
  .regex(/^[a-z][a-z0-9_-]*$/);
export const relativePathSchema = z
  .string()
  .min(1)
  .max(240)
  .refine(
    (path) =>
      path
        .split('/')
        .every(
          (part) =>
            /^[a-zA-Z0-9][a-zA-Z0-9._-]*$/.test(part) &&
            !part.endsWith('.') &&
            !/^(?:con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i.test(part),
        ),
    'Expected a portable relative path without traversal',
  );

export const traitCategorySchema = z.enum([
  'base_anatomy',
  'wool',
  'eyes',
  'expressions',
  'clothing',
  'accessories',
  'mutations',
  'pixel_corruption',
  'environments',
]);

export const traitSchema = z.strictObject({
  id: identifierSchema,
  category: traitCategorySchema,
  label: z.string().trim().min(1),
  asset: z.strictObject({ path: relativePathSchema, sha256: sha256Schema }),
  frequency: z.strictObject({
    weight: z.number().int().positive().max(Number.MAX_SAFE_INTEGER),
    plannedCount: z.number().int().nonnegative().optional(),
  }),
  rarityLabel: z.string().trim().min(1).optional(),
});

export const incompatibilityRuleSchema = z.strictObject({
  id: identifierSchema,
  traitIds: z.array(identifierSchema).min(2),
  reason: z.string().trim().min(1),
});

// Grails are explicit curated compositions, not an invented set of rare traits.
export const grailSchema = z.strictObject({
  id: identifierSchema,
  label: z.string().trim().min(1),
  traitIds: z.array(identifierSchema).min(1),
  plannedCount: z.number().int().positive(),
});

export const traitCatalogSchema = z
  .strictObject({
    schemaVersion: z.literal(1),
    purpose: z.enum(['DEVELOPMENT_ONLY', 'PRODUCTION']),
    traits: z.array(traitSchema),
    grails: z.array(grailSchema),
    incompatibilities: z.array(incompatibilityRuleSchema),
  })
  .superRefine((catalog, context) => {
    for (const [key, records] of [
      ['traits', catalog.traits],
      ['grails', catalog.grails],
      ['incompatibilities', catalog.incompatibilities],
    ] as const) {
      if (new Set(records.map((record) => record.id)).size !== records.length) {
        context.addIssue({
          code: 'custom',
          message: 'IDs must be unique',
          path: [key],
        });
      }
    }

    const traits = new Map(catalog.traits.map((trait) => [trait.id, trait]));
    for (const [key, records] of [
      ['grails', catalog.grails],
      ['incompatibilities', catalog.incompatibilities],
    ] as const) {
      records.forEach((record, index) => {
        if (
          new Set(record.traitIds).size !== record.traitIds.length ||
          record.traitIds.some((id) => !traits.has(id))
        ) {
          context.addIssue({
            code: 'custom',
            message: 'References must identify distinct existing traits',
            path: [key, index, 'traitIds'],
          });
        }
      });
    }

    if (catalog.purpose === 'PRODUCTION' && catalog.traits.length === 0) {
      context.addIssue({
        code: 'custom',
        message: 'Production catalog cannot be empty',
        path: ['traits'],
      });
    }
  });

// Recording a seed is necessary but insufficient for determinism. All inputs,
// ordering, algorithms, and render dependencies must eventually be fixed too.
export const generationRecipeSchema = z.strictObject({
  schemaVersion: z.literal(1),
  seedHex: sha256Schema,
  generatorVersion: z.string().trim().min(1),
  sourceCommit: z.string().regex(/^[a-f0-9]{40}$/),
  prngAlgorithm: z.string().trim().min(1),
  orderingVersion: z.string().trim().min(1),
  rendererVersion: z.string().trim().min(1),
  collectionConfigSha256: sha256Schema,
  catalogSha256: sha256Schema,
  assetsManifestSha256: sha256Schema,
  expectedOutputCount: z.number().int().positive().max(Number.MAX_SAFE_INTEGER),
});

export const specimenRecordSchema = z.strictObject({
  // Internal zero-based generation index; contract token-ID convention is TBD.
  index: z.number().int().nonnegative(),
  traitIds: z.array(identifierSchema),
  grailId: identifierSchema.optional(),
  art: z.strictObject({ path: relativePathSchema, sha256: sha256Schema }),
  metadata: z.strictObject({ path: relativePathSchema, sha256: sha256Schema }),
});

export const provenanceManifestSchema = z
  .strictObject({
    schemaVersion: z.literal(1),
    recipe: generationRecipeSchema,
    outputs: z.array(specimenRecordSchema),
  })
  .superRefine((manifest, context) => {
    const indices = new Set(manifest.outputs.map((output) => output.index));
    if (
      manifest.outputs.length !== manifest.recipe.expectedOutputCount ||
      indices.size !== manifest.outputs.length ||
      manifest.outputs.some(
        (output) => output.index >= manifest.recipe.expectedOutputCount,
      )
    ) {
      context.addIssue({
        code: 'custom',
        message: 'Outputs must cover every generation index exactly once',
        path: ['outputs'],
      });
    }
    const paths = manifest.outputs.flatMap((output) => [
      output.art.path,
      output.metadata.path,
    ]);
    if (new Set(paths).size !== paths.length) {
      context.addIssue({
        code: 'custom',
        message: 'Output file paths must be unique',
        path: ['outputs'],
      });
    }
  });

export type TraitCategory = z.infer<typeof traitCategorySchema>;
export type Trait = z.infer<typeof traitSchema>;
export type TraitCatalog = z.infer<typeof traitCatalogSchema>;
export type GenerationRecipe = z.infer<typeof generationRecipeSchema>;
export type SpecimenRecord = z.infer<typeof specimenRecordSchema>;
export type ProvenanceManifest = z.infer<typeof provenanceManifestSchema>;
