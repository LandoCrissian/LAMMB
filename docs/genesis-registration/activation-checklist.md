# Genesis database and activation handoff

Task081 starts at PR37 `8abca00bd7d3dd89be17fb67373a5ae700ec1608`.
This is a setup procedure for review, not authorization to execute production
DDL, deploy, merge, enable registration or mint. No production database was
connected or created. No real wallets, credentials or private records were read.
Use the final PR's exact head and attached CI results when adopting this procedure.

## Hosting decision

Retain the existing Netlify site associated with `lammb.fun`. Its actual site ID,
plan, installed adapter, database attachment and connection limits require owner
inspection; repository files alone do not establish them. Netlify documents
[Next.js Route Handler support](https://docs.netlify.com/build/frameworks/framework-setup-guides/nextjs/overview/),
so a separate API host is unnecessary for this Node/pg implementation.

First reuse a suitable existing private PostgreSQL database or isolated database
within the existing hosting account. If none exists, inspect the site's
[Netlify Database](https://docs.netlify.com/build/data-and-storage/netlify-database/)
availability and billing before proposing provisioning. Availability depends on
the account plan; do not silently create a paid service. This code uses the
standard PostgreSQL TCP protocol and transactions, not a provider HTTP driver.
Require a verified TLS endpoint, restricted runtime role and a documented
backup/restore facility. An attached database's generated owner URL is not a
least-privilege runtime credential. If the provider cannot supply these controls,
stop that setup and report the specific incompatibility.

No automatic database migration is installed in the build or request handler.
Preview deployments must never inherit the production database URL, rate secret,
wallet config or activation flags. Keep their registration/admin flags false.
Database branches and previews must not publicly expose copied wallet records.

## Exact settings (server runtime only)

| Setting                                | Prepared value / owner action                                                    |
| -------------------------------------- | -------------------------------------------------------------------------------- |
| `GENESIS_REGISTRATION_ENABLED`         | `false`; separate approval required before `true`                                |
| `GENESIS_ADMIN_ENABLED`                | `false`; separate private-admin activation approval required                     |
| `GENESIS_ORIGIN`                       | Exactly `https://lammb.fun`; redirects/aliases must not change signing authority |
| `GENESIS_ACTIVATION_REFERENCE`         | `sha256:<reviewed activation-record digest>`; retain actual approval privately   |
| `GENESIS_DATABASE_URL`                 | Dedicated runtime-role PostgreSQL URL; no `ssl*` query options; never publish    |
| `GENESIS_DATABASE_CA`                  | Provider's reviewed PEM CA if not in Node's trust store; no certificate bypass   |
| `GENESIS_RATE_SECRET`                  | Operator-generated 32–64 random bytes encoded as 64–128 lowercase hex chars      |
| `GENESIS_ADMIN_WALLETS`                | Owner-verified EOA addresses only; private, no invented value                    |
| `GENESIS_PRIVATE_VERIFICATION_WALLETS` | Owner-nominated founder/invitation EOAs, or empty; no automatic approval         |
| `GENESIS_APPROVED_PARTNERS`            | `{}` until project keys and retained evidence are explicitly approved            |
| `NETLIFY`                              | Platform-provided identity; verify gateway/header behavior on the actual adapter |
| `NODE_ENV`                             | `production`, supplied by the runtime                                            |

No setting uses `NEXT_PUBLIC_`. Pool limit is two connections **per process**,
not per deployment. Record provider connection capacity, hosting concurrency and
reserved operator connections. Use a reviewed transaction-compatible pooler if
needed; verify `BEGIN`/row locks/`SET LOCAL` and rollback through that endpoint.
Each transaction has a five-second statement timeout. Do not increase it or the
8 MiB/5,000-wallet bounds to conceal load failures. Run a measured private load
rehearsal within the approved provider quota before public intake.

## Database setup, after separate setup authorization

1. Record database/region/provider, owner, trusted TLS CA, retention, restore
   destination and connection budget. Use a supported PostgreSQL release; CI
   rehearses PostgreSQL 17. No database credentials belong in shell history,
   tickets, Git or this document. Use operator-managed libpq service/password
   files or a secure provider console, and scoped Netlify runtime secrets.
2. Keep both activation flags false. Create a dedicated non-superuser runtime
   login with no CREATEDB, CREATEROLE, REPLICATION, BYPASSRLS or migration-owner
   membership. Set a unique secret privately. A separate migration owner owns the
   schema/table. In a dedicated application database, restrict database CREATE
   and schema CREATE from PUBLIC and the runtime role. Inspect existing grants
   first; do not change another application's database privileges.
3. Use the migration owner with the reviewed `public` search path to apply
   `apps/web/registration/001-genesis.sql` **once**, with stop-on-error.
   SHA-256: `bf0d90d196c94535dedec8ddb8f1226e880f3fb808fdeb15629730c71b334a78`.
   It is transactional and creates one empty version-1 row. It deliberately
   fails if the table already exists; inspect the existing version/receipt
   rather than dropping or reinitializing it. There is no destructive down
   migration. Do not auto-run it on deploy.
4. Grant runtime only schema USAGE and table SELECT/UPDATE. It must not own the
   table or inherit its owner. No INSERT, DELETE, TRUNCATE, REFERENCES, TRIGGER,
   schema CREATE or database CREATE. Explicitly revoke table access from PUBLIC
   and any unrelated application role; preserve a separately reviewed backup
   reader/operator. Bind the actual runtime role and database in the operator's
   private setup receipt, without including credentials.
5. With the runtime-role service profile and `sslmode=verify-full`, run both
   read-only checks below from the adopted repository root. The profile must use
   the same endpoint, CA and role as the application's reviewed connection. SQL
   encryption detection does not itself prove hostname/certificate validation;
   retain the client trust settings and provider evidence too.

```powershell
# Profile configured privately by the operator; contains no credentials here.
$env:PGSERVICE = 'lammb-genesis-runtime-reviewed'
psql -X --set ON_ERROR_STOP=1 --file apps/web/registration/verify-runtime.sql
psql -X --set ON_ERROR_STOP=1 --file apps/web/registration/verify-tls.sql
```

Require `PASS_RUNTIME_ROLE_AND_SCHEMA` and `PASS_ENCRYPTED_CONNECTION`.
Both scripts use a read-only transaction and roll back. They return only status,
revision, byte count and TLS protocol/cipher, never wallet lists. Application
schema validation remains stricter than the SQL structure check and is exercised
by the real transaction suite. Run it on a disposable restored database before
activation; do not aim test fixtures at production.

## Backup and recovery rehearsal

The database contains private wallet/audit information. Retain encrypted provider
backups/PITR under an owner-approved policy, plus an independent private logical
backup and digest. Repository code or artwork backups do not preserve this data.
Specify RPO/RTO, backup expiry/deletion, incident owner and tested restore access.
No backup destination or production restoration has been activated by Task081.

After setup authorization, use trusted version-compatible PostgreSQL clients and
an operator-managed backup service profile. Follow the official
[pg_dump consistency rules](https://www.postgresql.org/docs/17/backup-dump.html)
and [pg_restore instructions](https://www.postgresql.org/docs/17/app-pgrestore.html).
Example commands, **not executed on production**:

```powershell
# Use a new private path for each backup. Restrict its ACL and encrypt at rest.
$env:PGSERVICE = 'lammb-genesis-backup-reviewed'
pg_dump --format=custom --no-owner --no-acl --table=public.genesis_registration_state --file $privateBackupPath
Get-FileHash -LiteralPath $privateBackupPath -Algorithm SHA256
# Upload only to the separately authorized PRIVATE destination; retrieve to a
# different private path, compare bytes/digest, and inspect the trusted archive.
pg_restore --list $independentlyRetrievedPath
# Select an EMPTY, isolated restore database profile, never the source database.
$env:PGSERVICE = 'lammb-genesis-isolated-restore-reviewed'
pg_restore --exit-on-error --single-transaction --no-owner --no-acl --dbname 'service=lammb-genesis-isolated-restore-reviewed' $independentlyRetrievedPath
```

Verify restored schema, revision, exact canonical state bytes and all approved
entitlements against a transactionally consistent source snapshot captured with
the backup receipt. `pg_dump` and a later independent query can reflect different
revisions under traffic: quiesce authorized writers for the receipt or use one
exported PostgreSQL snapshot; never excuse a mismatch. Validate the recovered
state with `validateState`, regenerate private CSVs and compare entitlement and
export digests. Apply the reviewed role grants and run both preflights.

Before serving a restored database, keep both flags off and revoke all recovered
sessions and challenges using a reviewed owner transaction. This requires the
migration/incident operator, not expanded runtime privileges. Retain approvals,
audit and rate buckets. Keep the HMAC rate secret stable when preserving bucket
continuity; after a suspected secret compromise, explicitly plan rotation and
upstream abuse controls rather than claiming the old buckets still match.
Require fresh administrator and collector sign-ins. Do not revive incident-era
sessions. Preserve the original backup and source; rehearse recovery in an
isolated destination and record restoration duration and digests privately.

CI rehearses schema creation, limited-role permissions, durable limits across
independent pools, exact application-state recovery, source immutability and
session invalidation using synthetic records. This is **not** evidence of a
production provider backup, production TLS handshake or off-device recovery.
Those remain explicit operating gates.

## Private rehearsal and owner activation checklist

- [ ] Review the final exact-head green repository and full Chrome/Edge CI; adopt
      PR36/PR37 dependency history through the approved review/merge process.
- [ ] Confirm existing Netlify site ID, branch/build mapping, adapter and domain.
      Keep `[skip netlify]` on draft updates; no deployment is authorized here.
- [ ] Authorize database setup; select existing suitable storage first. Record
      role grants, migration digest, TLS preflight and connection budget.
- [ ] Complete independent private backup/restore rehearsal, state/export hashes,
      session invalidation, RPO/RTO and retention/deletion policy.
- [ ] Authorize a private staging deployment separately. Verify platform connection
      IP replaces attacker-supplied headers and arbitrary X-Forwarded-For cannot
      evade limits. Do not log raw IPs, signatures or private request bodies.
- [ ] Verify founder/admin control through fresh EOA signatures. Check wrong
      wallet, wrong purpose, expired/replayed nonce, cross-site request, revoked
      session and separate browser/device rate limits. No wallet transaction.
- [ ] Approve privacy contact, 90-day unapproved-record / 180-day audit retention,
      backup retention and a private idle-maintenance procedure invoking `prune`.
      No public maintenance/admin endpoint or automatic job is created here.
- [ ] Confirm Founder48/GTD392/WL160/Public120 on mobile and desktop, default-off
      forms, unconfirmed partners, unannounced times and official OpenSea link.
- [ ] Obtain a distinct owner decision for private admin enablement, then for
      public WL intake; record exact commit/config/approval digest. Enabling admin
      alone allows only configured private/admin verification, not public WL.
- [ ] Verify OpenSea's native 720 hard cap, reserved-stage supply, GTD guarantee,
      additive GTD/WL/public limits and founder public-stage policy separately.
      Site registration is not a mint guarantee. Do not publish candidate partners,
      dates, allowlists or mint activation without their separate approvals.

Rollback: set both flags false, redeploy only with separate authorization and
verify the public config is closed. Stop private writers, invalidate sessions,
preserve audit and recovery evidence, then withdraw/revert code under review.
Do not drop the table, delete backups or reset approved allocations. A code
rollback alone does not revoke database sessions or restore earlier data.

The next launch-critical action after code review is owner selection/verification
of the existing hosting database and authorization of its private setup/recovery
rehearsal. This task does not activate any of these controls.
