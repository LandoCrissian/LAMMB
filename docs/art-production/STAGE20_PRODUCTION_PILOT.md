# Stage 20 development artwork pilot

This pilot turns existing approved art directions into a reviewable export package without generating artwork or assigning NFTs. It preserves the logical collection engine, Trait Bible v1.1.0, frequency proposals, compatibility constraints and six grail reservations. Robinhood Chain is the intended network; this work introduces no chain ID, contract, wallet, allocation, transaction or mint configuration.

## Evidence and scope

Verified baseline: `bf71f22c881ae409179f8c37efab89809c74a5af`. Stage 16 and Stage 17 are merged. PR #19 remains a draft at `969b1ba31b85f4f20f6220057e26492db7226ada`; none of its engineering changes are required by this pilot. Task 017 stays paused in its separate clean worktree.

The manifest is `packages/art-generator/fixtures/stage20-production-pilot.json`. The private source root is `C:/LAMMB-Studio`. Source hashes and the Stage 15 approval-inventory digest bind the selection. The manifest digest is a trusted-operator input, not authenticated owner authorization. Locally forged JSON approval records cannot establish approval by themselves.

The library scan retains aliases and historical records, rehashes all 848 historical artwork paths, and baselines later files separately. No filename confers approval. Only the 19 pilot PNGs receive the strict Stage 16 decoder in this run; a library inventory entry is not a claim that every reference/preview passed PNG ingestion. The full inventory and review images stay outside Git.

## Proposed practical art policy

| Proposed class       | Meaning                                                                                                                                                                                                                                 |
| -------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| PRODUCTION_CANDIDATE | Compelling LAMMB identity, coherent anatomy, readable face, acceptable apparel/contact, verified native PNG/provenance and no major visible seam or artifact. Requires owner acceptance and a separate technical registration decision. |
| NEEDS_REFINEMENT     | Useful direction with a specific artistic or differentiation issue; preserve it and identify the required improvement.                                                                                                                  |
| REJECTED             | Previously rejected or materially defective artwork; quarantine and retain evidence. A new policy never silently rehabilitates it.                                                                                                      |

The pilot proposes 18 production candidates and one refinement candidate. The refinement is the confident smirk: its change from the front identity is too subtle at 64px to assume strong collector differentiation. These are proposed judgments, not final NFT approval. The original art-direction approvals remain intact.

The 2% critical-silhouette guard and 8% inset are diagnostics, not automatic rejection criteria and not OpenSea requirements. Minor pixel differences, intentional bottom-edge portrait cropping and small framing differences can be acceptable. Severe accidental ear loss, internal garment cutoffs and incoherent anatomy still require refinement or rejection. Circular crops can hide ear tips or a tag even when square artwork is strong; inspect the supplied square/circle previews before deciding on production presentation. No percentage is certified without reviewed semantic masks.

## Exported pilot

| Family              | Candidates                                           | Technique                                             |
| ------------------- | ---------------------------------------------------- | ----------------------------------------------------- |
| Identity/camera     | Canonical, front, three-quarter right                | Immutable full-frame authored PNG                     |
| Expression          | Smirk, irritated, tongue out                         | Immutable full-frame authored PNG                     |
| Posture             | Skeptical tilt, relaxed lean                         | Immutable full-frame authored PNG                     |
| Streetwear          | Underground, high roller, neon rebel                 | Integrated full-frame authored PNG                    |
| Mutation            | Cybernetic, Magma, Crystalline, Botanical, Multi Eye | Integrated anatomy-family full frame                  |
| Compatible contacts | Canonical/Ivory tag, Broad Ash tag, Rolled Locks tag | Stage 17 source-specific deterministic reconstruction |

Total: 19 native 1254×1254 outputs, 16 authored copies, three composites and five mutations. Copies are byte-identical exports, not newly generated detail. Previews use disclosed downsampling; native masters are never resampled. There are zero ImageGen calls and no paid services.

Quarantined skeletons, conditional/family-rejected Void, conditional crossed forelimbs, failed Stage 3 wool transfers and Stage 18/19 repair studies are excluded. The failed repair studies remain experiments even if portions of them are attractive.

The new inventory annotates two incorrect inherited labels without editing the original evidence: the Magma portrait has a bare volcanic upper body rather than a black hoodie; the conditional Void entry was mislabeled Skeletal. Neither correction grants approval.

## Hybrid production architecture

1. The existing deterministic constructor remains the authority for a 5280-specimen logical trait vector, uniqueness fingerprint, compatibility and reserved compositions. It is not a visual uniqueness guarantee.
2. A reviewed source resolver maps a complete vector to one of three permitted recipe types: an authored full-frame source, a specifically registered compatible contact recipe, or a curated integrated mutation master. Unsupported vectors fail resolution. A pose or expression label is a source family, not an extra trait value silently added to the constructor.
3. Full-frame masters are immutable and not automatically interchangeable layers. Clothing, expression, perspective and most mutation changes require authored variants or demonstrated pose/anatomy-specific joint packs. Stage 3 failed wool extraction remains negative evidence.
4. Deterministic recipes bind exact base/contact/mask hashes, source-specific ROI/polygon, native dimensions and codec identity. The three ear-tag proofs do not establish arbitrary pose/contact portability. A structural mutation replaces anatomy; it does not add a second face.
5. A future queue keys each job by logical fingerprint, recipe digest, source hashes and codec descriptor. Checkpoint immutable source receipts and each verified output. Resume only after hashing the existing file/receipt; quarantine mismatches. Retry deterministic I/O only after diagnosis. ImageGen retries require an explicit bounded plan and current included-access evidence, never unlimited automatic retries.
6. A review package includes native artwork, 64px/128px square/circle previews, metadata, source lineage and duplicate diagnostics. Human owner review is required for personality, anatomy, contacts, mutation coherence and collector distinction. Separate final technical promotion follows approval; this task promotes zero sources.
7. Final PNG/metadata export must enforce truthful visible facets and the complete approved vector. The pilot's partial vectors are insufficient for NFT assignment. Image URIs must be resolved before any later publication. Token mapping and delayed reveal remain separate existing contracts, not actions taken by this tool.

## Metadata boundaries

The development adapter uses existing canonical trait IDs and OpenSea attribute vocabulary. It rejects duplicate categories, unknown/absent facets, incomplete accessory bundles, known incompatibilities and selected mutation-category conflicts. It deliberately does not pretend a partial vector passes all constructor constraints.

- Ear-tag proofs retain the reviewed four facets: Species, source-correct Wool, Black Hoodie and Ear Tag `5280`.
- Underground uses the visible Black Bomber and existing beanie/short-chain bundle. High Roller uses Smirk and the existing shades/gold bundle; one actual gold tooth is visible natively.
- Mutations export their visible existing Mutation family. They do not claim verified material chemistry or interchangeable family layers. Magma exports no Clothing facet.
- Olive-green eyes are not certified as the exact radioactive palette; gradient studio backgrounds are not registered flat background values. These facets are omitted.
- Irritated, tongue-out and skeptical interpretations have no verified direct existing expression mapping. They remain documented observations rather than invented metadata values.
- Neon jacket classification and pixel-corruption coverage are unregistered. Clothing/Pixel Corruption facets are omitted pending review. No new trait value or frequency is introduced.
- Multi Eye has five visible eyes and remains a curated study. Its reserved/ordinary-disabled logical status is preserved; this export does not authorize repeated allocation or grail classification.

Every metadata receipt binds the image SHA256, metadata digest, specification digest, reviewed claims and unresolved fields. `.invalid` image URLs are explicit unpublished placeholders. There are no token IDs, rarity scores, artificial tiers or publication actions. Complete metadata requires owner decisions on these gaps, followed by existing generator compatibility validation.

## Validation and measured results

The initial complete run validated 19/19 source decodes/exports, schema-valid metadata and exact native dimensions. All three independent reconstruction pairs matched historical PNG bytes and recorded zero outside-mask changes. Source protections remain 4 MiB encoded, 1254 maximum dimension and 1,572,516 decoded pixels per PNG. No dependency, lockfile, codec or decoder-budget change is needed.

The first complete run exported 46,682,348 bytes of native PNGs. It took 16.61 seconds including inventory hashing, RAM preflights, previews, comparisons and review sheets. Observed RSS at checkpoints was 195.86 MiB; process-lifetime peak RSS was 262.69 MiB. RAM preflights stayed above 4294.54 MiB. These are one-machine pilot measurements, not 5280-image throughput or ImageGen capacity estimates. Exact final-run measurements are in the private `PILOT_RESULTS.json`.

Exact encoded and decoded duplicate counts are zero. Pairwise normalized RGB differences are measured at native, 64px and 128px sizes. A 0.04 thumbnail difference is only a review trigger: common backgrounds and face layout can make distinct anatomy look numerically close. The first run flagged 16 of 171 pairs. In particular, canonical/tag are intentionally close; front/smirk and front/irritated require a collector-focused review. Multi Eye and High Roller also share the front layout while introducing readable anatomy/accessories. No metric certifies 5280-image visual diversity.

Negative tests cover promotion, source/manifest changes, unsafe paths, budget expansion, unknown or absent facets, duplicate identities, metadata incompatibilities, conditional/rejected evidence and malformed PNGs. Existing Stage 16/17 mask, alpha, hash, compatibility and decoder tests remain unchanged.

## Reproduce locally

Use locked existing dependencies, a fresh available-RAM measurement of at least 2048 MiB, and conservative one-worker Sharp settings. The tool prints a RAM measurement before the inventory, each candidate and similarity/review work. It does not terminate processes or change system settings.

```powershell
node --experimental-strip-types packages/art-generator/tooling/stage20-production-pilot.ts C:/LAMMB-Studio C:/LAMMB-Studio/reports/TASK_020_STAGE20_PILOT_001/NEW_RUN packages/art-generator/fixtures/stage20-production-pilot.json packages/art-generator/specs/lammb-traits-v1.json packages/art-generator/fixtures/stage17-asset-registry.json
```

Create the report parent first. The run directory must not exist; exclusive writes preserve previous attempts. Original source bytes remain untouched. The tool performs no network fetching or inference. Policy and security tests use synthetic small pixels; real-art evidence stays in the private review package.

## Remaining production work and smallest next stage

Owner-review these 19 studies and resolve the near-duplicate/expression decisions before expanding artwork. The next narrow task should bind accepted full-frame sources to complete truthful trait vectors and review their visible-facet contracts. Resolve tongue/irritation, Neon clothing/corruption and Magma wool/horn interpretation without changing approved IDs or frequencies implicitly.

Then register a small set of distinct pose/expression/anatomy families, retaining the demonstrated contact boundaries. Measure a second controlled renderer/export pilot with complete vectors and owner-accepted art. Require source resolver coverage, final URI/reveal validation, duplicate/art QA, measured review effort and bounded storage before any manufacturing authorization.

The Stage 15 budget still has 79 missing source templates and 284 family bindings; those are requirement records, not a count of ImageGen calls. Existing 23 approved principal directions and three validated contact recipes cannot support an honest claim of 5280 finished distinct NFTs. Additional authored art remains necessary, but included ImageGen allowance, retries, review throughput and final source coverage are unknown. No generation schedule or unlimited access is promised.
