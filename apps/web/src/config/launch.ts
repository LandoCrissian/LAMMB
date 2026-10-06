import { launchStateSchema } from '@lammb/schema/launch';

// Static foundation state, changed deliberately through reviewed source only.
// Replace with an authorized, audited state source in a future task.
export const currentLaunchState = launchStateSchema.parse('PRE_ASCENT');
