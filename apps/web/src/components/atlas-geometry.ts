export type Point = { x: number; y: number };
export type View = { x: number; y: number; k: number };
export type AtlasShape = {
  code: string;
  path: string;
  bounds: number[];
  sourceFeatureIds: number[];
};
export type AtlasData = {
  version: string;
  width: number;
  height: number;
  outline: string;
  graticule: string;
  countries: AtlasShape[];
  exceptions: { name: string; path: string }[];
};
export const initialView: View = { x: 0, y: 0, k: 1 };
export function constrainView(view: View): View {
  const k = Math.max(1, Math.min(48, view.k));
  return {
    k,
    x: Math.max(1000 * (1 - k), Math.min(0, view.x)),
    y: Math.max(520 * (1 - k), Math.min(0, view.y)),
  };
}
export function zoomAt(view: View, factor: number, anchor: Point): View {
  const k = Math.max(1, Math.min(48, view.k * factor));
  const ratio = k / view.k;
  return constrainView({
    k,
    x: anchor.x - (anchor.x - view.x) * ratio,
    y: anchor.y - (anchor.y - view.y) * ratio,
  });
}
export function pinchView(
  view: View,
  before: [Point, Point],
  after: [Point, Point],
): View {
  const distance = ([a, b]: [Point, Point]) => Math.hypot(a.x - b.x, a.y - b.y);
  const midpoint = ([a, b]: [Point, Point]) => ({
    x: (a.x + b.x) / 2,
    y: (a.y + b.y) / 2,
  });
  const start = midpoint(before),
    end = midpoint(after);
  const zoom = zoomAt(
    view,
    distance(after) / Math.max(1, distance(before)),
    start,
  );
  return constrainView({
    ...zoom,
    x: zoom.x + end.x - start.x,
    y: zoom.y + end.y - start.y,
  });
}
export function focusShape(shape: AtlasShape): View {
  const [x0 = 0, y0 = 0, x1 = 1000, y1 = 520] = shape.bounds;
  const k = Math.max(
    1,
    Math.min(
      48,
      Math.min(700 / Math.max(1, x1 - x0), 360 / Math.max(1, y1 - y0)),
    ),
  );
  return constrainView({
    k,
    x: 500 - ((x0 + x1) / 2) * k,
    y: 260 - ((y0 + y1) / 2) * k,
  });
}
