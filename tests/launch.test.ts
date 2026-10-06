import { describe, expect, it } from 'vitest';
import {
  launchStateSchema,
  launchStateChangeSchema,
} from '@lammb/schema/launch';
import { accessGroupSchema } from '@lammb/schema/eligibility';
import { currentLaunchState } from '../apps/web/src/config/launch';

const change = {
  id: '4b4381d2-8bd5-4f30-a18c-8cf8fa641a31',
  revision: 1,
  from: 'PRE_ASCENT',
  to: 'ASCENT',
  changedAt: '2026-10-06T00:00:00Z',
  actorRef: 'development-reviewer',
  reason: 'Synthetic schema validation fixture only',
};

describe('launch state boundary', () => {
  it('starts at pre-ascent and accepts only the seven approved states', () => {
    expect(currentLaunchState).toBe('PRE_ASCENT');
    expect(launchStateSchema.options).toEqual([
      'PRE_ASCENT',
      'ASCENT',
      'MINT',
      'RECOVERY',
      'BLACKOUT',
      'REVEAL',
      'REVEALED',
    ]);
    expect(launchStateSchema.safeParse('AUTO_MINT').success).toBe(false);
  });

  it('requires attribution, reason, timestamp, and revision for a future audit record', () => {
    expect(launchStateChangeSchema.safeParse(change).success).toBe(true);
    for (const field of ['actorRef', 'reason', 'changedAt', 'revision']) {
      const incomplete: Record<string, unknown> = { ...change };
      delete incomplete[field];
      expect(launchStateChangeSchema.safeParse(incomplete).success).toBe(false);
    }
    expect(
      launchStateChangeSchema.safeParse({ ...change, to: change.from }).success,
    ).toBe(false);
  });

  it('defines access vocabulary without allocating supply', () => {
    expect(accessGroupSchema.options).toEqual([
      'PARTNER_GTD',
      'ALLOWLIST',
      'PUBLIC',
    ]);
    expect(accessGroupSchema.safeParse('SECRET_ALLOCATION').success).toBe(
      false,
    );
  });
});
