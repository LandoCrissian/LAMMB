# Collection configuration

## Approved facts

LAMMB (`LAMMB`) has a supply of **5,280** and targets **Robinhood Chain mainnet**, chain ID **4663**. The primary mint price is **0 ETH**, represented as **0 wei**; network gas still applies. The domain is **lammb.fun**, the marketplace/drop target is **OpenSea**, and the launch model is **delayed reveal**. LAMMB means **Let's All Make Money Bitches**.

The access model consists of **Partner GTD**, **allowlist if required**, and **public allocation**. This defines vocabulary, not eligibility rules, quantities, per-wallet limits, a schedule, or a guarantee about integration availability.

## Current implementation

`packages/collection/src/config.ts` owns the canonical typed object. `collectionConfigSchema` validates nonempty names, safe positive integer supply and chain IDs, a bare domain, nonnegative bigint price, and the delayed reveal model. Strict objects reject unknown configuration properties. Invalid configuration throws on import and prevents building or serving dependent code. The object is frozen, and canonical facts have regression tests.

`packages/collection/src/network.ts` derives the network ID/name from that object. It describes mainnet and ETH currency units. It provides no RPC URL, credentials, block explorer guess, wallet configuration, signer, or transport. Nothing connects to mainnet.

The shared access schema contains three approved groups. No wallet records, hidden allocation logic, counters, proofs, or eligibility infrastructure are live. The future eligibility service should consume these shared types when its requirements are approved.

## Unresolved decisions

- Contract standard, token ID convention, ownership/authority, and supply enforcement.
- OpenSea drop support, integration method, and exact network availability at integration time.
- Partner selection, GTD proof rules, allowlist necessity, allocation quantities, wallet limits, and public mint timing.
- Metadata storage, sealed metadata, commitment format, reveal authorization, and irreversibility.
- License, artwork usage rights, royalty policy, and operational permissions.

No contract or metadata URI is invented in Task 001. Converting the bigint price to JSON requires an explicit string boundary; direct `JSON.stringify(collection)` is intentionally unsupported. Canonical JSON encoding for future hashes remains to be designed.
