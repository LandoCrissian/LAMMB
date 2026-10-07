import { z } from 'zod';
import { collection } from '@lammb/collection/config';
import {
  generationRecipeSchema,
  identifierSchema,
  relativePathSchema,
  sha256Schema,
  traitCategorySchema,
} from './schema.ts';
import {
  CANONICAL_VERSION,
  ENGINE_VERSION,
  ORDERING_VERSION,
  PRNG_VERSION,
  RENDERER_VERSION,
  SEED_DERIVATION_VERSION,
} from './versions.ts';

export const purposeSchema = z.enum(['DEVELOPMENT_ONLY', 'PRODUCTION']);
export const corruptionLevelSchema = z.enum([
  'NONE',
  'TOUCH',
  'BLEED',
  'FRACTURE',
  'GLITCHED',
  'REALITY_FAILURE',
]);
const ids = z.array(identifierSchema).max(2048);
const text = z
  .string()
  .trim()
  .min(1)
  .max(240)
  .refine(
    (value) => !/[\u0000-\u001f\u007f]/.test(value),
    'Control characters are forbidden',
  );

export const assetManifestSchema = z.strictObject({
  schemaVersion: z.literal(1),
  purpose: purposeSchema,
  assets: z
    .array(
      z.strictObject({
        id: identifierSchema,
        category: traitCategorySchema,
        path: relativePathSchema,
        sha256: sha256Schema,
        purpose: purposeSchema,
        dimensions: z
          .strictObject({
            width: z.number().int().positive().max(32768),
            height: z.number().int().positive().max(32768),
          })
          .optional(),
        composition: z.strictObject({
          role: z.enum(['LAYER', 'SCENE', 'EFFECT', 'REFERENCE']),
          order: z.number().int().min(0).max(100000),
          slot: identifierSchema,
        }),
        compatibilityTags: ids,
      }),
    )
    .min(1)
    .max(4096),
});

const categoryConstraint = z.strictObject({
  category: traitCategorySchema,
  allowedTraitIds: ids.min(1),
  replacementAssetIds: ids.min(1).nullable(),
});

export const engineTraitSchema = z.strictObject({
  id: identifierSchema,
  category: traitCategorySchema,
  label: text,
  assetIds: ids.min(1),
  frequency: z.strictObject({
    weight: z.number().int().min(1).max(1000000),
    plannedCount: z.number().int().min(0).max(collection.supply).optional(),
  }),
  tags: ids,
  requiresTraitIds: ids,
  incompatibleTraitIds: ids,
  requiresTags: ids,
  excludesTags: ids,
  identityAffecting: z.boolean(),
  publicMetadata: z.boolean(),
  displayOrder: z.number().int().min(0).max(100000),
  mutation: z
    .strictObject({
      categoryEffects: z.array(categoryConstraint).min(1).max(9),
    })
    .optional(),
  corruption: z.strictObject({ level: corruptionLevelSchema }).optional(),
  scene: z
    .strictObject({
      constraints: z.array(categoryConstraint).max(9),
      compositionReference: identifierSchema,
    })
    .optional(),
});

const ruleBase = { id: identifierSchema, reason: text };
export const compatibilityRuleSchema = z.discriminatedUnion('type', [
  z.strictObject({
    ...ruleBase,
    type: z.literal('INCOMPATIBLE'),
    traitIds: ids.min(2),
  }),
  z.strictObject({
    ...ruleBase,
    type: z.literal('REQUIRES'),
    whenTraitId: identifierSchema,
    requiredTraitIds: ids.min(1),
  }),
  z.strictObject({
    ...ruleBase,
    type: z.literal('EXCLUDES_TAG'),
    whenTraitId: identifierSchema,
    tag: identifierSchema,
  }),
  z.strictObject({
    ...ruleBase,
    type: z.literal('REQUIRES_TAG'),
    whenTraitId: identifierSchema,
    tag: identifierSchema,
  }),
]);

export const engineCatalogSchema = z.strictObject({
  schemaVersion: z.literal(2),
  purpose: purposeSchema,
  // Explicit current constructor policy, not a locked production cardinality.
  categories: z
    .array(
      z.strictObject({
        category: traitCategorySchema,
        selectionCount: z.literal(1),
      }),
    )
    .length(traitCategorySchema.options.length),
  plannedCountScope: z.literal('ORDINARY_ONLY'),
  traits: z.array(engineTraitSchema).min(1).max(2048),
  rules: z.array(compatibilityRuleSchema).max(2048),
  grails: z
    .array(
      z.strictObject({
        id: identifierSchema,
        label: text,
        frequencyScope: z.literal('EXCLUDE_FROM_ORDINARY'),
        reservations: z
          .array(
            z.strictObject({
              index: z
                .number()
                .int()
                .min(0)
                .max(collection.supply - 1),
              traitIds: ids.min(1),
            }),
          )
          .min(1)
          .max(collection.supply),
      }),
    )
    .max(128),
});

export const engineRequestSchema = z.strictObject({
  schemaVersion: z.literal(1),
  seedHex: sha256Schema,
  sourceReference: z
    .string()
    .regex(/^(?:[a-f0-9]{40}|urn:[a-z0-9-]+:[a-zA-Z0-9:._/-]+)$/)
    .max(240),
  outputCount: z.number().int().min(1).max(collection.supply),
  maxAttemptsPerSpecimen: z.number().int().min(1).max(10000),
  maxTotalAttempts: z.number().int().min(1).max(5000000),
});

export const constructionRecipeSchema = generationRecipeSchema
  .omit({ schemaVersion: true, sourceCommit: true })
  .extend({
    schemaVersion: z.literal(2),
    sourceReference: engineRequestSchema.shape.sourceReference,
    generatorVersion: z.literal(ENGINE_VERSION),
    prngAlgorithm: z.literal(PRNG_VERSION),
    orderingVersion: z.literal(ORDERING_VERSION),
    canonicalVersion: z.literal(CANONICAL_VERSION),
    rendererVersion: z.literal(RENDERER_VERSION),
    seedDerivationVersion: z.literal(SEED_DERIVATION_VERSION),
    expectedOutputCount: engineRequestSchema.shape.outputCount,
    maxAttemptsPerSpecimen: engineRequestSchema.shape.maxAttemptsPerSpecimen,
    maxTotalAttempts: engineRequestSchema.shape.maxTotalAttempts,
  });

export const logicalSpecimenSchema = z.strictObject({
  index: z
    .number()
    .int()
    .min(0)
    .max(collection.supply - 1),
  grailId: identifierSchema.nullable(),
  traitIds: ids.min(1),
  composition: z
    .array(
      z.strictObject({
        category: traitCategorySchema,
        traitId: identifierSchema,
        assetIds: ids.min(1),
        modifierTraitIds: ids,
      }),
    )
    .length(traitCategorySchema.options.length),
  corruptionLevel: corruptionLevelSchema,
  fingerprint: sha256Schema,
});

export const constructionProvenanceSchema = z.strictObject({
  schemaVersion: z.literal(2),
  purpose: purposeSchema,
  recipe: constructionRecipeSchema,
  logicalCollectionSha256: sha256Schema,
  publicMetadataSha256: sha256Schema,
  outputs: z
    .array(
      z.strictObject({
        index: z.number().int().min(0),
        fingerprint: sha256Schema,
        logicalSha256: sha256Schema,
        metadataSha256: sha256Schema,
        usedAssetIds: ids.min(1),
      }),
    )
    .max(collection.supply),
});

const descriptor = z.strictObject({ label: text, value: text });
export const developmentMetadataSchema = z.strictObject({
  schemaVersion: z.literal(1),
  purpose: purposeSchema,
  specimenIdentifier: text,
  name: text,
  imageReference: z
    .string()
    .regex(/^urn:lammb:(?:development|construction):logical:[a-f0-9]{64}$/),
  publicTraits: z.array(descriptor).max(9),
  mutation: descriptor.optional(),
  pixelCorruption: descriptor.optional(),
  environment: descriptor.optional(),
  provenanceReference: z
    .string()
    .regex(/^urn:lammb:(?:development|construction):provenance:[a-f0-9]{64}$/),
});

const count = z.number().int().min(0).max(collection.supply);
const attempts = z.number().int().min(0).max(5000000);
export const engineArtifactsSchema = z
  .strictObject({
    logicalCollection: z.strictObject({
      schemaVersion: z.literal(2),
      purpose: purposeSchema,
      recipe: constructionRecipeSchema,
      specimens: z.array(logicalSpecimenSchema).max(collection.supply),
    }),
    publicMetadata: z.strictObject({
      schemaVersion: z.literal(1),
      purpose: purposeSchema,
      specimens: z.array(developmentMetadataSchema).max(collection.supply),
    }),
    provenance: constructionProvenanceSchema,
    summary: z.strictObject({
      schemaVersion: z.literal(1),
      purpose: purposeSchema,
      requestedSpecimens: count,
      generatedSpecimens: count,
      uniqueFingerprints: count,
      grailCount: count,
      mutationCount: count,
      categoryFrequencies: z.record(
        traitCategorySchema,
        z.record(identifierSchema, count),
      ),
      ordinaryTraitFrequencies: z.record(identifierSchema, count),
      corruptionCounts: z.record(corruptionLevelSchema, count),
      rejectionCounts: z.record(z.string().max(400), attempts),
      attemptStatistics: z.strictObject({
        totalCandidates: attempts,
        rejectedCandidates: attempts,
        ordinaryAccepted: count,
        grailReservations: count,
        maxSpecimenAttempts: attempts,
        perSpecimenAttempts: z.array(attempts).max(collection.supply),
      }),
      catalogSha256: sha256Schema,
      assetManifestSha256: sha256Schema,
      logicalCollectionSha256: sha256Schema,
      publicMetadataSha256: sha256Schema,
    }),
  })
  .superRefine((artifacts, context) => {
    const expected = artifacts.logicalCollection.recipe.expectedOutputCount;
    if (
      artifacts.logicalCollection.specimens.length !== expected ||
      artifacts.publicMetadata.specimens.length !== expected ||
      artifacts.provenance.outputs.length !== expected ||
      artifacts.summary.attemptStatistics.perSpecimenAttempts.length !==
        expected ||
      artifacts.logicalCollection.specimens.some(
        (specimen, index) => specimen.index !== index,
      ) ||
      artifacts.provenance.outputs.some(
        (output, index) => output.index !== index,
      ) ||
      new Set(
        artifacts.logicalCollection.specimens.map(
          (specimen) => specimen.fingerprint,
        ),
      ).size !== expected
    ) {
      context.addIssue({
        code: 'custom',
        message: 'Artifacts require complete ordered unique specimen coverage',
      });
    }
  });

export type EngineCatalog = z.infer<typeof engineCatalogSchema>;
export type EngineTrait = z.infer<typeof engineTraitSchema>;
export type AssetManifest = z.infer<typeof assetManifestSchema>;
export type EngineRequest = z.infer<typeof engineRequestSchema>;
export type DevelopmentMetadata = z.infer<typeof developmentMetadataSchema>;
