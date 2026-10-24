# Genesis mint implementation and verification specification

Issue #34 design deliverable; no contract, deployment, token assignment or allocation is approved or executed here. Current `packages/contracts` has no compiler, ABI, wallet integration or deployed address. A passing web build is not contract readiness.

## Supply and identity invariants

- Exactly 720 total lifetime token IDs across PARTNER_GTD, ALLOWLIST, PUBLIC, owner reserves, gifts, retries and every other mint entry point combined. No bypass for owners or airdrops. Burns must never reopen lifetime capacity. Phase limits partition the same cap; they cannot each allocate 720.
- Owner must approve a phase/allocation table whose disjoint allocations sum to at most 720, including reserves. No GTD amount or wallet maximum is invented here. Specify cross-phase eligibility overlap, aggregate per-wallet lifetime maximum, per-phase maximum, recipient-versus-caller counting and the handling of smart contract wallets. Transfers do not replenish the original minter's allowance. A GTD reservation cannot be consumed by public mint before its explicitly approved release rule.
- Use one monotonic allocation cursor and one atomic supply/allowance update before any receiver callback. Proposed token range: 0..719, subject to owner review. Minting q allocates the next q IDs once. Revert the entire batch on any failed authorization, limit or receiver callback; retries never create collisions. Every path shares that counter. Reentrancy must fail, including cross-function callbacks.
- Contract token ID, `LGR1-` registration ID, stable composition ID and historical construction index are distinct. Before assigning any art, approve and hash a 720-row token-to-composition bijection tied to the exact accepted selection digest. Require unique token IDs, compositions, PNG/pixel hashes and unchanged classifications (690 ordinary / 24 Ultimate / six grails). No assignment or randomization is performed in this task.
- Price is exactly 0 wei for all phases. Reject nonzero payment; no hidden fee or paid bypass. UI says “Free mint; network gas applies.” Eligibility is enforced on chain; a disabled button is not authorization.

## Authorization and launch activation

Choose and independently review a contract standard and audited implementation before coding. ERC-721 plus its metadata interface is the proposed compatibility target, pending review; upgrade, ownership, pause and recovery policy remain owner decisions. No contract address is configured in the site.

An allowlist proof must bind chain ID, exact contract, phase, wallet/recipient and maximum allocation. Use a reviewed Merkle leaf encoding and domain separation, or a separately reviewed signed authorization with nonce/expiry and replay protection. A proof for another chain, contract, phase or wallet must fail. Updates to roots, schedules or caps must not invalidate already consumed allowances or expand lifetime supply. Host-generated eligibility must not override on-chain checks.

Keep all mint buttons disabled through PRE_ASCENT and until audited contract, confirmed network identity, reviewed eligibility, pinned metadata, exact-head CI and owner activation approval are complete. No public date is selected. Every deployment, wallet transaction, production signature/key/grant, registration and merge requires separate owner authorization. Disposable in-memory non-wallet signing tests alone were authorized for this task.

## Placeholder, metadata and delayed reveal

Before any mint, prepare one publicly retrievable unrevealed metadata object and reviewed sealed placeholder image. Do not use a website concept preview as accepted NFT art. All unrevealed token URIs must return the same reviewed sealed data with no final trait/rarity leaks, including through query parameters, private origins, events or predictable hidden paths. The current repository provides placeholder schemas/studies only; no approved hosted NFT placeholder is verified.

Preserve the accepted 720 artwork and metadata bytes. Task070 image URIs bind raw PNG bytes to CIDv1; a UnixFS directory import can produce a different CID. Resolve and test the exact URI form before choosing the publication pipeline. If rewriting public URIs is necessary, treat it as a new reviewed metadata version with a lossless source record; never silently alter accepted metadata.

Pin every approved image and metadata object with independently verified availability, manifests and recovery receipts. Verify retrieval from independent gateways and cold cache, MIME types, exact SHA256/pixels, 720 coverage, schema, attributes and the frozen token mapping. URI publication and pinning are separate authorized work, not done here.

The reveal authority must bind a reviewed immutable base URI/content commitment and token mapping. Specify whether reveal is global or per-token, the blackout/notice policy and authorized timing. Freeze final URIs after the approved one-way reveal; reveal retries must be idempotent. Never use a block timestamp, weak predictable seed or deployer's discretionary remapping to claim fairness. A randomness mechanism, if needed, requires separate design approval and test evidence.

## Safe environment test plan and release gates

1. Implement and compile in an isolated local EVM with synthetic accounts, fixtures and no network signer. Test 719 + 1 success, 720 + 1 rejection, q=0, q>remaining, integer bounds, owner/reserve paths, failed receiver rollback, reentrant receivers, retries, burns, interleaved phase calls and phase boundary races. Assert one unique lifetime ID range and cap after every operation/property sequence.
2. Test disjoint and overlapping GTD/allowlist/public wallets; per-phase and aggregate wallet limits; recipient/caller substitutions; proof mutation; wrong chain/contract/phase; replay; revoked roots; allocation release; duplicate requests and nonzero payment. Verify all paths share the cap.
3. Test nonexistent tokenURI rejection, identical sealed placeholder responses, no trait leaks, exact hash commitments, unauthorized/early/double reveal, incorrect mappings and immutable post-reveal URIs. Use preserved accepted bytes only after explicit private input verification.
4. Robinhood testnet staging is the next network stage, chain ID 46630. First verify `eth_chainId`. Owner authorization is required before any testnet deployment or wallet transaction; this task performed read-only network discovery only. Record compiler/contract/source hashes, chain ID, address, test results and receipts privately as appropriate.
5. OpenSea's chain discovery currently lists `robinhood`; this does not verify a particular NFT contract. Verify interface support, tokenURI ingestion, image/attribute rendering, refresh after reveal and marketplace discovery against the staged contract. Confirm whether OpenSea supports this testnet workflow; if it does not, obtain authoritative compatibility evidence and an approved alternative verification plan. Never substitute mainnet transactions without authorization.
6. Independent security review and explicit owner approval precede production deployment, registration, hosting/pinning or activation. Any missing evidence keeps launch BLOCKED and mint unavailable.

## Current network evidence

On 2026-10-23, read-only `eth_chainId` returned `0x1237` (4663) and `0xb626` (46630). OpenSea `GET /api/v2/chains` returned HTTP 200 and an explicit Robinhood Chain entry. See `scripts/verify-launch-network.mjs` and the recovery network receipt. These observations establish identity/discovery only.

Primary sources: [Robinhood connection documentation](https://docs.robinhood.com/chain/connecting/), [OpenSea chain discovery](https://docs.opensea.io/reference/get_chains), [OpenSea metadata standards](https://docs.opensea.io/docs/metadata-standards).
