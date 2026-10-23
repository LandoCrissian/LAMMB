import { randomBytes } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { privateKeyToAccount } from 'viem/accounts';
import { parseSiweMessage, validateSiweMessage } from 'viem/siwe';
import {
  emptyState,
  prune,
  validateState,
  wallet,
  type State,
} from '../apps/web/src/lib/genesis/model';
import {
  RegistrationService,
  hash,
  type ServiceConfig,
} from '../apps/web/src/lib/genesis/service';
import type { Store } from '../apps/web/src/lib/genesis/store';
import { handleGenesis } from '../apps/web/src/lib/genesis/http';
import { runtimeConfig } from '../apps/web/src/lib/genesis/runtime';
import { GENESIS, stages, release } from '../apps/web/src/lib/genesis/policy';

// Disposable, unfunded test identities exist only in memory. No wallet, RPC,
// deployment, external database or production key is used by this unit suite.
export class MemoryStore implements Store {
  state = emptyState();
  private tail: Promise<unknown> = Promise.resolve();
  transaction<T>(fn: (s: State) => Promise<T> | T): Promise<T> {
    const next = this.tail.then(async () => {
      const copy = structuredClone(this.state);
      const result = await fn(copy);
      this.state = validateState(copy);
      return structuredClone(result);
    });
    this.tail = next.catch(() => {});
    return next;
  }
}
const account = () =>
  privateKeyToAccount(
    ('0x' + randomBytes(32).toString('hex')) as `0x${string}`,
  );
const proof = 'sha256:' + 'a'.repeat(64);
const addr = (n: number) => '0x' + n.toString(16).padStart(40, '0');
async function setup() {
  const store = new MemoryStore(),
    admin = account(),
    collector = account(),
    founder = account();
  let now = Date.now();
  const config: ServiceConfig = {
    origin: 'https://lammb.fun',
    publicEnabled: true,
    adminEnabled: true,
    adminWallets: [admin.address.toLowerCase()],
    rateSecret: 'b'.repeat(64),
    approvedPartners: { 'approved-project': proof },
    privateVerificationWallets: [],
  };
  const service = new RegistrationService(store, config, () => now);
  async function login(
    who = collector,
    purpose: 'collector' | 'admin' = 'collector',
  ) {
    const c = await service.challenge(who.address, purpose, who.address);
    const signature = await who.signMessage({ message: c.message });
    return (await service.verify(c.id, c.binding, signature, who.address))
      .token;
  }
  const adminToken = await login(admin, 'admin');
  return {
    store,
    admin,
    collector,
    founder,
    config,
    service,
    login,
    adminToken,
    advance: (ms: number) => {
      now += ms;
    },
  };
}
const post = (
  action: string,
  data: unknown,
  cookie = '',
  origin = 'https://lammb.fun',
) =>
  new Request('https://lammb.fun/api/genesis/' + action, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Origin: origin,
      Cookie: cookie,
    },
    body: JSON.stringify(data),
  });

describe('Genesis stage policy', () => {
  it('has exactly four ordered stages, 720 units, private founder and inactive release', () => {
    expect(stages.map((s) => s.id)).toEqual(['FOUNDER', 'GTD', 'WL', 'PUBLIC']);
    expect(stages.map((s) => s.allocation)).toEqual([48, 392, 160, 120]);
    expect(stages.reduce((n, s) => n + s.allocation, 0)).toBe(GENESIS.supply);
    expect(GENESIS.chainId).toBe(4663);
    expect(GENESIS.collectionUrl).toBe('https://opensea.io/collection/lammbs');
    expect(release.mintEnabled).toBe(false);
    expect(release.verifiedOpeningTimes).toBeNull();
    expect(release.approvedPublicPartners).toEqual([]);
  });
});
describe('signature ownership and sessions', () => {
  it('uses standard parsed SIWE fields and a checksummed wallet for wallet interoperability', async () => {
    const s = await setup();
    const c = await s.service.challenge(
      s.collector.address,
      'collector',
      'standard-message',
    );
    const parsed = parseSiweMessage(c.message);
    expect(parsed.address).toBe(s.collector.address);
    expect(parsed.scheme).toBe('https');
    expect(parsed.chainId).toBe(4663);
    expect(parsed.uri).toBe('https://lammb.fun/mint');
    expect(
      validateSiweMessage({
        message: parsed,
        address: s.collector.address,
        domain: 'lammb.fun',
        scheme: 'https',
      }),
    ).toBe(true);
    expect(
      validateSiweMessage({ message: parsed, domain: 'evil.example' }),
    ).toBe(false);
  });
  it('binds origin, chain, purpose, random nonce, expiry and exact address', async () => {
    const s = await setup();
    const c = await s.service.challenge(
      s.collector.address,
      'collector',
      'client',
    );
    expect(c.message).toContain('lammb.fun wants you to sign in');
    expect(c.message).toContain('Chain ID: 4663');
    expect(c.message).toContain('No mint, transaction or spending approval.');
    expect(c.message).toContain('Expiration Time:');
    const token = (
      await s.service.verify(
        c.id,
        c.binding,
        await s.collector.signMessage({ message: c.message }),
        'client',
      )
    ).token;
    expect((await s.service.status(token)).address).toBe(
      s.collector.address.toLowerCase(),
    );
    expect(s.store.state.sessions.some((v) => v.digest === token)).toBe(false);
    expect(JSON.stringify(s.store.state)).not.toContain('signature');
  });
  it('rejects a different signer and consumes the nonce even on a bad signature', async () => {
    const s = await setup(),
      c = await s.service.challenge(s.collector.address, 'collector', 'client');
    await expect(
      s.service.verify(
        c.id,
        c.binding,
        await s.admin.signMessage({ message: c.message }),
        'client',
      ),
    ).rejects.toThrow('SIGNATURE_INVALID');
    await expect(
      s.service.verify(
        c.id,
        c.binding,
        await s.collector.signMessage({ message: c.message }),
        'client',
      ),
    ).rejects.toThrow('CHALLENGE_INVALID');
  });
  it('rejects a changed domain/message', async () => {
    const s = await setup(),
      c = await s.service.challenge(s.collector.address, 'collector', 'client');
    await expect(
      s.service.verify(
        c.id,
        c.binding,
        await s.collector.signMessage({
          message: c.message.replaceAll('lammb.fun', 'evil.example'),
        }),
        'client',
      ),
    ).rejects.toThrow('SIGNATURE_INVALID');
  });
  it('rejects missing browser challenge binding', async () => {
    const s = await setup(),
      c = await s.service.challenge(s.collector.address, 'collector', 'client');
    await expect(
      s.service.verify(
        c.id,
        '',
        await s.collector.signMessage({ message: c.message }),
        'client',
      ),
    ).rejects.toThrow('CHALLENGE_INVALID');
  });
  it('rejects expired challenges and sessions', async () => {
    const s = await setup(),
      c = await s.service.challenge(s.collector.address, 'collector', 'client');
    s.advance(300001);
    await expect(
      s.service.verify(
        c.id,
        c.binding,
        await s.collector.signMessage({ message: c.message }),
        'client',
      ),
    ).rejects.toThrow('CHALLENGE_INVALID');
    const token = await s.login();
    s.advance(1800001);
    await expect(s.service.status(token)).rejects.toThrow('SESSION_REQUIRED');
  });
  it('prevents replay and parallel verification of the same nonce', async () => {
    const s = await setup(),
      c = await s.service.challenge(s.collector.address, 'collector', 'client');
    const sig = await s.collector.signMessage({ message: c.message });
    const outcomes = await Promise.allSettled([
      s.service.verify(c.id, c.binding, sig, 'client'),
      s.service.verify(c.id, c.binding, sig, 'client'),
    ]);
    expect(outcomes.filter((o) => o.status === 'fulfilled')).toHaveLength(1);
  });
  it('revokes sessions on logout and supersedes a previous login', async () => {
    const s = await setup(),
      first = await s.login(),
      second = await s.login();
    await expect(s.service.status(first)).rejects.toThrow('SESSION_REQUIRED');
    await s.service.logout(second);
    await expect(s.service.status(second)).rejects.toThrow('SESSION_REQUIRED');
  });
  it('rejects nonadministrator sign-in and privilege escalation', async () => {
    const s = await setup(),
      token = await s.login();
    const c = await s.service.challenge(s.collector.address, 'admin', 'client');
    await expect(
      s.service.verify(
        c.id,
        c.binding,
        await s.collector.signMessage({ message: c.message }),
        'client',
      ),
    ).rejects.toThrow('ADMIN_FORBIDDEN');
    await expect(s.service.adminList(token)).rejects.toThrow('ADMIN_FORBIDDEN');
    await expect(
      s.service.decide(token, {
        address: s.collector.address,
        action: 'FOUNDER',
        evidence: proof,
      }),
    ).rejects.toThrow('ADMIN_FORBIDDEN');
    await expect(s.service.export(token, 'WL')).rejects.toThrow(
      'ADMIN_FORBIDDEN',
    );
  });
  it('revokes admin authority immediately when configured wallet access is removed', async () => {
    const s = await setup();
    s.config.adminWallets.length = 0;
    await expect(s.service.adminList(s.adminToken)).rejects.toThrow(
      'ADMIN_FORBIDDEN',
    );
  });
  it('keeps activation server-side and fails closed', async () => {
    const s = await setup(),
      token = await s.login();
    s.config.publicEnabled = false;
    const c = await s.service.challenge(
      s.collector.address,
      'collector',
      'client',
    );
    await expect(
      s.service.verify(
        c.id,
        c.binding,
        await s.collector.signMessage({ message: c.message }),
        'client',
      ),
    ).rejects.toThrow('REGISTRATION_INACTIVE');
    await expect(s.service.apply(token, true)).rejects.toThrow(
      'REGISTRATION_INACTIVE',
    );
    await expect(s.service.status(token)).rejects.toThrow(
      'REGISTRATION_INACTIVE',
    );
    s.config.adminEnabled = false;
    await expect(
      s.service.challenge(s.collector.address, 'collector', 'client'),
    ).rejects.toThrow('REGISTRATION_INACTIVE');
    await expect(s.service.adminList(s.adminToken)).rejects.toThrow(
      'REGISTRATION_INACTIVE',
    );
  });
  it('persists per-client limits without letting an attacker lock out another connection', async () => {
    const s = await setup();
    for (let i = 0; i < 5; i++)
      await s.service.challenge(
        s.collector.address,
        'collector',
        'same-client',
      );
    await expect(
      s.service.challenge(s.collector.address, 'collector', 'same-client'),
    ).rejects.toThrow('RATE_LIMITED');
    await expect(
      s.service.challenge(s.collector.address, 'collector', 'different-client'),
    ).resolves.toBeDefined();
    expect(s.store.state.rates.every((r) => /^[a-f0-9]{64}$/.test(r.key))).toBe(
      true,
    );
    s.advance(60001);
    await expect(
      s.service.challenge(s.collector.address, 'collector', 'same-client'),
    ).resolves.toBeDefined();
  });
  it('does not expose administrator or private-wallet membership before ownership proof', async () => {
    const s = await setup(),
      attacker = account();
    s.config.publicEnabled = false;
    s.config.privateVerificationWallets = [s.founder.address.toLowerCase()];
    for (const [candidate, purpose] of [
      [s.admin, 'admin'],
      [s.collector, 'admin'],
      [s.founder, 'collector'],
      [s.collector, 'collector'],
    ] as const) {
      const c = await s.service.challenge(
        candidate.address,
        purpose,
        'privacy-client',
      );
      expect(Object.keys(c).sort()).toEqual([
        'binding',
        'expires',
        'id',
        'message',
      ]);
      await expect(
        s.service.verify(
          c.id,
          c.binding,
          await attacker.signMessage({ message: c.message }),
          'privacy-client',
        ),
      ).rejects.toThrow('SIGNATURE_INVALID');
    }
    expect(s.store.state.records.map((r) => r.address)).toEqual([
      s.admin.address.toLowerCase(),
    ]);
  });
});
describe('private applications, founder and approved entitlements', () => {
  it('verifies an owner-nominated founder privately without public signup or admin privileges', async () => {
    const s = await setup();
    s.config.publicEnabled = false;
    s.config.privateVerificationWallets = [s.founder.address.toLowerCase()];
    const token = await s.login(s.founder);
    expect((await s.service.status(token)).founder).toBe(false);
    await expect(s.service.apply(token, true)).rejects.toThrow(
      'REGISTRATION_INACTIVE',
    );
    await expect(s.service.adminList(token)).rejects.toThrow('ADMIN_FORBIDDEN');
    const outsider = await s.service.challenge(
      s.collector.address,
      'collector',
      'other',
    );
    await expect(
      s.service.verify(
        outsider.id,
        outsider.binding,
        await s.collector.signMessage({ message: outsider.message }),
        'other',
      ),
    ).rejects.toThrow('REGISTRATION_INACTIVE');
    expect(
      s.store.state.records.some(
        (r) => r.address === s.collector.address.toLowerCase(),
      ),
    ).toBe(false);
    await s.service.decide(s.adminToken, {
      address: s.founder.address,
      action: 'FOUNDER',
      evidence: proof,
    });
    expect((await s.service.export(s.adminToken, 'FOUNDER')).units).toBe(48);
    expect((await s.service.status(token)).founder).toBe(true);
    s.config.privateVerificationWallets = [];
    await expect(s.service.status(token)).rejects.toThrow(
      'REGISTRATION_INACTIVE',
    );
  });
  it('requires ownership, consent and a collector session; application is pending, never approved', async () => {
    const s = await setup(),
      token = await s.login();
    await expect(s.service.apply('', true)).rejects.toThrow('SESSION_REQUIRED');
    await expect(s.service.apply(token, false)).rejects.toThrow(
      'PRIVACY_CONSENT_REQUIRED',
    );
    await expect(s.service.apply(s.adminToken, true)).rejects.toThrow(
      'COLLECTOR_SESSION_REQUIRED',
    );
    expect(await s.service.apply(token, true)).toEqual({
      status: 'PENDING',
      duplicate: false,
    });
    expect(await s.service.apply(token, true)).toEqual({
      status: 'PENDING',
      duplicate: true,
    });
    expect((await s.service.status(token)).wlAllowance).toBe(0);
    await expect(s.service.export(s.adminToken, 'WL')).rejects.toThrow(
      'NO_APPROVED_WALLETS',
    );
  });
  it('requires a pending application before approval and ownership before any admin grant', async () => {
    const s = await setup();
    await expect(
      s.service.decide(s.adminToken, {
        address: s.collector.address,
        action: 'WL_APPROVE',
        units: 2,
        evidence: proof,
      }),
    ).rejects.toThrow('OWNERSHIP_VERIFICATION_REQUIRED');
    await s.login();
    await expect(
      s.service.decide(s.adminToken, {
        address: s.collector.address,
        action: 'WL_APPROVE',
        units: 2,
        evidence: proof,
      }),
    ).rejects.toThrow('APPLICATION_REQUIRED');
  });
  it('supports approval, rejection and exact headerless exports with a digest', async () => {
    const s = await setup(),
      token = await s.login();
    await s.service.apply(token, true);
    await s.service.decide(s.adminToken, {
      address: s.collector.address,
      action: 'WL_APPROVE',
      units: 2,
      evidence: proof,
    });
    const output = await s.service.export(s.adminToken, 'WL');
    expect(output.csv).toBe(s.collector.address.toLowerCase() + ',2,0\r\n');
    expect(output.sha256).toBe(hash(output.csv));
    expect(output.csv.endsWith(String.fromCharCode(13, 10))).toBe(true);
    expect(output.units).toBe(2);
    expect(output.rows).toBe(1);
    await s.service.decide(s.adminToken, {
      address: s.collector.address,
      action: 'WL_REJECT',
      evidence: proof,
    });
    expect((await s.service.status(token)).wl).toBe('REJECTED');
    await expect(s.service.export(s.adminToken, 'WL')).rejects.toThrow(
      'NO_APPROVED_WALLETS',
    );
  });
  it('assigns one verified founder, exports exactly 48, and excludes other stages', async () => {
    const s = await setup(),
      token = await s.login(s.founder);
    await s.service.decide(s.adminToken, {
      address: s.founder.address,
      action: 'FOUNDER',
      evidence: proof,
    });
    const output = await s.service.export(s.adminToken, 'FOUNDER');
    expect(output.rows).toBe(1);
    expect(output.units).toBe(48);
    await expect(s.service.apply(token, true)).rejects.toThrow(
      'FOUNDER_STAGE_ONE_ONLY',
    );
    await expect(
      s.service.decide(s.adminToken, {
        address: s.founder.address,
        action: 'GTD_GRANT',
        key: 'invite-one',
        kind: 'INVITATION',
        units: 1,
        evidence: proof,
      }),
    ).rejects.toThrow('FOUNDER_STAGE_ONE_ONLY');
    await s.login();
    await expect(
      s.service.decide(s.adminToken, {
        address: s.collector.address,
        action: 'FOUNDER',
        evidence: proof,
      }),
    ).rejects.toThrow('ALLOCATION_EXCEEDED');
    expect(s.store.state.records.filter((r) => r.founderEvidence)).toHaveLength(
      1,
    );
  });
  it('prevents converting a GTD/WL participant into the founder', async () => {
    const s = await setup(),
      token = await s.login();
    await s.service.apply(token, true);
    await expect(
      s.service.decide(s.adminToken, {
        address: s.collector.address,
        action: 'FOUNDER',
        evidence: proof,
      }),
    ).rejects.toThrow('FOUNDER_STAGE_ONE_ONLY');
  });
  it('requires configured owner-approved partner evidence, one entitlement per project', async () => {
    const s = await setup();
    await s.login();
    const grant = {
      address: s.collector.address,
      action: 'GTD_GRANT' as const,
      key: 'unknown-project',
      kind: 'PARTNER' as const,
      units: 1,
      evidence: proof,
    };
    await expect(s.service.decide(s.adminToken, grant)).rejects.toThrow(
      'PARTNER_NOT_OWNER_APPROVED',
    );
    grant.key = 'approved-project';
    await s.service.decide(s.adminToken, grant);
    await expect(s.service.decide(s.adminToken, grant)).rejects.toThrow(
      'DUPLICATE_ENTITLEMENT',
    );
    await expect(
      s.service.decide(s.adminToken, {
        ...grant,
        key: 'approved-project',
        units: 2,
      }),
    ).rejects.toThrow('DUPLICATE_ENTITLEMENT');
    expect((await s.service.export(s.adminToken, 'GTD')).units).toBe(1);
  });
  it('caps individual invitations plus partner units at five and allows evidence-bound revocation', async () => {
    const s = await setup();
    await s.login();
    await s.service.decide(s.adminToken, {
      address: s.collector.address,
      action: 'GTD_GRANT',
      key: 'invite-one',
      kind: 'INVITATION',
      units: 5,
      evidence: proof,
    });
    await expect(
      s.service.decide(s.adminToken, {
        address: s.collector.address,
        action: 'GTD_GRANT',
        key: 'approved-project',
        kind: 'PARTNER',
        units: 1,
        evidence: proof,
      }),
    ).rejects.toThrow('INVALID_ALLOWANCE');
    await s.service.decide(s.adminToken, {
      address: s.collector.address,
      action: 'GTD_REVOKE',
      key: 'invite-one',
      evidence: proof,
    });
    await expect(s.service.export(s.adminToken, 'GTD')).rejects.toThrow(
      'NO_APPROVED_WALLETS',
    );
  });
  it('deduplicates overlapping GTD/WL wallets without fabricating public exclusion', async () => {
    const s = await setup(),
      token = await s.login();
    await s.service.apply(token, true);
    await s.service.decide(s.adminToken, {
      address: s.collector.address,
      action: 'GTD_GRANT',
      key: 'invite-five',
      kind: 'INVITATION',
      units: 5,
      evidence: proof,
    });
    await s.service.decide(s.adminToken, {
      address: s.collector.address,
      action: 'WL_APPROVE',
      units: 2,
      evidence: proof,
    });
    expect((await s.service.export(s.adminToken, 'GTD')).rows).toBe(1);
    expect((await s.service.export(s.adminToken, 'WL')).rows).toBe(1);
    const status = await s.service.status(token);
    expect(status.gtdAllowance + status.wlAllowance + 1).toBe(8);
    expect(
      s.store.state.records.filter(
        (r) => r.address === s.collector.address.toLowerCase(),
      ),
    ).toHaveLength(1);
  });
  it.each(['GTD', 'WL'] as const)(
    'serializes concurrent %s approvals and rolls back oversubscription',
    async (stage) => {
      const s = await setup();
      await s.login();
      await s.store.transaction((state) => {
        const total = stage === 'GTD' ? 390 : 158;
        for (let n = 0, remaining = total; remaining > 0; n++) {
          const units = Math.min(remaining, stage === 'GTD' ? 5 : 2);
          remaining -= units;
          state.records.push({
            address: addr(n + 100),
            verifiedAt: Date.now(),
            wl: stage === 'WL' ? 'APPROVED' : 'NOT_APPLIED',
            wlUnits: stage === 'WL' ? units : 0,
            wlEvidence: stage === 'WL' ? proof : null,
            grants:
              stage === 'GTD'
                ? [
                    {
                      key: 'seed-invite',
                      kind: 'INVITATION',
                      units,
                      evidence: proof,
                    },
                  ]
                : [],
            founderEvidence: null,
          });
        }
        state.records.find(
          (r) => r.address === s.collector.address.toLowerCase(),
        )!.wl = 'PENDING';
      });
      const other = account();
      await s.login(other);
      if (stage === 'WL')
        await s.store.transaction((state) => {
          state.records.find(
            (r) => r.address === other.address.toLowerCase(),
          )!.wl = 'PENDING';
        });
      const decide = (address: string) =>
        s.service.decide(s.adminToken, {
          address,
          action: stage === 'GTD' ? 'GTD_GRANT' : 'WL_APPROVE',
          units: 2,
          key: 'two-units',
          kind: 'INVITATION',
          evidence: proof,
        });
      const outcomes = await Promise.allSettled([
        decide(s.collector.address),
        decide(other.address),
      ]);
      expect(outcomes.filter((o) => o.status === 'fulfilled')).toHaveLength(1);
      expect((await s.service.export(s.adminToken, stage)).units).toBe(
        stage === 'GTD' ? 392 : 160,
      );
    },
  );
  it('rejects stale ownership evidence, invalid hashes and malformed addresses', async () => {
    const s = await setup();
    await s.login();
    s.advance(31 * 86400_000);
    const token = await s.login(s.admin, 'admin');
    await expect(
      s.service.decide(token, {
        address: s.collector.address,
        action: 'FOUNDER',
        evidence: proof,
      }),
    ).rejects.toThrow('OWNERSHIP_VERIFICATION_STALE');
    await expect(
      s.service.decide(token, {
        address: s.collector.address,
        action: 'FOUNDER',
        evidence: 'trust me',
      }),
    ).rejects.toThrow();
    expect(() => wallet('0x' + '0'.repeat(40))).toThrow('INVALID_WALLET');
    expect(() => wallet('alice.eth')).toThrow('INVALID_WALLET');
  });
});
describe('request boundaries and private data', () => {
  it('returns only capability flags when disabled and never lists wallets publicly', async () => {
    const res = await handleGenesis(
      new Request('https://lammb.fun/api/genesis/config'),
      'config',
      () => {
        throw new Error('secret-db-url');
      },
    );
    expect(await res.json()).toEqual({
      registrationEnabled: false,
      adminEnabled: false,
      mintEnabled: false,
    });
    const s = await setup();
    const privateRes = await handleGenesis(
      new Request('https://lammb.fun/api/genesis/admin-records'),
      'admin-records',
      () => s.service,
    );
    expect(privateRes.status).toBe(401);
    expect(await privateRes.text()).not.toContain(
      s.admin.address.toLowerCase(),
    );
    expect(privateRes.headers.get('cache-control')).toContain('no-store');
  });
  it('rejects cross-origin, unknown fields, invalid methods and public exports', async () => {
    const s = await setup();
    expect(
      (
        await handleGenesis(
          post(
            'challenge',
            { address: s.collector.address, purpose: 'collector' },
            '',
            'https://evil.example',
          ),
          'challenge',
          () => s.service,
        )
      ).status,
    ).toBe(403);
    expect(
      (
        await handleGenesis(
          post('challenge', {
            address: s.collector.address,
            purpose: 'collector',
            approved: true,
          }),
          'challenge',
          () => s.service,
        )
      ).status,
    ).toBe(400);
    expect(
      (
        await handleGenesis(
          post('export', { stage: 'PUBLIC' }),
          'export',
          () => s.service,
        )
      ).status,
    ).toBe(400);
    expect(
      (
        await handleGenesis(
          new Request('https://lammb.fun/api/genesis/apply'),
          'apply',
          () => s.service,
        )
      ).status,
    ).toBe(405);
    expect(
      (await handleGenesis(post('mint', {}), 'mint', () => s.service)).status,
    ).toBe(404);
  });
  it('bounds JSON body bytes without relying on Content-Length', async () => {
    const s = await setup();
    const r = await handleGenesis(
      post('challenge', { x: 'a'.repeat(4097) }),
      'challenge',
      () => s.service,
    );
    expect(r.status).toBe(413);
  });
  it('completes HTTP challenge, signature, private status, application and administrator export', async () => {
    const s = await setup();
    const cRes = await handleGenesis(
      post('challenge', { address: s.collector.address, purpose: 'collector' }),
      'challenge',
      () => s.service,
    );
    const c = await cRes.json(),
      challengeCookie = cRes.headers.get('set-cookie')!.split(';')[0]!;
    expect(c.binding).toBeUndefined();
    const vRes = await handleGenesis(
      post(
        'verify',
        {
          id: c.id,
          signature: await s.collector.signMessage({ message: c.message }),
        },
        challengeCookie,
      ),
      'verify',
      () => s.service,
    );
    expect(vRes.status).toBe(200);
    expect(vRes.headers.get('set-cookie')).toContain(
      'HttpOnly; SameSite=Strict',
    );
    const sessionCookie = vRes.headers.get('set-cookie')!.split(';')[0]!;
    const apply = await handleGenesis(
      post('apply', { consent: true }, sessionCookie),
      'apply',
      () => s.service,
    );
    expect((await apply.json()).status).toBe('PENDING');
    const sessionStatus = await handleGenesis(
      new Request('https://lammb.fun/api/genesis/status', {
        headers: { Cookie: sessionCookie },
      }),
      'status',
      () => s.service,
    );
    expect((await sessionStatus.json()).wl).toBe('PENDING');
    await s.service.decide(s.adminToken, {
      address: s.collector.address,
      action: 'WL_APPROVE',
      units: 2,
      evidence: proof,
    });
    const exportRes = await handleGenesis(
      post('export', { stage: 'WL' }, 'lammb_session=' + s.adminToken),
      'export',
      () => s.service,
    );
    expect(exportRes.status).toBe(200);
    expect(exportRes.headers.get('X-Allowlist-Units')).toBe('2');
    expect(hash(await exportRes.text())).toBe(
      exportRes.headers.get('X-Content-SHA256'),
    );
  });
});
describe('deployment and corruption fail closed', () => {
  const env = {
    NODE_ENV: 'production',
    GENESIS_REGISTRATION_ENABLED: 'true',
    GENESIS_ACTIVATION_REFERENCE: proof,
    GENESIS_ORIGIN: 'https://lammb.fun',
    GENESIS_RATE_SECRET: 'b'.repeat(64),
    GENESIS_DATABASE_URL: 'postgres://runtime:fake@db.example/genesis',
  };
  it('keeps both entrypoints inactive without an explicit activation reference', () => {
    expect(() => runtimeConfig({})).toThrow('REGISTRATION_INACTIVE');
    expect(() =>
      runtimeConfig({ ...env, GENESIS_ACTIVATION_REFERENCE: '' }),
    ).toThrow('ACTIVATION_REVIEW_REQUIRED');
    expect(runtimeConfig(env).ssl).toEqual({ rejectUnauthorized: true });
  });
  it.each([
    { GENESIS_ORIGIN: 'https://evil.example' },
    { GENESIS_DATABASE_URL: 'postgres://db.example/genesis?sslmode=no-verify' },
    { GENESIS_RATE_SECRET: 'short' },
    { GENESIS_APPROVED_PARTNERS: '{"invented":"unverified"}' },
    { GENESIS_ADMIN_ENABLED: 'true', GENESIS_ADMIN_WALLETS: '' },
  ])('rejects insecure runtime configuration %j', (change) => {
    expect(() => runtimeConfig({ ...env, ...change })).toThrow();
  });
  it('rejects duplicated state and invalid wallet allowances before commit', () => {
    const s = emptyState();
    const record = {
      address: addr(1),
      verifiedAt: Date.now(),
      wl: 'NOT_APPLIED' as const,
      wlUnits: 0,
      wlEvidence: null,
      grants: [],
      founderEvidence: null,
    };
    s.records.push(record, { ...record });
    expect(() => validateState(s)).toThrow('CORRUPT_DUPLICATE_STATE');
  });
  it('rejects orphaned sessions and expires unapproved data with bounded retention', () => {
    const s = emptyState(),
      now = Date.now();
    s.sessions.push({
      digest: 'a'.repeat(64),
      address: addr(1),
      purpose: 'collector',
      expires: now + 1000,
    });
    expect(() => validateState(s)).toThrow('ORPHANED_SESSION');
    s.records.push({
      address: addr(1),
      verifiedAt: now - 91 * 86400_000,
      wl: 'PENDING',
      wlUnits: 0,
      wlEvidence: null,
      grants: [],
      founderEvidence: null,
    });
    s.records.push({
      address: addr(2),
      verifiedAt: now - 91 * 86400_000,
      wl: 'APPROVED',
      wlUnits: 1,
      wlEvidence: proof,
      grants: [],
      founderEvidence: null,
    });
    s.audit.push({
      actor: addr(1),
      target: addr(1),
      at: now - 181 * 86400_000,
      action: 'WL_APPLIED_PRIVACY_V1',
      evidence: null,
    });
    prune(s, now);
    expect(s.records.map((r) => r.address)).toEqual([addr(2)]);
    expect(s.sessions).toEqual([]);
    expect(s.audit).toEqual([]);
    expect(() => validateState(s)).not.toThrow();
  });
  it('rate-limits submission requests durably and isolates private wallet statuses', async () => {
    const s = await setup(),
      a = await s.login(),
      b = await s.login(s.founder);
    for (let n = 0; n < 10; n++)
      await s.service.limitRequest('client', 'apply');
    await expect(s.service.limitRequest('client', 'apply')).rejects.toThrow(
      'RATE_LIMITED',
    );
    expect((await s.service.status(a)).address).toBe(
      s.collector.address.toLowerCase(),
    );
    expect((await s.service.status(b)).address).toBe(
      s.founder.address.toLowerCase(),
    );
  });
});
