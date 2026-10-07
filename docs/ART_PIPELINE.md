# Art and generation pipeline

## Current scope

Task 004 adds [production art ingestion and the renderer boundary](ART_INGESTION.md): V2 source manifests, lifecycle/digest-bound local review declarations, explicit composition plans, render provenance and a DEVELOPMENT_ONLY text transcript renderer. Actual dimensions, media, alpha pixels and profiles remain declarative until a reviewed decoder exists. Source hashes are byte-verified. No artwork, image rendering or production collection is created.

`packages/art-generator` now contains the Task 003 deterministic offline logical constructor, strict whole-input validation, compatibility/mutation/scene enforcement, bounded selection, explicit grail reservations, logical uniqueness, separate public metadata and internal provenance, and an executable reconstruction verifier. The 100-specimen fixture is **DEVELOPMENT_ONLY** and uses tiny synthetic text references. It contains no production artwork, raster renderer, final traits or production rarity. The shell's decorative mountain lines are not collection artwork.

The original version 1 schema foundation remains available. The version 2 constructor extends those boundaries:

| Input / record      | Current fields                                                                                                                                          |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Trait               | ID, label, category, asset references, integer weight/exact count, tags/dependencies, structural behavior, public visibility and identity participation |
| Categories          | Base anatomy, wool, eyes, expressions, clothing, accessories, mutations, pixel corruption, environments/scenes                                          |
| Frequency / counts  | Integer relative weight and optional exact ORDINARY_ONLY count; no production rarity claim                                                              |
| Grail               | Explicit reserved logical slots and complete curated compositions                                                                                       |
| Compatibility rule  | INCOMPATIBLE, REQUIRES, EXCLUDES_TAG and REQUIRES_TAG with explanations                                                                                 |
| Generation recipe   | Seed, source reference, generator/PRNG/order/renderer/canonical versions, input digests, expected count and attempt bounds                              |
| Specimen record     | Internal index, canonical composition, effective assets, grail reference, corruption level and logical fingerprint                                      |
| Provenance manifest | Recipe, ordered per-output hashes/asset references and complete logical/public metadata digests                                                         |

Whole-input validation rejects duplicate IDs/paths, unresolved references, environment/category mismatches, malformed digests, invalid quotas and incompatible grails. Actual source bytes must match every manifest SHA-256. The engine requires complete ordered output coverage and unique logical identities. Portable paths and the CLI enforce local source/output confinement. Logical verification reconstructs and compares all artifacts; it does not establish mint assignment fairness.

Weights drive integer selection conditioned by compatibility, uniqueness and exact ordinary quotas. Grails occupy explicitly reserved slots and are excluded from ordinary quotas. The current constructor selects one definition per category, with multi-asset structural effects. Neither that development policy nor the stress frequencies approves production artwork/cardinality/rarity. [Offline generator documentation](GENERATOR.md) defines exact semantics, canonical bytes, vectors, CLI commands, digests and stress results.

## Locked generation requirements

The complete production collection must eventually generate **5,280** art/metadata pairs, using canonical supply rather than a second executable constant. Task 003 generates only 100 logical development specimens. Identical normalized inputs, engine version and seed produce byte-identical ordered logical artifacts. A future approved renderer must extend that guarantee to final image bytes.

The recipe records input hashes, source reference, generator version, seed, construction PRNG, canonical ordering/encoding, logical renderer version and attempt budgets. No ambient randomness, wall-clock timestamp, directory enumeration or manual substitution influences deterministic artifacts. Final pixel rendering/codec versions and immutable production source/runtime evidence still require approval.

The candidate recipe uses a 32-byte hex seed and SHA-256 input/output digests as engineering schema conventions. Seed selection, public commitments, proof publication, and any contract linkage remain unresolved. These conventions can be deliberately revised before production; they make no claim about launch randomness today.

The offline reconstruction verifier now recomputes hashes, reproduces logical outputs, checks exact requested count/uniqueness/quotas/compatibility and rejects altered or missing evidence. It shares the constructor implementation and has independent PCG vectors and committed golden evidence; a separate adversarial production audit and public commitment verifier remain necessary. Input publication, seed secrecy and final image validation are unresolved.

## Directories

`assets/` reserves approved future source inputs. `fixtures/` preserves the empty version 1 catalog and adds the Task 003 stress catalog, manifest, request, tiny assets, PRNG vectors and golden summary. `src/schema.ts` owns canonical categories and the original boundaries; `engine-schema.ts` extends them. Generated bundles belong under ignored `artifacts/generated/`; bulk collection output is not checked in.

## Unresolved decisions

Canonical anatomy/artwork/taxonomy, production frequency targets, grails, asset formats, renderer/compositing, production identity/cardinality policy, metadata encoding, content addressing/storage, seed policy, commitments, licensing and publication remain unresolved. Construction PCG32, recipe seeding, logical fingerprints and canonical JSON are versioned DEVELOPMENT IMPLEMENTATION decisions; they do not choose reveal randomness or guarantee production readiness.

## Fairness commitment boundary

### Locked product decision

Rare/grail assignment is intended to be independently auditable. **A commitment proves only what the eventual protocol actually binds.** A digest alone does not prove random, unbiased or fair assignment; it does not establish when a commitment was published, which inputs were bound, whether the operator could choose among outcomes, or whether assignment followed the disclosed process.

### Current design direction

The preferred research sequence is **commit → mint/allocation → reveal shuffle → public verification**. The final algorithm is UNAPPROVED. Task 002's `fairnessCommitmentSchema` requires version `1`, record ID, DEVELOPMENT_FIXTURE authority and UNAPPROVED protocol status. There is no production commitment, assignment hash computation, assignment verifier or web fairness claim. Task 003's construction hashes/verifier occupy a separate offline integrity boundary.

Three independently staged slots represent collection input commitment, art/catalog commitment and assignment commitment. Each is explicitly NOT_PUBLISHED or PUBLISHED with a generic digest boundary (algorithm reference, hex encoding and value), UTC publication timestamp and public publication reference. Distinct slots can represent distinct publication times; this does not choose the final commitment chronology. Unknown fields, missing versions, malformed hex, missing publication evidence and unsafe references fail closed. Algorithm-specific digest lengths and correctness cannot be checked until the protocol is approved; syntax validation is not cryptographic validation.

Reveal verification material is UNAVAILABLE or PUBLISHED with a protocol specification reference and material references. Verification status can be NOT_RUN, UNVERIFIABLE, FAILED or REPORTED_VERIFIED. The latter requires all commitment slots and protocol material plus a verifier/report reference and timestamp. It records an external assertion in development data; parsing it does not perform verification, approve a protocol or establish fairness. No schema status is presented as a fairness badge in the website.

The offline construction recipe remains separate from launch assignment fairness. Task 003 approves a versioned development construction PRNG and logical integrity encoding only. Public commitments must eventually specify their own covered inputs, exact assignment semantics, publication evidence and an independently reproducible verifier.

### Unresolved decisions

PRNG, entropy source, VRF/provider choice, token-ID convention, allocation/assignment mapping, shuffle algorithm, commitment algorithm, exact bound inputs, publication chronology/channel, independent verifier, contract linkage and adversarial fairness review remain unresolved. None is locked or implemented by these interfaces.
