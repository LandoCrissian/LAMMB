-- Run explicitly against a private, backed-up PostgreSQL database with a migration
-- role. Runtime DML role receives only SELECT/UPDATE on this single table.
BEGIN;
CREATE TABLE genesis_registration_state (
  id smallint PRIMARY KEY CHECK (id = 1),
  revision bigint NOT NULL DEFAULT 0 CHECK (revision >= 0),
  data jsonb NOT NULL CHECK (data->>'version' = '1')
    CHECK (octet_length(data::text) <= 8388608)
);
INSERT INTO genesis_registration_state(id, data) VALUES
 (1, '{"version":1,"records":[],"challenges":[],"sessions":[],"rates":[],"audit":[]}');
COMMIT;
