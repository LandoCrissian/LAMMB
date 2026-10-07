# Offline collection construction

## LOCKED

Canonical collection facts remain in `packages/collection/src/config.ts`: LAMMB, supply 5,280, Robinhood Chain (4663), free mint with gas, delayed reveal and lammb.fun. Construction does not allocate NFTs to wallets or map specimens to token IDs. Category names remain defined once in `src/schema.ts`.

Construction must validate complete inputs, enforce compatibility and uniqueness, meet the requested count exactly, and reproduce ordered logical outputs. Failure returns a structured error without a partial collection or relaxed rules. **A commitment proves only what the eventual protocol actually binds.** Construction integrity is not proof of fair token assignment.

## DEVELOPMENT IMPLEMENTATION

### Input and version boundaries

`packages/art-generator` extends the Task 001 schemas with catalog version 2, source asset manifest version 1, construction request version 1, logical collection/provenance version 2 and development public metadata version 1. The original version 1 schema exports remain available; they do not run this constructor.

The catalog has exactly one selected trait definition per conceptual category. A definition can reference multiple assets; mutations and scenes can replace assets across categories. This is the current constructor policy, not an approved production category cardinality or a PNG stacking restriction. A future reviewed extension can add cardinality/compositing capabilities at these versioned boundaries without replacing validation, construction, hashing and verification.

Every trait declares stable ID, category, assets, integer weight, optional exact planned count, tags/dependencies/exclusions, identity participation, public visibility and display order. Manifest records declare stable ID, category, portable relative path, SHA-256, environment, optional dimensions, composition role/order/slot and tags. Dimensions are declarations here; no image decoder verifies pixels. Roles support references, layers, effects and scenes. Asset lists are sets; a future renderer must use manifest composition information and its approved recipe, never incidental list order.

The fixture catalog and every fixture asset are DEVELOPMENT_ONLY. IDs use `dev-`; labels describe generic development systems. Eleven tiny LF text assets are logical references, not artwork. No image renderer, AI artwork, final trait taxonomy or production rarity exists here. The CLI rejects PRODUCTION catalogs. Task 004 requires V2 source artwork with digest-bound APPROVED declarations for the reusable production constructor; V1 production inputs reject. Canonical supply is still required for full production construction; this does not authorize manufacture. See [art ingestion](ART_INGESTION.md).

### Construction PRNG

`pcg32-xsh-rr/1` implements the PCG XSH-RR 64-bit-state / 32-bit-output algorithm. BigInt state arithmetic is explicitly masked to 64 bits; output rotations use unsigned 32-bit operations. Integer weighted selection avoids floating-point probabilities. Bounded draws use rejection sampling to remove modulo bias and have their own 128-draw failure bound.

PCG32 was chosen for its small implementation, explicit integer behavior and independently published reference vectors. It is not cryptographically secure. The six committed 42/54 initialization vectors match the [official PCG reference example](https://www.pcg-random.org/using-pcg-c-basic.html). This choice is **COLLECTION CONSTRUCTION PRNG**, not **FUTURE TOKEN ASSIGNMENT / REVEAL RANDOMNESS**. Entropy, VRF, token convention, shuffle and final fairness protocol remain unapproved.

`sha256-recipe/1` hashes UTF-8 bytes of the literal prefix `LAMMB construction seed v1` followed by LF, then canonical recipe bytes. The first two 64-bit big-endian words initialize PCG state and sequence. The complete 32-byte supplied seed and every recipe field influence this derivation; state reduction is not a cryptographic fairness claim. The recipe binds:

- Seed, declared source commit/reference and requested output count.
- Generator, PRNG, canonical ordering/serialization, seed derivation and logical renderer versions.
- Collection configuration, normalized catalog and asset manifest digests.
- Per-specimen and total attempt budgets.

`logical-composition-only/1` records the absence of a pixel renderer. Changing any algorithm or normalization semantics requires versioning and new vectors/golden evidence. A source reference identifies the declared source; it does not attest to a Git checkout. The committed fixture uses stable `urn:lammb:development:task-003-source-v1` so its golden digest does not depend circularly on the commit containing it. Reviewers must separately inspect the exact PR commit. Future production recipes should use an approved immutable source reference and reproducible runtime policy.

### Canonical serialization and digests

`normalized-json-integers/1` is a documented logical encoding, not a claim of RFC 8785 compliance. Objects have NFC-normalized keys sorted by ECMAScript code-unit comparison, emitted directly in that order. Strings use NFC and normalize CRLF/CR to LF before JSON escaping. Numbers are safe integers in decimal; negative zero becomes zero. Arrays retain order, except input collections explicitly normalized as sets by the whole-input validator. Null and booleans use JSON spelling. Output is compact UTF-8 JSON with no BOM, spacing or trailing newline.

Duplicate normalized keys, invalid Unicode scalars, floats, unsafe integers, undefined, BigInt, symbols, accessors, sparse/decorated arrays, non-JSON objects, cycles and nesting deeper than 64 fail. Collection price crosses the configuration hashing boundary as a decimal string, never implicit BigInt serialization.

The validator sorts categories, traits/rules/grails/assets by ASCII identifiers; tag/reference sets, structural effects and reservations receive explicit canonical ordering. Display strings are schema-trimmed. Whitespace, object insertion order, input set order, JSON file line endings and machine paths do not influence logical digests. Source asset SHA-256 hashes **raw file bytes**, without line-ending or image normalization. The repository's existing `.gitattributes` keeps text fixtures LF on checkout; a genuinely changed asset byte stream must fail verification.

SHA-256 is the standard Node cryptographic digest of those exact bytes. Catalog and manifest hashes cover normalized validated inputs, not their pretty-printed source files. Specimen hashes cover full indexed logical records. Public metadata has separate per-specimen and collection hashes. The logical collection digest covers its recipe and ordered specimens. Provenance records each effective asset ID and each output's fingerprint/logical/metadata digest. It also binds the entire source manifest, including unused assets.

### Compatibility, mutation and scene semantics

`INCOMPATIBLE` forbids the declared set occurring together. `REQUIRES` is an implication from one trait to all required traits. `EXCLUDES_TAG` forbids a tag when its trigger is selected; `REQUIRES_TAG` requires one. Trait-local requirements/exclusions have the same meaning. Tags come from selected traits and **effective** assets after structural replacement.

Structural mutation category effects require the selected category trait to belong to an explicit allowed set and optionally replace that category's asset set. One mutation may constrain anatomy, wool, clothing and accessories simultaneously. Scenes have separately named constraints using these same category effects. Conflicting asset replacements reject the candidate; there is no hidden override precedence. The engine emits the effective composition and modifier references for future renderers, without assuming PNG layering.

Pixel corruption is a distinct category with the approved system levels NONE, TOUCH, BLEED, FRACTURE, GLITCHED and REALITY_FAILURE. Each selection declares a level and participates in identity. Its requirements/exclusions can constrain traits and effect capability tags. These names carry no approved production percentages.

Every rejection has a stable code and explanation. Aggregate counts and attempts stay in internal stress/provenance artifacts, never public metadata. One rejected candidate can violate multiple rules, so reason counts need not sum to rejected candidates.

### Grails, fingerprints and bounded selection

Grails contain explicit zero-based logical slots and complete curated compositions. These are construction indices, not token IDs. Reservations are validated before ordinary construction. A grail ID may reserve multiple distinct compositions; duplicate identities or overlapping slots fail. Reserved fingerprints are excluded from ordinary weighted selection, even before their reserved slot is reached.

Fingerprint version 1 hashes `{version: 1, identity: [...]}` with category, stable trait ID and sorted **effective** asset IDs for identity-affecting selected traits. Category/trait ordering is canonical. Image hashes alone are insufficient. Index, names, grail label, display/visibility metadata, weights, attempts and debug modifier fields cannot manufacture uniqueness. A non-identity modifier that changes effective assets still changes the corresponding identity layer. Approved production identity participation remains subject to review.

Selection uses bounded deterministic weighted candidates and hash-set uniqueness. Planned counts are exact for ORDINARY_ONLY slots; grails are excluded from those quotas and ordinary frequency counts but included in total category frequencies. Exhausted quotas are unavailable, and outstanding quotas constrain the final ordinary slots. Compatibility and uniqueness further condition the realized distribution; weights are not rarity promises.

Maximums are 10,000 candidates per specimen and 5,000,000 total. No unbounded random retry occurs. Failure reports index, current/total attempts, requested count, exhausted category where applicable and dominant rejection codes/explanations. This bounded greedy constructor can exhaust a budget even when a different global solution might exist; it does not prove mathematical unsatisfiability and does not backtrack or weaken rules. Production inputs must independently demonstrate feasibility under the approved strategy and bounds.

### Offline CLI and verifier

Use the repository-pinned Node 22.23.2 runtime and `npm ci`. No network access is required after installing the existing dependency graph. Commands default to the committed fixture catalog, manifest, request and source assets:

```text
npm run collection:generate -- --out task-003-stress-final-a --json
npm run collection:verify -- --out task-003-stress-final-a --json
npm run collection:summarize -- --out task-003-stress-final-a --json
npm run collection:generate -- --out task-003-stress-final-b --json
npm run collection:verify -- --out task-003-stress-final-b --json
```

Optional `--catalog`, `--manifest`, `--request` and `--assets-root` supply explicit local input paths. The CLI permits source assets only beneath the two reserved package asset roots and writes only beneath ignored `artifacts/generated/`. `--out` is a portable relative directory. Every run needs a new directory; existing outputs are never overwritten. A fixed staging directory with exclusive files is renamed after the complete bundle is written. Failed staging output is not valid evidence and may remain for owner inspection.

Bundles contain `collection.json`, `metadata.json`, `provenance.json` and `summary.json`. Generation time and absolute output path appear only in the external CLI report. The four deterministic artifacts contain neither timestamps nor machine paths. Summarize verifies first. Validation, generation, I/O or verification failure exits nonzero; no partial collection is reported successful.

The verifier reads independently supplied fixture inputs and actual asset bytes, regenerates every specimen, recomputes every hash and compares the entire canonical artifact bundle. It never trusts a stored `verified` flag or a supplied collection digest. Changed catalog, seed, source reference, output, metadata, provenance, summary or missing records fail. It shares the versioned pure constructor with generation; independent test vectors and committed golden evidence catch algorithm drift. This is an executable reproducibility verifier, not an independently implemented fairness audit.

### 100-specimen development stress result

The committed [golden summary](../packages/art-generator/fixtures/stress-golden.json) is the expected evidence; generated bulk artifacts remain ignored. This is an engine stress collection, not a preview of LAMMB art or production rarity.

| Measure                                 | Result                                                                    |
| --------------------------------------- | ------------------------------------------------------------------------- |
| Requested / generated / unique          | 100 / 100 / 100                                                           |
| Reserved grails / structural mutations  | 2 / 20                                                                    |
| Ordinary accepted / rejected candidates | 98 / 107                                                                  |
| Total candidates / maximum per specimen | 205 / 10                                                                  |
| Corruption levels                       | NONE 15; TOUCH 16; BLEED 17; FRACTURE 17; GLITCHED 17; REALITY_FAILURE 18 |

The six corruption planned counts cover 98 ordinary slots; the two grails add GLITCHED and REALITY_FAILURE. Frequencies below include grails. For each row, letters refer to the corresponding generic `dev-<category>-<letter>` trait IDs, with `base`, `eye`, `expression`, `accessory`, `mutation`, `pixel` and `environment` singular prefixes where used in the fixture.

| Category         | Development frequencies            |
| ---------------- | ---------------------------------- |
| base_anatomy     | a 66, b 31, c 1, d 2               |
| wool             | a 69, b 21, c 5, d 5               |
| eyes             | a 67, b 28, c 3, d 2               |
| expressions      | a 70, b 30                         |
| clothing         | a 65, b 26, c 4, d 5               |
| accessories      | a 70, b 5, c 15, d 10              |
| mutations        | a 80, b 20                         |
| pixel_corruption | a 15, b 16, c 17, d 17, e 17, f 18 |
| environments     | a 66, b 25, c 9                    |

| Rejection reason                                   | Count |
| -------------------------------------------------- | ----- |
| DUPLICATE_IDENTITY                                 | 8     |
| RESERVED_GRAIL_IDENTITY                            | 1     |
| RULE:dev-accessory-clothing-requirement            | 39    |
| RULE:dev-base-accessory-exclusion                  | 2     |
| RULE:dev-pixel-wool-exclusion                      | 1     |
| RULE:dev-scene-capability                          | 7     |
| STRUCTURE:dev-environment-b:base_anatomy           | 7     |
| STRUCTURE:dev-mutation-b:accessories               | 19    |
| STRUCTURE:dev-mutation-b:base_anatomy              | 11    |
| STRUCTURE:dev-mutation-b:clothing                  | 8     |
| STRUCTURE:dev-mutation-b:wool                      | 4     |
| TRAIT_INCOMPATIBLE:dev-pixel-f:dev-base-d          | 3     |
| TRAIT_REQUIRES:dev-pixel-d:dev-wool-a              | 21    |
| TRAIT_REQUIRES_TAG:dev-accessory-c:dev-scene-ready | 3     |
| TRAIT_REQUIRES_TAG:dev-mutation-b:dev-effect-ready | 8     |
| TRAIT_REQUIRES_TAG:dev-pixel-c:dev-effect-ready    | 10    |
| TRAIT_REQUIRES_TAG:dev-pixel-e:dev-effect-ready    | 12    |
| TRAIT_REQUIRES_TAG:dev-pixel-f:dev-effect-ready    | 3     |

| Canonical digest   | SHA-256                                                            |
| ------------------ | ------------------------------------------------------------------ |
| Catalog            | `9378da36d2cf931735de42dc67b63e7fa9c8363b5f2dbb5f405e017caa81754a` |
| Asset manifest     | `527e5a684c12b75fb1a107bc8b0767e23ecc3100c5912401993dc0937e70bd0f` |
| Logical collection | `3f062e25fe2648ab2f5167c27754526d0f968d531611ca8e4505d765ae7eb9c3` |
| Public metadata    | `0f402c1a650b3957527b028448bc44a258a2d5af1c191c19c68ce99ec63bed1b` |

Measured 100-specimen timing belongs in the external delivery report, outside deterministic evidence. The constructor uses indexed maps, bounded per-category selection and a fingerprint set; it avoids comparing every specimen with every other specimen. No production 5,280-specimen run or renderer benchmark has been performed.

## UNRESOLVED PRODUCTION DECISION

Approved artwork, taxonomy, rights, asset formats/dimensions, renderer/compositing, category cardinalities, identity policy, mutation/corruption/scene design, exact production weights/counts, grail compositions, feasibility strategy and performance acceptance remain open. Public metadata encoding, image/provenance storage, mapping construction indices to tokens, seed secrecy/publication, source/runtime attestation and publication policy need independent review. Final mint allocation/reveal entropy, shuffle and fairness protocol remain separate unresolved work. No blockchain, contracts, wallet ownership, IPFS publication, OpenSea refresh, deployment or production generation is implemented.
