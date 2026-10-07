import { z } from 'zod';
import {
  canonicalDatumSchema,
  fixtureAuthoritySchema,
  pendingDatumSchema,
} from './authority';
import { publicTextSchema } from './public-reference';

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

export const collectorRevealStateSchema = z.enum([
  'sealed',
  'blackout',
  'ready_to_reveal',
  'revealing',
  'revealed',
]);

export const collectorRevealPresentationSchema = z.strictObject({
  version: z.literal('1'),
  state: collectorRevealStateSchema,
  context: z.literal('UNOWNED_PRESENTATION'),
});

export type CollectorRevealState = z.infer<typeof collectorRevealStateSchema>;

// Presentation compatibility only; this is not an approved transition matrix.
export const compatibleCollectorStates = {
  PRE_ASCENT: ['sealed'],
  ASCENT: ['sealed'],
  MINT: ['sealed'],
  RECOVERY: ['sealed'],
  BLACKOUT: ['blackout'],
  REVEAL: ['ready_to_reveal', 'revealing', 'revealed'],
  REVEALED: ['revealed'],
} satisfies Record<LaunchState, readonly CollectorRevealState[]>;

export const milestoneIdSchema = z.enum([
  'GROUND',
  'HALFWAY',
  'ONE_FOOT_LEFT',
  'LAUNCH',
]);

// Supply is injected by packages/collection: no duplicated collection constant.
export function createLaunchSnapshotSchema(supply: number) {
  if (!Number.isSafeInteger(supply) || supply < 4 || supply % 2 !== 0) {
    throw new Error('Ascent requires an even canonical supply');
  }
  const altitude = z
    .number()
    .int()
    .min(0)
    .max(supply - 1);
  const milestones = canonicalDatumSchema(
    z.tuple([
      z.strictObject({ id: z.literal('GROUND'), altitudeFt: z.literal(0) }),
      z.strictObject({
        id: z.literal('HALFWAY'),
        altitudeFt: z.literal(supply / 2),
      }),
      z.strictObject({
        id: z.literal('ONE_FOOT_LEFT'),
        altitudeFt: z.literal(supply - 1),
      }),
      z.strictObject({
        id: z.literal('LAUNCH'),
        altitudeFt: z.literal(supply),
      }),
    ]),
  );
  const common = {
    version: z.literal('1'),
    dataAuthority: fixtureAuthoritySchema,
    collector: collectorRevealPresentationSchema,
  };
  return z
    .discriminatedUnion('state', [
      z.strictObject({
        ...common,
        state: z.literal('PRE_ASCENT'),
        currentAltitudeFt: canonicalDatumSchema(z.literal(0)),
        milestones,
      }),
      z.strictObject({
        ...common,
        state: z.literal('ASCENT'),
        currentAltitudeFt: pendingDatumSchema(
          altitude,
          'FUTURE_SERVER_AUTHORITY',
        ),
        milestones,
        milestoneHistory: pendingDatumSchema(
          z.array(
            z.strictObject({
              milestoneId: milestoneIdSchema,
              reachedAt: z.iso.datetime(),
            }),
          ),
          'FUTURE_SERVER_AUTHORITY',
        ),
      }),
      z.strictObject({
        ...common,
        state: z.literal('MINT'),
        currentAltitudeFt: canonicalDatumSchema(z.literal(supply)),
        mintIntegration: z.literal('NOT_CONNECTED'),
        specimen: z.literal('SEALED_SPECIMEN'),
      }),
      z.strictObject({
        ...common,
        state: z.literal('RECOVERY'),
        recoveredCount: pendingDatumSchema(
          z.number().int().min(0).max(supply),
          'FUTURE_ONCHAIN',
        ),
        supply: canonicalDatumSchema(z.literal(supply)),
      }),
      z.strictObject({
        ...common,
        state: z.literal('BLACKOUT'),
        message: z.strictObject({
          version: z.literal('1'),
          text: publicTextSchema,
        }),
      }),
      z.strictObject({
        ...common,
        state: z.literal('REVEAL'),
        availability: z.literal('PRESENTATION_ONLY'),
        presentation: z.strictObject({
          version: z.literal('1'),
          title: publicTextSchema,
          detail: publicTextSchema,
        }),
      }),
      z.strictObject({
        ...common,
        state: z.literal('REVEALED'),
        collectionPresentationStatus: z.literal('PLACEHOLDERS_ONLY'),
        publicTraitsStatus: z.literal('UNAVAILABLE'),
        shareCardStatus: z.literal('SCHEMA_ONLY'),
      }),
    ])
    .superRefine((snapshot, context) => {
      const allowed: readonly CollectorRevealState[] =
        compatibleCollectorStates[snapshot.state];
      if (!allowed.includes(snapshot.collector.state)) {
        context.addIssue({
          code: 'custom',
          path: ['collector', 'state'],
          message: 'Collector presentation conflicts with global launch state',
        });
      }
      const dynamic =
        snapshot.state === 'ASCENT'
          ? [snapshot.currentAltitudeFt, snapshot.milestoneHistory]
          : snapshot.state === 'RECOVERY'
            ? [snapshot.recoveredCount]
            : [];
      for (const datum of dynamic) {
        if (
          datum.dataAuthority.kind === 'DEVELOPMENT_FIXTURE' &&
          datum.dataAuthority.fixtureId !== snapshot.dataAuthority.fixtureId
        ) {
          context.addIssue({
            code: 'custom',
            message: 'Fixture source must match snapshot authority',
          });
        }
      }
      if (snapshot.state !== 'ASCENT') return;
      const current = snapshot.currentAltitudeFt.value;
      const history = snapshot.milestoneHistory.value;
      if (current === null || history === null) {
        if (current !== null || history !== null) {
          context.addIssue({
            code: 'custom',
            message: 'Altitude and history must share availability',
          });
        }
        return;
      }
      const expected = snapshot.milestones.value.filter(
        (milestone) => milestone.altitudeFt <= current,
      );
      if (
        history.length !== expected.length ||
        history.some(
          (entry, index) => entry.milestoneId !== expected[index]?.id,
        ) ||
        history.some(
          (entry, index) =>
            index > 0 &&
            Date.parse(entry.reachedAt) <
              Date.parse(history[index - 1]!.reachedAt),
        )
      ) {
        context.addIssue({
          code: 'custom',
          path: ['milestoneHistory'],
          message:
            'History must contain reached milestones once, in canonical/time order',
        });
      }
    });
}

export type LaunchSnapshot = z.infer<
  ReturnType<typeof createLaunchSnapshotSchema>
>;
