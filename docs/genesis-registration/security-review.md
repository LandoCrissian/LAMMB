# Genesis security review and release boundaries

This review covers code and synthetic tests, not an independent third-party
audit or an activated production service.

| Boundary          | Implementation / verification                                                                                            | Remaining operating gate                                                             |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------ |
| Mint separation   | Information-only official OpenSea link; no contract ABI, transaction API or custom mint                                  | Verify the actual Studio draft and release settings separately                       |
| Public collection | Four allocation targets total 720; no invented dates, partners, holders or live status                                   | Owner-approved dates and actual Studio configuration                                 |
| Ownership         | One-use, expiring message, domain/URI/chain/purpose binding, verified EOA signer, browser-binding cookie                 | Confirm actual founder/admin wallet compatibility; ERC-1271 unsupported              |
| Session           | Hashed random token; production __Host-/Secure/HttpOnly/Strict cookies; short expiry; logout and replacement             | Private host and TLS; signing-device security                                        |
| Administration    | Configured wallet + separate admin-purpose signature session; checks on every privileged method                          | Owner verify admin wallets, IAM and evidence custody                                 |
| Approval          | Required evidence digest, recent ownership verification; one partner entitlement per configured project; invitation caps | Manual evidence verification; no automatic on-chain holder discovery                 |
| Budget            | Transactional 48/392/160 approval ceilings; founder excluded from GTD/WL; overlap deduplication                          | Actual OpenSea on-chain cap, rollover and founder public-stage policy                |
| Private storage   | PostgreSQL row lock, validated bounded schema, parameterized statements, rollback; remote TLS verification               | Provision DB, restricted DML credentials, encrypted storage, private backup/restore  |
| Abuse             | Streamed 4 KiB JSON bound, strict fields, durable HMAC rate limits, fixed state bounds                                   | Verify Netlify gateway IP behavior; monitor Sybil abuse and capacity                 |
| Browser           | Exact Origin for mutations, cross-site Fetch Metadata rejection, no CORS, no-store private responses                     | Existing static-CSP inline-script risk remains documented; no CSP weakening          |
| Export            | Approved verified records only; sorted headerless CSV, dedup, free price, per-stage budgets and digest                   | Review private export, native Studio limits, wallet lookup, separate upload approval |
| Retention         | Expiring challenges/sessions/buckets, 90-day unapproved record retention, 180-day audit retention                        | Daily private maintenance when idle; approved-record and backup retention policy     |
| Recovery          | Reversible source implementation and migration; no artwork, production registry or historical pins changed               | Privately rehearse database restoration before activation                            |

Known product limitations are deliberately visible: allowlists alone do not
reserve supply; OpenSea's additive public allowance may permit the founder an
extra public mint; an EOA signature is not proof of partner holdings; no finalized
partner has been inferred. Public registration is OFF, admin access OFF and mint
actions OFF. A nonempty activation evidence hash is a reference for review, not
cryptographic proof that the owner authorized a deployment.

The database holds only wallet identifiers, verification timestamps, status,
minimal grant/approval evidence references and audit events. No seed, wallet
private key, raw IP, email, social profile or signature is stored. Test keys are
random, unfunded, process-local fixtures and never sent to RPC/OpenSea.

Unit/request tests verify untrusted input, replay, wrong signers, expired
challenges, cookie binding, CSRF, privilege escalation, disabled flags, malformed
configuration, duplicate wallets/entitlements, stale control evidence, approvals,
founder isolation, caps and export integrity. Mandatory disposable PostgreSQL CI
tests cover real transaction concurrency, rollback, corruption and nonce
consumption. Browser fixtures are marked as synthetic and never activate a live
service. Existing recovery readiness thresholds, source pins, Chamber assertions
and full Chrome/Edge acceptance remain intact.

No confirmed exploitable code defect remains from the local pass. Production
activation is nevertheless **NO-GO** until operating prerequisites and exact-head
CI are satisfied and the owner separately approves activation.

## Task082 native Database integration

The SDK resolves the current native branch. Request handling retains real `pg`
transactions, never independent HTTP queries for BEGIN/UPDATE/COMMIT. Code replaces
the provider URL's migration-owner login with SQL-created `lammb_genesis_runtime`;
a separate server-only password is required. A manual URL on Netlify, missing SDK
context or invalid provider options fails closed. URL SSL parameters cannot
weaken certificate/hostname verification. Every request transaction checks its
effective role, grants and TLS before reading private state.

Native migrations validate/adopt the exact historical schema, preserve data and
revision, reject drift, and create the restricted role NOLOGIN without secrets.
No destructive reset/down is provided. Request-local `getContext().deploy.context`
is authoritative; build-only CONTEXT/NETLIFY variables are not relied on. All
non-production contexts or missing native request context block every Genesis
endpoint before DB resolution. Client rate keys use `getContext().ip`, not
caller-supplied proxy headers.
There is no preview-enable switch; copied auth/flags do not expose wallet records.

Residual operating risks: actual native role permissions and auto-injected
provider credential privileges have not been inspected. A compromised function
can read its server secrets, including any provider-injected URL; the restricted
query login does not claim to eliminate full runtime compromise. Verify provider
scope/IAM and protect logs. Real TLS, branch mapping, backup retention, independent
recovery, connection capacity and adapter context/IP behavior require an authorized
platform rehearsal. Never fall back to an owner login, weaken grants or spoof
CONTEXT to make those gates pass. See the [native checklist](netlify-database.md).

### Full browser acceptance dependency

At Task082 head `5ab2922`, all 1,035 repository tests and responsive Genesis
checks passed, but Chrome job `120804217844` stopped in the existing Chamber
helper's locator-hover acknowledgement after the 1440px evolution and experiment
checks. The failure archive is `12550929603`, SHA-256
`6c32def8db70d39e9935d13f6598febcf8408f9c21a0e137d23baab381c520c0`.
The exact internal hover substep was not traced; Playwright 1.62.1's hover path
also waits on an injected hit-target interceptor, beyond native mouse movement.

At `9eaa467`, Edge job `120808359815` isolated the stall to the post-move DOM
hit-test read, before button press. The helper now checks geometry/hit targets
before input, observes trusted pointer receivers passively, completes native
move/down/up without intervening DOM queries, then validates the down/up receipt.
It does not force a click, dispatch DOM input, scroll hidden controls into view,
retry, change scene state or extend the original 30-second budget. All existing
Chamber assertions remain unchanged. Negative tests reject off-screen, disabled
or occluded targets, wrong event receivers and late input after expiry.

Chrome at `9eaa467` also overshot research proximity and held forward at the north
wall. Diagnostics publish once/second; a transient proximity result can be missed
by polling under software rendering. The approach now releases keys between
500ms native pulses and waits for a fresh diagnostic sample, correcting southward
after an overshoot. The original 25-second bound, actual proximity predicate and
all interaction assertions remain. Unit tests use real movement/collision rules
to verify approach from both sides. These are test-driver corrections required
by full acceptance, not changes to product gameplay or registration behavior.

The new receipt check at `6194c7b` exposed a helper identity error: activating
Third person renames the button First person, so resolving the old role/name
locator again waits for a label that no longer exists. The helper pins the
original element for geometry/receipt checks and disposes it afterward. A
regression test changes the locator after activation while the original node's
receipt remains readable. No assertions or deadlines are removed.
