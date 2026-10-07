import { z } from 'zod';
import {
  identifierSchema,
  relativePathSchema,
  sha256Schema,
  traitCategorySchema,
} from './schema.ts';

const purpose = z.enum(['DEVELOPMENT_ONLY', 'PRODUCTION']);
const ids = z.array(identifierSchema).max(2048);
export const dimensionsSchema = z.strictObject({
  width: z.number().int().positive().max(32768),
  height: z.number().int().positive().max(32768),
});
export const rendererDescriptorSchema = z.strictObject({
  id: identifierSchema,
  version: z
    .string()
    .regex(/^[0-9]+\.[0-9]+\.[0-9]+$/)
    .max(48),
});
export const placementSchema = z.strictObject({
  // Top-left source origin in the target reference frame. No implicit anchor.
  mode: z.enum(['FULL_FRAME', 'POSITIONED']),
  x: z.number().int().min(0).max(32768),
  y: z.number().int().min(0).max(32768),
  scaling: z.discriminatedUnion('mode', [
    z.strictObject({ mode: z.literal('NONE') }),
    z.strictObject({
      mode: z.literal('EXPLICIT'),
      target: dimensionsSchema,
      sampling: z.enum(['NEAREST', 'BILINEAR']),
    }),
  ]),
});
export const visualAssetSchema = z.strictObject({
  id: identifierSchema,
  category: traitCategorySchema,
  path: relativePathSchema,
  sha256: sha256Schema,
  purpose,
  state: z.enum(['DRAFT', 'REVIEW', 'APPROVED', 'RETIRED']),
  dimensions: dimensionsSchema,
  mediaType: z.enum(['image/png', 'image/svg+xml', 'text/plain']),
  alpha: z.strictObject({
    capability: z.enum(['NONE', 'SUPPORTED']),
    policy: z.enum(['REQUIRED', 'ALLOWED', 'FORBIDDEN']),
  }),
  colorProfile: z.enum(['SRGB', 'NONE']),
  composition: z.strictObject({
    role: z.enum(['LAYER', 'SCENE', 'EFFECT', 'REFERENCE']),
    order: z.number().int().min(0).max(100000),
    slot: identifierSchema,
    referenceFrame: identifierSchema,
    placement: placementSchema,
    blend: z.literal('SOURCE_OVER'),
  }),
  compatibilityTags: ids,
  requiresTags: ids,
  rendererRequirements: z.array(rendererDescriptorSchema).max(32),
});
export const artManifestSchema = z.strictObject({
  schemaVersion: z.literal(2),
  purpose,
  referenceFrames: z
    .array(
      z.strictObject({ id: identifierSchema, dimensions: dimensionsSchema }),
    )
    .min(1)
    .max(128),
  assets: z.array(visualAssetSchema).min(1).max(4096),
});
export const approvalManifestSchema = z.strictObject({
  schemaVersion: z.literal(1),
  purpose,
  // Local review declarations only. These records do not authenticate an authority.
  records: z
    .array(
      z.strictObject({
        assetId: identifierSchema,
        sha256: sha256Schema,
        state: z.enum(['DRAFT', 'REVIEW', 'APPROVED', 'RETIRED']),
        reviewReference: identifierSchema,
      }),
    )
    .max(4096),
});
export const planRequestSchema = z.strictObject({
  schemaVersion: z.literal(1),
  purpose,
  referenceFrame: identifierSchema,
  canvas: dimensionsSchema,
  renderer: rendererDescriptorSchema,
  output: z.strictObject({
    mediaType: z.enum(['text/plain', 'image/png']),
    colorProfile: z.literal('SRGB'),
    alpha: z.enum(['REQUIRED', 'ALLOWED', 'FORBIDDEN']),
  }),
  // Curated overrides are keyed by grail. Every source is ingested and approved.
  grailCompositions: z
    .array(z.strictObject({ grailId: identifierSchema, assetIds: ids.min(1) }))
    .max(128),
});
export type ArtManifest = z.infer<typeof artManifestSchema>;
export type ApprovalManifest = z.infer<typeof approvalManifestSchema>;
export type PlanRequest = z.infer<typeof planRequestSchema>;
