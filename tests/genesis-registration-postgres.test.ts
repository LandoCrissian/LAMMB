import { randomBytes } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { Pool } from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { PostgresStore } from '../apps/web/src/lib/genesis/store';
import { emptyState } from '../apps/web/src/lib/genesis/model';
import { RegistrationService, hash } from '../apps/web/src/lib/genesis/service';

const database = process.env.GENESIS_TEST_DATABASE_URL;
if (process.env.GITHUB_ACTIONS === 'true' && !database)
  throw new Error(
    'CI requires an isolated PostgreSQL registration test database',
  );
const schema = 'task080_' + randomBytes(8).toString('hex');
const admin = '0x' + '1'.repeat(40),
  first = '0x' + '2'.repeat(40),
  second = '0x' + '3'.repeat(40);
const proof = 'sha256:' + 'a'.repeat(64);
const token = randomBytes(32).toString('hex');
describe.skipIf(!database)('real PostgreSQL registration transactions', () => {
  let pool: Pool, otherPool: Pool, bootstrap: Pool;
  let service: RegistrationService,
    other: RegistrationService,
    store: PostgresStore;
  beforeAll(async () => {
    const url = new URL(database!);
    if (
      !['localhost', '127.0.0.1'].includes(url.hostname) ||
      !url.pathname.startsWith('/lammb_genesis_test')
    )
      throw new Error('Refusing non-disposable registration test database');
    bootstrap = new Pool({ connectionString: database });
    await bootstrap.query('CREATE SCHEMA "' + schema + '"');
    pool = new Pool({
      connectionString: database,
      options: '-c search_path=' + schema,
      max: 2,
    });
    otherPool = new Pool({
      connectionString: database,
      options: '-c search_path=' + schema,
      max: 2,
    });
    await pool.query(
      await readFile('apps/web/registration/001-genesis.sql', 'utf8'),
    );
    store = new PostgresStore(pool);
    const config = {
      origin: 'https://lammb.fun',
      publicEnabled: true,
      adminEnabled: true,
      adminWallets: [admin],
      rateSecret: 'a'.repeat(64),
      approvedPartners: {},
      privateVerificationWallets: [],
    };
    service = new RegistrationService(store, config);
    other = new RegistrationService(new PostgresStore(otherPool), config);
  });
  afterAll(async () => {
    await pool?.end();
    await otherPool?.end();
    if (bootstrap) {
      await bootstrap.query('DROP SCHEMA "' + schema + '" CASCADE');
      await bootstrap.end();
    }
  });
  async function seed() {
    const s = emptyState(),
      now = Date.now();
    s.records = [admin, first, second].map((address) => ({
      address,
      verifiedAt: now,
      wl: 'PENDING',
      wlUnits: 0,
      wlEvidence: null,
      grants: [],
      founderEvidence: null,
    }));
    s.sessions = [
      {
        digest: hash(token),
        address: admin,
        expires: now + 900000,
        purpose: 'admin',
      },
    ];
    for (let i = 1; i <= 79; i++)
      s.records.push({
        address: '0x' + (i + 100).toString(16).padStart(40, '0'),
        verifiedAt: now,
        wl: 'APPROVED',
        wlUnits: 2,
        wlEvidence: proof,
        grants: [],
        founderEvidence: null,
      });
    await pool.query(
      'UPDATE genesis_registration_state SET data=$1::jsonb WHERE id=1',
      [JSON.stringify(s)],
    );
  }
  it('serializes independent pools at the WL cap, committing one approval and rolling back the other', async () => {
    await seed();
    const approve = (s: RegistrationService, address: string) =>
      s.decide(token, {
        address,
        action: 'WL_APPROVE',
        units: 2,
        evidence: proof,
      });
    const results = await Promise.allSettled([
      approve(service, first),
      approve(other, second),
    ]);
    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
    const output = await service.export(token, 'WL');
    expect(output.units).toBe(160);
    expect(output.rows).toBe(80);
    expect(output.csv.split('\r\n').filter(Boolean)).toHaveLength(80);
    expect(output.sha256).toBe(hash(output.csv));
  });
  it('rolls back an interrupted transaction and preserves the connection for subsequent use', async () => {
    await seed();
    await expect(
      store.transaction((s) => {
        s.records.length = 0;
        throw new Error('simulated interruption');
      }),
    ).rejects.toThrow('simulated interruption');
    expect((await service.adminList(token)).length).toBe(82);
  });
  it('consumes a challenge exactly once across independent processes/pools', async () => {
    await seed();
    const c = await service.challenge(first, 'collector', 'test-client');
    const results = await Promise.allSettled([
      service.verify(c.id, c.binding, '0x00', 'test-client'),
      other.verify(c.id, c.binding, '0x00', 'test-client'),
    ]);
    expect(results.every((r) => r.status === 'rejected')).toBe(true);
    expect(
      results.map((r) => (r.status === 'rejected' ? r.reason.message : '')),
    ).toContain('CHALLENGE_INVALID');
    expect(
      (
        await pool.query(
          'SELECT data FROM genesis_registration_state WHERE id=1',
        )
      ).rows[0].data.challenges,
    ).toEqual([]);
  });
  it('fails closed on corrupted state without overwriting evidence', async () => {
    await pool.query(
      'UPDATE genesis_registration_state SET data = \'{"version":1}\'::jsonb WHERE id=1',
    );
    await expect(service.adminList(token)).rejects.toThrow();
    expect(
      (
        await pool.query(
          'SELECT data FROM genesis_registration_state WHERE id=1',
        )
      ).rows[0].data,
    ).toEqual({ version: 1 });
  });
});
