import { expect, it, vi } from 'vitest';
import { clickChamberControl } from '../scripts/lib/chamber-control.mjs';

it('does not pipeline press/release while the previous native input is unacknowledged', async () => {
  let moved!: () => void, pressed!: () => void;
  const move = new Promise<void>((r) => {
    moved = r;
  });
  const down = new Promise<void>((r) => {
    pressed = r;
  });
  const control = { isEnabled: async () => true, hover: vi.fn(() => move) };
  const page = {
    mouse: { down: vi.fn(() => down), up: vi.fn(async () => {}) },
  };
  const click = clickChamberControl(page, control);
  await vi.waitFor(() => expect(control.hover).toHaveBeenCalledOnce());
  expect(page.mouse.down).not.toHaveBeenCalled();
  expect(page.mouse.up).not.toHaveBeenCalled();
  moved();
  await vi.waitFor(() => expect(page.mouse.down).toHaveBeenCalledOnce());
  expect(page.mouse.up).not.toHaveBeenCalled();
  pressed();
  await click;
  expect(page.mouse.up).toHaveBeenCalledOnce();
});

it('does not dispatch any pointer input to a disabled control', async () => {
  const control = { isEnabled: async () => false, hover: vi.fn() };
  const page = { mouse: { down: vi.fn(), up: vi.fn() } };
  await expect(clickChamberControl(page, control)).rejects.toThrow('enabled');
  expect(control.hover).not.toHaveBeenCalled();
  expect(page.mouse.down).not.toHaveBeenCalled();
  expect(page.mouse.up).not.toHaveBeenCalled();
});
