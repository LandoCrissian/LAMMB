import { z } from 'zod';

// Vocabulary only. No allocations, wallet lists, proofs, or access decisions.
export const accessGroupSchema = z.enum(['PARTNER_GTD', 'ALLOWLIST', 'PUBLIC']);

export type AccessGroup = z.infer<typeof accessGroupSchema>;
