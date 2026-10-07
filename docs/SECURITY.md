# Security and engineering boundaries

## Current controls

- No private keys, seed phrases, RPC credentials, API tokens, contract addresses, or privileged client-side values are present or required.
- Environment files, dependency/build caches, and generated output are ignored. The tracked environment example contains comments only.
- Collection imports and Next configuration fail closed on invalid known configuration. Environment diagnostics identify the field without printing the supplied value.
- There is no wallet connection, mint button, signer, transaction, deployment command, eligibility endpoint, or state-change endpoint.
- Basic response headers deny framing, disable unused camera/microphone/geolocation features, prevent MIME sniffing, and limit referrer disclosure.
- CI has read-only repository permissions, installs a locked graph, and runs verification without production credentials. It does not deploy.
- Shared launch audit schemas require attribution and reason; no unauthenticated writer is provided.
- Art schemas reject unsafe relative paths, duplicate catalog IDs, invalid digest formats, and incomplete structural manifests.
- Task 002 strictly validates versioned launch payloads and collector compatibility before deriving view models. Fixture labels cannot be changed into numeric future onchain/server authority; unavailable values remain null.
- All seven static review panels show DEVELOPMENT / NOT LIVE. No dynamic launch-state controls, live recovered counts, ownership claims or final artwork/traits are present.
- Partner examples require DEVELOPMENT_ONLY and contain no real partners or wallets. There are no holder queries, allowlist generation, admin endpoints or eligibility decisions.
- Fairness records remain unapproved development boundaries. No hash is treated as proof of fairness. Public share-card schemas reject unapproved internal fields and unsafe reference schemes/embedded credentials.

The web shell uses no remote fonts, images, analytics, or third-party scripts. Schema validation is not authorization, cryptographic verification, or a sandbox. Basic headers are not a full production threat model. Content security policy must be designed and tested with the chosen hosting model and future wallet/integration requirements; no deployment configuration exists today.

## Required future principles

Keep privileged credentials server-side and validated before use. Do not add production signers or mainnet side effects during foundation tasks. Authorize and audit every live launch state change. Publish and enforce approved mint allocations without hidden exceptions. Preserve deterministic generation, independently verifiable fairness/provenance, and disclosed rarity methodology. Verify provider chain ID before any future wallet or RPC integration; never silently fall back to another chain.

Do not log secrets, publish raw eligibility data without an approved privacy policy, or treat local UI state as mint/reveal authorization. Contract security review and testnet verification must precede any separately authorized production transaction.

## Unresolved decisions

Admin authentication and recovery, authority separation, append-only audit storage, eligibility privacy, contract audits, signing custody, RPC provider, hosting/CSP, public commitments, provenance distribution, abuse controls, and incident response are future design work. No security audit or production readiness claim is made by Task 001.

## Reporting

The unchanged Task 001 dependency graph currently reports five high-severity audit entries in the development lint chain (`braces` → `micromatch` → `fast-glob` → Next ESLint packages). Task 002 adds no dependencies or lockfile changes. This finding requires separate dependency maintenance; the proposed major downgrade from `npm audit fix --force` was not applied. No security audit or production readiness claim is made by Task 002.

Use GitHub's private vulnerability reporting if the owner enables it, or contact the repository owner privately. Do not post secrets in public issues or PRs. A formal reporting address and response policy have not been established.
