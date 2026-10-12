# Stage 32 — bounded high-resolution delivery pilot

PR #27 was owner-authorized and rebase-merged after verifying head
`6d97994e620a2ae175a9edd0c889b2f77da90a1a`, base
`c26017c7160ef947320523542b2c66604fed5b72`, clean collection-only scope, no
blocking reviews and exact-head classify/verify success. Browser acceptance was
**skipped, not executed**. The resulting main is
`c63631d2659bbe7bb723e57b93f7bcca9786f6c8`; its tree exactly matches the reviewed
head. No protection bypass was used (GitHub reported main unprotected).

Four **3072×3072 resampled delivery candidates** retain the four complete native
recipes' visible attributes and provenance. Original **1254×1254 masters and
proofs remain byte-identical**. These derivatives create no new native detail,
are not production registered, and await owner inspection.

## Available tools and safety

Preflight RAM was 5404.2421875 MiB; subsequent RAM checks precede substantial
workloads and retain the >=2048 MiB gate. The RTX 3050 Laptop GPU reports 4096 MiB
total, 3955 MiB free and 8 MiB used in sampled readings, driver 591.59. All image
work is **CPU only**, Sharp concurrency 1/cache disabled. The method allocates
no GPU tensors or VRAM. System GPU samples are not an exclusive process peak.

The inspected Studio model roots have no dedicated super-resolution weights.
Installed ComfyUI templates are not model assets; the available SD1.5 checkpoint
is not a registered upscaler and was not loaded. No model download, inference,
ComfyUI launch, ImageGen call, paid API, purchase or subscription occurred.
Existing locked dependencies were installed from the offline npm cache; package
manifests and lockfile are unchanged. Sharp 0.35.5/libvips 8.18.7 are recorded.

## Representative comparison and actual failure evidence

Canonical was evaluated first at native, full delivery size and 64/128/256 square
and circular PFP sizes. Actual methods were bicubic, NoHalo, locally bounded
bicubic (LBB), and bicubic with restrained L-channel sharpening. Eye/lid/muzzle,
wool roots, ear/contact, 5280 metal numerals and fabric crops were compared.
Native pixel-grid magnification is explicitly a comparison visualization, not a
new native master.

Sharp maps unsupported enlargement kernels to cubic. The Magic Kernel 2021
enlargement probe was **byte-identical to bicubic**, so it was not counted as an
independent method or visual improvement. [Official resize documentation](https://sharp.pixelplumbing.com/api-resize/)

NoHalo and LBB are available affine interpolators, not neural upscalers.
NoHalo retained inspected fine edges better than ordinary bicubic; sharpening
showed little meaningful gain at this restraint. These are qualitative judgments,
not automated aesthetic certification. [Official affine/sharpen documentation](https://sharp.pixelplumbing.com/api-operation/)

The initial NoHalo/LBB outputs were rejected for an unintended dark outer fringe
caused by default black outside-image interpolation. Canonical's native top-right
RGB was (35,35,33), versus initial NoHalo (14,14,13); bottom-right was (31,30,31)
versus (5,5,5). Initial four NoHalo derivatives and all comparison artifacts remain
preserved as `REJECTED_BOUNDARY_ARTIFACT`; no failure is hidden.

## Selected boundary-safe transformation

The fixed development adapter uses **NoHalo with clamped right/bottom edge
support**. Scale is exactly 512/209; source origin and zero offsets are unchanged.
Four copied source-edge pixels are used only as interpolation support. The
1258px working raster maps to a bounded 3082px intermediate; only the original
mapped 3072px domain is emitted. This adds no visible background, canvas area,
anatomy or composition padding and crops no original anatomy.

An initial conservative 209-pixel support probe established the correction.
The four-pixel optimization produces **exactly the same final encoded PNGs**
for all four sources with less intermediate memory/work. Compared with the
unclamped derivatives, corrected pixels are confined to the last eight rows or
columns: **zero interior changes**. Face, wool and contact sampling therefore
remain unchanged by the boundary repair. The emitted image still resamples the
entire native frame; native-versus-delivery facial pixels are not claimed equal.

`tooling/delivery-derivative.ts` validates a complete approved source recipe and
exact native-proof digest before native PNG signature/CRC/scanline validation.
It accepts bytes only: no URLs, arbitrary paths, model parameters, rotations or
unbounded sizes. Native budget stays 4 MiB/1254px; legacy ingestion stays 1 MiB.
Only this delivery adapter has a fixed 3072px output, <=32 MiB encoded bound and
bounded 3082² working raster. Existing ingestion, renderer, registry, masks and
source contacts are unchanged.

Requests and expected outputs are in `fixtures/stage32-delivery-requests.json`.
Receipts record source/parent/approval hashes, rational scale, support/window
geometry, PNG encoding, codecs, decoded-pixel digest and derivative classification.
Pinned output bytes, bounded decode and receipt recomputation validate imports;
independent acceptance additionally reloads sources and reruns the transform.
Local receipts do not constitute owner authentication or automatic art approval.

## Four results and preservation

| Recipe       | Native finished proof SHA256                                       | Delivery SHA256                                                    |
| ------------ | ------------------------------------------------------------------ | ------------------------------------------------------------------ |
| Canonical    | `89ba9dba1070fe9cc8fab0be82b947ba8cc37f17d14b25dcf9260ee5cbde173b` | `5365e5960de5faecc432fe2bb8ce673d56872f827ae31bbde8eeb44223265c75` |
| Broad Ash    | `be31a4ee0745486208859ecdefcbec819f555ceb73579367e4bcc6e2d6367227` | `3ffd97a824f976805e5d7e76e42f39f55627c2671c9c72607893b986dc9866ff` |
| Rolled Locks | `b24074f881d853e5be351f53ec8d22d39208cdd99e0b52a5940bc49b13c3b040` | `fd54363d8432253834c4035b32cd4dad80ccdf7a0b58c20081c2f7bccd2c61ba` |
| Front        | `ad0d8fc9b5a5d7cdf98ad9a8bf5ad1f75704f1bf3971a82bb35de0874dc96d0e` | `0cf18e5bb60758e468cb94b7c6b4f18d03c41f9276ed47e4a29e05671ccaa800` |

All four native reconstructions match historical encoded bytes and have zero
outside-mask changes. Delivery reload/replay matches exactly, with four unique
encoded/decoded hashes. All 169 historical bindings across 92 paths and the
121-entry backlog verify. Native source-specific eye/background approval scopes,
Trait Bible IDs/frequencies, compatibility and six grail reservations are intact.
Delivery files are about 13.9–14.3 MB each. Per-proof runtime/RSS and exact byte
counts are in `STAGE32_DELIVERY_PILOT.json` and private receipts, with no batch
throughput or 5280-image feasibility extrapolation.

## Metadata, visual quality and release gates

Each derivative preserves the parent's eight textual attributes and nine-category
source trait-vector digest, changing only the image placeholder to
`https://artwork.invalid/lammb/delivery/<SHA256>.png`. Names/descriptions/external
URL remain collector-readable; no token IDs, scores, tiers or mint claims.
These placeholders are unpublished. The format follows the reviewed internal
OpenSea-compatible subset. The 3072px raster meets the current >=3000px media
guidance in dimensions, while its underlying native detail is still 1254px.
[OpenSea media guidance](https://docs.opensea.io/docs/media-and-traits)

Eyes, sheep anatomy, wool/fabric structure, tag numerals, shadows and contacts
remain recognizable. No new strands, typography, anatomy or neural detail is
invented. Gains at 64/128px are small; inherited tight-ear/circular crop limitations
remain. Upscaling neither reconstructs missing ear geometry nor creates a true
3072px authored master. Final quality is an owner decision, not a pixel-count pass.

Unit tests cover real fixed-size resampling and flat edge preservation, source
hash/parent scope, strict dimensions/methods, byte/pixel bounds, malformed or
truncated PNG, metadata/trait retention, duplicate outputs and false detail or
production claims. Existing tests/assertions/timeouts remain unchanged. Native
proofs and real four-source replay are independently verified on the Legion.

The post-merge **main** run `38318776274` separately failed Edge at the unchanged
Chamber scene-condition interaction step (ready scene, 10 fps, `near=false`),
after installation/startup/build succeeded. The completed main run has classify,
verify and Chrome SUCCESS, Edge FAILURE, and overall FAILURE. This is unresolved
interaction/performance evidence, not dismissed
as harmless infrastructure. Game code is byte-identical to pre-merge main;
no game/CI fix or blind rerun is performed here. Final exact-head Stage32 CI
and updated main-run status are reported separately; skipped PR browser jobs
are never presented as browser coverage.

Production registered: **0**. Required next gates: owner derivative/art inspection,
explicit derivative/source registration scope, high-resolution native-detail
decision, resolution of outstanding main browser CI, and separately authorized
live URI/release checks. No website, Chamber, World atlas, Netlify settings, RMT,
Task017, mint/wallet, production registration or mass-generation changes occur.
