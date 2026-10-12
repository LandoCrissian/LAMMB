# Stage 27 — dynamic characters and environmental storytelling

Authorized main: `5bfbdcaff5dc772d0dba519bdd4579394d400db4`, the merged Stage 25/26 PR #23. This task uses an isolated `codex/task-027-dynamic-characters` worktree, preserving paused Task 017 and all earlier artwork. Post-merge main classification/verification/build passed; Edge acceptance passed when inspected, while Chrome was still running. Pending coverage is not claimed successful.

## Three untouched native masters

Exactly three built-in `image_gen.imagegen` calls ran, one per study, with no retries. Each output is an untouched native 1254×1254 RGB PNG. Raw tool files and private Studio copies have identical bytes. No interpolation, padding, resizing or recompression was applied to native masters.

| Study                 | Native SHA256                                                      | Encoded bytes | Proposed technical/art QA |
| --------------------- | ------------------------------------------------------------------ | ------------- | ------------------------- |
| Collar Shift          | `c1ea578b93f03c378ad8c589c665532cf007f5d1aada9799ada1ff4170eb5128` | 2,305,063     | PRODUCTION_CANDIDATE      |
| Delighted Conspirator | `fe95b48b6831306f0e6d91dd804f74cac6442524f3b16960bc7efdbcac2cd04e` | 2,455,918     | NEEDS_REFINEMENT          |
| After-hours Observer  | `f9fbf9d8087cefa28c0a31bd6f72bd35ce29911f40fdb488b7184d3bb5b532fa` | 2,382,352     | PRODUCTION_CANDIDATE      |

Paths relative to private `C:/LAMMB-Studio`: `output/TASK_027_STAGE27_STUDIES_001/01-collar-shift-native.png`, `02-delighted-conspirator-native.png` and `03-after-hours-observer-native.png`. Each source decodes to 4,717,548 RGB bytes. PNG signature/CRC/decompression inspection and actual Sharp decoding passed within unchanged 1254px/4MiB budgets. All artwork is owner-review pending and **NOT_PRODUCTION_REGISTERED**.

## Raster references, prompts and included usage

The existing 115-entry backlog and all 143 source/evidence declarations across 79 unique paths passed digest verification before generation. The four distinct planned native reference PNGs were decoded and checked against their approved source identities. Rejected skeletons, failed composites and resized previews supplied no positive references.

| Study                 | Actual raster input role                    | SHA256                                                             |
| --------------------- | ------------------------------------------- | ------------------------------------------------------------------ |
| Collar Shift          | Primary approved front identity             | `23213a0781d596408ec29143f22ecfd4d7ddc29aa9a3dca38a7de44709bb5449` |
| Collar Shift          | Supporting approved relaxed-lean posture    | `7566ad5d315200acd6f7b1216e4d0e356872c7409d8dba3a63f09ec8374c8947` |
| Collar Shift          | Supporting approved Amused personality      | `082a2de341b74e93ebe94be380acb8b6ec8aad660d64aefe64ed80d83ea6b631` |
| Delighted Conspirator | Primary approved Amused identity/expression | `082a2de341b74e93ebe94be380acb8b6ec8aad660d64aefe64ed80d83ea6b631` |
| Delighted Conspirator | Supporting approved front anatomy           | `23213a0781d596408ec29143f22ecfd4d7ddc29aa9a3dca38a7de44709bb5449` |
| After-hours Observer  | Primary approved Lab Coat identity/garment  | `84093cc65b3c05928695588c1bf88cad9137143a364883b59fb7e6fd4a008d2b` |
| After-hours Observer  | Supporting approved front anatomy           | `23213a0781d596408ec29143f22ecfd4d7ddc29aa9a3dca38a7de44709bb5449` |

Exact execution prompts, paths/roles/hashes, passed tool arguments, saved identifiers, actual dimensions and timings are in `reports/TASK_027_STAGE27_EXPANSION_001/GENERATION_PROVENANCE.json`. They derive from the preserved `STAGE26_NEXT_STUDIES.json` prompts, with a concise use-case/single-square-image wrapper. The prepared plan raw SHA256 is `c5c87ab23a08f28caacac91fbb7c840ba932a16b178710af6d5afa91b517faad`. The new Task 027 directive supplies execution authorization; the old plan remains a plan-only record.

Before each call the live usage tool reported ordinary included usage available, 12% used, zero purchased credit balance. [Official built-in image guidance](https://learn.chatgpt.com/docs/image-generation) and [pricing guidance](https://learn.chatgpt.com/docs/pricing) establish the general included Codex usage route. No API key route, paid API, purchase, new subscription or GPU service was used. Rounded usage is not a per-image billing receipt, and no unlimited-call guarantee is made.

The tool exposed `image_url` and `output_hint`. The documented model family is not an actual backend version receipt; exact model version and seed remain null. Saved `exec-…png` filenames identify artifacts, not backend request IDs. ImageGen replay, exact protected-pixel preservation and requested output-size control are not claimed.

## Artistic QA

**Collar Shift — PRODUCTION_CANDIDATE:** a diagonal shoulder/collar position and one bent sheep forelimb/hoof produce a genuine new gesture. The bomber's ribbed collar/cuff, zipper, sleeve compression and restrained shoulder seam are coherent. Compact freckled muzzle, green heavy lids, low ears and fibrous curls preserve recognizable LAMMB identity. One cloven-looking hoof meets the collar; no human fingers or duplicate limb is observed. Head attitude still resembles approved relaxed lean, but the hoof/collar gesture and garment outline read at 64px/128px. Fine hoof anatomy needs owner inspection; no contact geometry or pose registration is implied.

**Delighted Conspirator — NEEDS_REFINEMENT:** the open smile, lifted eye/brow response and glossy asymmetric shell are appealing and anatomically coherent, with no visible human upper incisor row or duplicate facial structure. However, the head tilt, eye grammar and smiling mouth remain too close to approved Amused to establish the requested genuinely different personality at 64px. Wardrobe is the stronger contribution; the material reads partly leather-like despite the reflective-shell direction. This technically clean result is retained as a refinement study, not accepted as a new expression family. There was no retry or silent replacement.

**After-hours Observer — PRODUCTION_CANDIDATE:** a quiet observation window, broad containment machinery and restrained chartreuse lights give meaningful setting and depth. Wool/coat rim response coheres with the environmental lighting. The face remains the first read at 64px, followed by coat and laboratory cues. More body/scene reduces the face size, while the expression remains close to approved Lab Coat; the useful contribution is integrated storytelling and atmospheric material response. Fine machinery and pen-like pocket details disappear at thumbnails. No background separation, portable garment/contact or playable-location promise is made.

All three natives, actual-size 64/128/256 square and circular previews, and labeled comparisons were inspected. Major ear/crown contours are visible; circles trim outer clothing and some fringe. Intentional lower portrait cropping is acceptable. No semantic numerical framing pass is claimed; 2%/8% remain diagnostics, not mandatory rejection gates or OpenSea requirements. No crown, unwanted lettering/logo, major duplicate anatomy, corrupted file or obvious pasted seam is observed. Fine anatomy/material quality remains subject to owner review.

## Diversity and truthful metadata

The three unique encoded and decoded outputs were compared against 29 approved historical native sources and each other at 64px, 128px and native size: 270 comparisons, no exact duplicates and no whole-frame RGB-MAE <0.04 diagnostic pairs at 64px. This background/pose-sensitive metric does not certify visual uniqueness. Manual review still identifies Delighted's repeated Amused expression grammar. Three studies do not establish 5280 visually unique finished NFTs.

`packages/art-generator/fixtures/stage27-character-studies.json` provides partial, unpublished review metadata. Collar Shift proposes Species=Sheep and Clothing=Black Bomber. Delighted proposes Species=Sheep, Expression=Amused and Clothing=Reflective Shell; Delighted is a working art title, not a new trait value. Observer proposes Species=Sheep, Clothing=Lab Coat and Background=Containment Lab. All values come from the existing Trait Bible and remain subject to owner/source registration review.

Each example binds the native image SHA256 and canonical metadata SHA256. Image URIs use unpublished `artwork.invalid` placeholders. No unverified eye, wool, pose, pocket accessory, rarity score, tier or token assignment is emitted. `completeCollectionVector` and `productionRegistered` remain false. Full-frame authored character sources do not establish interchangeable trait layers.

## Backlog and engineering boundaries

Version 0.7.0 adds exactly three pending records for a total of 118. All 115 prior source lists, owner history, technical classes and compatibility restrictions are unchanged. `ARTWORK_BACKLOG_v0.6.0.json` pins the reviewed Stage 26 bytes so its source-bound authored proposals/tests continue using the original digest. The append validator adds only 0.6.0→0.7.0 alongside existing historical generation transitions, rejecting old-record rewrites, unapproved references, duplicate/reused outputs, missing evidence, owner approval claims and production promotion.

Current hash verification covers 156 declarations across 85 private paths. Skeletal anatomy, Pixel Drip compatibility, Magma garment compatibility and Rolled Locks differentiation remain open. No Trait Bible ID/frequency, supply, compatibility rule, grail reservation, renderer, dependency/lockfile, CI, website or Task 017 change occurs.

The sequential CPU review used Sharp 0.35.5/libvips 8.18.7 with cache disabled and concurrency one: 6.66s, peak process RSS 165.59MiB; individual native decodes took about 30–32ms. RAM before the review was 4671.82421875MiB, above the 2048MiB gate. Generation wall times are recorded separately and do not measure local GPU inference, server memory or collection throughput.

The [owner-only Stage 27 review folder](https://drive.google.com/drive/folders/1n5hTAqB_u3zLmMEw-oHAzAsyK29Dptuj) receives native PNGs, provenance, comparisons, exact-size boards and 18 downsampled square/circle previews. Enlarged tiles are clearly labeled display-only. Source registration, final NFT artwork approval and next generation require separate owner decisions. No merge, manual deployment, mint, mass generation or production promotion follows this report.
