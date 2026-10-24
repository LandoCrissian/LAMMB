export function clickChamberControl(
  page: { mouse: { down(): Promise<unknown>; up(): Promise<unknown> } },
  control: { isEnabled(): Promise<boolean>; hover(): Promise<unknown> },
): Promise<void>;
