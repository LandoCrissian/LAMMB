// Original deterministic chamber rules. Metres; camera yaw 0 faces negative Z.
export type Position = { x: number; z: number };
export type ExperimentPhase = 'READY' | 'RUNNING' | 'COMPLETE';
export const chamber = {
  spawn: { x: 0, z: 5.5 },
  halfWidth: 6,
  halfDepth: 7,
  eyeHeight: 1.65,
  radius: 0.3,
  speed: 2.8,
  terminal: { x: -3.3, z: 0.4 },
  worldTerminal: { x: 3.3, z: 0.4 },
  specimen: { x: 0, z: -1 },
  interactionRadius: 2.1,
  obstacles: [
    { x: 0, z: -1, halfX: 1.6, halfZ: 1.3 },
    { x: -3.3, z: 0.4, halfX: 0.7, halfZ: 0.55 },
    { x: 3.3, z: 0.4, halfX: 0.7, halfZ: 0.55 },
  ],
} as const;
export const experiment = {
  title: 'SPECIMEN 0004 — FINANCIAL COMPETENCE TEST',
  initialBalance: '$100',
  balance: '$0.37',
  loans: '$48,000',
  confidence: '100%',
  conclusion: 'EXPERIMENT SUCCESSFUL. SUBJECT REMAINS TECHNICALLY ALIVE.',
  disclaimer:
    'Fictional laboratory credits. No real money, loans or token assignments.',
} as const;
export function validPosition(p: Position) {
  const r = chamber.radius;
  return (
    Number.isFinite(p.x) &&
    Number.isFinite(p.z) &&
    Math.abs(p.x) <= chamber.halfWidth - r &&
    Math.abs(p.z) <= chamber.halfDepth - r &&
    !chamber.obstacles.some(
      (o) =>
        Math.abs(p.x - o.x) < o.halfX + r && Math.abs(p.z - o.z) < o.halfZ + r,
    )
  );
}
export function moveObserver(
  p: Position,
  yaw: number,
  strafe: number,
  forward: number,
  seconds: number,
): Position {
  if (![yaw, strafe, forward, seconds].every(Number.isFinite)) return p;
  const magnitude = Math.max(1, Math.hypot(strafe, forward));
  const distance = chamber.speed * Math.min(0.05, Math.max(0, seconds));
  const dx =
    ((Math.cos(yaw) * strafe - Math.sin(yaw) * forward) / magnitude) * distance;
  const dz =
    ((-Math.sin(yaw) * strafe - Math.cos(yaw) * forward) / magnitude) *
    distance;
  // Small fixed maximum step prevents tunnelling; independent axes slide on walls.
  const next = { ...p };
  if (validPosition({ x: next.x + dx, z: next.z })) next.x += dx;
  if (validPosition({ x: next.x, z: next.z + dz })) next.z += dz;
  return next;
}
export function nearTerminal(p: Position) {
  return (
    Math.hypot(p.x - chamber.terminal.x, p.z - chamber.terminal.z) <=
    chamber.interactionRadius
  );
}
export type Destination = 'research' | 'specimen' | 'world' | null;
export function nearbyDestination(p: Position): Destination {
  const targets = [
    ['research', chamber.terminal, 2.1],
    ['world', chamber.worldTerminal, 2.1],
    ['specimen', chamber.specimen, 3.1],
  ] as const;
  return (
    targets.find(
      ([, at, radius]) => Math.hypot(p.x - at.x, p.z - at.z) <= radius,
    )?.[0] ?? null
  );
}
export function smoothAxis(current: number, target: number, seconds: number) {
  return (
    current +
    (target - current) *
      (1 - Math.exp(-12 * Math.max(0, Math.min(seconds, 0.05))))
  );
}
export type CameraPoint = Position & { y: number };
// Conservative swept camera sphere: room and all solid furniture. No mesh raycast churn.
export function safeCameraBoom(
  origin: CameraPoint,
  desired: CameraPoint,
): CameraPoint {
  let last = 0;
  const steps = Math.max(
    1,
    Math.ceil(
      Math.hypot(
        desired.x - origin.x,
        desired.y - origin.y,
        desired.z - origin.z,
      ) / 0.08,
    ),
  );
  for (let i = 1; i <= steps; i++) {
    const t = i / steps;
    const x = origin.x + (desired.x - origin.x) * t;
    const y = origin.y + (desired.y - origin.y) * t;
    const z = origin.z + (desired.z - origin.z) * t;
    if (
      Math.abs(x) > 5.75 ||
      Math.abs(z) > 6.75 ||
      y < 0.25 ||
      y > 4.6 ||
      chamber.obstacles.some(
        (o) =>
          Math.abs(x - o.x) < o.halfX + 0.18 &&
          Math.abs(z - o.z) < o.halfZ + 0.18 &&
          y < 3.6,
      )
    )
      break;
    last = t;
  }
  return {
    x: origin.x + (desired.x - origin.x) * last,
    y: origin.y + (desired.y - origin.y) * last,
    z: origin.z + (desired.z - origin.z) * last,
  };
}
