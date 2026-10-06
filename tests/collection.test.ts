import { describe, expect, it } from 'vitest';
import { collectionConfigSchema } from '@lammb/schema/collection';
import { collection } from '@lammb/collection/config';
import { robinhoodChain } from '@lammb/collection/network';

describe('canonical collection configuration', () => {
  it('preserves the approved facts and exact integer price', () => {
    expect(collection).toMatchObject({
      name: 'LAMMB',
      symbol: 'LAMMB',
      supply: 5280,
      chainId: 4663,
      mintPriceWei: 0n,
      domain: 'lammb.fun',
    });
    expect(Object.isFrozen(collection)).toBe(true);
    expect(robinhoodChain.chainId).toBe(collection.chainId);
    expect(robinhoodChain.name).toBe(collection.chainName);
    expect(robinhoodChain).not.toHaveProperty('rpcUrl');
  });

  it.each([
    { supply: 0 },
    { supply: 1.5 },
    { supply: Number.MAX_SAFE_INTEGER + 1 },
    { chainId: -1 },
    { mintPriceWei: -1n },
    { mintPriceWei: 0 },
    { domain: 'https://lammb.fun' },
    { domain: 'localhost' },
    { secret: 'unexpected-field' },
  ])('rejects invalid configuration %o', (override) => {
    expect(
      collectionConfigSchema.safeParse({ ...collection, ...override }).success,
    ).toBe(false);
  });
});
