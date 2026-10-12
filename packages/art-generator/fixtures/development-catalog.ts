import { traitCatalogSchema } from '../src/schema';

// Frequency-bearing legacy fixture remains empty. Source-specific owner
// approvals are exported separately without assigning generator weights.
export const developmentCatalog = traitCatalogSchema.parse({
  schemaVersion: 1,
  purpose: 'DEVELOPMENT_ONLY',
  traits: [],
  grails: [],
  incompatibilities: [],
});

export { sourceBoundDevelopmentCatalog } from './source-bound-development-catalog.ts';
