# Stage 16: bounded native PNG/contact proof

The adapter reconstructed the existing approved frontal ear-tag proof exactly.
This is one development engineering proof, not production asset registration,
new artwork, a token assignment, or evidence of 5280-image capacity.

Main was verified at `dd48cdf1582f348bb7a024e1ee820eec8ef18384`. Task 017
remains paused, clean and unchanged in its separate worktree. Website, Chamber,
atlas, Netlify, CI, Trait Bible, constructor and mint/wallet files are unchanged.

## Boundaries and source approval

`pngContactRenderer` is an asynchronous, resolved registration adapter using the
existing canonical SHA256 utilities, source declarations and OpenSea schema.
It deliberately does not fabricate a logical specimen to bypass
`deriveCompositionPlan`, replace the synchronous development text renderer, or
alter `productionReady100`/`pixelReproductionProven`. General family-binding,
production binary bundle export and approved collection rendering remain future
work.

The proof request is strict and `DEVELOPMENT_ONLY`. The base has digest-bound
`APPROVED_ART_DIRECTION` evidence. Contact/mask have
`VALIDATED_RECONSTRUCTION_INPUT` evidence from the approved finished Stage 7
proof, as explicitly authorized for reuse in Stage 16. They are not independently
approved portable accessories. Every input and output has
`productionRegistered: false`. Local review declarations do not authenticate
owner authority; no source is promoted to production by this code.

Source PNGs and prior reports stay untouched. The fixture contains relative
local paths and original hashes, not PNGs or website assets. No network fetching
exists. A caller provides an explicit trusted local source root; input paths are
confined, regular files, with links/junctions, size changes and digest changes
rejected. File reads allocate only the bounded stated size. IO errors expose
stable codes rather than local paths or supplied values. This is local tooling,
not an HTTP upload endpoint; a future service needs isolation, authentication,
quotas and reviewed filesystem trust rules.

## Evidence-bounded source budget

The existing `validateArt` and `io.ts` **1MiB** source cap and **64MiB** aggregate
cap are unchanged. The new proof adapter has a separate immutable policy:

| Budget                    |       Bound |
| ------------------------- | ----------: |
| Encoded PNG per source    |        4MiB |
| Aggregate encoded sources |        8MiB |
| Each dimension            | 1254 pixels |
| Pixels per source         |   1,572,516 |
| PNG chunks                |        4096 |
| Encoded output            |        4MiB |

The preliminary sequential decode measured 53.51MiB peak RSS. Actual input sizes
and decoded layouts justify the narrow bound:

| Input         | Encoded bytes | Decoded bytes | Layout                          |
| ------------- | ------------: | ------------: | ------------------------------- |
| Front native  |     2,312,892 |     4,717,548 | 1254×1254 RGB8                  |
| Contact joint |       112,635 |       329,000 | 235×350 RGBA8                   |
| Saved mask    |        21,513 |     4,717,548 | 1254×1254 RGB8 grayscale values |
| Total         |     2,447,040 |     9,764,096 | Three inputs                    |

The 4MiB bound covers the measured base and historical 2,969,728-byte finished
proof. It is not evidence for 3072px sources or arbitrary collections. The
largest permitted RGBA raw buffer is 6,290,064 bytes; filtered scanlines have a
separate exact expansion bound. Compressed-size limits alone do not establish
decoder safety.

## Decoder and color policy

Before Sharp sees bytes, the adapter validates PNG signature, complete chunk
framing/order, CRCs, IHDR, dimensions, channels and bounded zlib expansion.
Scanline length and filter bytes must be valid. Trailing data/streams, missing
end chunks, unknown critical chunks, animation, palette, interlace, 16-bit,
transparency-key, ICC and EXIF inputs are rejected. Only `sRGB`, `gAMA`, `pHYs`
and opaque source `caBX` ancillary chunks are accepted, without duplicates.
Compressed text and all other ancillary chunks are rejected before native
decoding, so metadata cannot escape the bounded image-data expansion check.
Native decoding additionally
uses `failOn: warning`, explicit pixel/channel limits and normal safety features.

This small proof accepts RGB/RGBA8 with standard sRGB or untagged bytes explicitly
interpreted as sRGB. It rejects nonstandard gamma/chromaticities and never claims
an absent embedded profile exists. Raw pixels are not silently converted to a
new color space. Source C2PA/ancillary bytes remain preserved in the originals;
the derivative encoder does not carry a claim that those credentials attest the
new file. Source hashes and new provenance are separate.

See [Sharp constructor safety](https://sharp.pixelplumbing.com/api-constructor/),
[PNG encoding options](https://sharp.pixelplumbing.com/api-output/#png) and
[Node zlib limits](https://nodejs.org/docs/latest-v22.x/api/zlib.html#class-options).

## Exact registration and composition

Base SHA256:
`23213a0781d596408ec29143f22ecfd4d7ddc29aa9a3dca38a7de44709bb5449`

Joint SHA256:
`32b64756dc35163a8a62661192f66cf0d79199af1fd553bc7bd30f60ca2a7524`

Mask SHA256:
`b07e6530dc162d7e08bd16910fcda42c294f895a847632150261009c81278c96`

The ROI is x=65, y=550, width=235, height=350. The original 21-vertex polygon,
identity transform, and saved 6px/10px inside-only feather values are retained.
The saved grayscale mask must equal the layer alpha at every ROI pixel and be
zero outside the ROI/polygon. ROI edges have zero alpha; transparent joint RGB
must be zero. No resampling, padding, wool extraction, new geometry or new AI
pixels are introduced.

Composition uses the prior straight-alpha byte-domain sRGB arithmetic:

```text
floor((joint * alpha + base * (255 - alpha) + 127) / 255)
```

This is intentionally not a linear-light compositor. Changing color arithmetic
would change the established proof. All 1,530,287 pixels outside the nonzero mask
match the approved base exactly. Inside the 42,229-pixel mask, 40,054 pixels
change; 7288 mask pixels have fractional alpha. Every source and the request are
rechecked after asynchronous processing for mutation.

The independent reconstruction reloads and decodes sources afresh and uses a
different arithmetic implementation, without calling the renderer. It matches
raw pixels, encoded bytes, and the original Stage 7 native PNG.

Finished SHA256:
`ad0d8fc9b5a5d7cdf98ad9a8bf5ad1f75704f1bf3971a82bb35de0874dc96d0e`

Native output: **1254×1254 RGB PNG, 2,969,728 bytes**. Node v22.23.2,
Sharp **0.35.5**, libvips **8.18.7**, libpng **1.6.58**; the receipt records all
codec versions. Sharp already existed in the lockfile; the art workspace now
declares that exact dependency. No new transitive package versions were added.

## Workstation and measured performance

The restarted Legion initially reported 3927.30MiB available RAM, with RMT as
the active console/current user. The implementation and CLI use a 2048MiB RAM
gate before substantial workloads. The proof worker uses concurrency 1 and
Sharp cache disabled. No GPU inference or protected-process termination occurs.

First proof measurement: render **353.42ms**, independent reconstruction and
historical comparison **264.56ms**, whole CLI **2407.99ms**, peak process RSS
**149.53MiB**. The minimum of six boundary RAM samples was **4410.71MiB**.
This is sampled available RAM, not a claimed continuous minimum. Node heap is
capped by the invocation; native buffers/RSS are separately measured. None of
these measurements predict 5280-image throughput, retry rates or 3072px costs.

## Reproduce without overwriting evidence

After locked dependency installation, with originals under an explicit local
source root and at least 2048MiB available RAM:

```powershell
$env:NODE_OPTIONS = '--max-old-space-size=192'
node --experimental-strip-types packages/art-generator/tooling/stage16-png-proof.ts C:/LAMMB-Studio/output stage16-proof-owner-review
```

The CLI writes an exclusive new folder under `artifacts/generated/`. It refuses
existing output folders. The native proof, independent reconstruction, source
registration, provenance, runtime and metadata receipts remain development-only.
No original asset or previously completed output is overwritten.

Targeted checks (one worker, no browser/build/image-generation suite):

```text
vitest run tests/png-proof.test.ts tests/art-ingestion.test.ts tests/art-ingestion-io.test.ts tests/art-pipeline.test.ts --maxWorkers=1 --no-file-parallelism
tsc --project packages/art-generator/tsconfig.json --noEmit
```

Synthetic unit pixels test decoder rejection, hash/approval invalidation, file
confinement, registration, alpha contamination, pixel preservation, deterministic
output and metadata encoding. They do not assess LAMMB aesthetics. Actual private
masters are not committed; remote CI tests synthetic fixtures, while the Legion
receipt establishes the native proof.

## Development-only metadata

The existing strict OpenSea schema validates four previously reviewed visible
facets from Trait Bible v1.1.0: Species=Sheep, Wool=Ivory Curls,
Clothing=Black Hoodie, Ear Tag=5280. Eye/color/expression/background labels and
genuinely absent accessories/mutations are omitted. No rarity, rank, tier,
grail or token ID is issued. A sidecar binds image bytes, metadata digest and
unchanged specification digest.

`https://artwork.invalid/...` is a reserved, deliberately unresolvable placeholder,
not public storage. No metadata is published. A future owner-authorized storage,
token mapping and reveal integration remains necessary.

## Artistic and production limits

Native inspection shows the previously approved face, wool, hoodie and contact;
exact equality to Stage 7 is stronger than an approximate aesthetic comparison.
The 5280 plate remains clear at native/128px and less reliably decipherable at
64px. Inherited ear margins and a small metal scuff remain. No framing repair was
authorized or performed.

The joint contains receiving ear, background and contact-shadow context. It is
bound to these exact hashes, pose, lighting and mask; it is not proven reusable
on other front wool, clothing or background families. Failed Stage 3 composites
are not inputs. The source family is not promoted to 3072px/transparent production
assets, and the four metadata labels are not a complete nine-category collection
trait vector.

Stop for owner review of this proof and draft PR. No 5280 render, new artwork,
production asset approval, merge, deployment or Task 017 resumption is authorized.
