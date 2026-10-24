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
    boundingBox(): Promise<{
      x: number;
      y: number;
      width: number;
      height: number;
    } | null>;
    evaluate(
      fn: (element: Element, point: { x: number; y: number }) => boolean,
      point: { x: number; y: number },
    ): Promise<boolean>;
  },
): Promise<void>;
