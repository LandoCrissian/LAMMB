-- Read-only operator preflight. Connect AS the runtime role, using the reviewed
-- application search_path and TLS verify-full (see activation-checklist.md).
-- No private wallet, session, rate key or connection credential is returned.
BEGIN READ ONLY;
SET LOCAL statement_timeout = '5000ms';
DO $$
DECLARE
  state_table regclass := to_regclass('genesis_registration_state');
  permitted boolean;
BEGIN
  IF state_table IS NULL THEN RAISE EXCEPTION 'GENESIS_MIGRATION_REQUIRED'; END IF;
  SELECT NOT (rolsuper OR rolcreatedb OR rolcreaterole OR rolreplication OR rolbypassrls)
    INTO permitted FROM pg_roles WHERE rolname = current_user;
  IF permitted IS DISTINCT FROM true THEN RAISE EXCEPTION 'GENESIS_RUNTIME_ROLE_PRIVILEGED'; END IF;
  IF EXISTS (SELECT FROM pg_class WHERE oid = state_table AND pg_has_role(current_user, relowner, 'MEMBER'))
    OR has_schema_privilege(current_user, current_schema(), 'CREATE')
    OR has_database_privilege(current_user, current_database(), 'CREATE')
    THEN RAISE EXCEPTION 'GENESIS_RUNTIME_DDL_PRIVILEGE'; END IF;
  IF NOT has_table_privilege(current_user, state_table, 'SELECT')
    OR NOT has_table_privilege(current_user, state_table, 'UPDATE')
    THEN RAISE EXCEPTION 'GENESIS_RUNTIME_DML_REQUIRED'; END IF;
  IF has_table_privilege(current_user, state_table, 'INSERT')
    OR has_table_privilege(current_user, state_table, 'DELETE')
    OR has_table_privilege(current_user, state_table, 'TRUNCATE')
    OR has_table_privilege(current_user, state_table, 'REFERENCES')
    OR has_table_privilege(current_user, state_table, 'TRIGGER')
    THEN RAISE EXCEPTION 'GENESIS_RUNTIME_EXCESS_DML'; END IF;
  IF (SELECT count(*) FROM genesis_registration_state) <> 1
    OR NOT EXISTS (SELECT FROM genesis_registration_state WHERE id = 1 AND revision >= 0
      AND data->>'version' = '1' AND octet_length(data::text) <= 8388608
      AND jsonb_typeof(data->'records') = 'array'
      AND jsonb_typeof(data->'sessions') = 'array'
      AND jsonb_typeof(data->'challenges') = 'array'
      AND jsonb_typeof(data->'rates') = 'array'
      AND jsonb_typeof(data->'audit') = 'array')
    THEN RAISE EXCEPTION 'GENESIS_RUNTIME_STATE_INVALID'; END IF;
END $$;
SELECT 'PASS_RUNTIME_ROLE_AND_SCHEMA' AS result, revision,
  octet_length(data::text) AS state_bytes
  FROM genesis_registration_state WHERE id = 1;
ROLLBACK;
