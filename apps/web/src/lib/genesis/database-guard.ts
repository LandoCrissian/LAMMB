import type { PoolClient } from 'pg';
import { GenesisError } from './model';

// Runs inside the SAME checked-out transaction, with no credentials or wallet
// values in the result. SET ROLE is intentionally not an access-control boundary.
export async function verifyDatabaseAccess(
  client: PoolClient,
  requireTls: boolean,
) {
  const { rows } = await client.query<{
    restricted: boolean;
    encrypted: boolean;
  }>(`
    SELECT
      NOT (r.rolsuper OR r.rolcreatedb OR r.rolcreaterole OR r.rolreplication OR r.rolbypassrls)
      AND NOT pg_has_role(current_user, c.relowner, 'MEMBER')
      AND NOT has_database_privilege(current_user, current_database(), 'CREATE')
      AND NOT has_schema_privilege(current_user, n.oid, 'CREATE')
      AND has_table_privilege(current_user, c.oid, 'SELECT')
      AND has_table_privilege(current_user, c.oid, 'UPDATE')
      AND NOT has_table_privilege(current_user, c.oid, 'INSERT,DELETE,TRUNCATE,REFERENCES,TRIGGER')
      AS restricted,
      COALESCE((SELECT ssl FROM pg_stat_ssl WHERE pid = pg_backend_pid()), false) AS encrypted
    FROM pg_roles r
    JOIN pg_class c ON c.oid = to_regclass('genesis_registration_state')
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE r.rolname = current_user
  `);
  const access = rows[0];
  if (rows.length !== 1 || !access || access.restricted !== true)
    throw new GenesisError('DATABASE_RUNTIME_PERMISSIONS_INVALID', 503);
  if (requireTls && access.encrypted !== true)
    throw new GenesisError('DATABASE_VERIFIED_TLS_REQUIRED', 503);
}
