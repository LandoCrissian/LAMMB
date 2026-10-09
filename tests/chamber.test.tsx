import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  chamber,
  experiment,
  moveObserver,
  nearTerminal,
  validPosition,
  smoothAxis,
  safeCameraBoom,
  nearbyDestination,
  type Position,
} from '../apps/web/src/lib/chamber-model';
import Chamber from '../apps/web/src/app/universe/experimental/chamber/page';
import {
  navigation,
  navigationDestinationPath,
} from '../apps/web/src/config/navigation';
import { facilityDestinations } from '../apps/web/src/config/labs';
import { PointerOwner } from '../apps/web/src/lib/chamber-input';

describe('independent thumb ownership and camera continuity', () => {
  it('keeps simultaneous thumb owners independent through cancellation and unrelated lost capture', () => {
    const movement = new PointerOwner(),
      look = new PointerOwner();
    expect(movement.claim(11)).toBe(true);
    expect(look.claim(22)).toBe(true);
    expect(movement.claim(22)).toBe(false);
    expect(look.release(11)).toBe(false);
    expect(look.id).toBe(22);
    expect(movement.release(11)).toBe(true);
    expect(look.id).toBe(22);
    expect(movement.claim(33)).toBe(true);
    movement.clear();
    look.clear();
    expect(movement.claim(44)).toBe(true);
  });
  it('accelerates and decelerates smoothly without reversing or depending on frame subdivision', () => {
    const a = smoothAxis(0, 1, 0.04);
    expect(a).toBeGreaterThan(0);
    expect(a).toBeLessThan(1);
    expect(smoothAxis(a, 0, 0.04)).toBeLessThan(a);
    expect(smoothAxis(smoothAxis(0, 1, 0.02), 1, 0.02)).toBeCloseTo(a);
  });
  it('sweeps a camera sphere before walls, furniture and the ceiling', () => {
    const origin = { x: 0, y: 1.55, z: 5.5 };
    expect(
      safeCameraBoom(origin, { x: 0, y: 2.3, z: 9 }).z,
    ).toBeLessThanOrEqual(6.75);
    expect(safeCameraBoom(origin, { x: 0, y: 1.55, z: -2 }).z).toBeGreaterThan(
      0.48,
    );
    expect(
      safeCameraBoom(origin, { x: 0, y: 9, z: 5.5 }).y,
    ).toBeLessThanOrEqual(4.6);
    expect(safeCameraBoom(origin, { x: 0, y: 2.3, z: 6 })).toEqual({
      x: 0,
      y: 2.3,
      z: 6,
    });
  });
  it('exposes distinct reachable destinations without enabling remote interaction', () => {
    expect(nearbyDestination(chamber.spawn)).toBeNull();
    expect(nearbyDestination({ x: 0, z: 1.6 })).toBe('specimen');
    expect(nearbyDestination({ x: -3.3, z: 1.6 })).toBe('research');
    expect(nearbyDestination({ x: 3.3, z: 1.6 })).toBe('world');
  });
});
describe('containment chamber movement and safety', () => {
  function walk(
    start: Position,
    strafe: number,
    forward: number,
    frames = 180,
    yaw = 0,
  ) {
    let p = start;
    for (let i = 0; i < frames; i++)
      p = moveObserver(p, yaw, strafe, forward, 1 / 60);
    return p;
  }
  it('moves in camera-relative directions with equal diagonal speed and bounded frame time', () => {
    const cardinal = walk(chamber.spawn, 1, 0, 30);
    const diagonal = walk(chamber.spawn, 1, 1, 30);
    expect(Math.hypot(cardinal.x, cardinal.z - chamber.spawn.z)).toBeCloseTo(
      Math.hypot(diagonal.x, diagonal.z - chamber.spawn.z),
    );
    expect(
      moveObserver(chamber.spawn, Math.PI / 2, 0, 1, 1 / 60).x,
    ).toBeLessThan(0);
    expect(moveObserver(chamber.spawn, 0, 0, 1, 20).z).toBeCloseTo(
      chamber.spawn.z - chamber.speed * 0.05,
    );
    expect(moveObserver(chamber.spawn, NaN, 1, 1, 1)).toEqual(chamber.spawn);
  });
  it('contains sustained movement at all four room walls and blocks the specimen and console', () => {
    for (const [strafe, forward] of [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
      [1, 1],
      [-1, 1],
    ] as const) {
      const p = walk(chamber.spawn, strafe, forward, 1200);
      expect(validPosition(p)).toBe(true);
      expect(Math.abs(p.x)).toBeLessThanOrEqual(
        chamber.halfWidth - chamber.radius,
      );
      expect(Math.abs(p.z)).toBeLessThanOrEqual(
        chamber.halfDepth - chamber.radius,
      );
    }
    expect(walk(chamber.spawn, 0, 1, 1200).z).toBeGreaterThanOrEqual(
      0.6 - 0.001,
    );
    expect(walk({ x: -3.3, z: 5.5 }, 0, 1, 1200).z).toBeGreaterThanOrEqual(
      1.25 - 0.001,
    );
    expect(validPosition({ x: 0, z: -1 })).toBe(false);
    expect(validPosition({ x: -3.3, z: 0.4 })).toBe(false);
  });
  it('makes the terminal reachable while requiring proximity in the scene', () => {
    expect(nearTerminal(chamber.spawn)).toBe(false);
    expect(nearTerminal({ x: -3.3, z: 1.6 })).toBe(true);
    const left = walk(chamber.spawn, -1, 0, 70);
    expect(nearTerminal(walk(left, 0, 1, 80))).toBe(true);
  });
});
describe('isolated fictional prototype', () => {
  it('does not advertise the chamber through any public destination list', () => {
    expect(
      [...navigation, ...facilityDestinations].map((item) => item.href),
    ).not.toContain('/universe/experimental/chamber');
    expect(navigationDestinationPath('/universe/experimental/chamber')).toBe(
      '/universe',
    );
    expect(navigationDestinationPath('/universe/experimental/missing')).toBe(
      '/universe/experimental/missing',
    );
    const source = readFileSync(
      'apps/web/src/app/universe/experimental/chamber/page.tsx',
      'utf8',
    );
    expect(source).toContain('index: false');
  });
  it('server-renders the entire non-3D story without misleading financial or collection functionality', () => {
    const html = renderToStaticMarkup(createElement(Chamber));
    expect(html).toContain('OWNER REVIEW PROTOTYPE');
    expect(html).toContain('COMPLETE NON-3D ALTERNATIVE');
    expect(html).toContain('chamber-native-evidence');
    expect(html).toContain('Specimen description and World alternative');
    expect(html).toContain('href="/world"');
    for (const text of [
      experiment.initialBalance,
      experiment.balance,
      experiment.loans,
      experiment.confidence,
      experiment.conclusion,
    ])
      expect(html).toContain(text);
    expect(html).toContain('Fictional laboratory credits');
    expect(html).toContain('aria-haspopup="dialog"');
    expect(html).not.toMatch(
      /5,280|Colorado|<video|<audio|<iframe|<form|Connect wallet/,
    );
  });
});
