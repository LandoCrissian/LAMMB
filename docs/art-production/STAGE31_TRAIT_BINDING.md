# Stage 31 — source trait evidence and registration gates

Four approved source-specific recipes remain technically reproducible, but none
can honestly become a complete metadata recipe or production-registration
candidate under the current definitions. **Complete recipes: 0. Candidates: 0.
Production registered: 0.** Both Eye and Background correspondence remain
unresolved. This is an evidence-based gate outcome, not an invented completion.

## Baseline and preserved inputs

Authorized main is `c26017c7160ef947320523542b2c66604fed5b72`, the verified
PR #26 merge. This branch starts there. The 121-entry backlog, owner histories,
quarantines, original artwork, Stage 16–30 provenance, Trait Bible v1.1.0,
compatibility rules, frequencies and six grail reservations remain unchanged.
No ImageGen, website, Chamber, Netlify settings or Task 017 work occurs.

`packages/art-generator/fixtures/stage31-trait-bindings.json` records four
versioned development evidence receipts. Each binds the exact native source and
decoded pixels, historical output, saved request/review, unchanged specification,
all compared trait definitions, provenance and manual region coordinates.
No new Eye/Background/Pose ID is added. All existing Eye/Background definitions
still have `PROPOSED` approval status in the machine-readable specification;
source art-direction approval is a separate fact.

| Source family     | Source PNG SHA256                                                  | Historical output SHA256                                           |
| ----------------- | ------------------------------------------------------------------ | ------------------------------------------------------------------ |
| Canonical / Ivory | `34a8b9369ce4ccbf6c5f07bff54e176660798ec668a45f97b6a8f793961a592a` | `89ba9dba1070fe9cc8fab0be82b947ba8cc37f17d14b25dcf9260ee5cbde173b` |
| Broad Ash         | `b2736f8678ec0c0eb3b83ff4192720c9116a79129e5b5b0713a6e7698c9ad493` | `be31a4ee0745486208859ecdefcbec819f555ceb73579367e4bcc6e2d6367227` |
| Rolled Locks      | `6b94719ef6c30bfaf730733ead2bfcea45821017aa122ba521587d36dbac8df7` | `b24074f881d853e5be351f53ec8d22d39208cdd99e0b52a5940bc49b13c3b040` |
| Front / Ivory     | `23213a0781d596408ec29143f22ecfd4d7ddc29aa9a3dca38a7de44709bb5449` | `ad0d8fc9b5a5d7cdf98ad9a8bf5ad1f75704f1bf3971a82bb35de0874dc96d0e` |

Native sources and outputs are **1254×1254** RGB PNGs. Exact corresponding
contacts, masks, ROI and polygons are retained. Independent reload/render pairs
match every historical PNG byte and decoded composition, with **zero changed
pixels outside the approved contact domain**. Encoded and decoded output hashes
are unique across these four. This does not certify aesthetic uniqueness at
collection scale or transferability across arbitrary anatomy/pose families.

## Eye evidence

Native master inspection and 1:1 context crops show two coherent sheep eyes,
dark pupils, purposeful heavy lids and white catchlights in all four. Irises
read green/olive with yellow-green crescent detail under shaded studio lighting.
This assessment uses actual raster artwork, not a filename or generation prompt.

The current Radioactive Green definition requires coherent **CCFF00 irises**
and restrained glow. The images do not provide a verified albedo/material
reference or clear intentional emission evidence that establishes that design.
Amber, Oxide Red, Ice Blue, Violet, Onyx, Split Signal and Observer Array do not
confidently describe these consistent green primary eyes. All eight existing
definitions and metadata values were compared; none is silently selected.

Two small lower-iris proxy regions per source are hashed and measured. Each is
12×7 pixels, with integer RGB ranges/means and explicit crop coordinates.
They contain texture/shadow and may include a pupil edge; they are **not complete
iris segmentations**. The sampled mean colors vary between yellow-green and
olive; no sampled pixel equals CCFF00. Neither that observation nor nearest RGB
distance proves or disproves the underlying shaded albedo. Color measurements
are diagnostics and do not decide trait identity automatically.

Each receipt stays `EYE_BINDING_UNRESOLVED` with a null binding. Required
resolution: owner-reviewed existing-definition correspondence supported by an
artist/material reference, or separately authorized definition/trait work.
No recoloring or new generation is authorized by this task.

## Background evidence

All four frames show an integrated, subtly warm charcoal/taupe studio gradient
with vignette and subject lighting. No removable registered background layer or
semantic separation mask exists. These backdrops are **not interchangeable**.

The existing Chartreuse, Near Black and Graphite definitions describe flat
CCFF00, 080C0A and 242A27 fields. Containment Lab requires distant industrial
shapes; Midnight Signal requires chartreuse signal glow; Event Horizon requires
a distinct contained phenomenon. None confidently describes these ordinary
shaded studio backgrounds. A generic dark vignette is insufficient evidence
for Event Horizon.

Three manually observed background proxies per frame contain 43–81 RGB colors,
with rounded mean values approximately RGB (34–40, 32–37, 32–37). The proxies
are source-bound evidence of visible variation, not complete background masks,
automatic scene recognition or proof of an unlit material color. Full native
inspection provides the semantic assessment.

Each receipt stays `BACKGROUND_BINDING_UNRESOLVED`. Required resolution:
owner-reviewed correspondence consistent with an existing definition and source
reference, or separately authorized definition/background asset work. No
unapproved new background identifier or layer swap is introduced.

## Visible vectors and metadata semantics

| Facet            | Evidence state                               | Public development example                 |
| ---------------- | -------------------------------------------- | ------------------------------------------ |
| Species          | Verified present                             | Sheep                                      |
| Wool             | Verified source family                       | Ivory Curls / Ash Curls / Rolled Locks     |
| Eyes             | Unresolved                                   | Omitted; blocks completeness               |
| Expression       | Verified visible correspondence              | Heavy Lidded                               |
| Clothing         | Verified integrated source garment           | Black Hoodie                               |
| Accessories      | Verified 5280 tag and exact joint            | Ear Tag: 5280                              |
| Background       | Unresolved                                   | Omitted; blocks completeness               |
| Mutation         | Verified absent normal anatomy               | Mutation/derived mutation Material omitted |
| Pixel Corruption | Verified absent effect, explicit clean state | NONE                                       |
| Pose             | Verified internal registration family        | Omitted; no existing public pose trait     |

The unchanged metadata specification explicitly treats Pixel Corruption `NONE`
as a meaningful clean state. Stage 31's six-facet examples restore that existing
semantics. Stage 30's historical five-facet examples and hashes are preserved,
not rewritten. No visible effect is fabricated: `NONE` describes clean artwork.
Absent mutation/accessory subfacets remain omitted. Normal wool/skin materials
are not assigned a new mutation-material or pose attribute.

Examples use the existing OpenSea-compatible schema, an exact image hash in a
reserved `.invalid` URI, no token assignment, no public publication and no
rarity tier, custom score or fake grail label. Syntactically valid partial JSON
is not a complete collection vector.

## Registration contract and security

`tooling/trait-binding.ts` verifies hash-pinned observations, complete decoded
source digest, bounded crop pixels, all compared definition hashes, source
context, provenance list, pose and existing source-specific compatibility.
It reuses the reviewed Stage 30 reconciliation and existing bounded PNG decoder
and renderer. It does not accept an arbitrary new receiver/contact or redesign.

The four current receipts are explicitly unresolved. Their schema forbids
silent binding insertion or promotion. Each assessment is
`BLOCKED_INCOMPLETE_METADATA`, with `registrationCandidate=false`,
`productionRegistered=false` and a separate explicit owner promotion gate.
The proposal array is empty. A future resolved receipt needs a separately
reviewed contract/specification decision; this version cannot fabricate a
COMPLETE state from existing unresolved observations.

Import validation recomputes the assessment from its source context before
comparing metadata/record bytes. It rejects inserted Eyes/Background/Pose traits,
false completeness/candidate/promotion flags, malformed metadata and duplicate
output hashes. Negative tests also cover wrong source hashes, changed decoded
pixels, wrong definitions/regions, missing provenance/approval, incompatible
wool/clothing, invalid contacts and bounds.

These are trusted local operator receipts, not cryptographic owner authentication
or a public upload endpoint. A pure metadata gate does not decode a PNG or prove
reconstruction; real native acceptance independently loads/decodes and replays
the exact saved images. Automated pixels cannot certify artistic quality.

## Capacity and highest-leverage next work

Exact existing-engine enumeration remains 13,271,040 Cartesian vectors,
5,907,744 structurally valid all-value vectors and 5,852,449 constructor-selectable
ordinary/reserved vectors. These counts describe logical structure, not finished
artwork, feasible quotas or visual distinctness.

| Manufacturing gate                               | Count |
| ------------------------------------------------ | ----: |
| Proven technically renderable recipes            |     4 |
| Complete truthful metadata recipes               |     0 |
| Production-registration candidates               |     0 |
| Actually production registered                   |     0 |
| Complete-metadata/registration shortfall to 5280 |  5280 |

The mechanical four-proof shortfall is 5276; it is not a production forecast.
No new output has been manufactured by counting logical vectors. Highest
leverage is owner review of the **Eye and Background definition-to-source
correspondence**, followed by explicit complete-vector and production gate
review. Extra ImageGen studies would not resolve that semantic mismatch by
themselves. Clothing/mutation/pose source coverage and visual batch QA still
limit future scaling, even after these four bindings are resolved.

## Owner review package

The private review folder contains four byte-identical native finished proofs,
source-to-output provenance, exact manual evidence crops, 64/128/256 square and
circular derivatives, partial metadata, blocked readiness records, capacity and
source receipts. Original masters remain immutable. Native crops retain original
pixel values; PFP reductions are clearly derivative images and are not native
resolution claims. Existing tight-ear and circular crop limitations remain.

Files are isolated at `C:/LAMMB-Studio/reports/TASK_031_STAGE31_TRAIT_BINDING_001`.
Drive uploads require owner-only metadata readback; links are delivered only
after that check. Final CI evidence is recorded separately on the exact draft
PR head. No automatic merge, mint activation, production promotion, manual
deployment, paid service or mass generation occurs.
