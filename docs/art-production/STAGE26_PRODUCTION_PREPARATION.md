# Stage 26 — owner decisions and authored-source preparation

Baseline: main `6a2f56829471a923021adb47ae107bb5f58f4821`; reviewed PR #23 head `7506bac8f198bf6d5efce255013610f40c460258`. Work continues on the clean, existing Stage 25 branch. No new artwork, production promotion or source alteration occurs.

## Owner records

| Backlog item                             | Current owner art decision                              | Production state          |
| ---------------------------------------- | ------------------------------------------------------- | ------------------------- |
| `backlog-study25-amused`                 | ART_DIRECTION_APPROVED                                  | NOT_PRODUCTION_REGISTERED |
| `backlog-study25-lab-coat`               | ART_DIRECTION_APPROVED                                  | NOT_PRODUCTION_REGISTERED |
| `backlog-study25-rolled-locks-evolution` | NEEDS_REFINEMENT: insufficiently distinct coil geometry | NOT_PRODUCTION_REGISTERED |

The backlog moves from 0.5.0 to 0.6.0 with exactly three dated decision appends and one new owner-evidence binding. All 115 item IDs, source lists, prior decisions, technical classifications, compatibility restrictions and provenance remain unchanged. The immutable 0.5.0 snapshot preserves Stage 25 tests. Existing wording that art approval was pending is historical, superseded by these explicit decisions. No rejected study is rehabilitated. The transcription records the current owner directive; it is not cryptographic owner authentication or a production-approval credential.

Skeletal dentition and cervical/shoulder anatomy refinement remain open. Both Pixel Drip coverage/visible-effect mapping and Magma Hoodie family-specific clothing compatibility remain open. Exposed Magma and the older approved Rolled Locks are retained.

## Two development proposals

`packages/art-generator/fixtures/stage26-authored-proposals.json` binds the current backlog, exact raw/canonical Trait Bible, owner record, historical generation evidence and two native sources. The adapter is `packages/art-generator/tooling/authored-source-proposal.ts`. It is deliberately limited to these two authored frames; it neither resolves arbitrary combinations nor changes the production registry or renderer.

| Source   | Untouched native PNG SHA256                                        | Dimensions | Encoded bytes | Decoded RGB bytes |
| -------- | ------------------------------------------------------------------ | ---------- | ------------- | ----------------- |
| Amused   | `082a2de341b74e93ebe94be380acb8b6ec8aad660d64aefe64ed80d83ea6b631` | 1254×1254  | 2,315,018     | 4,717,548         |
| Lab Coat | `84093cc65b3c05928695588c1bf88cad9137143a364883b59fb7e6fd4a008d2b` | 1254×1254  | 2,493,914     | 4,717,548         |

Native paths are `output/TASK_025_STAGE25_STUDIES_001/01-amused-native.png` and `03-lab-coat-native.png`, relative to the private Studio root. Native signature, CRC/decompression and actual Sharp decode pass within existing 1254px/4MiB proof budgets. Pixel digests equal the preserved Stage 25 receipts. No resizing, recompression, extraction or replacement of original files occurs.

Both proposals specify `IMMUTABLE_AUTHORED_FULL_FRAME_ONLY`, `poseContactRegistration: NOT_VALIDATED`, `extractedLayers: false` and `productionRegistered: false`. They require source-bound owner art approval and matching generation-output dimensions/raster hashes. Altered context, duplicate sources, rejected-source hashes, unbound evidence, unsupported facets, missing source files, invalid PNGs and source tampering fail closed. Private I/O uses existing confined, bounded readers and decoder. Source/evidence checks do not independently prove aesthetic quality or authenticate an owner.

**Amused:** the asymmetric mouth, cheek lift and coordinated green eyelids remain recognizable at 64px/128px. The authored face/wool/pose differ from other frames, so this is a whole-frame expression source. No transferable mouth, eye or ear-tag contact source exists. Fine teeth are not counted in metadata, and the tight outer fringe/circular crop remains a known limitation.

**Lab Coat:** broad hoodless lapels, asymmetric fastening, sleeves and pockets supply a distinct garment outline. The head remains readable at 64px; the scientist personality is restrained and the dark coat can read as a peacoat. Small pen-like pocket details are integrated illustration details, not an independent Accessory. No ordinary-hoodie substitution or inherited tag-contact compatibility is claimed.

## Truthful partial metadata

Amused emits Species=Sheep, Expression=Amused and Clothing=Black Hoodie. Lab Coat emits Species=Sheep and Clothing=Lab Coat, the existing canonical name for `lammb-clothing-long-coat`. All values come from existing Trait Bible facets. No unverified Eye, Wool, Background, pose, pocket accessory, rarity score or tier is emitted.

Each unpublished example binds the exact native image SHA256 and canonical metadata SHA256. Its `artwork.invalid` image URI is a deliberate placeholder, not a published asset. `completeCollectionVector` and `productionRegistered` are false, token assignment is null. These are partial development examples, not final metadata for a deterministic specimen vector. Future source registration must reconcile every visible trait with approved source bindings before final export.

## Preserved renderer proof

The Stage 17 registry canonical digest remains `83c0c9be5ac1c79a6761ae957d8c55d3bf56698ab88a25988945ec094724c4c7`. Independent reconstruction twice per proof equals the historical PNG bytes at native 1254×1254. Outside-mask changed pixels are zero; the correct Ivory/Ash/Rolled wool and 5280 tag facets remain unchanged.

| Proof             | Exact reconstructed PNG SHA256                                     |
| ----------------- | ------------------------------------------------------------------ |
| Canonical / Ivory | `89ba9dba1070fe9cc8fab0be82b947ba8cc37f17d14b25dcf9260ee5cbde173b` |
| Broad Ash         | `be31a4ee0745486208859ecdefcbec819f555ceb73579367e4bcc6e2d6367227` |
| Rolled Locks      | `b24074f881d853e5be351f53ec8d22d39208cdd99e0b52a5940bc49b13c3b040` |

Private receipt: `reports/TASK_026_STAGE26_PREPARATION_001/HISTORICAL_AND_AUTHORED_RESULTS.json`. It verifies 143 declarations across 79 unique private paths. Sequential CPU validation took 2.574s, peak process RSS 161.01MiB; the six proof renders took 2.200s and two authored evaluations 0.171s. Sharp 0.35.5/libvips 8.18.7, concurrency one, cache disabled. These measurements describe one workstation run, not collection throughput or GPU memory. Available RAM before it was 5190.94921875MiB, above the 2048MiB safety gate.

## Acceptance boundary

The adapter, fixture, immutable snapshot and source-bound owner transition require targeted validation and fresh exact-head PR CI. Skipped Chamber jobs are **not executed browser coverage**. The historical main run had Chrome/Edge scene-movement failures; this task does not repair or dismiss them. CI evidence and readiness are recorded separately in the Stage 26 delivery report.

No decoder limit, dependency, deterministic generator, Trait Bible rule/frequency, grail reservation, existing renderer, website or paused Task 017 file changes. No generation, mint, registration promotion, merge or deployment. Owner approval remains necessary for actual production registration and for execution of the proposed next studies.
