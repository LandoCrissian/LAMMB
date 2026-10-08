# Future atlas registry protocol — not implemented

This specifies security boundaries for a later authorized implementation. Task 008 has no backend registration, wallet provider, contract reads, signatures, OAuth, persistent location storage or database. Country exploration is available without identity.

## Admission and specimen identity

An owner-reviewed admission registry must bind collection ID to **Robinhood Chain 4663**, a verified deployed contract, NFT interface/standard, provenance evidence and lifecycle status. No candidate name grants eligibility. Verify code, interface behavior and approved token ranges; consider upgrade/proxy changes and suspend uncertain entries. Contract addresses must be independently verified before release. Collection admission does not establish a wallet's ownership or consent.

Specimen identity is chain + contract + canonical uint256 token ID. For [ERC-721](https://eips.ethereum.org/EIPS/eip-721), read `ownerOf` at a recorded block and reject burned/nonexistent tokens. For [ERC-1155](https://eips.ethereum.org/EIPS/eip-1155), verify `balanceOf` and the requested positive quantity. Multiple addresses can hold one ID; ERC1155 requires a declared allocation/aggregation policy so the same units are not double-counted. A wallet is not a person; public counts must name their actual metric. Do not label balances or token registrations as unique collectors.

## Consent, signature and server authority

Use a structured, owner-readable, [EIP-712](https://eips.ethereum.org/EIPS/eip-712) domain-separated action or carefully specified [EIP-4361](https://eips.ethereum.org/EIPS/eip-4361) sign-in followed by separately authorized actions. A login signature alone must not authorize publication or arbitrary future updates.

The signed payload must bind the canonical HTTPS origin/audience, protocol name and version, chain 4663, collection contract, token ID, country ISO code, visibility settings, action (create/update/withdraw), record revision, single-use cryptographic nonce, issuance time and short expiry. Bind an action to its intended registry; cross-domain, cross-chain and cross-action reuse must fail. Prefer a precise schema over free-form messages. Explain what will become public before signature approval.

The server must validate message structure, canonical country allowlist and admitted contract; recover the signer or validate supported smart-contract wallets through [EIP-1271](https://eips.ethereum.org/EIPS/eip-1271); validate time, origin and chain; atomically consume nonce and compare record revision. Reject expired, replayed, out-of-order and changed payloads. Do not rely on client-submitted balances, signatures merely having a valid format, or unverified browser network state. Add bounded requests, rate limits and abuse controls without inferring physical location from IP. Do not store wallet secrets or ask for seed phrases.

Recheck authoritative ownership server-side at an explicit finalized/confirmation-policy block immediately before acceptance. Handle RPC failures, chain reorganization and contract-specific transfer behavior as pending/unavailable rather than guessing eligibility. Record contract, token, block number/hash, verification policy/version, signature evidence digest and admission revision. Keep private authentication evidence separate from the public view.

## Updates, removal and transfers

Only a current verified owner may create or update an active participation record. Visibility or country changes require a newly bound action, not a stale login. Withdrawal requires authenticated authority over the record; former owners should be able to remove their own private association without affecting a new owner's record. Resolve ERC1155 partial-balance changes explicitly, including quantity shrinkage, multi-holder records and duplicate-unit prevention.

Monitor relevant transfer/burn events and periodically revalidate balances. Invalidate or mark stale records before including them in active aggregation; revalidate again at public read boundaries using a published freshness policy. Transfers do not transfer country consent, profile identity or OAuth links. A new owner opts in independently. Never keep an old owner's country as the new owner's active record. Reorgs and unresolved verification suspend active display. Define retention and deletion policies before launch.

## Voluntary geography and public display

Country is voluntary self-declaration, not verified residence. Collect an ISO country choice only. No GPS, IP-based location inference, precise addresses, phone number or mandatory X identity. Do not reject a country because a network address appears elsewhere.

Keep raw wallet identity, consent proof and administrative history private by default. Public records require separate opt-in and a reviewed visibility policy. Publish only the minimum necessary information; an optional specimen gallery can itself link tokens to wallets, so consent must explain that implication. Design minimum cohort thresholds, delayed/suppressed low-count aggregates and withdrawal effects before totals become visible. Do not silently equate hidden/suppressed counts with zero. Avoid browser analytics that collect country fragments or wallet data without a separate approved policy.

Optional X OAuth is a later, independently authorized capability with least-privilege scopes, revocation and explicit identity visibility. It cannot prove NFT ownership or admission. Multiple wallets/profiles and consent boundaries need policy; no one-wallet-one-person assumption.

## First Arrival history

Keep historical provenance separate from active current-owner participation. A First Arrival event must specify its actual meaning (first verified opt-in record for a country/collection under a named policy), server acceptance time, deterministic tie-breaking, relevant block evidence and signed-consent digest. It is not proof of first residence or the first human collector.

Transfers must not rewrite a former event into a new owner's arrival. Withdrawn/private events must obey their original disclosure and retention consent; do not promise immutable public wallet history without explicit approval. Until an authoritative registry and reviewed provenance policy exist, show history unavailable. Never reconstruct arrival events from fixture records as live history.

## Decisions required before implementation

Verified LAMMB contract; collection admission authority; ERC1155 eligibility/quantity policy; freshness and reorg policy; disputed-territory/country naming policy; privacy thresholds and retention; contract-wallet support; signature specification and threat review; opt-in public fields; First Arrival tie-breaking/withdrawal policy; independently reviewed backend infrastructure. None is implied by the atlas preview.
