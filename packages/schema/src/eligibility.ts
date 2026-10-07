import { z } from 'zod';
import { publicReferenceSchema, publicTextSchema } from './public-reference';

// Vocabulary only. No allocations, wallet lists, proofs, or access decisions.
export const accessGroupSchema = z.enum(['PARTNER_GTD', 'ALLOWLIST', 'PUBLIC']);

export type AccessGroup = z.infer<typeof accessGroupSchema>;

export const partnerDeclarationSchema = z
  .strictObject({
    version: z.literal('1'),
    environment: z.literal('DEVELOPMENT_ONLY'),
    accessGroup: z.literal('PARTNER_GTD'),
    partnerId: z.string().regex(/^dev-[a-z0-9][a-z0-9-]{0,75}$/),
    displayName: publicTextSchema,
    projectIdentifier: publicReferenceSchema,
    chain: z.strictObject({
      name: publicTextSchema,
      chainId: z.number().int().positive().max(Number.MAX_SAFE_INTEGER),
    }),
    eligibilitySourceType: z.enum([
      'PROJECT_DECLARATION',
      'SNAPSHOT_REFERENCE',
      'FUTURE_OWNERSHIP_CHECK',
    ]),
    snapshot: z.discriminatedUnion('status', [
      z.strictObject({ status: z.literal('UNRESOLVED') }),
      z.strictObject({
        status: z.literal('DECLARED'),
        policyReference: publicReferenceSchema,
        snapshotReference: publicReferenceSchema,
      }),
    ]),
    status: z.enum(['PROPOSED', 'UNDER_REVIEW', 'DISABLED']),
    visualAssetReference: publicReferenceSchema.optional(),
  })
  .refine(
    (partner) =>
      partner.eligibilitySourceType !== 'SNAPSHOT_REFERENCE' ||
      partner.snapshot.status === 'DECLARED',
    {
      path: ['snapshot'],
      message: 'Snapshot sources require policy and snapshot references',
    },
  );

export type PartnerDeclaration = z.infer<typeof partnerDeclarationSchema>;
