import { z } from 'zod';
import countryCodes from './data/country-codes.json';

export const countryCodeSchema = z
  .string()
  .refine(
    (value) => countryCodes.includes(value),
    'Expected an ISO 3166-1 alpha-2 code from the pinned catalog',
  );

export const atlasChainSchema = z.strictObject({
  id: z.literal(4663),
  name: z.literal('Robinhood Chain'),
});
export const countrySchema = z.strictObject({
  code: countryCodeSchema,
  name: z.string().min(1),
  boundaryAvailable: z.boolean(),
});
// Geographic ISO membership is validated against the separately versioned catalog.
export const tokenIdSchema = z
  .string()
  .regex(/^(0|[1-9][0-9]{0,77})$/)
  .refine(
    (value) =>
      value.length <= 78 &&
      /^[0-9]+$/.test(value) &&
      BigInt(value) < 2n ** 256n,
    'Token ID must fit uint256 without floating-point conversion',
  );
export const contractSchema = z.strictObject({
  chainId: z.literal(4663),
  address: z
    .string()
    .regex(/^0x[0-9a-fA-F]{40}$/)
    .refine((v) => !/^0x0{40}$/.test(v)),
  standard: z.enum(['ERC721', 'ERC1155']),
  verification: z.literal('VERIFIED'),
  evidenceRevision: z.string().min(1),
});
export const collectionSchema = z
  .strictObject({
    id: z.string().regex(/^[a-z0-9][a-z0-9-]{0,63}$/),
    name: z.string().min(1),
    role: z.enum(['FOUNDING', 'COMMUNITY']),
    admission: z.enum([
      'FOUNDING_PENDING',
      'CANDIDATE',
      'ADMITTED',
      'SUSPENDED',
    ]),
    contract: contractSchema.nullable(),
  })
  .superRefine((value, ctx) => {
    if (value.admission === 'ADMITTED' && !value.contract)
      ctx.addIssue({
        code: 'custom',
        message: 'Admission requires verified contract evidence',
        path: ['contract'],
      });
    if (
      ['CANDIDATE', 'FOUNDING_PENDING'].includes(value.admission) &&
      value.contract
    )
      ctx.addIssue({
        code: 'custom',
        message: 'Pending collections cannot claim a live contract',
        path: ['contract'],
      });
    if (value.admission === 'FOUNDING_PENDING' && value.role !== 'FOUNDING')
      ctx.addIssue({
        code: 'custom',
        message: 'Only the founding concept has founding status',
        path: ['role'],
      });
  });
export const collectionFilterSchema = z.discriminatedUnion('kind', [
  z.strictObject({ kind: z.literal('ALL_COMMUNITIES') }),
  z.strictObject({
    kind: z.literal('COLLECTION'),
    collectionId: z.string().min(1),
  }),
]);
export const registrationStatusSchema = z.enum([
  'UNAVAILABLE',
  'ACTIVE',
  'WITHDRAWN',
  'TRANSFER_STALE',
  'VERIFICATION_PENDING',
]);
export const fixtureParticipationSchema = z.strictObject({
  recordId: z.string().min(1),
  collectionId: z.string().min(1),
  tokenId: tokenIdSchema,
  countryCode: countryCodeSchema,
  status: registrationStatusSchema,
  publicDisplay: z.boolean(),
  // Quantity is explicit for ERC1155. It is not a count of people.
  quantity: tokenIdSchema.refine(
    (v) => v.length <= 78 && /^[0-9]+$/.test(v) && BigInt(v) > 0n,
  ),
});
export const participationViewSchema = z.discriminatedUnion('authority', [
  z.strictObject({
    authority: z.literal('UNAVAILABLE'),
    status: z.literal('REGISTRY_NOT_YET_LIVE'),
    records: z.null(),
  }),
  z.strictObject({
    authority: z.literal('DEVELOPMENT_FIXTURE'),
    fixtureId: z.string().min(1),
    records: z.array(fixtureParticipationSchema),
  }),
]);
export type AtlasChain = z.infer<typeof atlasChainSchema>;
export type AtlasCountry = z.infer<typeof countrySchema>;
export type AtlasCollection = z.infer<typeof collectionSchema>;
export type CollectionContract = z.infer<typeof contractSchema>;
export type TokenId = z.infer<typeof tokenIdSchema>;
export type CollectionFilter = z.infer<typeof collectionFilterSchema>;
export type RegistrationStatus = z.infer<typeof registrationStatusSchema>;
export type ParticipationView = z.infer<typeof participationViewSchema>;

// This is a typed frontend contract, not an authority/ownership validator.
export function filterParticipation(
  view: ParticipationView,
  collections: AtlasCollection[],
  countryCode: string,
  filter: CollectionFilter,
): ParticipationView {
  if (view.authority === 'UNAVAILABLE') return view;
  const admitted = new Set(
    collections.filter((c) => c.admission === 'ADMITTED').map((c) => c.id),
  );
  return {
    ...view,
    records: view.records.filter(
      (record) =>
        admitted.has(record.collectionId) &&
        record.countryCode === countryCode &&
        record.status === 'ACTIVE' &&
        record.publicDisplay &&
        (filter.kind === 'ALL_COMMUNITIES' ||
          record.collectionId === filter.collectionId),
    ),
  };
}
