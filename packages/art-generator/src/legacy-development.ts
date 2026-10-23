import { collection } from '@lammb/collection/config';

// Frozen v1 development protocol only: preserve pinned Trait Bible simulations,
// source approvals and golden construction bytes. Never a Genesis mint capacity.
export const archivedDevelopmentSupply = 5280;
export const archivedDevelopmentCollection = Object.freeze({
  ...collection,
  supply: archivedDevelopmentSupply,
});
