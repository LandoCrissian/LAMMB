import { z } from 'zod';

export const launchStateSchema = z.enum([
  'PRE_ASCENT',
  'ASCENT',
  'MINT',
  'RECOVERY',
  'BLACKOUT',
  'REVEAL',
  'REVEALED',
]);

export type LaunchState = z.infer<typeof launchStateSchema>;

// A storage boundary for future deliberate changes, not a transition engine.
export const launchStateChangeSchema = z
  .strictObject({
    id: z.uuid(),
    revision: z.number().int().positive(),
    from: launchStateSchema,
    to: launchStateSchema,
    changedAt: z.iso.datetime(),
    actorRef: z.string().trim().min(1),
    reason: z.string().trim().min(1),
  })
  .refine((change) => change.from !== change.to, {
    message: 'A state change must change state',
    path: ['to'],
  });

export type LaunchStateChange = z.infer<typeof launchStateChangeSchema>;
