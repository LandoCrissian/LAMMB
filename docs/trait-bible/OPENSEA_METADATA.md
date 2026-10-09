# Token metadata and delayed reveal specification

The proposed public encoding uses `name`, `description`, `image`, `external_url`
and an `attributes` array of string `trait_type` / `value` pairs. This follows
[OpenSea metadata standards](https://docs.opensea.io/docs/metadata-standards) and
[media and traits](https://docs.opensea.io/docs/media-and-traits), checked during
Task 015. OpenSea obtains JSON from the contract's token metadata URI; this task
creates no contract or public URI. Its current media guidance recommends images
at least 3000 pixels square; the proposed master is 3072px. That recommendation
is not a hard parser requirement or proof that ImageGen returns 3072px natively.

`packages/art-generator/src/opensea-metadata.ts` implements a strict reviewed
subset of that vocabulary. The accompanying JSON Schema is portable. All Task 015
exports are **development previews**, wrapped with `published: false`, and use
`https://example.invalid/` media references. They test encoding without pretending
an image exists. No production metadata is written or assigned to a token.

## Naming and visible traits

Stable machine IDs are lowercase ASCII and versioned in the specification. Public
display values are canonical strings, including uppercase corruption system names.
IDs, weights, target counts, seeds, compatibility rules, indices, fingerprints,
review declarations and private provenance never appear in token attributes.
Display-name edits require a reviewed specification version and new digests.

Species, Wool, Eyes, Expression, Clothing, Material, Pixel Corruption and Background
describe the visible design. Structural Mutation is emitted only when present.
The single accessory configuration is expanded into visible Headwear, Eyewear,
Ear Tag, Jewelry, Dental Accent or Equipment attributes. A cap-and-shades
configuration yields two actual facets; it is not a fictional bundle property.
Absent accessory facets are omitted, never null/empty strings. Pixel Corruption
NONE and No Clothing are explicit meaningful visible states. No Mutation attribute
is emitted for normal anatomy. Material derives from the selected structural
family; a visible curated phenomenon may override that facet only for its exact
reserved composition.

Do not add a rarity tier, Grail badge, rank, numeric score or unobserved trait to
public metadata. Six grail designs are owner-review candidates; their internal
reservation IDs are not published. The visible phenomenon is an artistic attribute,
subject to final image QA. Logical consistency does not establish that a future
render actually contains the specified visual feature.

Final token names must use the **owner-approved contract identifier convention**
and an independently verified assignment map. This is still unresolved. The
adapter deliberately accepts only `SIM-0000` style simulation names; zero-based
construction indices cannot be silently converted into token IDs. `external_url`
uses the existing domain root, without inventing collector/token pages.

## Sealed metadata

Before reveal, every sealed record has the same approved sealed media and generic
description, with an empty attributes array. It must not disclose future mutations,
facets, weights, internal indices, fingerprints, filenames or reserved slots.
The sealed-media URI is not selected or published by this task.

Before reveal publication, approve final images, metadata bytes, storage/content
addressing, token identifiers, assignment protocol and media integrity. Commit
the exact approved artifacts using the future approved commitment policy; protect
unrevealed bundles and review logs. Publish only after owner authorization and
validate every assigned token's media and JSON. Refresh mechanisms and contract
events must follow the chosen standard and marketplace integration at that time.
No shuffle, fairness, signature, freeze, licensing or chain-support claim is
established by parsing these previews. Existing construction integrity and future
assignment fairness remain separate boundaries.

## Final export acceptance

Validate 5280 records against the strict metadata schema and approved trait/value
set, with unique assigned token IDs and immutable media references. Match each
attribute to decoded owner-approved imagery. Check actual image status/MIME/hash,
resolution, content addressing, absent-trait behavior and no secret leakage.
Recompute raw image and canonical metadata digests, and bind them to render/source
provenance. Verify the reveal map independently before public publication.

Task 015 schema tests cover malformed/relative/credentialed image references,
unknown metadata fields, duplicate attributes, invented ranking fields, missing
categories, incompatible traits and mismatched curated compositions. These checks
do not fetch external media or perform a marketplace listing.
