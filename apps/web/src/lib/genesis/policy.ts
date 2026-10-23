export const GENESIS = Object.freeze({
  supply: 720,
  chainId: 4663,
  collectionUrl: 'https://opensea.io/collection/lammbs',
  price: 'FREE · network gas applies',
  reveal: 'Delayed reveal',
});

export const stages = [
  {
    id: 'FOUNDER',
    name: 'Founder',
    allocation: 48,
    limit: 48,
    access:
      'Private founder allocation. Owner-verified wallet only. No public signup.',
  },
  {
    id: 'GTD',
    name: 'Guaranteed access',
    allocation: 392,
    limit: 5,
    access:
      'Verified partner holders and individually approved wallets. Partner selection is pending owner approval.',
  },
  {
    id: 'WL',
    name: 'Whitelist',
    allocation: 160,
    limit: 2,
    access:
      'Apply for consideration. An application is not an approval or a reserved mint.',
  },
  {
    id: 'PUBLIC',
    name: 'Public',
    allocation: 120,
    limit: 1,
    access:
      'No registration. Mint on OpenSea when the public stage is verified live, subject to remaining supply.',
  },
] as const;
export type Stage = (typeof stages)[number]['id'];

// These are approved allocation TARGETS, not a claim about configured on-chain caps.
// No schedule, partner endorsement, live stage or mint activation is authorized here.
export const release = Object.freeze({
  mintEnabled: false,
  verifiedOpeningTimes: null,
  approvedPublicPartners: [] as readonly string[],
});
