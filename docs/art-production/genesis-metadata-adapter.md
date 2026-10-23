# Genesis metadata adapter, version 1

Task071 adds an independent reader and adapter for the hash-bound Task070 Genesis selection. It does not relax the legacy development registry, change artwork, execute registrations, assign token IDs or publish metadata. The private acceptance dataset is deliberately absent from this repository.

## Compatibility boundary

The existing registry is `DEVELOPMENT_ONLY`, accepts at most 32 source assets and explicitly rejects production promotion. The legacy metadata validator closes its trait vocabulary over 16 names. The actual 720 prepared records contain 36 distinct names, 30 outside that vocabulary. All 720 fail the legacy validator. Renaming or dropping these traits would misrepresent accepted artwork.

| Task070 input                             | Genesis representation                            | Validation                                                                                        |
| ----------------------------------------- | ------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| Exact selection JSON and owner scope JSON | Externally supplied SHA-256 trust pins            | Version 2 selection; 720 unique IDs, PNGs and pixel arrays; 690 ordinary, 24 Ultimate, six grails |
| Stable composition and lineage IDs        | Unchanged IDs and provenance                      | No held or superseded selection; accepted PNG hash equals selected PNG hash                       |
| Prepared metadata bytes                   | `extensions.task070.sourceMetadataJson`           | Original byte digest plus parsed schema; duplicate trait names rejected                           |
| Prepared metadata object                  | `metadata`                                        | All 36 source-observed labels supported explicitly; exact source-bound values; no coercion        |
| Complete selection entry                  | `extensions.task070.entry`                        | Preserved and compared to the pinned entry, including historical source and recovery fields       |
| PNG SHA-256 and RGB pixel SHA-256         | Unchanged hashes                                  | Native 1024×1024 RGB PNG, CRC and decoded pixels checked independently                            |
| Recipe, sources, renderer and recovery    | `provenance`                                      | Referenced local bytes rehashed; archive ID/hash/member evidence required                         |
| Editable peg geometry                     | Independently pinned geometry index and witnesses | 64×64 addresses, nine layers, palette, contacts, occlusion and complete grid hash                 |
| Ultimate / grail classification           | `classification`                                  | Exact correspondence to frozen selection; no conversion into rarity weights                       |
| Unknown new fields                        | Explicit versioned extension or rejection         | Strict outer schemas; unknown top-level fields and unrecognized extension namespaces rejected     |

The private `TASK071_SCHEMA_COMPATIBILITY_MATRIX.json` enumerates each observed trait label, affected composition IDs and legacy incompatibility. `genesisTraitNames` in `genesis-model.ts` is the version 1 closed vocabulary. Adding vocabulary requires a reviewed schema change and source evidence, not a permissive catch-all.

## Versions and deterministic bytes

The adapted envelope uses `lammb-genesis-composition/1`. Registry record, snapshot, execution grant and readiness-report schemas have separate version identifiers. Geometry index schema 2 binds each witness digest, grid digest and source-binding digest. Unknown versions fail.

Duplicate JSON keys, including escaped spellings of the same key, are rejected before adaptation. The parser never accepts the usual last-key-wins ambiguity.

`serializeGenesis` sorts object keys and preserves array order, string values, Unicode and embedded line endings. It adds no whitespace or normalization. It rejects unsafe integers, non-finite numbers, negative zero, sparse arrays, cycles, accessors, symbols, prototype keys and exotic objects. Depth and node budgets bound parsing/serialization work. This is a project-specific versioned format, not a claim of RFC 8785 equivalence.

Raw source metadata SHA-256 and canonical effective metadata SHA-256 are separate fields. `restoreTask070` reconstructs the exact original metadata text and selection entry. `validateAdapted` rechecks both hashes, all fields, provenance and the independently pinned geometry. Round-trip integrity therefore covers historical fields as well as the public metadata object.

Metadata image URIs preserve Task070's CIDv1 raw SHA-256 binding to PNG bytes. No pinning or publication is performed. A later ordinary UnixFS import may yield a different CID and requires an explicit reviewed metadata revision.

## Read-only actual-data validation

Use Node 22 and installed locked dependencies. Supply reviewed digests independently; never calculate trust pins from an untrusted replacement immediately before execution.

```powershell
node --max-old-space-size=1024 --experimental-strip-types packages/art-generator/tooling/genesis-readiness.ts `
  --task070-root '<private Task070 directory>' `
  --selection-sha256 '<reviewed selection digest>' `
  --approval-sha256 '<reviewed approval digest>' `
  --geometry-root '<private geometry-v3 directory with INDEX-v2.json>' `
  --geometry-index-sha256 '<reviewed geometry index digest>' `
  --source-root '<preserved pegboard root>' `
  --output-root '<new exclusive disposable output directory>'
```

This command has no execution flag, signer, wallet, network upload or production-store option. It reads sources sequentially, writes new adapted JSON and a disposable readiness journal, verifies deterministic replay of the adapter and byte-exact round trips, and stops before `REGISTERED`. It enforces a 4,096 MiB start gate before private input I/O, retains the 2,048 MiB in-flight safety floor, and requires stable workstation readings before launch. Existing artwork is never rendered or rewritten by this adapter.

Historical metadata remains readable through the exact preserved Task070 extension. Unrelated historical formats are not guessed or migrated automatically. Unsupported lossless mappings fail with `GenesisError.code`, optional composition ID and field path. File paths are root-confined and symlinks/junctions rejected; source-size and parser budgets apply.
