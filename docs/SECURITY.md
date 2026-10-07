# Security and engineering boundaries

## Current controls

- No private keys, seed phrases, RPC credentials, API tokens, contract addresses, or privileged client-side values are present or required.
- Environment files, dependency/build caches, and generated output are ignored. The tracked environment example contains comments only.
- Collection imports and Next configuration fail closed on invalid known configuration. Environment diagnostics identify the field without printing the supplied value.
- There is no wallet connection, mint button, signer, transaction, deployment command, eligibility endpoint, or state-change endpoint.
- Basic response headers deny framing, disable unused camera/microphone/geolocation features, prevent MIME sniffing, and limit referrer disclosure.
- CI has read-only repository permissions, installs a locked graph, and runs verification without production credentials. It does not deploy.
- Shared launch audit schemas require attribution and reason; no unauthenticated writer is provided.
- Art schemas and whole-input validation reject unknown fields, unsafe paths, duplicate IDs/case-folded paths, malformed/incorrect asset hashes, unresolved references, mismatched environments/categories, invalid quotas and incompatible grails.
- Task 002 strictly validates versioned launch payloads and collector compatibility before deriving view models. Fixture labels cannot be changed into numeric future onchain/server authority; unavailable values remain null.
- All seven static review panels show DEVELOPMENT / NOT LIVE. No dynamic launch-state controls, live recovered counts, ownership claims or final artwork/traits are present.
- Partner examples require DEVELOPMENT_ONLY and contain no real partners or wallets. There are no holder queries, allowlist generation, admin endpoints or eligibility decisions.
- Fairness records remain unapproved development boundaries. No hash is treated as proof of fairness. Public share-card schemas reject unapproved internal fields and unsafe reference schemes/embedded credentials.

The web shell uses no remote fonts, images, analytics, or third-party scripts. Schema validation is not authorization, cryptographic verification, or a sandbox. Basic headers are not a full production threat model. Content security policy must be designed and tested with the chosen hosting model and future wallet/integration requirements; no deployment configuration exists today.

## DEVELOPMENT IMPLEMENTATION: offline generator threat boundary

Catalogs/manifests/requests are untrusted structured data. Zod strict schemas bound collection size, traits/assets/rules and attempt budgets. Logical generation uses no eval, shell execution, ambient randomness, clocks, filesystem enumeration, remote downloads, wallet/RPC/contract code or network client. Construction seeds are input data, not private keys; the fixture seed is intentionally public. Future pre-reveal secrecy/publication is unresolved.

Portable source/output paths reject traversal, absolute paths, backslashes, URLs, drive prefixes, empty/dot components, trailing dots, encoded components and Windows device names. Source assets can be loaded only from the two reserved art-package roots. Every path segment is checked for symlinks/junctions and real-path confinement before use. Actual bytes must match declared SHA-256. CLI limits input JSON to 2 MiB, individual source assets to 1 MiB, total source bytes to 64 MiB, and each artifact JSON file to 64 MiB. These are current logical-development resource limits, not final artwork sizing decisions.

Writes are restricted to ignored `artifacts/generated/`, with fixed artifact filenames, exclusive staging creation and no overwrite of an existing destination. The CLI never executes catalog strings. The output directory and its parents must be owner-controlled while a command runs: path checks are defense in depth, not protection against a privileged local attacker racing filesystem changes. Failed staging directories may remain and are never treated as a completed bundle.

Generation rejects duplicate logical identities, ordinary creation of reserved grails, conflicting structural replacements and unmet exact quotas. Per-specimen/total candidate bounds fail without partial output or relaxed rules. Rejection diagnostics remain internal. Public metadata is a strict allowlist of public presentation fields; recipe seeds, weights, compatibility, retries, hidden assignment data and generation debug fields are excluded.

The verifier regenerates from independent input evidence and recomputes all hashes; supplied digests and `verified` flags are insufficient. Negative tests cover altered inputs/output and missing evidence. This verifies construction integrity, not input approval, seed fairness, source attestation, token assignment, image correctness or safe production publication. See [generator](GENERATOR.md).

## Task 004 ingestion and render boundary

Production requires V2 source manifests and matching local APPROVED digest/state declarations; legacy production and development fixture sources reject. Approvals do not authenticate an authority. V2 declarations are strict and bounded; geometry/cropping, explicit scaling, role/order/slot/frame ambiguity, required tags and renderer identity are checked. No image decoder executes or verifies PNG/SVG content, alpha pixels or color profiles. Those checks remain explicitly declarative, and production pixel readiness remains false.

JSON inputs now also reject ancestor symlink/junction paths and stay within the checkout. Source roots and generated output confinement remain intact. Art CLI tests disable network APIs while validating, planning, rendering and checking readiness. No source mutation, eval, shell execution from data, network or blockchain adapter is introduced. Exact saved fixture text bytes match output provenance. The render verifier reconstructs and compares the whole bundle, including metadata/image hash linkage. See [art ingestion](ART_INGESTION.md).

## Required future principles

Keep privileged credentials server-side and validated before use. Do not add production signers or mainnet side effects during foundation tasks. Authorize and audit every live launch state change. Publish and enforce approved mint allocations without hidden exceptions. Preserve deterministic generation, independently verifiable fairness/provenance, and disclosed rarity methodology. Verify provider chain ID before any future wallet or RPC integration; never silently fall back to another chain.

Do not log secrets, publish raw eligibility data without an approved privacy policy, or treat local UI state as mint/reveal authorization. Contract security review and testnet verification must precede any separately authorized production transaction.

## Unresolved decisions

Admin authentication and recovery, authority separation, append-only audit storage, eligibility privacy, contract audits, signing custody, RPC provider, hosting/CSP, public commitments, provenance distribution, source/runtime attestation, production asset processing limits, abuse controls and incident response are future design work. No production security audit or readiness claim is made.

## Reporting

The existing external dependency graph reports five high-severity audit entries in the development lint chain (`braces` → `micromatch` → `fast-glob` → Next ESLint packages). Task 003 adds only a reference to the existing `collection` workspace; no external dependency or version changes. This finding requires separate dependency maintenance; the proposed major downgrade from `npm audit fix --force` was not applied.

Use GitHub's private vulnerability reporting if the owner enables it, or contact the repository owner privately. Do not post secrets in public issues or PRs. A formal reporting address and response policy have not been established.
