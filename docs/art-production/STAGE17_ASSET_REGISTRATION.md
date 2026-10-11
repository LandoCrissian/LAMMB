# Stage 17: source-specific asset registration proof

Three preserved three-quarter LAMMB masters now reconstruct their reviewed 5280
ear-tag hybrids through the merged Stage 16 PNG adapter. No artwork generation,
anatomy replacement, source resampling or collection batch is involved.

Baseline: `1b70b4443458888bddd4cf23777381b3025eb6f3` (merged Stage 16 PR #16).
The paused Task 017 worktree is outside this change.

## Registry and trust boundary

`packages/art-generator/fixtures/stage17-asset-registry.json` is the version 0.1.0,
schema-version 1, **DEVELOPMENT_ONLY** registry. It contains eight entries: three
art-direction-approved bases, one reconstruction-validated contact, one
reconstruction-validated mask and three reconstruction-validated historical
outputs. **Zero entries are PRODUCTION_REGISTERED.** These counts describe this
pilot, not the complete artwork inventory or approved collection assets.

Each entry binds an exact native/derivative SHA256, confined relative source path,
encoded and decoded layout declarations, pose/wool/expression/clothing/accessory/
mutation families, approval records, dependency IDs, contact registration IDs,
compatibility whitelist, framing status and provenance. The five digest-bound
evidence files include Stage 15 inventory/framing and Stage 4/5 reconstruction/QA.
Source dimensions are verified by decoding; declarations alone are insufficient.

The explicit states are ART_DIRECTION_APPROVED, CONDITIONAL_ART_APPROVAL,
REJECTED, RECONSTRUCTION_VALIDATED and PRODUCTION_REGISTERED. This development
adapter rejects production promotion entirely. It has no owner-authentication or
production-promotion endpoint. A future authenticated, explicit owner approval
contract is required; artistic approval never advances a production state.

Approval records are trusted local review evidence, not cryptographic owner
signatures. A trusted caller pins the reviewed canonical registry digest before
rendering. Hashes detect substitution; they do not authenticate an arbitrary
new registry supplied with its own matching hash. Treat repository review and
preserved owner approval records as part of this boundary.

The context-bound Stage 4 contact contains a local ear fold, attachment, metal
tag, shadow and neighboring background/clothing. Its lineage, including the
untouched ImageGen edit hash and deterministic mask construction, remains in the
digest-bound Stage 4 record. That full-frame edit is not a newly approved base.
Only the historical excerpt and exact three demonstrated receivers are enabled.
No portable tag, arbitrary pose support, independently swappable wool or general
trait compositor is claimed. Failed Stage 3 wool extraction is not an input.

## Registration and reconstruction

The renderer accepts FRONT (existing Stage 16 behavior) and
ORIGINAL_THREE_QUARTER declarations. The registry resolves complete reviewed
tuples instead of accepting arbitrary combinations. Every tuple binds the base,
joint and mask SHA256, identity transform, 300×390 ROI at (75,670), saved
23-vertex polygon, exact grayscale mask and RGBA alpha correspondence.

Native canvas: **1254×1254**. Source-derived landmarks are manual Stage 4 proxies
for irises, nose, mouth and far-ear contour, with 12px uncertainty. They describe
observed surfaces rather than hidden anatomy and are not a production landmark
certification. The exact pixel mask/polygon, not these proxies, controls rendering.

RGB byte composition remains
`floor((joint * alpha + base * (255 - alpha) + 127) / 255)`.
Every pixel outside the nonzero mask must equal its original base. Zero-alpha RGB
must be zero; nonzero ROI edges, non-grayscale masks, clipping, inconsistent alpha
and out-of-domain mask pixels are rejected. Source hashes and registry digest are
checked again after rendering. PNG output is decoded and compared to raw pixels.

Independent reconstruction reloads and decodes all sources, uses a separately
written difference-form integer calculation, encodes independently and compares
both bytes and pixels. It also compares against the preserved Stage 4/5 PNG.
Identical output is demonstrated for the recorded Node/Sharp/libvips/codecs;
cross-version encoder byte stability is not promised. No deterministic ImageGen
replay is claimed.

| Proof              | Native PNG SHA256                                                  |
| ------------------ | ------------------------------------------------------------------ |
| Canonical + tag    | `89ba9dba1070fe9cc8fab0be82b947ba8cc37f17d14b25dcf9260ee5cbde173b` |
| Broad Ash + tag    | `be31a4ee0745486208859ecdefcbec819f555ceb73579367e4bcc6e2d6367227` |
| Rolled Locks + tag | `b24074f881d853e5be351f53ec8d22d39208cdd99e0b52a5940bc49b13c3b040` |

All three match their historical native files byte for byte. There are 65,064
nonzero-mask pixels and 10,269 partial-alpha pixels in each. Changed pixel counts
are 61,651 / 60,803 / 60,898 respectively; **outside-mask changes are zero**.
Face, eyes, muzzle and wool outside this bounded local contact are preserved.
The intended ear-fold contact is modified; whole-ear pixel identity is not claimed.

## Framing and visual review

The Stage 15 proposal remains a proposal: 2% critical-silhouette guard and 8%
aspirational inset, separately evaluating square NFT and circular PFP presentation.
These are internal policies, not asserted marketplace rules. No approved source
is shrunk, padded, cropped or altered to obtain a pass.

Decoded bright-contour witnesses in constrained ear/crown bands show left-edge
insets of **0 / 2 / 2 pixels** (0% / 0.1595% / 0.1595%). Right-ear witnesses have
28 / 29 / 29px clearance; crown witnesses 26 / 19 / 25px. All three fail the
proposed square 2% guard and 8% target. Centered circular crops also clip the
left-ear contour. These witnesses prove failure; they are not a complete semantic
mask and cannot prove silhouette containment. Dark fur/ear edges may extend further.

Exports include square and transparent circular previews at 64,128,256,1024px,
plus a source/final comparison. These are explicitly downsampled review copies,
not new native detail. The inherited local attachment looks coherent and the
metal tag remains recognizable at 64px; four digits are not reliably readable at
that size. At 128px the numerals are substantially clearer. No new duplicate
anatomy, floating wool or obvious contact seam was observed in this review.
Native source limits and circular clipping remain defects for production framing.
Automated reconstruction does not replace owner art review.

## Metadata

Each development example exposes only Species=Sheep, its exact wool facet
(Ivory Curls / Ash Curls / Rolled Locks), Clothing=Black Hoodie and Ear Tag=5280.
IDs and canonical metadata values resolve from unchanged Trait Bible v1.1.0.
The registry rejects Ivory facets for Ash/Rolled sources and unsupported extra
facets. No eye/background/expression labels are inferred. No absent mutation,
rarity tier, score, grail label, token ID or allocation appears.

Metadata bindings include image, metadata, spec and registry SHA256 and proof ID.
`https://artwork.invalid/...` is an unpublished reserved placeholder URI, not live
storage. This is not a full NFT export or mint-ready metadata package.

## Source budget and performance

Unchanged bounds: 4MiB per PNG/evidence file, 8MiB total PNG inputs per proof,
1254 maximum side, 1,572,516 pixels, 4096 PNG chunks and 4MiB output. Legacy source
ingestion stays at 1MiB. No budget is raised. Actual source PNGs range from 28,703
bytes (mask) and 171,117 bytes (contact) to 2,334,805 bytes (base). Decoded inputs
total 9,903,096 bytes per proof; intermediates/codec allocations add overhead.
Existing signature/CRC/IHDR/IDAT ordering, bounded inflate, color-mode checks,
malformed/truncated rejection, path confinement and no-link checks remain intact.

Final measured run on the Legion (Node 22.23.2, Sharp 0.35.5, libvips 8.18.7):

| Proof        | Renderer ms | Fresh source decode ms | Independent reconstruction ms | Output bytes |
| ------------ | ----------: | ---------------------: | ----------------------------: | -----------: |
| Canonical    |      349.83 |                  57.88 |                        262.80 |    2,961,803 |
| Broad Ash    |      322.85 |                  57.84 |                        260.70 |    2,914,912 |
| Rolled Locks |      328.38 |                  60.05 |                        267.51 |    2,940,548 |

Whole CLI peak RSS: **156.07MiB**, including sequential previews/comparison.
Minimum sampled available RAM: **6665.3671875MiB**. RAM is printed before every
substantial CLI phase, with a hard 2048MiB gate. Boundary samples are not a
continuous minimum. Sharp concurrency=1/cache disabled, Node heap=192MiB for
rendering, no GPU inference. One three-proof run is not a 5280-piece throughput
estimate. Exact codec versions and timing scope are exported in results/receipts.

## Reproduce and validate

With the preserved local Studio root and a fresh >=2048MiB RAM preflight:

```powershell
node --experimental-strip-types packages/art-generator/tooling/stage17-asset-proof.ts C:/LAMMB-Studio stage17-proof-new-run
```

The CLI creates an exclusive new directory beneath ignored `artifacts/generated`;
an existing run is never overwritten. Private artwork is not committed to Git.
Required files/paths/hashes are enumerated in the registry. Missing evidence,
contact/mask/native sources stop the run; there is no fetching or regeneration.

Targeted validation: locked install, changed-file formatting/lint, art-generator
typecheck and focused test typecheck; **140 tests across five suites passed**.
The new registry suite includes 39 tests, with 26 declaration rejection cases plus
registry/evidence/source substitution, missing/malformed/oversized source,
alpha mismatch, metadata binding, deterministic bytes and pixel preservation.
Existing PNG security/ingestion/pipeline suites remain unchanged. Changed files
are restricted to art-generator code/fixture/tooling, this report and its focused
collection test. No dependencies, CI, website, game or Trait Bible changes.
Existing full CI runs remotely unchanged; its exact-head result is recorded on
the draft PR and in the private delivery record. No local browser suites/builds.

## Remaining production gates

Owner review is required for these reconstructed artworks and the framing policy.
No source is promoted to production. Required future work includes explicit owner
production authorization, reviewed semantic identity/occlusion masks, certified
landmarks, acceptable framing and family-specific contacts for additional poses,
expressions, backgrounds, garments or mutations. The shared historical excerpt
is only validated against these three exact sources. No arbitrary trait layering,
larger native sources, collection-wide source completeness, mass production,
publication, mint or schedule feasibility is established.
