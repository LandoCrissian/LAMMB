import { createLaunchSnapshotSchema } from '@lammb/schema/launch';
import { collection } from './config';

export const launchSnapshotSchema = createLaunchSnapshotSchema(collection.supply);

// The 5280 Ascent is a Mile High narrative, not a token-supply counter.
export const ascentMilestones = {
  dataAuthority: 'STATIC_CANONICAL',
  value: [
    { id: 'GROUND', altitudeFt: 0 },
    { id: 'HALFWAY', altitudeFt: 2640 },
    { id: 'ONE_FOOT_LEFT', altitudeFt: 5279 },
    { id: 'LAUNCH', altitudeFt: 5280 },
  ],
} as const;

// Supply-based narrative markers; never imply minted supply or sellout.
export const recoveryMilestones = Object.freeze([
  0,
  Math.floor(collection.supply / 2),
  collection.supply - 1,
  collection.supply,
]);
