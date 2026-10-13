# Stage 34 — Approved authored characters and production diversity

PR29 was accepted at head `46c1d1c66b4e050ca7b585ed714b23ed8847e6c3` and
rebase merged to `f658d08cf760c56ae94577e6461e947b58ddcd8c`. The reviewed tree
`5d30823299b873c7b92183a135fbff16441b792d` and newest `[skip netlify]` commit
marker survived. Exact-head classify/verify passed; browser acceptance was
skipped, not executed. No Netlify status appeared on the reviewed/merged head.
The [existing freeze procedure](STAGE33_NETLIFY_FREEZE.md) remains operational,
not a site-wide stop-build guarantee. No Netlify settings or deploy APIs changed.

## Delivery result and approval boundary

Four approved authored frames now have bounded native pass-through and
independently replayed 3072px delivery recipes. They remain **incomplete metadata
proposals**. The previous four complete recipes and their historical PNG hashes
remain unchanged. No new character, layer combination or production asset is
created by copying a native source or resampling its delivery derivative.

| Measure                                        | Count |
| ---------------------------------------------- | ----: |
| Approved native source declarations            |    31 |
| Native sources reviewed in this comparison     |     8 |
| Complete approved development metadata recipes |     4 |
| New complete metadata recipes                  |     0 |
| Reproducible 3072px delivery outputs           |     8 |
| Production registered                          |     0 |
| Complete-metadata shortfall to 5280            |  5276 |
| Production-registration shortfall              |  5280 |
| Permanent backlog records retained unchanged   |   121 |

Eight exact hashes are distinct at both encoded and decoded native resolution.
This is not certification of artistic uniqueness or a 5280-image capacity claim.
Twenty-eight thumbnail pairs were measured at 64px and 128px; one pair fell below
the provisional global normalized RGB-MAE threshold of 0.05. The measure is
diagnostic and sensitive to shared pose/background. It does not reject art or
assign rarity. Logical counts and frequencies were not increased by this task.

## Four source-bound results

| Source               | Native SHA256                                                      | 3072px SHA256                                                      | Missing decision                                                                                     |
| -------------------- | ------------------------------------------------------------------ | ------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------- |
| Amused               | `082a2de341b74e93ebe94be380acb8b6ec8aad660d64aefe64ed80d83ea6b631` | `682ac185fe6516e1b7d1629083ea66dd97a80b7b4efdc61cda97fdbd226765f5` | Eye and studio-background source bindings                                                            |
| Utility Vest         | `9a858dda8c1c7293a6a0acb517c60b7e8aafb5d091bc15ae867f76350d81b52d` | `6f7df2855f15d0295cfb527d287130a9f75bc0949e58de90eedb0dfde53f5937` | Eye and studio-background source bindings                                                            |
| Magma Hoodie         | `7afa4e0ba9e3ed52fbe443ace411fa9a2d25625c749bf1f716ab5034d8531492` | `669e984dfd71d13b81a19d9b79e02afd092c71a252dc50b77268b2e064e12981` | Eye/background source bindings; integrated Scorched Hoodie definition and Magma family compatibility |
| After-hours Observer | `f9fbf9d8087cefa28c0a31bd6f72bd35ce29911f40fdb488b7184d3bb5b532fa` | `2a09dbd70e3a69baf999c3b97ceab62ee403a32c4d8a8367f46bb6954500fd34` | Eye source binding                                                                                   |

Each artistically approved source is verified against generation, artistic QA,
dated owner decision and reference-dependency hashes from the permanent backlog.
Native output equals the approved file byte-for-byte; independently decoded
pixels also match. Authored frames have no edits or contact layers: this is
source pass-through, not reconstruction of independently interchangeable anatomy.

Amused's asymmetrical open smile corresponds to the existing Amused definition;
no tongue or dental-count value is invented. Utility Vest fits its existing
structured dark garment definition; its underlying crewneck is part of one
authored outfit, not another independently selected Clothing value. After-hours
Observer fits the existing near-black Lab Coat and distant Containment Lab
definitions. Small pocket details remain garment decoration and confer no prop,
accessory or utility claim.

All four retain recognizable sheep muzzles, low lateral ears and coherent eyes.
Normal frames map to Ivory Curls. Native Magma material review supports existing
**Singed Curls**: intact dark curls, surviving fibres and cooled brown edges. The
earlier conservative Basalt Curls proposal and receipts are preserved in the
private review history; a new wool ID is unnecessary. No old owner decision or
quarantined study is rewritten.

Magma's basalt anatomy and chartreuse fissures match the existing family
description, including its low swept horn pair. The source-specific scorched
hoodie must remain integrated with that anatomy. Ordinary Magma rules exclude
Black Hoodie and do not include source-catalog Olive Green eyes; those rules are
preserved. No constructor-compatible vector or exception is assumed. The
exposed Magma/no-hoodie master remains a separate retained source at SHA256
`d8b85e65943c819c2fcbb3a56a2ff4539cf5ed350c203101799544bf0389f4d5`.

## Truthful metadata and exact pending scope

The [proposal fixture](../../packages/art-generator/fixtures/stage34-authored-frames.json)
binds nine internal facets to each exact source: anatomy, wool, eyes, expression,
clothing, accessories, pixel corruption, environment and mutation. Pose remains
a source family, not an invented public trait. Absent accessories and normal
mutation values export their existing empty metadata; Pixel Corruption exports
NONE. Fissure light is not pixel corruption. No ear tag is added.

Native visual review supports olive-green irises, not exact CCFF00 glow. Existing
Olive Green approval covers only the four prior proofs. Proposed additional
bindings therefore remain pending for all four new source hashes. The three
studio gradients require equivalent source-scope review; After-hours Observer
uses the truthful existing Containment Lab value.

Only **Scorched Hoodie** is proposed as a new garment definition, restricted to
the exact Magma Hoodie source. No source-catalog definitions are overwritten;
the proposals neither activate traits nor assign weights. Magma's full
eye/garment/anatomy-family combination also requires explicit owner compatibility
review outside ordinary layering.

The API emits two distinct JSON examples per frame:

- `verifiedPartialMetadata`: verified existing visible facets only. It never
  implies completeness.
- `proposedMetadata`: a full proposed visible vector with pending labels and
  source scopes. `completeMetadata` remains false in the enclosing record.

Both validate the existing OpenSea JSON structure and retain unpublished
`https://artwork.invalid/` image placeholders. No token, rarity, tier, publication
or production registration is assigned. Metadata examples are review proposals,
not activation in the weighted collection generator.

## Narrow renderer and security changes

The Stage32 NoHalo pixel operation is factored into a bounded shared utility.
Its existing complete-recipe wrapper still verifies the original parent,
approval, metadata and hashes before rendering. All four historical native and
3072px outputs were independently replayed after the refactor and match exactly.

The new authored-frame wrapper accepts only four static source declarations,
their exact dated owner decisions, the pinned 121-item backlog and unchanged
Trait Bible. Its trust anchor is privately cloned from imported JSON. Arbitrary
trait edits, contacts, transforms, sources, approval changes and promotion are
rejected. Confined local digest reads verify references and provenance before
decoding; no arbitrary network fetch is provided.

Existing 4MiB encoded-source, 8MiB raster-input and 1254px decoded-native budgets
remain intact. RGB8/CRC/zlib/color checks use the existing decoder. Delivery stays
fixed at 3072px, with a 3082px intermediate and 32MiB output bound. No unlimited
decoder, GPU inference or new dependency is introduced.

NoHalo uses rational scale 512/209, zero offsets, four copied right/bottom support
pixels and the original-domain 3072px output window. PNG compression is level 9,
adaptive filtering off and palette off. Receipts record Sharp 0.35.5, libvips
8.18.7, libpng 1.6.58 and zlib-ng 2.3.3. Replay is measured in that codec
environment; no universal cross-platform byte guarantee is claimed.

New authored decode times were about 61–67ms; rendering took 3.45–3.65 seconds.
Independent load/replay took 3.60–3.73 seconds. New render/PFP processes peaked
at 239.60MiB RSS; the historical replay processes peaked at 241.99MiB. All workloads
used concurrency one and passed a fresh 2048MiB available-RAM gate. Delivery files
range from 13,675,888 to 16,894,810 bytes. Native masters remain immutable;
resampling creates no new native detail or missing ear anatomy.

## Collector review and next stage

The eight-source contact sheet labels four complete recipes and four pending
metadata proposals. Square/circular 64/128/256 previews are provided. Amused adds
an obvious mouth/cheek change; Utility Vest changes torso and collar structure;
Magma changes integrated material/anatomy; the Observer adds coat, body rotation
and authored environmental light. The Observer's face is smaller at 64px, but
the setting remains character-first. Tight inherited fringe and intentional
bottom portrait crops remain diagnostics, not automatic failures. No numeric
2%/8% or OpenSea crop compliance is claimed.

Next: obtain the exact source-scope and Magma garment/family decisions above,
then append reviewed bindings through a separately approved catalog version.
Only after those gates should the four pending vectors become complete recipes.
Keep production promotion separate, and expand other approved authored families
before requesting more generation. No automatic Stage35 implementation, source
promotion, mint activation, mass generation or deployment follows this report.
