-- Native deploy lifecycle, version 1. Never edit after application.
-- Adopts the exact historical 001 contract without resetting existing data.
BEGIN;
SET LOCAL statement_timeout = '10000ms';
SELECT pg_advisory_xact_lock(hashtextextended(current_schema() || ':genesis-migrations', 0));

CREATE TEMP TABLE genesis_expected_contract (
  id smallint PRIMARY KEY CHECK (id = 1),
  revision bigint NOT NULL DEFAULT 0 CHECK (revision >= 0),
  data jsonb NOT NULL CHECK (data->>'version' = '1')
    CHECK (octet_length(data::text) <= 8388608)
) ON COMMIT DROP;

DO $$
DECLARE
  actual regclass := to_regclass('genesis_registration_state');
  expected regclass := 'pg_temp.genesis_expected_contract'::regclass;
  columns_actual jsonb;
  columns_expected jsonb;
  constraints_actual text[];
  constraints_expected text[];
BEGIN
  IF actual IS NULL THEN
    CREATE TABLE genesis_registration_state (
      id smallint PRIMARY KEY CHECK (id = 1),
      revision bigint NOT NULL DEFAULT 0 CHECK (revision >= 0),
      data jsonb NOT NULL CHECK (data->>'version' = '1')
        CHECK (octet_length(data::text) <= 8388608)
    );
    INSERT INTO genesis_registration_state(id, data) VALUES
      (1, '{"version":1,"records":[],"challenges":[],"sessions":[],"rates":[],"audit":[]}');
    actual := 'genesis_registration_state'::regclass;
  END IF;
  LOCK TABLE genesis_registration_state IN ACCESS EXCLUSIVE MODE;
  IF NOT EXISTS (SELECT FROM pg_class WHERE oid = actual AND relkind = 'r'
      AND NOT relrowsecurity AND NOT relforcerowsecurity)
    OR EXISTS (SELECT FROM pg_trigger WHERE tgrelid = actual AND NOT tgisinternal)
    OR EXISTS (SELECT FROM pg_inherits WHERE inhrelid = actual OR inhparent = actual)
    THEN RAISE EXCEPTION 'GENESIS_EXISTING_SCHEMA_REVIEW_REQUIRED'; END IF;
  SELECT jsonb_agg(jsonb_build_array(a.attname, a.atttypid, a.atttypmod,
      a.attnotnull, a.attidentity, a.attgenerated, pg_get_expr(d.adbin, d.adrelid)) ORDER BY a.attnum)
    INTO columns_actual FROM pg_attribute a
    LEFT JOIN pg_attrdef d ON d.adrelid = a.attrelid AND d.adnum = a.attnum
    WHERE a.attrelid = actual AND a.attnum > 0 AND NOT a.attisdropped;
  SELECT jsonb_agg(jsonb_build_array(a.attname, a.atttypid, a.atttypmod,
      a.attnotnull, a.attidentity, a.attgenerated, pg_get_expr(d.adbin, d.adrelid)) ORDER BY a.attnum)
    INTO columns_expected FROM pg_attribute a
    LEFT JOIN pg_attrdef d ON d.adrelid = a.attrelid AND d.adnum = a.attnum
    WHERE a.attrelid = expected AND a.attnum > 0 AND NOT a.attisdropped;
  SELECT array_agg(pg_get_constraintdef(oid) ORDER BY pg_get_constraintdef(oid))
    INTO constraints_actual FROM pg_constraint WHERE conrelid = actual;
  SELECT array_agg(pg_get_constraintdef(oid) ORDER BY pg_get_constraintdef(oid))
    INTO constraints_expected FROM pg_constraint WHERE conrelid = expected;
  IF columns_actual IS DISTINCT FROM columns_expected
    OR constraints_actual IS DISTINCT FROM constraints_expected
    THEN RAISE EXCEPTION 'GENESIS_EXISTING_SCHEMA_REVIEW_REQUIRED'; END IF;
  IF (SELECT count(*) FROM genesis_registration_state) <> 1
    OR NOT EXISTS (SELECT FROM genesis_registration_state WHERE id = 1 AND revision >= 0
      AND data->>'version' = '1' AND octet_length(data::text) <= 8388608
      AND jsonb_typeof(data->'records') = 'array'
      AND jsonb_typeof(data->'sessions') = 'array'
      AND jsonb_typeof(data->'challenges') = 'array'
      AND jsonb_typeof(data->'rates') = 'array'
      AND jsonb_typeof(data->'audit') = 'array')
    THEN RAISE EXCEPTION 'GENESIS_EXISTING_STATE_REVIEW_REQUIRED'; END IF;
END $$;
REVOKE ALL ON genesis_registration_state FROM PUBLIC;
COMMIT;
