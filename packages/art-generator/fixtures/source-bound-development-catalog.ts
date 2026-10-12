import input from './stage31c-approved-source-catalog.json' with { type: 'json' };
import { approvedSourceCatalogSchema } from '../tooling/approved-source-traits.ts';

// Schema-valid, unweighted source records. Recipe resolution additionally
// validates the pinned owner history, spec, proposal and exact source context.
export const sourceBoundDevelopmentCatalog =
  approvedSourceCatalogSchema.parse(input);
