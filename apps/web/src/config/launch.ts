import { developmentLaunchSnapshots } from './development-launch';

// Static foundation state, changed deliberately through reviewed source only.
// Replace with an authorized, audited state source in a future task.
export const currentLaunchSnapshot = developmentLaunchSnapshots.PRE_ASCENT;
export const currentLaunchState = currentLaunchSnapshot.state;
