# Task080 security review and release boundaries

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
