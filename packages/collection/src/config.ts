import { collectionConfigSchema } from '@lammb/schema/collection';

// Canonical Genesis mint cap. 5280 remains a heritage/altitude brand, never token supply.
export const collection = Object.freeze(
  collectionConfigSchema.parse({
    name: 'LAMMB',
    symbol: 'LAMMB',
    supply: 720,
    chainId: 4663,
    mintPriceWei: 0n,
    domain: 'lammb.fun',
    chainName: 'Robinhood Chain',
    marketplaceTarget: 'OpenSea',
    revealModel: 'delayed',
  }),
);
