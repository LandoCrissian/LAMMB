import { expect, it, vi } from 'vitest';
import { clickChamberControl } from '../scripts/lib/chamber-control.mjs';

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
  expect(control.evaluate).toHaveBeenCalledTimes(2);
  expect(page.mouse.up).not.toHaveBeenCalled();
  pressed();
  await click;
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

it('does not press if a moved pointer reveals an overlapping target', async () => {
  const { control, page } = fixture();
  control.evaluate.mockResolvedValueOnce(true).mockResolvedValueOnce(false);
  await expect(clickChamberControl(page, control)).rejects.toThrow(
    'occluded after move',
  );
  expect(page.mouse.move).toHaveBeenCalledOnce();
  expect(page.mouse.down).not.toHaveBeenCalled();
  expect(page.mouse.up).not.toHaveBeenCalled();
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
