import { randomBytes } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { Pool } from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { PostgresStore } from '../apps/web/src/lib/genesis/store';
import { emptyState, validateState } from '../apps/web/src/lib/genesis/model';
import { RegistrationService, hash } from '../apps/web/src/lib/genesis/service';

const database = process.env.GENESIS_TEST_DATABASE_URL;
if (process.env.GITHUB_ACTIONS === 'true' && !database)
  throw new Error('CI requires disposable PostgreSQL for native migrations');
const prefix = 'task082_' + randomBytes(8).toString('hex');
const role = 'lammb_genesis_runtime';
const stateMigration =
  'netlify/database/migrations/20261024000100_genesis_state.sql';
const roleMigration =
  'netlify/database/migrations/20261024000200_genesis_runtime.sql';
const address = '0x' + '1'.repeat(40);

describe.skipIf(!database)('native migration and runtime PostgreSQL', () => {
  let owner: Pool, pool: Pool, runtime: Pool, other: Pool;
  const schemas: string[] = [];
  let ownedRole = false;
  async function isolated(suffix: string) {
    const schema = prefix + '_' + suffix;
    await owner.query('CREATE SCHEMA "' + schema + '"');
    schemas.push(schema);
    return new Pool({
      connectionString: database,
      options: '-c search_path=' + schema,
      max: 2,
    });
  }
  async function apply(target: Pool, filename: string) {
    const client = await target.connect();
    try {
      await client.query(await readFile(filename, 'utf8'));
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
  beforeAll(async () => {
    const url = new URL(database!);
    if (
      !['localhost', '127.0.0.1'].includes(url.hostname) ||
      !url.pathname.startsWith('/lammb_genesis_test')
    )
      throw new Error('Refusing non-disposable native migration database');
    owner = new Pool({ connectionString: database });
    if (
      (await owner.query('SELECT FROM pg_roles WHERE rolname=$1', [role]))
        .rowCount
    )
      throw new Error('Refusing to change a preexisting test role');
    pool = await isolated('native');
    await apply(pool, stateMigration);
    await apply(pool, roleMigration);
    ownedRole = true;
    const attributes = (
      await pool.query(
        'SELECT rolcanlogin, rolinherit FROM pg_roles WHERE rolname=$1',
        [role],
      )
    ).rows[0];
    expect(attributes).toEqual({ rolcanlogin: false, rolinherit: false });
    const password = randomBytes(32).toString('hex');
    await owner.query(
      'ALTER ROLE ' + role + " LOGIN PASSWORD '" + password + "'",
    );
    url.username = role;
    url.password = password;
    const config = {
      connectionString: url.toString(),
      options: '-c search_path=' + schemas[0],
      max: 2,
    };
    runtime = new Pool(config);
    other = new Pool(config);
  });
  afterAll(async () => {
    await runtime?.end();
    await other?.end();
    await pool?.end();
    if (owner) {
      for (const schema of schemas)
        await owner.query('DROP SCHEMA "' + schema + '" CASCADE');
      if (ownedRole) {
        await owner.query('DROP OWNED BY ' + role);
        await owner.query('DROP ROLE ' + role);
      }
      await owner.end();
    }
  });

  it('initializes one bounded row and permits guarded SELECT/UPDATE only', async () => {
    const store = new PostgresStore(runtime, { requireTls: false });
    await store.transaction((state) => expect(state).toEqual(emptyState()));
    await runtime.query(
      await readFile('apps/web/registration/verify-runtime.sql', 'utf8'),
    );
    for (const sql of [
      'DELETE FROM genesis_registration_state',
      'TRUNCATE genesis_registration_state',
      "INSERT INTO genesis_registration_state(id,data) VALUES(1,'{}')",
      'CREATE TABLE forbidden(id int)',
      'ALTER TABLE genesis_registration_state ADD COLUMN forbidden int',
    ])
      await expect(runtime.query(sql)).rejects.toThrow(
        /permission denied|must be owner/,
      );
  });
  it('adopts an exact historical schema without changing private state or revision and tolerates replay', async () => {
    const target = await isolated('adopt');
    try {
      await apply(target, 'apps/web/registration/001-genesis.sql');
      const state = emptyState();
      state.records.push({
        address,
        verifiedAt: Date.now(),
        wl: 'PENDING',
        wlUnits: 0,
        wlEvidence: null,
        grants: [],
        founderEvidence: null,
      });
      state.rates.push({
        key: hash('synthetic'),
        start: Date.now(),
        count: 3,
      });
      await target.query(
        'UPDATE genesis_registration_state SET revision=42, data=$1::jsonb',
        [JSON.stringify(validateState(state))],
      );
      const before = (
        await target.query(
          'SELECT revision,data::text FROM genesis_registration_state',
        )
      ).rows;
      await apply(target, stateMigration);
      await apply(target, roleMigration);
      await apply(target, stateMigration);
      await apply(target, roleMigration);
      expect(
        (
          await target.query(
            'SELECT revision,data::text FROM genesis_registration_state',
          )
        ).rows,
      ).toEqual(before);
    } finally {
      await target.end();
    }
  });
  it.each([
    [
      'column',
      'ALTER TABLE genesis_registration_state ADD COLUMN unexpected int',
      'GENESIS_EXISTING_SCHEMA_REVIEW_REQUIRED',
    ],
    [
      'constraint',
      'ALTER TABLE genesis_registration_state DROP CONSTRAINT genesis_registration_state_data_check',
      'GENESIS_EXISTING_SCHEMA_REVIEW_REQUIRED',
    ],
    [
      'state',
      'UPDATE genesis_registration_state SET data=\'{"version":1}\'::jsonb',
      'GENESIS_EXISTING_STATE_REVIEW_REQUIRED',
    ],
  ])(
    'rejects incompatible existing %s atomically, preserving the original evidence',
    async (suffix, change, error) => {
      const target = await isolated(suffix);
      try {
        await apply(target, 'apps/web/registration/001-genesis.sql');
        await target.query(change);
        const before = (
          await target.query(
            'SELECT revision,data::text FROM genesis_registration_state',
          )
        ).rows;
        await expect(apply(target, stateMigration)).rejects.toThrow(error);
        expect(
          (
            await target.query(
              'SELECT revision,data::text FROM genesis_registration_state',
            )
          ).rows,
        ).toEqual(before);
        expect(
          (
            await target.query(
              "SELECT to_regclass('pg_temp.genesis_expected_contract') AS temp",
            )
          ).rows[0].temp,
        ).toBeNull();
      } finally {
        await target.end();
      }
    },
  );
  it('fails before mutation for owner connections, excess privileges and unencrypted runtime connections', async () => {
    const before = (
      await pool.query(
        'SELECT revision,data::text FROM genesis_registration_state',
      )
    ).rows;
    await expect(
      new PostgresStore(pool, { requireTls: false }).transaction(() => {}),
    ).rejects.toThrow('DATABASE_RUNTIME_PERMISSIONS_INVALID');
    await expect(
      new PostgresStore(runtime, { requireTls: true }).transaction(() => {}),
    ).rejects.toThrow('DATABASE_VERIFIED_TLS_REQUIRED');
    await pool.query('GRANT DELETE ON genesis_registration_state TO ' + role);
    try {
      await expect(
        new PostgresStore(runtime, { requireTls: false }).transaction(() => {}),
      ).rejects.toThrow('DATABASE_RUNTIME_PERMISSIONS_INVALID');
      // Reapplying the grant migration narrows table privileges, never data.
      await apply(pool, roleMigration);
    } finally {
      await pool.query(
        'REVOKE DELETE ON genesis_registration_state FROM ' + role,
      );
    }
    expect(
      (
        await pool.query(
          'SELECT revision,data::text FROM genesis_registration_state',
        )
      ).rows,
    ).toEqual(before);
  });
  it('refuses to adopt a runtime role with unexpected role membership', async () => {
    const parent = prefix + '_parent';
    await owner.query('CREATE ROLE "' + parent + '" NOLOGIN');
    await owner.query('GRANT "' + parent + '" TO ' + role);
    try {
      await expect(apply(pool, roleMigration)).rejects.toThrow(
        'GENESIS_RUNTIME_ROLE_REVIEW_REQUIRED',
      );
    } finally {
      await owner.query('REVOKE "' + parent + '" FROM ' + role);
      await owner.query('DROP ROLE "' + parent + '"');
    }
  });
  it('keeps rates atomic and durable across restricted native-schema pool instances', async () => {
    const config = {
      origin: 'https://lammb.fun',
      publicEnabled: true,
      adminEnabled: false,
      adminWallets: [],
      rateSecret: 'a'.repeat(64),
      approvedPartners: {},
      privateVerificationWallets: [],
    };
    const first = new RegistrationService(
      new PostgresStore(runtime, { requireTls: false }),
      config,
    );
    const second = new RegistrationService(
      new PostgresStore(other, { requireTls: false }),
      config,
    );
    const attempts = await Promise.allSettled(
      Array.from({ length: 12 }, (_, i) =>
        (i % 2 ? first : second).limitRequest('native-client', 'apply'),
      ),
    );
    expect(
      attempts.filter((result) => result.status === 'fulfilled'),
    ).toHaveLength(10);
    expect(
      attempts.filter((result) => result.status === 'rejected'),
    ).toHaveLength(2);
    await expect(second.limitRequest('native-client', 'apply')).rejects.toThrow(
      'RATE_LIMITED',
    );
  });
});
