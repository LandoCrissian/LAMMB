# Netlify Database integration and owner activation checklist

Task082 extends PR37 at `faf9bd3de1386810d588c9bde5d40ff4b61bd902`.
This procedure supersedes the historical Task081 manual PostgreSQL setup for
Netlify. It does **not** authorize a merge, deployment, provisioning, production
DDL, public registration or mint activation. Both registration flags default off.
Founder 48 / GTD 392 / WL 160 / Public 120 remains 720; partners are unconfirmed,
times unannounced and minting is OpenSea only.

## Confirm the existing project first

- [ ] Review the exact integration head and full Chrome/Edge and PostgreSQL CI.
      Adopt PR36/PR37 dependency history through the approved review process.
- [ ] In the existing `lammb.fun` project record the site ID, team, Personal
      credit-based plan, existing native Database attachment, region and limits.
      The owner reported an attached database; no authenticated Netlify project
      connection was available here to independently confirm its identity/state.
- [ ] With an authorized CLI 26+ session, inspect `netlify status` and
      `netlify database status` privately. Never use `--show-credentials`, print
      connection strings or link another site. Do not run `database init` against
      an already attached database. Personal supports native Database; no separate
      Neon account, external provider or new API host is needed.
- [ ] Keep draft commits and PR title marked `[skip netlify]`. Obtain separate
      authorization for private platform setup/deployment; none occurred here.

## Prepared build and migration lifecycle

- [ ] Base directory: repository root (`.`). Package directory: `apps/web` in the
      site UI. Build: `npm run build`; publish: `apps/web/.next`; Node 22.23.2.
      Root `netlify.toml` defines build/base/publish and preview-off flags. Verify
      the actual site's OpenNext adapter and resolved migration discovery before
      authorizing a deploy. SDK 2.0.1 requires Node >=22.12.0.
- [ ] Inspect existing native migration history. Prepared files under root
      `netlify/database/migrations/` are `20261024000100_genesis_state.sql` then
      `20261024000200_genesis_runtime.sql`. If the site's highest version is at
      or above these, or its schema differs, stop and reconcile history before
      applying. Never edit an applied migration or reset its ledger.
- [ ] Back up before an authorized apply. Netlify applies migrations immediately
      before publishing, and fails the deploy on migration errors. No DDL runs in
      web builds/request handlers. Do not run hosted `drizzle-kit push` or apply
      the historical SQL manually on an existing native database.

The first migration creates one empty version-1 state row on an empty database
or adopts the exact historical table contract without changing state/revision.
Column types/defaults/constraints, RLS, triggers, inheritance and bounded row
structure are checked; drift fails instead of being reset. Original
`apps/web/registration/001-genesis.sql` is unchanged, SHA-256
`bf0d90d196c94535dedec8ddb8f1226e880f3fb808fdeb15629730c71b334a78`.

The second migration creates SQL role `lammb_genesis_runtime` **NOLOGIN**, without
admin/owner privileges or memberships; grants only schema USAGE and table
SELECT/UPDATE. Unexpected privilege/role state fails. It does not revoke shared
database/schema privileges from unrelated applications; investigate PUBLIC-
derived CREATE grants separately instead of weakening checks or changing other
applications. It never embeds a password or enables registration.

## Restricted runtime setup, after separate authorization

- [ ] Verify the native migration role can create a restricted SQL role. Neon
      SQL-created roles avoid `neon_superuser`; Console-created roles may not.
      If native permissions deny this, stop for the provider-supported procedure.
      Do not fall back to an owner login or use SET ROLE as an isolation boundary.
- [ ] Privately set a unique random 32-byte password and enable LOGIN for
      `lammb_genesis_runtime`. In an approved TLS-verified psql operator session,
      `\password lammb_genesis_runtime` prompts without shell-history exposure;
      then authorize `ALTER ROLE lammb_genesis_runtime LOGIN`. Do not commit the
      password to SQL or print it in a ticket/build log.
- [ ] Configure these server-only, production-scoped Functions settings:

| Setting                                | Value / owner action                                                |
| -------------------------------------- | ------------------------------------------------------------------- |
| `GENESIS_REGISTRATION_ENABLED`         | `false` until separate public-intake approval                       |
| `GENESIS_ADMIN_ENABLED`                | `false` until separate private-admin approval                       |
| `GENESIS_ORIGIN`                       | Exactly `https://lammb.fun`                                         |
| `GENESIS_ACTIVATION_REFERENCE`         | Retained owner approval's `sha256:<64 lowercase hex>`               |
| `GENESIS_DATABASE_PASSWORD`            | Restricted login's random secret, 32–256 printable ASCII characters |
| `GENESIS_DATABASE_URL`                 | **Unset on Netlify**; legacy standalone/local PostgreSQL only       |
| `GENESIS_DATABASE_CA`                  | Reviewed provider PEM only if Node trust is insufficient            |
| `GENESIS_RATE_SECRET`                  | Private random 32–64 bytes as 64–128 lowercase hex characters       |
| `GENESIS_ADMIN_WALLETS`                | Owner-verified private EOA administrator list                       |
| `GENESIS_PRIVATE_VERIFICATION_WALLETS` | Owner-nominated founder/invitation EOAs, or empty                   |
| `GENESIS_APPROVED_PARTNERS`            | `{}` until actual projects/evidence are approved                    |

Netlify supplies `NETLIFY_DB_URL`; do not manually copy it, its old
`NETLIFY_DATABASE_URL` predecessor, or secrets into Git/public variables. The SDK
selects host/database/branch; code replaces only the login, validates provider URL
options, strips SSL URL overrides and enforces certificate/hostname verification
with `pg`. Native/manual URL ambiguity and SDK failure close the API, with no
pinned production fallback. Transactions remain on one checked-out pg client,
including BEGIN, row lock, validated mutation, UPDATE and COMMIT/ROLLBACK.

Every runtime transaction checks actual role attributes, effective grants, owner
membership and TLS before touching state. No INSERT/DELETE/TRUNCATE/DDL or owner
membership is permitted. Unencrypted loopback is development/test only. Channel
binding is enabled as supported by pg; verify-full TLS is mandatory regardless.

## Preview confidentiality and platform rehearsal

- [ ] Confirm main database resolution for production and distinct provider
      branches for two authorized previews. Preview branches copy production PII,
      roles and authentication state. Keep branch credentials/build logs private.
- [ ] Leave both flags false on previews/branch deploys. Independently, code blocks
      **every non-production CONTEXT, or missing CONTEXT on Netlify**, before SDK
      resolution or pool creation. Copied sessions, admin config and Origin cannot
      open private records/decisions/exports. There is no preview-enable override.
- [ ] Do not give previews production rate/admin/password secrets. Platform preview
      access protection adds defense where available; it does not replace this
      unconditional API block. Do not spoof CONTEXT for QA. Use disposable local/CI
      synthetic data; any future hosted backend rehearsal needs separate review.
- [ ] Verify actual Node Route Handler SDK context (including Lambda compatibility
      constraints), adapter-provided CONTEXT/NETLIFY and trusted connection-IP
      behavior privately. Missing context fails closed; no manual URL workaround.
- [ ] With a trusted runtime-role service profile using verify-full TLS run
      `apps/web/registration/verify-runtime.sql` and `verify-tls.sql`. Require
      `PASS_RUNTIME_ROLE_AND_SCHEMA` and `PASS_ENCRYPTED_CONNECTION`. These are
      read-only status/revision/size or protocol/cipher checks, not wallet exports.
      SQL's encrypted flag alone does not prove certificate/hostname verification.
- [ ] Record provider capacity/cold starts and load within approved limits. Pool
      max two is **per function process**, not per site; connection/statement
      timeouts are five seconds and idle timeout ten seconds. Do not relax the
      8 MiB/5,000-wallet bounds or timeouts to conceal load failures.

## Recovery and activation gates

- [ ] Record actual provider backup/PITR/on-publish retention, incident owner,
      RPO/RTO, independent encrypted destination and tested operator access.
      Netlify UI restore **replaces production**; it is not an isolated rehearsal
      or routine code rollback.
- [ ] With compatible PostgreSQL tools/private backup credentials make a consistent
      logical backup. Independently retrieve/hash it and restore to a new isolated
      destination. Do not store real wallet backups in Git, public paths or CI
      artifacts. Preserve the native migration ledger as well as application data.
- [ ] With writers quiesced or one exported snapshot, compare canonical JSONB bytes,
      revision, validated records and export hashes. A later live query is not the
      same snapshot. Keep the source/backup, flags off, and invalidate restored
      sessions/challenges while preserving approvals/audit/rate buckets. Verify
      grants/TLS and fresh sign-ins; record private hashes and restoration duration.
- [ ] Approve privacy contact, retention (90 days unapproved records / 180 days
      audit), approved-record/backup policy, and trusted gateway rate-limit checks.
- [ ] Verify founder/admin EOAs, nonce/purpose/domain, replay/expiry, CSRF, durable
      limits and private export checksums. No transaction; smart accounts remain
      unsupported. Authorize private admin first, public WL intake separately.
- [ ] Verify four stage targets and inactive mint actions on mobile/desktop.
      Actual OpenSea caps, GTD guarantees, rollover, founder policy and additive
      wallet allowances remain separate launch gates. No dates/partners inferred.

Rollback: close both flags through an authorized configuration deploy, stop
writers and invalidate sessions privately. Preserve data/audit/backups. Roll code
back under review, without destructive down migrations. Code rollback does not
restore data or undo a migration. CI's synthetic snapshot is not a provider
backup receipt, native branch test or production TLS handshake.

Official references: [SDK/API](https://docs.netlify.com/build/data-and-storage/netlify-database/api/),
[migrations](https://docs.netlify.com/build/data-and-storage/netlify-database/migrations/),
[setup](https://docs.netlify.com/build/data-and-storage/netlify-database/getting-started/),
[backup behavior](https://docs.netlify.com/build/data-and-storage/netlify-database/backup-and-recovery/),
[Neon SQL roles](https://neon.com/docs/manage/roles).
