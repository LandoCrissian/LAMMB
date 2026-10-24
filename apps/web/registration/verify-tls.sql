-- Always require TLS here. Disposable loopback CI is NOT production TLS evidence.
BEGIN READ ONLY;
SET LOCAL statement_timeout = '5000ms';
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_stat_ssl WHERE pid = pg_backend_pid() AND ssl)
    THEN RAISE EXCEPTION 'GENESIS_VERIFIED_TLS_REQUIRED'; END IF;
END $$;
SELECT 'PASS_ENCRYPTED_CONNECTION' AS result, version, cipher
  FROM pg_stat_ssl WHERE pid = pg_backend_pid();
ROLLBACK;
