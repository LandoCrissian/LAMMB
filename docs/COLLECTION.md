# Collection configuration

## Locked product decisions

LAMMB (`LAMMB`) has a supply of **5,280** and targets **Robinhood Chain mainnet**, chain ID **4663**. The primary mint price is **0 ETH**, represented as **0 wei**; network gas still applies. The domain is **lammb.fun**, the marketplace/drop target is **OpenSea**, and the launch model is **delayed reveal**. LAMMB means **Let's All Make Money Bitches**.

The access model consists of **Partner GTD**, **allowlist if required**, and **public allocation**. This defines vocabulary, not eligibility rules, quantities, per-wallet limits, a schedule, or a guarantee about integration availability.

## Current implementation

`packages/collection/src/config.ts` owns the canonical typed object. `collectionConfigSchema` validates nonempty names, safe positive integer supply and chain IDs, a bare domain, nonnegative bigint price, and the delayed reveal model. Strict objects reject unknown configuration properties. Invalid configuration throws on import and prevents building or serving dependent code. The object is frozen, and canonical facts have regression tests.

`packages/collection/src/network.ts` derives the network ID/name from that object. It describes mainnet and ETH currency units. It provides no RPC URL, credentials, block explorer guess, wallet configuration, signer, or transport. Nothing connects to mainnet.

The shared access schema contains exactly PARTNER_GTD, ALLOWLIST and PUBLIC. No wallet records, hidden allocation logic, proofs or eligibility infrastructure are live.

## DEVELOPMENT IMPLEMENTATION: collection construction

Task 003 adds an offline logical engine using this canonical configuration, without changing any collection facts. A DEVELOPMENT_ONLY stress fixture produces exactly 100 unique specimens with generic `dev-` IDs, all nine categories, all six approved corruption system levels, structural mutation/scene constraints and two curated grails. Synthetic text references are not LAMMB art or a production preview; observed frequencies are not production rarity.

Construction indices are internal ordered positions, not token IDs or mint assignments. Integer construction PCG32 and exact ordinary quotas operate only within this versioned development engine. Final production assets, rendering, identity/cardinality policy, rarity, seed/publication and reveal assignment remain unapproved. [Generator documentation](GENERATOR.md) contains the reproducibility protocol, fixture evidence and CLI.

Development public metadata has an explicit strict presentation boundary with specimen identifier/name, logical image reference, selected public traits, optional public mutation/corruption/environment descriptors and provenance reference. Internal recipe/seed/debug information is separate. This DTO does not approve OpenSea encoding, final NFT URI formats, ownership claims or production share-card data.

## Current design direction: Partner GTD model

There is one consolidated PARTNER_GTD group. Partner declarations are inputs to future policy, never one mint stage per partner. `partnerDeclarationSchema` requires version, development environment, partner ID, display name, opaque project/collection reference, chain name/ID, eligibility source type, snapshot policy/reference status and declaration status; a visual reference is optional. A snapshot source requires both policy and snapshot references. Strict objects reject wallet lists and extra allocation fields.

Current declarations are DEVELOPMENT_ONLY, with `dev-` IDs. `packages/collection/src/development-partners.ts` contains one synthetic schema example, no real project enrollment. Declarations do not check ownership, query holders, scrape wallets, generate allowlists or make eligibility decisions. Qualifying through multiple communities must eventually be deduplicated by an approved policy. No deduplication rule or entitlement quantity is selected here. Production declarations require separately reviewed authority and schema evolution.

## Current design direction: Share experience

Version `1` requires explicit fixture authority. It cannot represent a live ownership or provenance claim; a future authorized revealed-data adapter and reviewed schema evolution are required for production cards.

The intended collector share experience follows reveal. `shareCardSchema` version `1` accepts only PUBLIC_REVEALED public fields: opaque token identifier, LAMMB name/number, image reference, selected public label/value traits, optional mutation/pixel-corruption/environment label/value descriptors, and provenance reference. Optional descriptors represent future public data; no actual traits or identifier convention are supplied. Internal fields are rejected at the top level and inside trait/descriptor objects.

Public references accept HTTPS without credentials, IPFS references or opaque URNs. These references are validated structurally and never fetched/published by Task 002. There is no share image renderer, download/share action, wallet address, private recipe, seed, generation index or internal metadata in this boundary. A future adapter must explicitly choose approved public fields and obtain revealed data from an authorized source before card generation. Schema validity alone does not establish reveal status, ownership, reference trust or provenance correctness.

## Unresolved decisions

- Contract standard, token ID convention, ownership/authority, and supply enforcement.
- OpenSea drop support, integration method, and exact network availability at integration time.
- Partner selection, GTD proof rules, allowlist necessity, allocation quantities, wallet limits, and public mint timing.
- Metadata storage, sealed metadata, commitment format, reveal authorization, and irreversibility.
- License, artwork usage rights, royalty policy, and operational permissions.

No contract or published NFT metadata URI is invented. Converting the bigint price to JSON requires an explicit decimal-string boundary; direct `JSON.stringify(collection)` is intentionally unsupported. Task 003 defines versioned canonical logical encoding for offline integrity hashes. Final fairness commitments and public NFT metadata encoding still require approval.
