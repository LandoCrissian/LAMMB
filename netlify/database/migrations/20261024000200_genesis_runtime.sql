-- No credentials in migrations. Owner enables LOGIN privately only after review.
-- Neon SQL-created roles do not receive neon_superuser membership.
BEGIN;
SET LOCAL statement_timeout = '10000ms';
SELECT pg_advisory_xact_lock(hashtextextended(current_schema() || ':genesis-migrations', 0));
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'lammb_genesis_runtime') THEN
    CREATE ROLE lammb_genesis_runtime NOLOGIN NOINHERIT NOSUPERUSER
      NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS;
  END IF;
  IF EXISTS (SELECT FROM pg_roles WHERE rolname = 'lammb_genesis_runtime'
      AND (rolsuper OR rolcreatedb OR rolcreaterole OR rolreplication OR rolbypassrls))
    OR EXISTS (SELECT FROM pg_auth_members WHERE member = 'lammb_genesis_runtime'::regrole)
    OR EXISTS (SELECT FROM pg_class WHERE oid = 'genesis_registration_state'::regclass
      AND relowner = 'lammb_genesis_runtime'::regrole)
    OR has_schema_privilege('lammb_genesis_runtime', current_schema(), 'CREATE')
    OR has_database_privilege('lammb_genesis_runtime', current_database(), 'CREATE')
    THEN RAISE EXCEPTION 'GENESIS_RUNTIME_ROLE_REVIEW_REQUIRED'; END IF;
  EXECUTE format('GRANT USAGE ON SCHEMA %I TO lammb_genesis_runtime', current_schema());
END $$;
REVOKE ALL ON genesis_registration_state FROM lammb_genesis_runtime;
GRANT SELECT, UPDATE ON genesis_registration_state TO lammb_genesis_runtime;
COMMIT;
