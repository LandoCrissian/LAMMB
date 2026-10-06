import { traitCatalogSchema } from '../src/schema';

// Intentionally empty. These are neither approved traits nor collection output.
export const developmentCatalog = traitCatalogSchema.parse({
  schemaVersion: 1,
  purpose: 'DEVELOPMENT_ONLY',
  traits: [],
  grails: [],
  incompatibilities: [],
});
