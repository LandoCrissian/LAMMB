import { collection } from '@lammb/collection/config';
import {
  ascentMilestones,
  launchSnapshotSchema,
} from '@lammb/collection/launch';
import type { LaunchState, LaunchSnapshot } from '@lammb/schema/launch';

const dataAuthority = {
  kind: 'DEVELOPMENT_FIXTURE',
  fixtureId: 'task-002-launch-study',
} as const;
const collector = { version: '1', context: 'UNOWNED_PRESENTATION' } as const;
const common = { version: '1', dataAuthority } as const;

// Source-reviewed, static studies. No query/env/storage override or state writer.
export const developmentLaunchSnapshots: Readonly<
  Record<LaunchState, LaunchSnapshot>
> = Object.freeze({
  PRE_ASCENT: launchSnapshotSchema.parse({
    ...common,
    state: 'PRE_ASCENT',
    collector: { ...collector, state: 'sealed' },
    currentAltitudeFt: { value: 0, dataAuthority: 'STATIC_CANONICAL' },
    milestones: ascentMilestones,
  }),
  ASCENT: launchSnapshotSchema.parse({
    ...common,
    state: 'ASCENT',
    collector: { ...collector, state: 'sealed' },
    currentAltitudeFt: { value: collection.supply - 1, dataAuthority },
    milestones: ascentMilestones,
    milestoneHistory: {
      dataAuthority,
      value: [
        { milestoneId: 'GROUND', reachedAt: '2026-01-01T00:00:00Z' },
        { milestoneId: 'HALFWAY', reachedAt: '2026-01-02T00:00:00Z' },
        { milestoneId: 'ONE_FOOT_LEFT', reachedAt: '2026-01-03T00:00:00Z' },
      ],
    },
  }),
  MINT: launchSnapshotSchema.parse({
    ...common,
    state: 'MINT',
    collector: { ...collector, state: 'sealed' },
    currentAltitudeFt: {
      value: collection.supply,
      dataAuthority: 'STATIC_CANONICAL',
    },
    mintIntegration: 'NOT_CONNECTED',
    specimen: 'SEALED_SPECIMEN',
  }),
  RECOVERY: launchSnapshotSchema.parse({
    ...common,
    state: 'RECOVERY',
    collector: { ...collector, state: 'sealed' },
    recoveredCount: {
      value: null,
      dataAuthority: { kind: 'FUTURE_ONCHAIN', status: 'UNAVAILABLE' },
    },
    supply: { value: collection.supply, dataAuthority: 'STATIC_CANONICAL' },
  }),
  BLACKOUT: launchSnapshotSchema.parse({
    ...common,
    state: 'BLACKOUT',
    collector: { ...collector, state: 'blackout' },
    message: {
      version: '1',
      text: 'The specimens remain sealed. Hold the silence.',
    },
  }),
  REVEAL: launchSnapshotSchema.parse({
    ...common,
    state: 'REVEAL',
    collector: { ...collector, state: 'ready_to_reveal' },
    availability: 'PRESENTATION_ONLY',
    presentation: {
      version: '1',
      title: 'BREAK THE SEAL.',
      detail:
        'The intended passage from sealed specimen to LAMMB. Ownership and reveal actions are not connected in this development presentation.',
    },
  }),
  REVEALED: launchSnapshotSchema.parse({
    ...common,
    state: 'REVEALED',
    collector: { ...collector, state: 'revealed' },
    collectionPresentationStatus: 'PLACEHOLDERS_ONLY',
    publicTraitsStatus: 'UNAVAILABLE',
    shareCardStatus: 'SCHEMA_ONLY',
  }),
});
