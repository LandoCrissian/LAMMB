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
  interactionRadius: 2.1,
  obstacles: [
    { x: 0, z: -1, halfX: 1.6, halfZ: 1.3 },
    { x: -3.3, z: 0.4, halfX: 0.7, halfZ: 0.55 },
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
  let next = { ...p };
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
