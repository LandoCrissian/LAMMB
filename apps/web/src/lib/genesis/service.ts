import { createHash, createHmac, randomBytes } from 'node:crypto';
import { verifyMessage } from 'viem';
import { GENESIS } from './policy';
import {
  GenesisError,
  evidence,
  prune,
  validateState,
  wallet,
  type State,
} from './model';
import type { Store } from './store';

export const hash = (value: string) =>
  createHash('sha256').update(value).digest('hex');
const random = () => randomBytes(32).toString('hex');
export interface ServiceConfig {
  origin: string;
  publicEnabled: boolean;
  adminEnabled: boolean;
  adminWallets: string[];
  rateSecret: string;
  approvedPartners: Record<string, string>;
  privateVerificationWallets: string[];
}
export class RegistrationService {
  constructor(
    private store: Store,
    readonly config: ServiceConfig,
    private clock = () => Date.now(),
  ) {}
  gate(purpose: 'collector' | 'admin', address?: string) {
    if (
      !(purpose === 'admin'
        ? this.config.adminEnabled
        : this.config.publicEnabled ||
          (this.config.adminEnabled &&
            address !== undefined &&
            this.config.privateVerificationWallets.includes(address)))
    )
      throw new GenesisError('REGISTRATION_INACTIVE', 503);
  }
  private rate(s: State, key: string, max: number, now: number) {
    const digest = createHmac('sha256', this.config.rateSecret)
      .update(key)
      .digest('hex');
    let r = s.rates.find((r) => r.key === digest);
    if (!r) {
      if (s.rates.length >= 5000) return false;
      r = { key: digest, start: now, count: 0 };
      s.rates.push(r);
    }
    if (r.start + 60_000 <= now) {
      r.start = now;
      r.count = 0;
    }
    // Return failures, rather than throwing inside the transaction, to commit limits.
    r.count++;
    return r.count <= max;
  }
  async limitRequest(client: string, action: string) {
    const now = this.clock();
    const allowed = await this.store.transaction((s) => {
      prune(s, now);
      return this.rate(
        s,
        'request:' + action + ':' + client,
        action === 'apply' ? 10 : 120,
        now,
      );
    });
    if (!allowed) throw new GenesisError('RATE_LIMITED', 429);
  }
  async challenge(
    input: string,
    purpose: 'collector' | 'admin',
    client: string,
  ) {
    const address = wallet(input);
    this.gate(purpose, address);
    if (purpose === 'admin' && !this.config.adminWallets.includes(address))
      throw new GenesisError('ADMIN_FORBIDDEN', 403);
    const now = this.clock(),
      id = random(),
      binding = random();
    const expires = now + 5 * 60_000;
    const nonce = random();
    const message = [
      `${new URL(this.config.origin).host} wants you to sign in with your Ethereum account:`,
      address,
      '',
      `LAMMB Genesis ${purpose} access. No mint, transaction or spending approval.`,
      '',
      `URI: ${this.config.origin}/mint`,
      'Version: 1',
      `Chain ID: ${GENESIS.chainId}`,
      `Nonce: ${nonce}`,
      `Issued At: ${new Date(now).toISOString()}`,
      `Expiration Time: ${new Date(expires).toISOString()}`,
    ].join('\n');
    const allowed = await this.store.transaction((s) => {
      prune(s, now);
      const ipOk = this.rate(s, 'challenge-ip:' + client, 10, now);
      const walletOk = this.rate(s, 'challenge-wallet:' + address, 5, now);
      if (!ipOk || !walletOk) return false;
      if (s.challenges.length >= 1000) return false;
      s.challenges.push({
        id,
        address,
        binding: hash(binding),
        purpose,
        message,
        expires,
      });
      return true;
    });
    if (!allowed) throw new GenesisError('RATE_LIMITED', 429);
    return { id, message, binding, expires };
  }
  async verify(id: string, binding: string, signature: string, client: string) {
    const now = this.clock();
    const challenge = await this.store.transaction((s) => {
      prune(s, now);
      if (!this.rate(s, 'verify:' + client, 20, now)) return null;
      const index = s.challenges.findIndex(
        (c) => c.id === id && c.binding === hash(binding),
      );
      if (index < 0) return null;
      return s.challenges.splice(index, 1)[0]!;
    });
    if (!challenge) throw new GenesisError('CHALLENGE_INVALID', 401);
    this.gate(challenge.purpose, challenge.address);
    if (
      challenge.purpose === 'admin' &&
      !this.config.adminWallets.includes(challenge.address)
    )
      throw new GenesisError('ADMIN_FORBIDDEN', 403);
    let valid = false;
    try {
      valid = await verifyMessage({
        address: challenge.address as `0x${string}`,
        message: challenge.message,
        signature: signature as `0x${string}`,
      });
    } catch {
      /* A malformed signature is an authentication failure. */
    }
    if (!valid) throw new GenesisError('SIGNATURE_INVALID', 401);
    const token = random(),
      expires = now + (challenge.purpose === 'admin' ? 15 : 30) * 60_000;
    await this.store.transaction((s) => {
      prune(s, now);
      let record = s.records.find((r) => r.address === challenge.address);
      if (!record) {
        if (s.records.length >= 5000)
          throw new GenesisError('APPLICATION_CAPACITY', 503);
        record = {
          address: challenge.address,
          verifiedAt: now,
          wl: 'NOT_APPLIED',
          wlUnits: 0,
          wlEvidence: null,
          grants: [],
          founderEvidence: null,
        };
        s.records.push(record);
      } else record.verifiedAt = now;
      s.sessions = s.sessions.filter(
        (c) =>
          !(c.address === challenge.address && c.purpose === challenge.purpose),
      );
      s.sessions.push({
        digest: hash(token),
        address: challenge.address,
        expires,
        purpose: challenge.purpose,
      });
    });
    return { token, expires };
  }
  private session(s: State, token: string, admin = false) {
    const entry = s.sessions.find(
      (c) => c.digest === hash(token) && c.expires > this.clock(),
    );
    if (!entry) throw new GenesisError('SESSION_REQUIRED', 401);
    this.gate(entry.purpose, entry.address);
    if (
      admin &&
      (entry.purpose !== 'admin' ||
        !this.config.adminWallets.includes(entry.address))
    )
      throw new GenesisError('ADMIN_FORBIDDEN', 403);
    return entry;
  }
  async status(token: string) {
    return this.store.transaction((s) => {
      const session = this.session(s, token);
      const r = s.records.find((r) => r.address === session.address)!;
      return {
        address: r.address,
        founder: Boolean(r.founderEvidence),
        wl: r.wl,
        wlAllowance: r.wlUnits,
        gtdAllowance: r.grants.reduce((n, g) => n + g.units, 0),
        notice:
          'Eligibility here is an administrative record, not an on-chain mint guarantee.',
      };
    });
  }
  async apply(token: string, consent: boolean) {
    if (!consent) throw new GenesisError('PRIVACY_CONSENT_REQUIRED');
    this.gate('collector');
    return this.store.transaction((s) => {
      const session = this.session(s, token);
      if (session.purpose !== 'collector')
        throw new GenesisError('COLLECTOR_SESSION_REQUIRED', 403);
      const r = s.records.find((r) => r.address === session.address)!;
      if (r.founderEvidence)
        throw new GenesisError('FOUNDER_STAGE_ONE_ONLY', 409);
      if (r.wl !== 'NOT_APPLIED') return { status: r.wl, duplicate: true };
      r.wl = 'PENDING';
      s.audit.push({
        at: this.clock(),
        actor: r.address,
        target: r.address,
        action: 'WL_APPLIED_PRIVACY_V1',
        evidence: null,
      });
      return { status: r.wl, duplicate: false };
    });
  }
  async logout(token: string) {
    await this.store.transaction((s) => {
      s.sessions = s.sessions.filter((c) => c.digest !== hash(token));
    });
  }
  async adminList(token: string) {
    return this.store.transaction((s) => {
      this.session(s, token, true);
      return s.records;
    });
  }
  async decide(
    token: string,
    input: {
      address: string;
      action:
        'FOUNDER' | 'GTD_GRANT' | 'GTD_REVOKE' | 'WL_APPROVE' | 'WL_REJECT';
      evidence: string;
      units?: number | undefined;
      key?: string | undefined;
      kind?: 'PARTNER' | 'INVITATION' | undefined;
    },
  ) {
    const target = wallet(input.address),
      proof = evidence.parse(input.evidence);
    return this.store.transaction((s) => {
      const actor = this.session(s, token, true).address;
      const r = s.records.find((r) => r.address === target);
      if (!r) throw new GenesisError('OWNERSHIP_VERIFICATION_REQUIRED', 409);
      if (r.verifiedAt + 30 * 86400_000 < this.clock())
        throw new GenesisError('OWNERSHIP_VERIFICATION_STALE', 409);
      if (input.action === 'FOUNDER') {
        if (r.grants.length || r.wl !== 'NOT_APPLIED')
          throw new GenesisError('FOUNDER_STAGE_ONE_ONLY', 409);
        r.founderEvidence = proof;
      } else {
        if (r.founderEvidence)
          throw new GenesisError('FOUNDER_STAGE_ONE_ONLY', 409);
        if (input.action === 'GTD_GRANT') {
          const grant = {
            key: input.key!,
            kind: input.kind!,
            units: input.units!,
            evidence: proof,
          };
          if (
            grant.kind === 'PARTNER' &&
            this.config.approvedPartners[grant.key] !== proof
          )
            throw new GenesisError('PARTNER_NOT_OWNER_APPROVED', 409);
          if (r.grants.some((g) => g.key === grant.key))
            throw new GenesisError('DUPLICATE_ENTITLEMENT', 409);
          r.grants.push(grant);
        } else if (input.action === 'GTD_REVOKE') {
          r.grants = r.grants.filter((g) => g.key !== input.key);
        } else if (input.action === 'WL_APPROVE') {
          if (!['PENDING', 'APPROVED'].includes(r.wl))
            throw new GenesisError('APPLICATION_REQUIRED', 409);
          r.wl = 'APPROVED';
          r.wlUnits = input.units!;
          r.wlEvidence = proof;
        } else {
          if (r.wl === 'NOT_APPLIED')
            throw new GenesisError('APPLICATION_REQUIRED', 409);
          r.wl = 'REJECTED';
          r.wlUnits = 0;
          r.wlEvidence = null;
        }
      }
      validateState(s);
      s.audit.push({
        at: this.clock(),
        actor,
        target,
        action: input.action,
        evidence: proof,
      });
      return { saved: true };
    });
  }
  async export(token: string, stage: 'FOUNDER' | 'GTD' | 'WL') {
    return this.store.transaction((s) => {
      const actor = this.session(s, token, true).address;
      validateState(s);
      const rows = s.records
        .flatMap((r) => {
          const units =
            stage === 'FOUNDER'
              ? r.founderEvidence
                ? 48
                : 0
              : stage === 'GTD'
                ? r.grants.reduce((n, g) => n + g.units, 0)
                : r.wlUnits;
          return units ? [{ address: r.address, units }] : [];
        })
        .sort((a, b) => a.address.localeCompare(b.address, 'en'));
      if (!rows.length) throw new GenesisError('NO_APPROVED_WALLETS', 409);
      const csv =
        rows.map((r) => `${r.address},${r.units},0`).join('\r\n') + '\r\n';
      s.audit.push({
        at: this.clock(),
        actor,
        target: actor,
        action: 'EXPORT_' + stage,
        evidence: 'sha256:' + hash(csv),
      });
      return {
        csv,
        sha256: hash(csv),
        rows: rows.length,
        units: rows.reduce((n, r) => n + r.units, 0),
      };
    });
  }
}
