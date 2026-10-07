import { z } from 'zod';
import { fixtureAuthoritySchema } from './authority';
import { publicReferenceSchema, publicTextSchema } from './public-reference';

const publicTraitSchema = z.strictObject({
  label: publicTextSchema,
  value: publicTextSchema,
});

// This is an allowlist of public fields, never a projection of an internal recipe.
export const shareCardSchema = z.strictObject({
  version: z.literal('1'),
  dataAuthority: fixtureAuthoritySchema,
  scope: z.literal('PUBLIC_REVEALED'),
  tokenIdentifier: publicTextSchema,
  lammbNameOrNumber: publicTextSchema,
  imageReference: publicReferenceSchema,
  selectedPublicTraits: z.array(publicTraitSchema).max(32),
  mutation: publicTraitSchema.optional(),
  pixelCorruption: publicTraitSchema.optional(),
  environment: publicTraitSchema.optional(),
  provenanceReference: publicReferenceSchema,
});

export type ShareCard = z.infer<typeof shareCardSchema>;
