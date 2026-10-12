# Stage 23 — character evolution studies

Baseline: `11d1396d516eb9e140d1c25ff2ff42402f0c413e`, the rebase-merged Stage 21/22 owner-decision work. PR #19 and PR #20 remain unmerged dependencies; no tooling or conflicting backlog from those branches is imported. The permanent backlog is now version 0.3.0 with 112 items; all 109 earlier records and decisions remain unchanged. The Stage 22 snapshot and its registry bindings are preserved separately.

## Three native studies

Exactly three built-in `image_gen.imagegen` calls produced these full-frame studies, with actual approved raster references. No automatic retries, paid API route, purchased credits, local inference or production promotion occurred. A fresh usage check before each call reported ordinary included usage allowed, 9% consumed and no credit balance. [Official built-in image guidance](https://learn.chatgpt.com/docs/image-generation) and [included-limit policy](https://learn.chatgpt.com/docs/pricing) explain that this route uses the general Codex allowance. Those percentages are rounded account limits, not per-image billing receipts or a promise of unlimited generation.

| Study                   | Native PNG SHA256                                                  | Proposed QA classification |
| ----------------------- | ------------------------------------------------------------------ | -------------------------- |
| Ovine Skeletal          | `b42e616701c2b1d9ec8b0c9ad45e6941451d8a84ef7a3187c1923b57631a049f` | NEEDS_REFINEMENT           |
| Pixel Drip Evolution    | `33094916e4c946d5f794d47cd078f78ea63b8284bd7fe6b5227311a37b99d74d` | PRODUCTION_CANDIDATE       |
| Structured Utility Vest | `9a858dda8c1c7293a6a0acb517c60b7e8aafb5d091bc15ae867f76350d81b52d` | PRODUCTION_CANDIDATE       |

All are untouched native 1254×1254 RGB PNGs. Their respective encoded sizes are 2,391,446; 2,270,565; and 2,347,475 bytes. Bounded PNG signature, CRC, decompression and actual Sharp raw decoding passed. Each decoded RGB image occupies 4,717,548 bytes. Private Studio copies match the raw tool originals exactly; no master was resized or recompressed. Native paths are `output/TASK_023_STAGE23_STUDIES_001/01-ovine-skeletal-native.png`, `02-pixel-drip-evolution-native.png` and `03-utility-vest-native.png`, relative to `C:/LAMMB-Studio`.

All three require owner art review. `PRODUCTION_CANDIDATE` is a proposed QA class, not an owner approval or `PRODUCTION_REGISTERED` state. Previous skeletal and repair rejections remain quarantined.

## Reference and provenance boundaries

The skeletal study used approved original three-quarter identity `34a8b9369ce4ccbf6c5f07bff54e176660798ec668a45f97b6a8f793961a592a` as primary, with approved front identity `23213a0781d596408ec29143f22ecfd4d7ddc29aa9a3dca38a7de44709bb5449` supporting species and material construction. The Stage 22 sheep anatomy guide supplied the anatomical specification; no rejected skull was a generation input and no third-party anatomy plate was copied into the artwork.

Pixel Drip used the original identity as primary and art-approved Stage 21 Pixel Drip `be2da3bae45f9a02403c144049966c4d768140dbffff2bedc8ef66e37c28010f` as supporting effect direction. Utility Vest used the front identity as primary and the original identity as support. These are actual local raster paths passed to the tool, not text-only references.

Exact prompts, arguments, source hashes, tool-returned filenames, native dimensions and output hashes are preserved in `reports/TASK_023_STAGE23_EVOLUTION_001/GENERATION_PROVENANCE.json`. The tool exposes no actual model version, seed or deterministic replay control; these fields remain null. Observed `exec-…png` filenames identify saved outputs, not backend request IDs. Requested framing is not an API size guarantee. All three are generative full-frame authorship: facial pixels differ from references, and no deterministic identity lock or layer registration is claimed.

## Artistic and metadata assessment

**Skeletal:** a forward ovine rostrum, long mandibular body, toothless interval and lateral orbit improve on the previous broad frontal human-skull studies. No upper anterior incisor row or human clavicles are visible; shoulders stay inside the hoodie. The lower front arcade remains tall and regular, with uncertain sheep-specific splay/flattened shape and visible count. Dense surviving wool obscures cervical and jaw articulation. Native jaw/neck crops are supplied for expert and owner review. Rendering appeal cannot certify sheep anatomy; this source needs refinement and is not an accepted skeletal master.

**Pixel Drip:** varied fragments emerge from curled wool, and a separate cloth transition follows a hoodie seam. The face and most materials remain clean. The three-quarter view and gradient differ from Stage 21's frontal large-cube arrangement. Floating particles are decorative overflow; some vanish at 64px. A reviewed subject/effect mask is still needed for any TOUCH/BLEED/FRACTURE mapping. No corruption tier, exact palette, Eye, Background or unverified Expression facet is exported.

**Utility Vest:** the raised open collar, sleeveless structured torso, ripstop panels and purposeful pockets address an underserved silhouette. Wool/neck contact and hardware are coherent; the intentional bottom crop omits the hem and tiny hardware is indistinct at 64px. `lammb-clothing-utility-vest` is an existing proposed mapping. The underlying knit shirt is part of the authored frame, not a second independent Clothing value. No cloth-layer portability or complete trait-vector eligibility has been proved.

The backlog records proposed existing Species/Clothing/Mutation mappings only. No new IDs, trait frequencies, grail reservations, ranking fields, token IDs or metadata publication are introduced. All records remain outside production registration.

## PFP and diversity evidence

Native and 64/128/256 square/circular previews were visually inspected. Major ears, crown and expressions remain readable; portrait garment cropping is intentional. Circular presentation can remove outer clothing and decorative fragments. Fine fringe margins remain tight. The 2% guard and 8% inset are diagnostics; no semantic-mask compliance is asserted and no source was padded to force compliance.

Eighteen actual-size PFP files and labeled comparison boards are in the private review package. Comparison-board enlargement is display-only, not generated detail. There are no encoded or decoded exact duplicates among the three outputs or against the 19-source Stage 20 pilot plus two Stage 21 approved studies. There are 189 RGB difference comparisons across 64, 128 and native resolution. None meets the inherited 64px whole-frame MAE <0.04 diagnostic. This background-sensitive metric is not proof of perceptual uniqueness; shared faces, wool and dark apparel still need human review.

The utility vest adds the clearest missing clothing silhouette. Pixel Drip develops a specific effect grammar; it does not multiply one portrait into many unique specimens. Skeletal adds a promising construction direction but does not close the anatomy blocker. Magma, Cybernetic, Crystalline, Botanical and Multi-Eye retain distinct material/anatomy families; their clothing and expression contacts remain source-specific. Cute biological appeal and intimidating mutation appeal should coexist within the established identity.

Highest-value gaps remain Side Eye/Amused/Defiant expression sources, Lab Jacket and Long Coat silhouettes, the five underdeveloped wool source families, body-pose/contact registration, authored background separation, and unresolved Skeletal/Void anatomy. Preserve exposed Magma and Magma Hoodie as different art directions. The existing Magma clothing whitelist still excludes Hoodie. Neither logical 5280 simulations nor this pilot establishes 5280 visually distinct finished images.

## Validation and owner gate

New append tests cover prior-history/hash rewrites, unapproved inputs, wrong dimensions, duplicate/relabelled outputs, missing provenance, false art approval, production promotion and positive use of a technically rejected output. Historical Stage 22 registration tests continue to use its exact snapshot; passing them cannot silently approve the new studies. Existing renderer, source caps, decoder limits, Trait Bible, dependencies and CI remain unchanged.

The local review pipeline used Sharp 0.35.5, CPU concurrency one and disabled cache. Decode times were approximately 27–28 ms each. Preview/comparison work took 14.29 seconds and peaked at 154.61 MiB process RSS; these are review measurements, not ImageGen server memory or collection-render throughput. RAM preflights exceeded 2048 MiB. ImageGen call wall times and rounded usage evidence are preserved privately.

Post-merge main CI verification and classification passed. Its Edge Chamber job failed at the inherited movement-condition timeout in `verify-chamber-browser.mjs:854`; browser/game code is unchanged by the merged art work. This failure is preserved as baseline evidence, not declared harmless or green. Stage 23 runs no local website builds or browser suites and makes no CI/game correction.

Owner review must decide the two candidate art directions and the skeletal dental/neck concerns. Next recommended work, after approval: a no-generation Pixel Drip semantic coverage review and pose-specific Utility Vest registration. Any new skeletal correction needs a separate bounded art directive. No collection batch or production promotion follows automatically.
