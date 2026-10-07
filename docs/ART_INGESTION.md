# Production art ingestion and renderer boundary

Task 004 prepares LAMMB for **100 real visual LAMMBs** once approved art exists. It creates no artwork, final traits, real visual collection, contracts or deployment. Supply remains the canonical 5,280; construction indices remain separate from token IDs. A local approval declaration is a review record, **not authenticated authority or a signature**.

## LOCKED ARCHITECTURE

ARTIST OUTPUT → SOURCE ASSET → HASH → REVIEW → APPROVAL → INGESTION → LOGICAL SPECIMEN → COMPOSITION PLAN → RENDER → OUTPUT HASH → PROVENANCE

Artists deliver immutable local source files and their explicit reference frame, dimensions, placement, transparency and color declarations. Review starts with the exact raw-byte SHA-256. Artwork lifecycle is DRAFT → REVIEW → APPROVED, with RETIRED unavailable for construction. Moving through those states is an owner review process; no CLI changes source bytes or auto-approves assets. Updating a manifest digest after changing a file invalidates its old approval record.

Production construction requires manifest V2 and an APPROVED local declaration for every manifest asset. DRAFT, REVIEW, RETIRED, missing approval, digest/state mismatch, DEVELOPMENT_ONLY sources, development IDs and text fixtures fail closed. The production loader also refuses the development source root. This policy covers ordinary assets, replacement assets, effects, scenes, curated grail sources and unused manifest assets. V1 remains accepted only for Task 003 development regression evidence.

Logical construction owns trait selection, structural replacements and randomness. Planning validates the supplied logical composition, selected trait constraints, fingerprint, corruption level and grail reservation against independently supplied catalog/source evidence. Planning does not rerun seed selection; verify an existing logical bundle with `collection:verify` before using it as construction evidence. Rendering receives a resolved plan plus hash-checked source bytes, with no trait catalog, PRNG, clock, network or filesystem input.

A composition plan binds its normalized logical specimen and fingerprint, normalized source/approval manifests, normalized plan request, renderer identity/version, canvas/reference frame, output specification, effective logical sources and strictly ordered visual operations. Source hashes cover raw bytes; plan/metadata/provenance hashes use Task 003's versioned canonical encoding. Identical logical evidence, manifests, composition policy and renderer identity derive identical plans regardless of file enumeration or input set/object order.

Production reproduction requires both a proven deterministic renderer and a pinned runtime/codec policy. Task 004 proves only deterministic **text render transcripts**. It makes no pixel reproduction or production image correctness claim.

## DEVELOPMENT IMPLEMENTATION

### Versioned inputs

| Boundary                   | Version                       | Validation purpose                                                                              |
| -------------------------- | ----------------------------- | ----------------------------------------------------------------------------------------------- |
| Source asset manifest      | 2                             | Explicit environment, immutable source digests, dimensions/frame, composition and compatibility |
| Approval manifest          | 1                             | Exact asset ID/digest/state match to a reviewed local declaration                               |
| Plan request               | 1                             | Chosen square canvas/frame, renderer, output and optional curated grail source set              |
| Composition plan           | 1                             | Fully resolved ordered renderer instructions and input commitments                              |
| Render metadata/provenance | 1                             | Separate output and public metadata digests; ordered source evidence                            |
| Fixture renderer           | `dev-text-renderer` / `1.0.0` | Canonical textual transcript; DEVELOPMENT_ONLY and text/plain only                              |

`art-schema.ts` defines strict schemas. Manifest V2 records stable asset ID, category, portable relative source path, SHA-256, purpose, lifecycle, required width/height, media type, alpha capability/policy, color profile, composition role/order/slot/frame/placement/blend, provided/required compatibility tags and optional renderer requirements. There are no executable filenames, scripts, arbitrary transforms or dependency graphs.

`referenceFrames` gives each reference an explicit dimension pair. The plan request selects a frame and an equal square canvas. **64 × 64 is only the generic development reference declaration over existing text fixtures.** It chooses no production dimensions or pose names. Dimensions range from 1 to 32,768 per side within the current schema.

The declaration vocabulary accepts PNG, SVG and development text. This is an ingestion boundary, not approval of a production format or implementation of a decoder. No SVG is executed or interpreted; no PNG is decoded. Raw source integrity is verified, while file/media type, actual dimensions, alpha pixels and color profile are **declarative only**. Even a PNG declaration with matching bytes has not passed image validation. The production loader requires source placement under `packages/art-generator/assets/`; fixtures remain under `fixtures/assets/`.

Approval records contain asset ID, SHA-256, lifecycle and a stable local review reference. They do not sign anything, prove a review occurred or authenticate who approved it. An attacker able to replace both source evidence and approval declarations can create different valid local declarations. Future authority/signing, protected review storage and independent review remain unresolved.

### Geometry, transparency and compatibility

Placement uses a top-left source origin and integer coordinates. FULL_FRAME requires exact target/reference dimensions and zero offset. POSITIONED explicitly allows a smaller asset at a declared location. Any placement extending outside the reference frame fails as cropping. Scaling NONE preserves source dimensions; EXPLICIT carries target dimensions and a declared NEAREST or BILINEAR sampling policy into the plan. No production image is silently resized. These policies are modeled instructions; the text renderer performs no sampling.

Alpha capability is NONE or SUPPORTED; policy is REQUIRED, ALLOWED or FORBIDDEN. REQUIRED with NONE rejects. SRGB/NONE color declarations prevent arbitrary untracked profile choices; PNG declarations must specify SRGB. A future decoder must check the actual bytes and a future renderer must enforce output alpha/profile requirements.

All effective logical and curated grail sources must belong to the chosen reference frame. Required asset tags must be provided by selected traits/effective sources. This permits pose/anatomy/head/clothing/scene compatibility without inventing production names. Declared renderer requirements, when nonempty, are explicit acceptable identity/version alternatives. Unresolved frames, references or unsupported requirements fail.

### Layer order, structural changes and corruption

Manifest composition roles are LAYER, SCENE, EFFECT and REFERENCE. Slots are explicitly named composition positions. Numeric order alone determines operation order. Duplicate order or slot within a selected composition rejects, including REFERENCE records; no filesystem, asset-ID or insertion-order tiebreaker hides ambiguity. Mutually exclusive replacement variants can reuse the same order/slot because they cannot coexist in the resolved composition. Ordering dependencies are unsupported and strict schemas reject their fields; there is no cycle-prone dependency mechanism.

The planner verifies and copies the engine's effective source sets and modifier trait IDs after mutation/scene resolution. Multi-layer replacements remain explicit. Conflicting replacements already fail logical validation. Development replacement declarations have explicit orders/slots; Task 003's original V1 manifest and golden vectors are unchanged.

Pixel corruption preserves NONE, TOUCH, BLEED, FRACTURE, GLITCHED and REALITY_FAILURE without production frequencies. Plan-level corruption records the level, source effects versus curated-source mode and a source/fingerprint-bound instruction digest. EFFECT assets in the distinct corruption category carry `source-effect-instruction/1` instructions. The transcript preserves these instructions without pretending to execute pixel effects. Future procedural effect algorithms, parameters and semantics need their own versioned deterministic upstream construction; no renderer draws randomness.

### Grails

Ordinary layered grails use the logical effective asset set. Curated assets can be referenced by logical traits. Optional plan-request `grailCompositions` select an explicit alternate source set for a reserved grail, producing a special composition plan whose operation geometry/order comes from the same validated V2 manifest. This implementation does not allow arbitrary scripts or per-grail unvalidated geometry overrides. Original logical source evidence remains bound even when alternate sources replace its rendered operations. Curated corruption is explicitly source-bound in the plan. All sources remain ingested, environment-checked, digest-checked and approval-bound.

### Renderer, output and verification

`Renderer` is a versioned interface with descriptor, purpose and `render(plan, sources)`. `renderWith` checks identity/environment, source bytes and plan immutability. Determinism of a future implementation must be proven separately; declaring an ID is not such a proof. The built-in fixture accepts only DEVELOPMENT_ONLY/text/plain and its exact descriptor.

The fixture transcript is canonical JSON **stored as exact UTF-8 text** in `fixture-render.txt`. Its digest is SHA-256 of that file's bytes. The bundle also contains `plan.json`, `render-metadata.json` and `render-provenance.json`. Metadata uses an opaque output-hash URN, not a published image URL. It is an engineering development record, not final NFT metadata. Public output metadata contains no seed, weight, attempt statistics or internal review records.

Render provenance binds logical fingerprint/full-record digest, composition-plan digest, renderer ID/version, logical source ID/hash evidence, ordered operation source ID/hash evidence, rendered output digest and canonical public metadata digest. The plan digest transitively binds geometry, blend/output policies, manifest and approval records. Reconstruction verification compares the **entire bundle** against independently supplied logical/source/policy evidence. Forged digests, changed order/placement/version/source/output or metadata/image references fail.

### Offline CLI

Use pinned Node 22.23.2/npm 10.9.8 with the existing installed dependency graph. Commands never fetch remote art, access a chain or modify source artwork. Defaults use the V2 development declarations over Task 003's existing eleven text sources:

```sh
# Reproduce and verify existing DEVELOPMENT_ONLY logical evidence first.
npm run collection:generate -- --out task-004-logical --json
npm run collection:verify -- --out task-004-logical --json
npm run collection:art:validate -- --json
npm run collection:plan -- --logical-dir task-004-logical --index 0 --out task-004-plan --json
npm run collection:render-fixture -- --logical-dir task-004-logical --index 0 --out task-004-render --json
npm run collection:art:readiness -- --logical-dir task-004-logical --json
```

`--manifest`, `--approvals`, `--catalog`, `--request`, `--plan-request` and `--assets-root` select explicit local evidence. JSON input files must be within the checkout with no symlink/junction ancestors. `--logical-dir` and `--out` are portable relative generated directories; existing output directories are never overwritten. Plan can print without saving. Fixture render requires a fresh output directory. `--json` uses compact machine JSON; default output is readable indented JSON. Failure exits nonzero with a structured error. Missing physical source files fail before planning/readiness and return `ART_CLI_FAILURE`.

Readiness validates all source bytes and approval declarations, catalog references, IDs/paths, environment/geometry/roles and every supplied logical specimen's plan. It identifies orphans against **all** trait, mutation/scene replacement and special grail references; unused-in-this-sample assets are not automatically orphaned. Duplicate logical indices/fingerprints, missing evidence, invalid plans and orphan assets fail. Valid development fixtures can report `ok: true` and 100 plans, while `declarativeProductionReady100` remains false. A production declaration sample can pass declarative checks; `productionReady100` is **always false** in Task 004, with the missing decoder/production renderer reported as blockers. No real 100-image batch exists.

Input JSON is bounded at 2 MiB, per-source bytes at 1 MiB, total source bytes at 64 MiB and existing logical artifact reads at 64 MiB each. These configurable future acceptance limits may need review for actual art; dimensions are not a promise that every possible file fits. Source/output path segments are checked for traversal, URLs, absolute paths, reserved device names and symlink/junction escapes. Fixed filenames and exclusive staging protect the generated boundary. Owner-controlled paths during execution remain required; privileged filesystem races are outside this local threat model.

## UNRESOLVED ART DECISIONS

Actual art/rights, final traits, dimensions, poses/frame names, canonical layer order/slots, overlay alpha/profile policy, production source format, decoder/compositor and exact library/runtime/codec versions, scaling approval, procedural pixel algorithms, grail composition policy, production rarity/frequencies, final metadata/storage/publication and approval authority/signing remain unresolved. A real image dependency requires STOP_FOR_OWNER_REVIEW with library/version, need, alternatives, security and determinism implications before addition. Task 004 adds zero external dependencies and does not begin Task 005.
