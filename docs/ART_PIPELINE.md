# Art and generation foundation

## Current scope

`packages/art-generator` contains schemas and an **empty development-only catalog**. It contains no generator algorithm, PRNG, raster renderer, final traits, production art, metadata output, rarity assignment, or executable verification tool. The shell's decorative mountain lines are not collection artwork.

The schemas describe:

| Input / record       | Current fields                                                                                                 |
| -------------------- | -------------------------------------------------------------------------------------------------------------- |
| Trait                | ID, label, category, relative asset path, SHA-256 digest                                                       |
| Categories           | Base anatomy, wool, eyes, expressions, clothing, accessories, mutations, pixel corruption, environments/scenes |
| Frequency / rarity   | Integer relative weight, optional planned count and descriptive rarity label                                   |
| Grail                | Explicit named composition of trait references and planned count                                               |
| Incompatibility rule | Distinct trait references and a reason                                                                         |
| Generation recipe    | Seed, source commit, generator/PRNG/order/renderer versions, input digests, expected output count              |
| Specimen record      | Internal generation index, trait/grail references, art and metadata paths/digests                              |
| Provenance manifest  | Recipe and complete indexed output records                                                                     |

Catalog validation rejects duplicate IDs and dangling or duplicate rule/grail references. Empty production catalogs are rejected. Portable relative paths reject absolute paths and traversal. Manifests require every zero-based generation index exactly once and unique output paths. These are structural checks; they do not read files or establish real provenance, rarity, compatibility, or fairness. A rule's trait set expresses a forbidden co-occurrence; enforcement belongs to a future generator. Layer ordering and category cardinality are not decided by enum order.

Weights describe future input intent, not a published distribution or a selection algorithm. Planned counts are not enforced across a collection yet. Grail quotas, compatibility consistency, specimen-to-catalog references, and actual hash correctness require a future whole-input validator. Synthetic validation-test fixtures are clearly marked and are not approved traits.

## Hard requirements for the future generator

The complete collection must eventually generate **5,280** art/metadata pairs, using the canonical supply rather than a second executable constant. Identical approved inputs must produce identical ordered outputs and hashes in a specified reproducible environment.

Record all input hashes, the exact source commit, generator version, seed, fixed PRNG algorithm, stable trait ordering, layer ordering, renderer/codec versions, and canonical metadata serialization. Do not use ambient `Math.random`, wall-clock time, host directory iteration order, or undisclosed manual substitutions. Seed recording alone does not make generation deterministic.

The candidate recipe uses a 32-byte hex seed and SHA-256 input/output digests as engineering schema conventions. Seed selection, public commitments, proof publication, and any contract linkage remain unresolved. These conventions can be deliberately revised before production; they make no claim about launch randomness today.

An eventual independent verifier must recompute hashes, reproduce generation, confirm supply and uniqueness, check trait/grail quotas and incompatibilities, and compare public commitments. Unverifiable rarity assignments and hidden overrides are unacceptable. Input assets, catalog, recipe, and verifier must be available under an approved publication policy.

## Directories

`assets/` reserves source inputs; `fixtures/` holds the empty development catalog; `src/schema.ts` defines the boundary. Future generated artifacts belong under ignored `artifacts/generated/` or approved external storage. No generated collection files are checked in.

## Unresolved decisions

Canonical anatomy/artwork and taxonomy, frequency targets, grail design, source asset formats, layer/scene compositing, PRNG, seed derivation, duplicate policy, renderer, metadata schema/encoding, content addressing/storage, commitment format, licensing, and verifier/publication process remain unresolved.
