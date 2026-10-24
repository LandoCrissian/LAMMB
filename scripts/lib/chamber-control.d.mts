export function clickChamberControl(
  page: {
    viewportSize(): { width: number; height: number } | null;
    mouse: {
      move(x: number, y: number): Promise<unknown>;
      down(): Promise<unknown>;
      up(): Promise<unknown>;
    };
  },
  control: {
    isEnabled(): Promise<boolean>;
    elementHandle(): Promise<{
      scrollIntoViewIfNeeded(): Promise<unknown>;
      boundingBox(): Promise<{
        x: number;
        y: number;
        width: number;
        height: number;
      } | null>;
      evaluate(
        fn: (
          element: Element,
          argument: {
            at: { x: number; y: number };
            stage: 'prepare' | 'verify' | 'cleanup';
          },
        ) => boolean,
        argument: {
          at: { x: number; y: number };
          stage: 'prepare' | 'verify' | 'cleanup';
        },
      ): Promise<boolean>;
      dispose(): Promise<unknown>;
    } | null>;
  },
): Promise<void>;

export function approachChamberConsole(
  page: {
    keyboard: {
      press(key: string, options: { delay: number }): Promise<unknown>;
    };
    waitForTimeout(milliseconds: number): Promise<unknown>;
  },
  read: () => Promise<{ x: number; z: number; near: boolean }>,
  record?: (point: { key: string; x: number; z: number }) => void,
): Promise<void>;
