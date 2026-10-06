import { z } from 'zod';

export const collectionConfigSchema = z.strictObject({
  name: z.string().trim().min(1),
  symbol: z.string().regex(/^[A-Z0-9]+$/),
  supply: z.number().int().positive().max(Number.MAX_SAFE_INTEGER),
  chainId: z.number().int().positive().max(Number.MAX_SAFE_INTEGER),
  mintPriceWei: z.bigint().nonnegative(),
  domain: z.string().regex(/^(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,}$/),
  chainName: z.string().trim().min(1),
  marketplaceTarget: z.string().trim().min(1),
  revealModel: z.literal('delayed'),
});

export type CollectionConfig = z.infer<typeof collectionConfigSchema>;
