import { collectionConfigSchema } from '@lammb/schema/collection';

// The only executable source of canonical collection constants.
export const collection = Object.freeze(
  collectionConfigSchema.parse({
    name: 'LAMMB',
    symbol: 'LAMMB',
    supply: 5280,
    chainId: 4663,
    mintPriceWei: 0n,
    domain: 'lammb.fun',
    chainName: 'Robinhood Chain',
    marketplaceTarget: 'OpenSea',
    revealModel: 'delayed',
  }),
);
