import { createLaunchSnapshotSchema } from '@lammb/schema/launch';
import { collection } from './config';

export const launchSnapshotSchema = createLaunchSnapshotSchema(
  collection.supply,
);

export const ascentMilestones = {
  dataAuthority: 'STATIC_CANONICAL',
  value: [
    { id: 'GROUND', altitudeFt: 0 },
    { id: 'HALFWAY', altitudeFt: collection.supply / 2 },
    { id: 'ONE_FOOT_LEFT', altitudeFt: collection.supply - 1 },
    { id: 'LAUNCH', altitudeFt: collection.supply },
  ],
} as const;

// Narrative markers only: they do not authorize state changes or imply sellout.
export const recoveryMilestones = Object.freeze([
  1000,
  collection.supply / 2,
  4000,
  5000,
  collection.supply - 1,
  collection.supply,
]);
