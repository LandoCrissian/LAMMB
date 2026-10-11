# Stage 18 — Lossless framing pilot: engineering pass, artwork rejected

The 1254×1254 canonical LAMMB places left-ear fringe at the native boundary and
continues its hoodie beyond the frame. A single 1392×1392 development canvas
pilot preserves the approved pixels and improves the observed head/ear clearance,
but exposes a straight hoodie cutoff. **It is not a finished production artwork.**
The failed pilot is preserved for owner review; no ImageGen edit, anatomy repair,
production registration, trait change or collection generation occurred.

## Baseline and immutable sources

Authorized main: `bf71f22c881ae409179f8c37efab89809c74a5af`, merged Stage 17.
Paused Task 017 remains untouched in its own worktree. The Stage 16/17 renderer,
registry, source-ingestion limits and Trait Bible are unchanged.

| Source                  | SHA256                                                             |
| ----------------------- | ------------------------------------------------------------------ |
| Canonical native        | `34a8b9369ce4ccbf6c5f07bff54e176660798ec668a45f97b6a8f793961a592a` |
| Approved ear-tag hybrid | `89ba9dba1070fe9cc8fab0be82b947ba8cc37f17d14b25dcf9260ee5cbde173b` |
| Contact RGBA            | `29a3ffead57c075d2981578a75dd38a7be00a6674efb31d4bb51b818167712e6` |
| Saved contact mask      | `bc69326292066150459da4440b675a63a453009221493446df55a9a58badff7d` |

The isolated private report records 37 verified source/evidence bindings, including
the three native sources and historical hybrids, 14 Stage 5 records, five registry
evidence records, prior framing/pilot specifications and seven approved supporting
pose/expression sources. Supporting portraits were not used to manufacture pixels.
No resized preview substitutes for a source. The canonical hybrid also replays
through the unchanged registered renderer before the framing experiment.

## Semantic candidates and observed anatomy

`packages/art-generator/fixtures/stage18-semantic-candidates.json` records manual
native-coordinate polygons, landmarks, sample rectangles and a 12px provisional
contour uncertainty. Seven binary RGB review masks cover critical identity,
protected face/expression, ear geometry, background, contact keepout, decorative
overflow and uncertain/off-frame anatomy. The private overlay shows their coverage.

These are **manual candidates pending owner approval**, not certified segmentation,
extracted production layers or automated bright-pixel masks. Coarse polygon edges
do not trace every wool fiber. Fringe and local curl gaps remain uncertain. Exact
whole-source pixel preservation is stronger than the protected-face subset test,
but does not certify the candidate mask's anatomical completeness.

Native 1:1 left-ear inspection shows the main ear body/tip largely visible, with
fine fringe intersecting x=0 around y=780–874. Hidden continuation and its length
cannot be measured from this raster. This is evidence of truncated/uncertain
fringe, **not proof of missing major ear anatomy**. Padding cannot recover it.
The hoodie visibly intersects the native bottom and lower side boundaries too.
Those off-frame clothing pixels do not exist in the source.

## One canvas experiment

Canvas 1392×1392; unchanged source 1254×1254; integer translation **(+81,+59)**.
Padding: left 81, top 59, right 57, bottom 79. No source resize, interpolation,
stretch or warp. A deterministic six-term least-squares RGB field is fitted to
manually selected background rectangles. Limited background-only edge anchoring
extends it outside the native rectangle. Native background pixels are copied
unchanged; fitting coefficients, samples, rounding and 96px anchor decay are saved.

The final development pilot includes the existing approved 5280 ear tag. Its output
SHA256 is `8e09a02ccee4df742d2ad60d59d35d179c8ccb917cc1e1a9686c088f7762f64c`.
1392 is a **composited canvas size**, not newly generated native character detail.
The 1254px source occupies 90.0862% of the corresponding display width: a 9.9138%
relative face-size reduction in same-size thumbnails, without source resampling.
Review derivatives at 64/128/256 use reported Lanczos3 downsampling.

## Pixel and contact proof

- All **1,572,516 approved hybrid pixels** match after inverse translation.
- All **291,616 protected-face candidate pixels** match the canonical source.
- Canonical changes outside the historical contact mask: **zero**.
- New-canvas pixels are generated background only, not inferred anatomy.
- Contact ROI translates from (75,670,300,390) to **(156,729,300,390)**.
- Every saved polygon vertex receives the same integer offset. Contact RGBA bytes
  remain unchanged; the native mask is zero-extended and translated exactly.
- Independent source-over arithmetic at the translated ROI matches direct copying
  of the historical hybrid, both decoded RGB pixels and encoded PNG bytes.
- A fresh bounded PNG decode matches the rendered raw pixels exactly.

This proves registration arithmetic for this exact canonical source/contact only.
It does not establish compatibility with other poses, backgrounds or anatomy.

## Framing measurements and artistic review

Measurements use complete filled **candidate semantic regions**, not luma thresholds.
Observed critical mask: square inset **72px / 5.1724%**, radial inset
**51.8242px / 3.7230%**. Subtracting the provisional 12px uncertainty leaves
60px square and 39.8242px radial clearance, above the proposed 27.84px (2%) guard.
No candidate critical-region pixels are clipped by a centered circle. The observed
contact keepout has 53.0984px minimum radial clearance. The 8% aspiration fails.

**These measurements do not grant framing compliance:** source-edge fringe is
incomplete/uncertain and the masks await owner review. Neither margin is an OpenSea
requirement. Square and circular previews at 64, 128 and 256 were visually inspected.
The eyes, muzzle, attitude and head dominance remain recognizable; the gold tag is
visible. The exact numerals are weak at 64px and more readable at 128/256.

The native square shows an abrupt horizontal hoodie termination at new y=1313,
plus lower side joins. Circular previews also reveal the cutoff. This is an
artistic failure even though pixel preservation and contact alignment pass.
Background-only extension cannot supply off-frame clothing. Ear fringe still ends
at the translated source edge. No excessive blending was used to hide either defect.

**Art QA: REJECTED_FOR_PRODUCTION / PRESERVED_FAILURE_EVIDENCE.**

## Bounded output-only development adapter

`framing-pilot.ts` supports only RGB8 1392×1392 development outputs, a 4MiB encoded
bound, 4096 chunks and exact decoded/filtered byte counts. SHA256, PNG signature,
CRC, chunk ordering, non-interlaced RGB8 layout and bounded zlib expansion are
checked before Sharp decoding. Unexpected chunks, larger dimensions, malformed
images and decompression bombs are rejected. No network fetching or production
ingestion integration exists. Sharp concurrency=1, cache disabled.

Production source/renderer bounds remain **1254px, 1,572,516 pixels, 4MiB per
source, 8MiB total inputs**. Legacy ingestion remains 1MiB. The existing decoder
still rejects 1392px output. No 3072px production budget is authorized.

Native RGB decoded bytes: 4,717,548. Pilot RGB: **5,812,992**; hypothetical RGBA:
7,750,656. Pixel increase: 23.2206%. Measured whole tooling run: **5425.14ms**,
**204.61MiB peak RSS**, minimum sampled available RAM **5097.8359375MiB**.
Printed 2048MiB gates precede each substantial phase. Boundary samples are not a
continuous RAM minimum; no GPU workload or 5280-image throughput claim.

## Owner-gated repair proposal

No generation was invoked. If the owner requires a complete fringe, propose one
future reference-conditioned local ear/background reconstruction using the exact
canonical native as primary identity and the approved hybrid as secondary contact
design evidence. The failed pilot may serve only as an edit canvas/negative QA
example, never positive anatomical truth.

Provisional ear edit rectangle on the 1392 canvas: **x=69..94, y=839..934**
(native x=-12..13, y=780..875). Only the uncertain fringe and adjacent new
background may change. The saved contact ROI begins at x=156; no intersection is
allowed. Eyes, muzzle, expression, wool identity, hoodie and tag are protected.
Any generated result must be locally masked onto the immutable base, with exact
pixel verification outside the separately approved edit mask. The built-in tool
does not expose a guaranteed pixel-lock/mask or deterministic replay contract.
Do not invoke it until scope, references and included access are approved.

Ear repair alone cannot solve the hoodie failure. A separate owner decision is
required for exterior-only clothing continuation or another presentation policy.
The bottom continuation region is new x=81..1334, y=1313..1391; lower side bands
also require reviewed continuation. No existing clothing pixel may be silently
modified. Do not pretend a background extension manufactures those structures.

## Validation and review boundary

Locked install; changed-file formatting/lint; art-generator and focused-test
typecheck; PNG/registry targeted tests; independent reconstruction; original source
hashes and changed-file scope checks. New tests exercise exact source and padding
bytes, PNG replay, unchanged production limits, wrong hashes, malformed/oversized
input, unsupported layouts and bounded decompression. No timeout increase.

The first new tests timed out because generic deep comparison expanded multi-MiB
Buffers; replacing it with exact `Buffer.equals` retained every byte comparison
and the existing 5-second timeout. Failure evidence is preserved in the private
report. Existing security tests and assertions remain unchanged.

Reproduce once into a new exclusive output location (the CLI refuses to overwrite
`pilot-001`; preserve any existing run before explicitly selecting another run):

```powershell
node --experimental-strip-types packages/art-generator/tooling/stage18-framing-pilot.ts C:/LAMMB-Studio
```

Native outputs, masks, registration, comparison, previews and audit reports reside
in `C:/LAMMB-Studio/reports/ART_016_STAGE18_FRAMING_PILOT_001/`; private artwork is
not committed. A draft engineering PR does not approve the failed artwork,
semantic masks, framing policy, repair proposal or production assets.

**STOP_FOR_OWNER_ART_REVIEW.** No automatic ImageGen, merge, deployment or next stage.
