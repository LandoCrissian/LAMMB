import { z } from 'zod';
import { getAddress } from 'viem';

export class GenesisError extends Error {
  constructor(
    public code: string,
    public status = 400,
  ) {
    super(code);
  }
}
export function wallet(value: string) {
  try {
    const address = getAddress(value);
    if (/^0x0{40}$/i.test(address)) throw new Error();
    return address.toLowerCase();
  } catch {
    throw new GenesisError('INVALID_WALLET');
  }
}
const address = z
  .string()
  .regex(/^0x[0-9a-f]{40}$/)
  .refine((v) => !/^0x0{40}$/.test(v));
export const evidence = z.string().regex(/^sha256:[0-9a-f]{64}$/);
const grantSchema = z
  .strictObject({
    key: z.string().regex(/^[a-z0-9-]{3,64}$/),
    kind: z.enum(['PARTNER', 'INVITATION']),
    units: z.number().int().min(1).max(5),
    evidence,
  })
  .refine((g) => g.kind !== 'PARTNER' || g.units === 1);
export const recordSchema = z.strictObject({
  address,
  verifiedAt: z.number().int().nonnegative(),
  wl: z.enum(['NOT_APPLIED', 'PENDING', 'APPROVED', 'REJECTED']),
  wlUnits: z.number().int().min(0).max(2),
  wlEvidence: evidence.nullable(),
  grants: z.array(grantSchema).max(5),
  founderEvidence: evidence.nullable(),
});
export type WalletRecord = z.infer<typeof recordSchema>;
export const stateSchema = z.strictObject({
  version: z.literal(1),
  records: z.array(recordSchema).max(5000),
  challenges: z
    .array(
      z.strictObject({
        id: z.string().regex(/^[a-f0-9]{64}$/),
        address,
        binding: z.string().regex(/^[a-f0-9]{64}$/),
        message: z.string().max(1800),
        expires: z.number().int(),
        purpose: z.enum(['collector', 'admin']),
      }),
    )
    .max(1000),
  sessions: z
    .array(
      z.strictObject({
        digest: z.string().regex(/^[a-f0-9]{64}$/),
        address,
        expires: z.number().int(),
        purpose: z.enum(['collector', 'admin']),
      }),
    )
    .max(2000),
  rates: z
    .array(
      z.strictObject({
        key: z.string().regex(/^[a-f0-9]{64}$/),
        start: z.number().int(),
        count: z.number().int().nonnegative(),
      }),
    )
    .max(5000),
  audit: z
    .array(
      z.strictObject({
        at: z.number().int(),
        actor: address,
        action: z.string().max(40),
        target: address,
        evidence: evidence.nullable(),
      }),
    )
    .max(20000),
});
export type State = z.infer<typeof stateSchema>;
export function emptyState(): State {
  return {
    version: 1,
    records: [],
    challenges: [],
    sessions: [],
    rates: [],
    audit: [],
  };
}
export function validateState(input: unknown): State {
  const s = stateSchema.parse(input);
  const unique = (values: string[]) => new Set(values).size === values.length;
  if (
    !unique(s.records.map((r) => r.address)) ||
    !unique(s.challenges.map((c) => c.id)) ||
    !unique(s.sessions.map((c) => c.digest)) ||
    !unique(s.rates.map((c) => c.key))
  )
    throw new GenesisError('CORRUPT_DUPLICATE_STATE', 503);
  const addresses = new Set(s.records.map((r) => r.address));
  if (s.sessions.some((session) => !addresses.has(session.address)))
    throw new GenesisError('ORPHANED_SESSION', 503);
  let founders = 0,
    gtd = 0,
    wl = 0;
  for (const r of s.records) {
    if (!unique(r.grants.map((g) => g.key)))
      throw new GenesisError('DUPLICATE_ENTITLEMENT');
    const units = r.grants.reduce((n, g) => n + g.units, 0);
    if (
      units > 5 ||
      (r.wl === 'APPROVED') !== (r.wlUnits > 0 && r.wlEvidence !== null)
    )
      throw new GenesisError('INVALID_ALLOWANCE');
    if (r.wl !== 'APPROVED' && (r.wlUnits !== 0 || r.wlEvidence !== null))
      throw new GenesisError('INVALID_ALLOWANCE');
    if (r.founderEvidence) {
      founders++;
      if (units || r.wl !== 'NOT_APPLIED')
        throw new GenesisError('FOUNDER_STAGE_ONE_ONLY');
    }
    gtd += units;
    wl += r.wlUnits;
  }
  if (founders > 1 || gtd > 392 || wl > 160)
    throw new GenesisError('ALLOCATION_EXCEEDED', 409);
  return s;
}
export function prune(s: State, now: number) {
  s.challenges = s.challenges.filter((c) => c.expires > now);
  s.sessions = s.sessions.filter((c) => c.expires > now);
  s.rates = s.rates.filter((c) => c.start + 300_000 > now);
  // No email, socials, raw IP, signature or nonce secrets are persisted.
  // Expire unapproved records after 90 days without ownership verification.
  const expired = new Set(
    s.records
      .filter(
        (r) =>
          !r.founderEvidence &&
          r.grants.length === 0 &&
          r.wl !== 'APPROVED' &&
          r.verifiedAt + 90 * 86400_000 <= now,
      )
      .map((r) => r.address),
  );
  s.records = s.records.filter((r) => !expired.has(r.address));
  s.sessions = s.sessions.filter((r) => !expired.has(r.address));
  s.audit = s.audit.filter((r) => r.at + 180 * 86400_000 > now);
}
