# Stage 31B — source-bound metadata extension proposal

Four existing native recipes can have complete **proposed development metadata**
using two narrowly scoped appearance definitions: **Olive Green** eyes and
**Charcoal Studio Gradient** background. Neither definition is owner approved,
weighted, enabled in the 5280 constructor or production registered.

The original Stage 30 and Stage 31 receipts remain unchanged and unresolved
under their original catalog. This separate versioned proposal does not rewrite
metadata history, broaden an existing definition or manufacture new images.

## Official OpenSea guidance and internal policy

Reviewed on 2026-10-12 using the current official documentation.

OpenSea reads token JSON through ERC-721 `tokenURI` or ERC-1155 `uri`. The token
document is distinct from collection-level `contractURI` metadata. This task
implements no contract or token assignment. [Metadata standards](https://docs.opensea.io/docs/metadata-standards)

OpenSea documents `name`, `description`, `image`, `external_url` and an
`attributes` array. String traits use `trait_type` and string `value`; numeric,
date and boost representations are separate options. Here, `5280` is a textual
ear-tag label. The optional hexadecimal `background_color` display field is
different from our descriptive Background attribute. Current media guidance
recommends images at least 3000×3000. Our four actual native PNGs remain
1254×1254; this task makes no resolution change or marketplace-ingestion claim.
[Media and traits](https://docs.opensea.io/docs/media-and-traits)

The metadata-storage guide supports hosted HTTPS, IPFS, Arweave, onchain JSON
data URIs and ERC-4804 `web3://` resolution. Our fixtures retain hash-bound
`https://artwork.invalid/lammb/<SHA256>.png` placeholders. They are unpublished
and do not resolve to live artwork. Publication would require actual served
metadata/media and a separately reviewed URI/contract path.
[Metadata storage](https://docs.opensea.io/docs/metadata-storage)

LAMMB's existing validator intentionally accepts a narrower subset: HTTPS/IPFS
media URIs without credentials, fragments or whitespace; fixed `external_url`
`https://lammb.fun`; bounded names/descriptions; known textual facet labels;
unique attribute labels; no invented rarity tiers, ranks or grail claims. These
are internal rules, not a claim that OpenSea mandates our 66-value taxonomy,
nine internal categories, color definitions, URI subset or byte-size caps.
No schema loosening is needed for the new descriptive string proposals.

## Reviewed existing definitions

All eight Eye and six Environment definitions were reviewed against the actual
native artwork and source-bound evidence crops, not filenames or prompts.

| Existing family                                   | Why it does not confidently describe these sources                                                                                      |
| ------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| Radioactive Green                                 | Requires CCFF00 irises and restrained glow; shaded olive/yellow-green irises and catchlights do not establish exact albedo or emission. |
| Amber / Oxide Red / Ice Blue / Violet / Onyx      | Different named color appearances.                                                                                                      |
| Split Signal / Observer Array                     | One paired color split or extra sockets; these sources have two coherent similar-colored primary eyes.                                  |
| Chartreuse / Near Black / Graphite                | Flat exact-color fields; the authored background has gradient, warm shading and vignette.                                               |
| Containment Lab / Midnight Signal / Event Horizon | Their industrial shapes, signal glow or dimensional phenomenon are not present.                                                         |

Manual native inspection supports the proposed appearance labels. Small hashed
RGB crops are diagnostic witnesses, not complete segmentations, image
recognition, a material-albedo measurement or an automatic trait classifier.
The original definitions, IDs, approval statuses, frequencies, constraints and
six grail reservations are unchanged.

## Proposed source-only definitions

`packages/art-generator/fixtures/stage31b-source-trait-extension.json` and
`tooling/source-trait-extension.ts` define a separate proposal contract.

| Proposal ID                                            | Public value                         | Visible definition                                                                                                                                       |
| ------------------------------------------------------ | ------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `proposed-lammb-eyes-olive-green`                      | Eyes: Olive Green                    | Two coherent sheep eyes with shaded olive-green irises, yellow-green crescent detail, dark pupils and studio catchlights. No exact CCFF00 or glow claim. |
| `proposed-lammb-environments-charcoal-studio-gradient` | Background: Charcoal Studio Gradient | Integrated warm charcoal/taupe shading, gradient and vignette; no registered removable background layer.                                                 |

Both have `OWNER_DEFINITION_APPROVAL_PENDING`, `selectionWeight=null`,
`proposedTotalCount=null`, `generatorEnabled=false` and scope
`EXACT_LISTED_SOURCE_FRAMES_ONLY`. The constructor does not import these
definitions. Owner acceptance of the names/bindings, future catalog integration,
counts/weights and production registration are separate decisions.

## Four source-bound vectors

Shared verified attributes: Species **Sheep**, Expression **Heavy Lidded**,
Clothing **Black Hoodie**, Ear Tag **5280**, Pixel Corruption **NONE**.
Shared proposed attributes: Eyes **Olive Green**, Background **Charcoal Studio
Gradient**. Mutation and derived mutation Material are genuinely absent and
omitted. Pose remains internal registration information; there is no new public
Pose identifier. Pixel NONE follows the existing explicit clean-state semantics.

| Recipe       | Wool         | Internal pose          | Native source SHA256                                               | Exact finished PNG SHA256                                          |
| ------------ | ------------ | ---------------------- | ------------------------------------------------------------------ | ------------------------------------------------------------------ |
| Canonical    | Ivory Curls  | ORIGINAL_THREE_QUARTER | `34a8b9369ce4ccbf6c5f07bff54e176660798ec668a45f97b6a8f793961a592a` | `89ba9dba1070fe9cc8fab0be82b947ba8cc37f17d14b25dcf9260ee5cbde173b` |
| Broad Ash    | Ash Curls    | ORIGINAL_THREE_QUARTER | `b2736f8678ec0c0eb3b83ff4192720c9116a79129e5b5b0713a6e7698c9ad493` | `be31a4ee0745486208859ecdefcbec819f555ceb73579367e4bcc6e2d6367227` |
| Rolled Locks | Rolled Locks | ORIGINAL_THREE_QUARTER | `6b94719ef6c30bfaf730733ead2bfcea45821017aa122ba521587d36dbac8df7` | `b24074f881d853e5be351f53ec8d22d39208cdd99e0b52a5940bc49b13c3b040` |
| Front        | Ivory Curls  | FRONT                  | `23213a0781d596408ec29143f22ecfd4d7ddc29aa9a3dca38a7de44709bb5449` | `ad0d8fc9b5a5d7cdf98ad9a8bf5ad1f75704f1bf3971a82bb35de0874dc96d0e` |

`STAGE31B_METADATA_PROPOSALS.json` stores all four computed nine-slot vectors,
eight-attribute OpenSea examples, source/contact/mask hashes and evidence
bindings. Two slots have `PROPOSED_SOURCE_BINDING`; seven retain prior verified
present/absent evidence. They are not approved generator trait vectors.

| Gate                                                  | Count |
| ----------------------------------------------------- | ----: |
| Technically reproducible native recipes               |     4 |
| Complete proposed source metadata                     |     4 |
| Complete recipes under the unchanged existing catalog |     0 |
| Production-registration candidates                    |     0 |
| Production registered                                 |     0 |
| New generator-enabled definitions                     |     0 |

There are no remaining uncertain visible facets in these appearance proposals.
The two definition approvals are pending. Existing-catalog correspondence
remains unresolved. Technical output shortfall is 5276; production-registered
shortfall is 5280. Neither count forecasts collection-scale visual uniqueness.

## Validation and limitations

The proposal digest is
`21dd4985b4d449acf80954b843376e989e1e0d7c89b9ffe3e0852153b03baedc`.
It binds the unchanged spec, original evidence cohort and exact four sources and
outputs. Reconciliation reuses the existing source-specific approval,
compatibility, request, review, decoded-source and region-hash checks. No other
source, contact transfer, background swap or arbitrary trait combination is
authorized. Imported result validation recomputes the complete proposed record.

Negative tests cover changed hashes/history/definitions, duplicate sources or
outputs, incorrect metadata, unsupported URI forms, missing provenance/art
approval, activation, weights, counts and false production promotion. Existing
malformed PNG, bounded decoding, mask, contact and compatibility tests remain.

Independent private acceptance reloads and renders each native proof twice,
compares historical encoded bytes and independently decoded pixels, and verifies
zero outside-mask changes. All 169 historical bindings across 92 unique paths
verify; the 121-entry backlog is byte-identical. Native acceptance used
Sharp 0.35.5/libvips 8.18.7, CPU concurrency 1, 200.375 MiB peak RSS and 3.846 s.
RAM was 5703.45703125 MiB before this workload (2048 MiB gate). These local
receipts are not cryptographic owner authentication or a public upload API.

Original pixels, native dimensions, framing limitations and thumbnail behavior
are preserved. Four unique encoded and decoded hashes do not certify aesthetic
uniqueness for 5280 artworks. Automated validation cannot approve artistic
quality. CI and final owner-only Drive readback are recorded on the exact PR
head in the isolated private report; no PNG or personal Drive permission data
is committed.

Owner review artifacts: `C:/LAMMB-Studio/reports/TASK_031B_SOURCE_TRAIT_EXTENSION_001`.
No new artwork, ImageGen call, production promotion, metadata publication, mint,
manual deployment, website/Chamber/Task017 work or paid service occurs.
