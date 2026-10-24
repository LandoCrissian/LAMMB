import { expect, it, vi } from 'vitest';
import {
  approachChamberConsole,
  clickChamberControl,
} from '../scripts/lib/chamber-control.mjs';
import { moveObserver, nearTerminal } from '../apps/web/src/lib/chamber-model';

function fixture() {
  return {
    control: {
      isEnabled: vi.fn(async () => true),
      boundingBox: vi.fn(async () => ({
        x: 10,
        y: 20,
        width: 100,
        height: 48,
      })),
      evaluate: vi.fn(async () => true),
    },
    page: {
      viewportSize: () => ({ width: 320, height: 844 }),
      mouse: {
        move: vi.fn(async () => {}),
        down: vi.fn(async () => {}),
        up: vi.fn(async () => {}),
      },
    },
  };
}

it('does not pipeline press/release while the previous native input is unacknowledged', async () => {
  let moved!: () => void, pressed!: () => void;
  const move = new Promise<void>((r) => {
    moved = r;
  });
  const down = new Promise<void>((r) => {
    pressed = r;
  });
  const { control, page } = fixture();
  page.mouse.move.mockImplementation(() => move);
  page.mouse.down.mockImplementation(() => down);
  const click = clickChamberControl(page, control);
  await vi.waitFor(() => expect(page.mouse.move).toHaveBeenCalledWith(60, 44));
  expect(control.evaluate).toHaveBeenCalledOnce();
  expect(page.mouse.down).not.toHaveBeenCalled();
  expect(page.mouse.up).not.toHaveBeenCalled();
  moved();
  await vi.waitFor(() => expect(page.mouse.down).toHaveBeenCalledOnce());
  expect(control.evaluate).toHaveBeenCalledOnce();
  expect(page.mouse.up).not.toHaveBeenCalled();
  pressed();
  await click;
  expect(control.evaluate).toHaveBeenCalledTimes(2);
  expect(page.mouse.up).toHaveBeenCalledOnce();
});

it('does not dispatch any pointer input to a disabled control', async () => {
  const { control, page } = fixture();
  control.isEnabled.mockResolvedValue(false);
  await expect(clickChamberControl(page, control)).rejects.toThrow('enabled');
  expect(control.boundingBox).not.toHaveBeenCalled();
  expect(page.mouse.move).not.toHaveBeenCalled();
  expect(page.mouse.down).not.toHaveBeenCalled();
  expect(page.mouse.up).not.toHaveBeenCalled();
});

it('rejects controls outside the viewport without forcing or scrolling them', async () => {
  const { control, page } = fixture();
  control.boundingBox.mockResolvedValue({
    x: 400,
    y: 20,
    width: 100,
    height: 48,
  });
  await expect(clickChamberControl(page, control)).rejects.toThrow('viewport');
  expect(page.mouse.move).not.toHaveBeenCalled();
  expect(page.mouse.down).not.toHaveBeenCalled();
});

it('rejects an occluded control before sending native input', async () => {
  const { control, page } = fixture();
  control.evaluate.mockResolvedValue(false);
  await expect(clickChamberControl(page, control)).rejects.toThrow(
    'native input',
  );
  expect(page.mouse.move).not.toHaveBeenCalled();
  expect(page.mouse.down).not.toHaveBeenCalled();
});

it('rejects a native receipt if an overlapping target intercepted the gesture', async () => {
  const { control, page } = fixture();
  control.evaluate.mockResolvedValueOnce(true).mockResolvedValueOnce(false);
  await expect(clickChamberControl(page, control)).rejects.toThrow(
    'trusted down/up',
  );
  expect(page.mouse.move).toHaveBeenCalledOnce();
  expect(page.mouse.down).toHaveBeenCalledOnce();
  expect(page.mouse.up).toHaveBeenCalledOnce();
});

it('finishes native move/down/up before asking the renderer for a receipt', async () => {
  const { control, page } = fixture();
  control.evaluate.mockResolvedValueOnce(true).mockImplementation(async () => {
    expect(page.mouse.move).toHaveBeenCalledOnce();
    expect(page.mouse.down).toHaveBeenCalledOnce();
    expect(page.mouse.up).toHaveBeenCalledOnce();
    return true;
  });
  await clickChamberControl(page, control);
  expect(control.evaluate).toHaveBeenCalledTimes(2);
});

it('retains the original 30-second budget and never starts late input after failure', async () => {
  vi.useFakeTimers();
  try {
    let acknowledge!: () => void;
    const { control, page } = fixture();
    page.mouse.move.mockImplementation(
      () =>
        new Promise<void>((r) => {
          acknowledge = r;
        }),
    );
    const click = clickChamberControl(page, control);
    const failure = expect(click).rejects.toThrow('timed out (30000ms)');
    await vi.advanceTimersByTimeAsync(30000);
    await failure;
    acknowledge();
    await vi.advanceTimersByTimeAsync(1);
    expect(page.mouse.down).not.toHaveBeenCalled();
    expect(page.mouse.up).not.toHaveBeenCalled();
  } finally {
    vi.useRealTimers();
  }
});

it.each([
  { x: -4.34, z: -6.675 },
  { x: -3.3, z: 5.5 },
  { x: -4.6, z: 5.5 },
])(
  'reaches actual console geometry using native pulse directions from %j',
  async (start) => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(0);
    try {
      let position = { ...start };
      const page = {
        keyboard: {
          press: vi.fn(async (key: string, options: { delay: number }) => {
            expect(['w', 's']).toContain(key);
            expect(options.delay).toBe(500);
            for (let frame = 0; frame < 10; frame++)
              position = moveObserver(
                position,
                0,
                0,
                key === 'w' ? 1 : -1,
                0.05,
              );
            vi.setSystemTime(Date.now() + options.delay);
          }),
        },
        waitForTimeout: async (ms: number) => {
          vi.setSystemTime(Date.now() + ms);
        },
      };
      await approachChamberConsole(page, async () => ({
        ...position,
        near: nearTerminal(position),
      }));
      expect(nearTerminal(position)).toBe(true);
      expect(Date.now()).toBeLessThan(25000);
      expect(page.keyboard.press.mock.calls[0]?.[0]).toBe(
        start.z < 0.4 ? 's' : 'w',
      );
    } finally {
      vi.useRealTimers();
    }
  },
);

it('fails the same 25-second approach bound when movement makes no progress', async () => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(0);
  try {
    const page = {
      keyboard: {
        press: async (_key: string, options: { delay: number }) => {
          vi.setSystemTime(Date.now() + options.delay);
        },
      },
      waitForTimeout: async (ms: number) => {
        vi.setSystemTime(Date.now() + ms);
      },
    };
    await expect(
      approachChamberConsole(page, async () => ({
        x: -3.3,
        z: 5.5,
        near: false,
      })),
    ).rejects.toThrow('timed out (25000ms)');
    expect(Date.now()).toBeLessThanOrEqual(25000);
  } finally {
    vi.useRealTimers();
  }
});
