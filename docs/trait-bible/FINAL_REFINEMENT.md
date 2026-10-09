# Task 015B final design refinement

The owner's Task 015B request authorizes three wool profiles within the eight
existing values and three deliberate accessory configurations. Specification
1.1.0 implements that direction using the existing one-trait-per-category engine.
It has 66 values across nine categories. No artwork, final frequency, reference
role or singleton classification is approved here. The historical Task 015/015A
owner-direction and audit records are preserved unchanged.

## Wool geometry

| Profile            | Existing values                  | Proposed / observed profile totals |
| ------------------ | -------------------------------- | ---------------------------------: |
| Compact crown      | Ivory, Charcoal, Frosted, Singed |                        2970 / 3227 |
| Broad/offset crown | Ash, Pink, Chartreuse Tips       |                        2070 / 1833 |
| Rolled locks       | Rolled Locks                     |                          240 / 220 |

[Wool specification](WOOL_SILHOUETTES.md) defines crown height/offset, connected
curl roots, fixed low lateral ear anchors, clearance and required registered
family sources. Compact crowns rise 18–24% of skull height; broad crowns rise
30–40% with a 10–15% skull-width offset; rolled locks have 3–5 distinct clusters.
These are proposed production geometry gates, not measurements of approved art.
Caps must preserve the selected profile with reviewed contact masks. Beanies are
incompatible with broad crowns and locks rather than compressing them into a
different silhouette. Color names, IDs and public Wool attributes are unchanged.

## Accessory configurations and frequency audit

| Configuration                      | Nominal preference / raw weight | Observed |
| ---------------------------------- | ------------------------------: | -------: |
| Cap with 5280 Ear Tag              |                             200 |      241 |
| Beanie with Short Chain            |                             180 |       81 |
| Shades with Gold Dental Accent     |                             120 |       47 |
| Standalone Gold Dental Accent      |                             180 |       72 |
| Both visible dental configurations |                300, provisional |      119 |

[Bundle specification](ACCESSORY_BUNDLES.md) gives exact visible facets, source
IDs, family and joint-fit requirements. One configuration is selected per specimen;
no unrestricted accessory layering is introduced. Cap/tag emits Headwear and Ear
Tag. Beanie/chain emits Headwear and Jewelry. Shades/gold emits Eyewear and Dental
Accent. Absent components are omitted; no internal bundle name, rank or rarity tier
is published. OpenSea can calculate marketplace rarity from truthful attributes.

The accessory category remains a 5280-total preference budget. Cap and tag each
contribute 100 to the new 200 bundle. Beanie and chain each contribute 90 to the new
180 bundle. Shades and standalone gold each contribute 60 to the new 120 bundle.
The combined dental preference therefore becomes 180 + 120 = 300; it is not an
exact count or an attempt to force the previous 240. All approved counts are null.

The engine draws all nine categories, rejects the complete incompatible or
duplicate candidate and tries again. Consequently raw weights are not accepted
probabilities. In the recorded seed, 441 candidates drew a dental configuration:
276 standalone and 165 bundled. Of these, 322 were rejected and 119 accepted.
279 rejected gold candidates had Heavy Lidded, Side Eye or Stoic expressions with
no visible dentition. The remaining 43 were rejected by other compatibility,
quota or uniqueness conditions; rejection causes can overlap. Skeletal gold
requires Defiant; crystal and void dental configurations are excluded. Accepted
gold totals are normal 110, cybernetic 4, magma 2, skeletal 1 and botanical 2.

Beanie/chain is reduced by compact-wool fit, low collar requirements, botanical
growth clearance and narrow magma intersections. Standalone beanie is also now
compact-only. Compact wool totals rise while broad/locks fall under those
conditions. Cap/tag benefits from broader allowed intersections. Neither outcome
is a guaranteed final artwork count. [Full category/facet tables](FREQUENCIES.md)
and [reconstructed candidate trace](ADVERSARIAL_015B.json) expose the differences.

| Disclosed deterministic seed prefix | Unique specimens | Visible gold |
| ----------------------------------- | ---------------: | -----------: |
| 0150                                |             5280 |          119 |
| 0151                                |             5280 |          121 |
| 0152                                |             5280 |          116 |
| 0153                                |             5280 |           81 |

[Seed sensitivity](SEED_SENSITIVITY_015B.json) preserves complete seeds, frequencies
and hashes. These four successes prove the disclosed recipes, not all possible
seeds. Owner must approve a realized-count policy before production; exact dependent
counts require separate feasibility work, not weaker compatibility.

## Grail visibility and unchanged reservations

All six proposed IDs, indices and selected trait vectors remain unchanged from
the verified Task 015A head. No reservation or classification is approved.
[Visibility gates](GRAIL_VISIBILITY.md) require silhouette comparison against the
ordinary mutation family at 64px and 128px. Five neck-based phenomena need a novel
continuous feature at least 6px high × 4px wide at 64px, doubled at 128px, exposed
above the existing collar without changing the recipe. Observer Array must show
two primary and three secondary eyes, with each secondary eye at least 2px/4px
at the corresponding review size. Protect the phenomenon and sheep landmarks
from corruption. Quarantine any concept whose garment/crop cannot meet its gate;
do not silently change clothing or award a singleton label.

## Deterministic collection evidence

Two fresh runs produced nine byte-identical bundle files. Both have 5280 unique
logical identities, zero accepted incompatibilities, six unchanged reservations,
5274 ordinary specimens and exact mutation/corruption/background quotas. Candidate
draws: 7803; rejected: 2529; maximum attempts for one specimen: 57. Metadata for all
5280 records passes the OpenSea-compatible proposal schema. No constraint, attempt
limit or constructor behavior was relaxed.

- Canonical specification SHA256:
  `2681b2b423b95ddc05ea74e29e80851d7103422b8c61ab9b6df2080f88645f9a`.
- Logical collection SHA256:
  `a94dbc1eaec03e00c662b6b2d04ee941c623f14e8e0eb5e412df1a1038a16d84`.
- Metadata preview SHA256:
  `c9628e3b414c4e6ea9065b902aa33e3a9f50e031019b43f164f0f817176e16b1`.

[Simulation evidence](SIMULATION.json) records exact counts and effective
replacement checks. Development descriptor bytes are not artwork. There are 4074
distinct configurations when ignoring background and pixel corruption, and 1116
coarse signatures after collapsing material/color details to three wool profiles.
These projections flag possible repetition, not measured perceptual duplicates.

## Minimum viable artwork pilot and remaining blockers

[The exact pilot manifest](ARTWORK_PILOT.md) enumerates every source ID/family and
review vector. It has 38 source bindings: 32 ImageGen/alignment bindings and six
deterministic sources; 18 review compositions; 24 required masks/contact fits/crops.
These are source obligations, not 32 generation calls or an included-usage estimate.

1. Establish and approve normal sheep identity, registered landmarks, frame and
   compact Ivory / broad Ash / Rolled Locks sources. Stop for owner artwork review.
2. Prove three bundle fits, cap/tag on all three profiles, chain on hoodie/vest,
   gold on Smirk/Amused/Defiant, Side Eye and standalone ear-tag controls. Approve
   exact 5280 glyph vector and iris/lid, crown/ear and collar masks.
3. Prove skeletal anatomy with Defiant dental bundle and magma anatomy with broad
   cap/tag and compact chain fits. Anatomy masters own the face/neck; ancillary
   mutation layers contain contact emission only, preventing a duplicate face.
4. Produce one potential Cooled Core full-frame source, compare ordinary magma,
   and review its unchanged recipe at 64px/128px. No grail approval is implied.

Each future stage requires separate authorization and current included ImageGen
access verification under zero additional spending. Preserve no-text native PNG
masters and exact tool/prompt/reference/dimension/hash provenance. 3072px is a
proposed alignment canvas, not a proven native generation size. Registered layer
extraction cannot be assumed from arbitrary independently generated portraits.

All 79 templates and 284 family bindings remain MISSING; replacing 42 parent
templates with the family matrix yields 321 planned bindings, not unique PNGs or
generation calls. This pilot does not prove every palette, collar, expression,
mutation, corruption level or the other five grails. A production compiler and PNG
renderer, joint-fit binding, approved references, actual alpha/color/crop proof,
loader-budget measurements, visual duplicate review and reveal/token mapping
remain blockers. The existing 1 MiB/file and 64 MiB loader gates are unchanged.

Task 015B generates no images and changes no website/game/Netlify/CI/RMT files.
Only collection validation runs locally. Remote repository CI remains unchanged.
The existing draft PR #15 is retained for owner review; no merge or deployment.
