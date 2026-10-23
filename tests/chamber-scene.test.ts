import { afterEach, expect, it, vi } from 'vitest';
import { ChamberScene } from '../apps/web/src/lib/chamber-scene';
import type { ChamberSnapshot } from '../apps/web/src/lib/chamber-scene';

afterEach(() => vi.unstubAllGlobals());

it('publishes the exact frozen observer between periodic samples and on resume', () => {
  vi.stubGlobal('document', { pointerLockElement: null });
  vi.stubGlobal('cancelAnimationFrame', vi.fn());
  vi.stubGlobal(
    'requestAnimationFrame',
    vi.fn(() => 1),
  );
  const snapshot = vi.fn<(value: ChamberSnapshot) => void>();
  // Exercise the real pause/input/publication methods without allocating WebGL.
  // A movement frame occurred after the last once-per-second diagnostic sample.
  const scene = Object.assign(Object.create(ChamberScene.prototype), {
    position: { x: 3.3, z: 1.253033084747867 },
    yaw: 0.2,
    pitch: -0.1,
    perspective: 'third',
    camera: { position: { x: 3.5, y: 2.25, z: 4 } },
    avatar: { visible: true },
    renderer: { info: { render: {}, memory: {} }, getPixelRatio: () => 1 },
    reducedMotion: { matches: false },
    hooks: { snapshot },
    keys: new Set(['w']),
    axis: { x: 0, y: 1 },
    velocity: { x: 0, y: 0.8 },
    inspectPointers: new Map(),
    drag: null,
    canvas: {},
    disposed: false,
    lost: false,
  }) as ChamberScene;

  scene.setPaused(true);
  expect(snapshot).toHaveBeenCalledTimes(1);
  const frozen = snapshot.mock.calls[0]![0];
  expect(frozen).toMatchObject({
    x: 3.3,
    z: 1.253033084747867,
    yaw: 0.2,
    pitch: -0.1,
    perspective: 'third',
    destination: 'world',
  });
  scene.setPaused(false);
  expect(snapshot).toHaveBeenCalledTimes(2);
  expect(snapshot.mock.calls[1]![0]).toEqual(frozen);
  expect(Reflect.get(scene, 'keys').size).toBe(0);
  expect(Reflect.get(scene, 'velocity')).toEqual({ x: 0, y: 0 });
});
