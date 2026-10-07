import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { collection } from '@lammb/collection/config';
import { launchSnapshotSchema } from '@lammb/collection/launch';
import { createLaunchPresentation } from '@lammb/collection/presentation';
import {
  collectorRevealPresentationSchema,
  collectorRevealStateSchema,
  launchStateSchema,
} from '@lammb/schema/launch';
import { developmentLaunchSnapshots as fixtures } from '../apps/web/src/config/development-launch';
import { LaunchStatus } from '../apps/web/src/components/launch-status';

const fixtureAuthority = fixtures.ASCENT.dataAuthority;
const ascent = fixtures.ASCENT;
const recovery = fixtures.RECOVERY;

function atAltitude(value: number) {
  if (ascent.state !== 'ASCENT') throw new Error('Invalid test fixture');
  return {
    ...ascent,
    currentAltitudeFt: { value, dataAuthority: fixtureAuthority },
    milestoneHistory: {
      dataAuthority: fixtureAuthority,
      value: ascent.milestones.value
        .filter((milestone) => milestone.altitudeFt <= value)
        .map((milestone, index) => ({
          milestoneId: milestone.id,
          reachedAt: `2026-01-0${index + 1}T00:00:00Z`,
        })),
    },
  };
}

describe('validated launch presentations', () => {
  it.each(launchStateSchema.options)(
    'validates and renders %s with explicit development authority',
    (state) => {
      const presentation = createLaunchPresentation(fixtures[state]);
      expect(presentation.state).toBe(state);
      const html = renderToStaticMarkup(
        createElement(LaunchStatus, { presentation, id: state }),
      );
      expect(html).toContain('DEVELOPMENT / NOT LIVE');
      expect(html).toContain('no ownership verified');
      expect(html).toContain(`id="${state}-heading"`);
      expect(html).not.toMatch(/<button|<form|<img|<iframe/);
      expect(html).not.toContain('onClick');
      expect(
        launchSnapshotSchema.safeParse({
          ...fixtures[state],
          version: undefined,
        }).success,
      ).toBe(false);
      expect(
        launchSnapshotSchema.safeParse({
          ...fixtures[state],
          walletOwner: 'unapproved',
        }).success,
      ).toBe(false);
    },
  );

  it.each([-1, 0.5, 5280, 5281, NaN, Infinity])(
    'rejects invalid ascent altitude %s',
    (value) => {
      expect(launchSnapshotSchema.safeParse(atAltitude(value)).success).toBe(
        false,
      );
    },
  );

  it('binds halfway, the final pause and mint altitude to canonical supply', () => {
    const halfway = createLaunchPresentation(atAltitude(2640));
    expect(halfway.visual.kind).toBe('altitude');
    if (halfway.visual.kind !== 'altitude') throw new Error('Invalid view');
    expect(halfway.visual.percent).toBe(50);
    expect(
      halfway.visual.milestones.find((entry) => entry.id === 'HALFWAY'),
    ).toMatchObject({
      altitudeLabel: '2,640 FT',
      label: 'Halfway',
      reached: true,
    });
    expect(halfway.visual.nextMilestoneLabel).toBe('5,279 FT / ONE FOOT LEFT');
    const pause = createLaunchPresentation(atAltitude(5279));
    expect(pause.title).toBe('ONE FOOT LEFT.');
    if (pause.visual.kind !== 'altitude') throw new Error('Invalid view');
    expect(pause.visual.nextMilestoneLabel).toBe(
      '5,280 FT / Mint-launch altitude',
    );
    const mint = createLaunchPresentation(fixtures.MINT);
    expect(mint.visual).toMatchObject({
      kind: 'specimen',
      altitudeLabel: '5,280 FT',
    });
    expect(
      launchSnapshotSchema.safeParse({
        ...fixtures.MINT,
        currentAltitudeFt: { value: 5279, dataAuthority: 'STATIC_CANONICAL' },
      }).success,
    ).toBe(false);
    expect(launchSnapshotSchema.safeParse(atAltitude(0)).success).toBe(true);
  });

  it('rejects reordered or altered milestones and inconsistent milestone history', () => {
    if (ascent.state !== 'ASCENT') throw new Error('Invalid test fixture');
    expect(ascent.milestones.value.map((entry) => entry.altitudeFt)).toEqual([
      0, 2640, 5279, 5280,
    ]);
    for (const milestones of [
      [...ascent.milestones.value].reverse(),
      ascent.milestones.value.map((entry) =>
        entry.id === 'HALFWAY' ? { ...entry, altitudeFt: 2641 } : entry,
      ),
    ]) {
      expect(
        launchSnapshotSchema.safeParse({
          ...ascent,
          milestones: { ...ascent.milestones, value: milestones },
        }).success,
      ).toBe(false);
    }
    for (const history of [
      [],
      [...ascent.milestoneHistory.value!].reverse(),
      [...ascent.milestoneHistory.value!, ascent.milestoneHistory.value![0]],
    ]) {
      expect(
        launchSnapshotSchema.safeParse({
          ...ascent,
          milestoneHistory: { ...ascent.milestoneHistory, value: history },
        }).success,
      ).toBe(false);
    }
    const timeReversed = ascent.milestoneHistory.value!.map((entry, index) => ({
      ...entry,
      reachedAt: `2026-01-0${3 - index}T00:00:00Z`,
    }));
    expect(
      launchSnapshotSchema.safeParse({
        ...ascent,
        milestoneHistory: { ...ascent.milestoneHistory, value: timeReversed },
      }).success,
    ).toBe(false);
  });

  it.each([-1, 5281, 1.5])('rejects invalid recovered count %s', (value) => {
    expect(
      launchSnapshotSchema.safeParse({
        ...recovery,
        recoveredCount: { value, dataAuthority: fixtureAuthority },
      }).success,
    ).toBe(false);
  });

  it.each([0, 1000, 2640, 4000, 5000, 5279, 5280])(
    'accepts bounded fixture count %s without changing recovery state',
    (value) => {
      const view = createLaunchPresentation({
        ...recovery,
        recoveredCount: { value, dataAuthority: fixtureAuthority },
      });
      expect(view.state).toBe('RECOVERY');
      expect(view.visual).toMatchObject({
        kind: 'recovery',
        value,
        dataLabel: 'Development fixture / sample count / not onchain',
      });
    },
  );

  it('rejects authority relabeling and never turns unavailable onchain supply into zero', () => {
    const view = createLaunchPresentation(recovery);
    expect(view.visual).toMatchObject({
      kind: 'recovery',
      value: null,
      percent: null,
      valueLabel: '— / 5,280',
    });
    for (const dataAuthority of [
      { kind: 'FUTURE_ONCHAIN', status: 'UNAVAILABLE' },
      {
        kind: 'FUTURE_ONCHAIN',
        status: 'LIVE',
        fixtureId: fixtureAuthority.fixtureId,
      },
      'STATIC_CANONICAL',
      { kind: 'DEVELOPMENT_FIXTURE', fixtureId: 'different-fixture' },
    ]) {
      expect(
        launchSnapshotSchema.safeParse({
          ...recovery,
          recoveredCount: { value: 2640, dataAuthority },
        }).success,
      ).toBe(false);
    }
    expect(
      launchSnapshotSchema.safeParse({
        ...recovery,
        dataAuthority: { kind: 'FUTURE_ONCHAIN', status: 'UNAVAILABLE' },
      }).success,
    ).toBe(false);
    expect(
      launchSnapshotSchema.safeParse({
        ...recovery,
        supply: {
          value: collection.supply + 1,
          dataAuthority: 'STATIC_CANONICAL',
        },
      }).success,
    ).toBe(false);
  });

  it('supports unavailable altitude without inventing history or a next milestone', () => {
    const pending = {
      value: null,
      dataAuthority: { kind: 'FUTURE_SERVER_AUTHORITY', status: 'UNAVAILABLE' },
    };
    const input = {
      ...ascent,
      currentAltitudeFt: pending,
      milestoneHistory: pending,
    };
    expect(createLaunchPresentation(input).visual).toMatchObject({
      value: null,
      percent: null,
      nextMilestoneLabel: 'Awaiting authorized altitude data',
    });
    expect(
      launchSnapshotSchema.safeParse({
        ...input,
        milestoneHistory:
          ascent.state === 'ASCENT' ? ascent.milestoneHistory : undefined,
      }).success,
    ).toBe(false);
    expect(() => createLaunchPresentation({ state: 'ASCENT' })).toThrow();
  });

  it('validates all collector states and rejects conflicting global presentations', () => {
    for (const state of collectorRevealStateSchema.options) {
      expect(
        collectorRevealPresentationSchema.safeParse({
          version: '1',
          state,
          context: 'UNOWNED_PRESENTATION',
        }).success,
      ).toBe(true);
    }
    expect(
      collectorRevealPresentationSchema.safeParse({
        version: '1',
        state: 'owned',
        context: 'UNOWNED_PRESENTATION',
      }).success,
    ).toBe(false);
    for (const state of ['ready_to_reveal', 'revealing', 'revealed']) {
      expect(
        launchSnapshotSchema.safeParse({
          ...fixtures.REVEAL,
          collector: { ...fixtures.REVEAL.collector, state },
        }).success,
      ).toBe(true);
      const presentation = createLaunchPresentation({
        ...fixtures.REVEAL,
        collector: { ...fixtures.REVEAL.collector, state },
      });
      expect(presentation.collectorStudies.map((study) => study.state)).toEqual(
        ['ready_to_reveal', 'revealing', 'revealed'],
      );
      const html = renderToStaticMarkup(
        createElement(LaunchStatus, { presentation }),
      );
      expect(html).toContain('REVEALING / DEVELOPMENT PREVIEW');
      expect(html).toContain('No reveal job or animation runs.');
    }
    for (const global of launchStateSchema.options) {
      const invalid =
        global === 'BLACKOUT'
          ? 'sealed'
          : global === 'REVEAL' || global === 'REVEALED'
            ? 'blackout'
            : 'revealed';
      expect(
        launchSnapshotSchema.safeParse({
          ...fixtures[global],
          collector: { ...fixtures[global].collector, state: invalid },
        }).success,
      ).toBe(false);
    }
  });
});
