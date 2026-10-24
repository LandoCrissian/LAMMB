import { randomBytes } from 'node:crypto';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Pool } from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { PostgresStore } from '../apps/web/src/lib/genesis/store';
import { emptyState, validateState } from '../apps/web/src/lib/genesis/model';
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
  it('preserves rate limits across fresh service instances and independent database pools', async () => {
    await seed();
    for (let n = 0; n < 10; n++)
      await service.limitRequest('restart-client', 'apply');
    await expect(other.limitRequest('restart-client', 'apply')).rejects.toThrow(
      'RATE_LIMITED',
    );
    expect(
      (
        await pool.query(
          'SELECT data FROM genesis_registration_state WHERE id=1',
        )
      ).rows[0].data.rates,
    ).toHaveLength(1);
  });
  it('rehearses least-privilege runtime transactions and the read-only operator preflight', async () => {
    await seed();
    const role = schema + '_runtime';
    const testPassword = randomBytes(32).toString('hex');
    const runtimeUrl = new URL(database!);
    runtimeUrl.username = role;
    runtimeUrl.password = testPassword;
    const runtime = new Pool({
      connectionString: runtimeUrl.toString(),
      options: '-c search_path=' + schema,
    });
    try {
      await bootstrap.query(
        'CREATE ROLE "' +
          role +
          '" LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS PASSWORD \'' +
          testPassword +
          "'",
      );
      await bootstrap.query(
        'GRANT USAGE ON SCHEMA "' + schema + '" TO "' + role + '"',
      );
      await bootstrap.query(
        'GRANT SELECT, UPDATE ON "' +
          schema +
          '".genesis_registration_state TO "' +
          role +
          '"',
      );
      const before = (
        await pool.query(
          'SELECT revision FROM genesis_registration_state WHERE id=1',
        )
      ).rows[0].revision;
      await runtime.query(
        await readFile('apps/web/registration/verify-runtime.sql', 'utf8'),
      );
      expect(
        (
          await pool.query(
            'SELECT revision FROM genesis_registration_state WHERE id=1',
          )
        ).rows[0].revision,
      ).toBe(before);
      await new PostgresStore(runtime).transaction((s) => {
        expect(s.records).toHaveLength(82);
      });
      for (const sql of [
        'DELETE FROM genesis_registration_state',
        'TRUNCATE genesis_registration_state',
        'CREATE TABLE forbidden(id int)',
        "INSERT INTO genesis_registration_state(id,data) VALUES (1,'{}')",
      ]) {
        await expect(runtime.query(sql)).rejects.toThrow(/permission denied/);
      }
      // Owner/superuser connections must fail the same production preflight.
      const ownerClient = await pool.connect();
      try {
        await expect(
          ownerClient.query(
            await readFile('apps/web/registration/verify-runtime.sql', 'utf8'),
          ),
        ).rejects.toThrow('GENESIS_RUNTIME_ROLE_PRIVILEGED');
      } finally {
        await ownerClient.query('ROLLBACK');
        ownerClient.release();
      }
      // This CI service is explicitly unencrypted loopback; do not label it TLS-tested.
      const tlsClient = await runtime.connect();
      try {
        await expect(
          tlsClient.query(
            await readFile('apps/web/registration/verify-tls.sql', 'utf8'),
          ),
        ).rejects.toThrow('GENESIS_VERIFIED_TLS_REQUIRED');
      } finally {
        await tlsClient.query('ROLLBACK');
        tlsClient.release();
      }
    } finally {
      await runtime.end();
      await bootstrap.query('DROP OWNED BY "' + role + '"');
      await bootstrap.query('DROP ROLE "' + role + '"');
    }
  });
  it('recovers an independently read private state snapshot into a disposable schema without changing the source', async () => {
    await seed();
    for (let n = 0; n < 10; n++)
      await service.limitRequest('recovery-client', 'apply');
    const source = (
      await otherPool.query(
        'SELECT revision, data::text AS bytes FROM genesis_registration_state WHERE id=1',
      )
    ).rows[0];
    const dir = await mkdtemp(join(tmpdir(), 'lammb-db-recovery-'));
    const recoverySchema = schema + '_recovery';
    const recovered = new Pool({
      connectionString: database,
      options: '-c search_path=' + recoverySchema,
    });
    try {
      const filename = join(dir, 'private-state.json');
      await writeFile(filename, source.bytes, { flag: 'wx', mode: 0o600 });
      const bytes = await readFile(filename);
      expect(hash(bytes.toString('utf8'))).toBe(hash(source.bytes));
      const state = validateState(JSON.parse(bytes.toString('utf8')));
      await bootstrap.query('CREATE SCHEMA "' + recoverySchema + '"');
      await recovered.query(
        await readFile('apps/web/registration/001-genesis.sql', 'utf8'),
      );
      await recovered.query(
        'UPDATE genesis_registration_state SET revision=$1, data=$2::jsonb WHERE id=1',
        [source.revision, JSON.stringify(state)],
      );
      const independent = (
        await recovered.query(
          'SELECT data::text AS bytes FROM genesis_registration_state WHERE id=1',
        )
      ).rows[0].bytes;
      expect(hash(independent)).toBe(hash(source.bytes));
      // Restore must invalidate pre-incident authentication while retaining
      // approvals/audit and durable rate buckets. Apply only to this test copy.
      await new PostgresStore(recovered).transaction((s) => {
        s.sessions = [];
        s.challenges = [];
      });
      const restoredService = new RegistrationService(
        new PostgresStore(recovered),
        service.config,
      );
      await expect(restoredService.adminList(token)).rejects.toThrow(
        'SESSION_REQUIRED',
      );
      await expect(
        restoredService.limitRequest('recovery-client', 'apply'),
      ).rejects.toThrow('RATE_LIMITED');
      const after = (
        await pool.query(
          'SELECT revision, data::text AS bytes FROM genesis_registration_state WHERE id=1',
        )
      ).rows[0];
      expect(after).toEqual(source);
    } finally {
      await recovered.end();
      await bootstrap.query(
        'DROP SCHEMA IF EXISTS "' + recoverySchema + '" CASCADE',
      );
      await rm(dir, { recursive: true, force: true });
    }
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
