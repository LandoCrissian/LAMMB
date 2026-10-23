# Genesis stages and private registration

Task080 is an isolated implementation based on PR36, exact base
`c021d75789109139a3ed3c0da4a77219715dc72a`. Main was fetched at
`c3d5618bc1712043e506e81ca54e35a41194a1a0`. PR36 remains unmerged:
adopt its recovery changes before, or together with, this dependent draft.
No deployment, merge, registration activation or mint activation is included.

## Experience

`/mint` shows Founder 48 → GTD 392 → WL 160 → Public 120, exactly 720.
The 714 regular artworks include 690 ordinary and 24 Ultimate Editions;
six grails are separate. Price is zero; Robinhood Chain gas applies. Reveal
is delayed. The Mile High ascent remains heritage, not supply.

Opening times are unverified and displayed as “To be announced.” No partner
projects are finalized or endorsed. No wallet lists are embedded in HTML,
client bundles or public API responses. The collection information link is
exactly https://opensea.io/collection/lammbs. All mint buttons remain disabled;
there is no website mint, mint ABI, transaction request or activation API.

The WL form requires a verified wallet and consent; its first state is PENDING.
Repeat submissions return the existing status. GTD has no public self-approval
path. The administrator assigns verified individual invitations or reviewed
partner entitlements. Founder has no public application and can appear in
only the Stage 1 export.

## Server boundaries

Node route handlers at `/api/genesis/[action]` call one service shared by tests.
PostgreSQL is required. There is no production in-memory fallback or local-file
wallet database. An explicit migration creates one versioned, bounded JSONB
state row. Each operation uses one checked-out client, BEGIN, SELECT FOR UPDATE,
validated mutation, UPDATE and COMMIT; failures roll back. This serializes
approvals, exports and one-time challenge consumption across serverless instances.
The state is capped at 5,000 wallet records, 1,000 live challenges, 2,000 sessions,
5,000 rate buckets, 20,000 audit entries and 8 MiB encoded data. Capacity failures
close submissions. Do not scale these bounds without a measured migration.

Ownership uses EIP-191 message recovery through viem, with SIWE-style domain,
URI, chain 4663, purpose, random nonce, issued time and five-minute expiration.
The server verifies the exact stored message; clients cannot provide a replacement.
A separate random browser-binding cookie prevents challenge transfer/login CSRF.
Consumption is atomic and happens even when the submitted signature is wrong.
Only EOA signatures are supported in this version; ERC-1271/smart-account wallets
require a separately reviewed chain-aware verifier. A signature proves control,
not partner holdings or eligibility.

Session cookies are HttpOnly, SameSite=Strict, Path=/ and Secure with a __Host-
prefix in production. Only SHA-256 session and browser-binding tokens are stored.
Collector sessions last 30 minutes; admin sessions 15 minutes. Login replaces
earlier sessions of the same purpose. Role checks re-read configured admin
addresses and flags on every privileged operation; a collector cookie cannot
be promoted into an administrator. Logout revokes the stored token.

Writes require an exact configured Origin. Cross-site Fetch Metadata is rejected.
JSON bodies are streamed with a 4,096-byte maximum; unknown fields are rejected.
No CORS allowance is added. Private responses use no-store and Vary: Cookie.
Signatures, raw IPs, database URLs and private errors are never logged.
Production CSP and recovery/RAM gates are unchanged.

Rate limits are stored transactionally, HMAC-keyed, and enforced before signatures:
10 challenges per connection/minute, 5 per wallet/minute, 20 verification attempts
per connection/minute. Only Netlify's platform-set connection IP is trusted when
`NETLIFY=true`; other hosts use a shared conservative bucket. Do not enable on
another host until its trusted gateway identity has been reviewed. Wallet ownership
does not prevent multi-wallet/Sybil abuse; add monitored gateway limits/challenge
controls if needed before opening registration. Do not claim a solved Sybil defense.

## Approval and export rules

Administrator access requires an explicitly configured wallet and a fresh sign-in,
not a public secret or NEXT_PUBLIC variable. `/admin/genesis` is noindex and exposes
no private state until authenticated. It offers reviewed decisions, revocation,
and private downloads; it has no activation controls.

Each approval needs a `sha256:<64 lowercase hex>` evidence reference to a retained
private review record. The operator must independently verify the evidence:
a digest is not an automatic holder snapshot. PARTNER grants additionally require
an owner-approved private project key/evidence digest in server configuration,
one unit per unique project, at most five GTD units total per wallet.
INVITATION grants require individually reviewed evidence and a unique invitation
key; units still count toward the same five-unit ceiling. Empty partner config is
the shipped default. No historical partner candidates are silently adopted.

Founder requires a recently ownership-verified address, no existing WL/GTD
participation and evidence. Exactly one founder can be assigned. Founder gets
48 units only in its export and is excluded from GTD/WL. WL approval requires
an application; allowance is one or two. Each approval checks the global issued
budgets: Founder 48, GTD ≤392, WL ≤160. Public's planning target is 120. Unused
allowances are not silently redistributed.

Private exports are deterministic sorted, headerless OpenSea CSV:
`address,custom-per-wallet-limit,0` with CRLF, no ENS or duplicate address.
Only verified, approved records are included; empty lists fail rather than emit
fake files. Responses include SHA-256, row count and entitlement count. Export
creation appends its digest to the private audit. No actual wallet data or allowlist
is committed to GitHub. Do not upload exports until separately authorized.

OpenSea's current [allowlist documentation](https://support.opensea.io/en/articles/8867054-define-your-allowlists)
permits up to five presales and documents **additive** stage limits, including
public: GTD5 + WL2 + public1 can mean eight cumulative mints. This site does not
enforce a contract cap. A list is not a supply reservation. Before calling GTD
guaranteed, independently verify the exclusive stage, issued units ≤392,
the native supply mechanics, adequate inventory and exact exported wallets.
Founder-only public exclusion remains unverified in native Studio; the site
cannot stop that wallet minting directly on OpenSea. Resolve that policy/configuration
before launch, without introducing a custom website mint.

## Activation and operational prerequisites

Both flags are OFF by default and were not enabled on a live host.
After separate owner approval, provision a private PostgreSQL database, encrypted
at rest, independent backups and least-privilege runtime DML credentials.
Apply `apps/web/registration/001-genesis.sql` once using a migration role.
Grant the runtime role only SELECT/UPDATE on this table. Never grant schema/DDL
or public database access. Verify certificate trust; remote connections enforce
TLS certificate validation. SSL query-string overrides are rejected.

Server-only settings are documented in `apps/web/.env.example`. An activation
evidence digest, exact origin, strong rate secret and valid database settings are
required even when only admin access is enabled. Keep both flags false until
private staging, backup restoration, role policy and privacy operations are reviewed.
Never place credentials, admin wallet configuration or private partners in a
NEXT_PUBLIC variable. No credentials are supplied by this draft.

Retention: challenges, sessions and buckets expire automatically on sign-in
traffic. Unapproved records without grants expire after 90 days since their last
ownership verification. Audit entries expire after 180 days. Approved entitlements
remain private while required for the launch audit; close and delete them under
the owner-approved post-launch retention plan. Run a daily reviewed private
maintenance transaction invoking the same `prune` function if traffic is absent.
Database backups require corresponding retention/deletion policies; no background
job or backup destination has been activated by this change.

Before activation: approve retention/contact policy and deletion-request handling,
verify trusted IP headers in the actual hosting adapter, rehearse private recovery,
confirm founder/admin wallets and evidence, finalize partner snapshot policy,
review allocations/overlap and Studio caps, approve times and keep mint disabled
until native OpenSea configuration and owner authorization are verified.

## Tests and rollback

Unit and request-handler tests cover synthetic ownership signatures, replay,
expiry, browser binding, CSRF, minimal input, disabled flags, privacy, founder
isolation, invitations, approvals, duplicate wallets, budgets and exports.
The PostgreSQL integration suite is mandatory in CI with a disposable service;
it checks independent-pool concurrency, rollback, nonce consumption and corruption.
No production data or wallet connection is needed.

The unchanged full Windows Chrome/Edge acceptance runs remain required. Additional
Genesis checks cover mobile widths, closed API behavior and a clearly labeled
synthetic WL UI fixture; they do not pretend to verify live eligibility or wallets.

Rollback: leave the draft unmerged or revert its commits. Disable both activation
flags and revoke sessions before withdrawing an adopted service. Preserve approved
private evidence/backups, then follow the reviewed retention policy. Artwork,
canonical metadata, mint contracts, production registration and PR36's protected
source evidence are not modified.
