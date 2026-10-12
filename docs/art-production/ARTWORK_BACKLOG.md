# Permanent artwork-development backlog

`ARTWORK_BACKLOG_v1.json` is the durable, versioned review record. Version 0.3.0 preserves all 109 Stage 22 items and appends three Stage 23 studies, for 112 items. Items cover historical artwork decisions, existing trait-source requirements, failed repair evidence, legacy references, production gaps and bounded art studies. It is a development backlog, not a production asset registry or an NFT allocation list.

`ARTWORK_BACKLOG_v0.2.0.json` preserves the exact Stage 22 snapshot. Its canonical SHA256 remains `029ddfb529330a7d459fa8cc1d9e9d174b2963c8157c16e687775ab74c592744`. The Stage 22 authored registry must resolve against that snapshot, not the evolving current backlog. Its source and owner-evidence bindings have not been rewritten. The original `mainSha` is the historical capture baseline; each new generation records its own provenance separately.

Each item has a stable ID, exact source declarations where files exist, artistic approval state, separate production registration state, technical status, limitations, required improvements, next action and decision history. Empty sources denote a requirement or unresolved source mapping; they do not invent missing PNGs. Reference paths are relative to the private `C:/LAMMB-Studio` root. Native artwork stays outside Git; the owner review package preserves generated masters and provenance.

The Stage 15 inventory supplies inherited owner-directive art-direction decisions. Its historical wording is preserved, including conditional crossed forelimbs and Void and rejected generic/skeletal masters. Stage 20 classifications are proposed technical/art reviews, not new owner approvals. Historical event dates are null where the source does not establish an exact date. No filename, including FINAL, promotes approval.

The original Identity Vault still has a historical null canonical field. Later explicit owner approval of the reference-conditioned identity is recorded in the recovered Stage 15 decision evidence. The old vault file remains unchanged. The Magma clothing and Void mutation-label corrections annotate actual evidence without rewriting the original reports.

## Maintenance contract

1. Preserve item IDs and existing history. Add a new dated decision only when the owner or a verified technical review actually supplies it; distinguish authorization to generate from acceptance of artwork.
2. Bind every present source to its exact SHA256 and native dimensions. Preserve original bytes and register derivatives separately. A resized preview is never a replacement native source.
3. Record new tool outputs as owner-review pending. Record technical rejection without pretending it revokes an unrelated historical art-direction approval.
4. Production promotion requires a separate explicit owner gate, exact approved source hashes, registered family/contact geometry and truthful metadata. This backlog version allows no production promotions; evolve its contract through review when that work is authorized.
5. Keep Trait Bible IDs, frequencies, compatibility rules, collection supply and grail reservations unchanged unless the owner separately approves those changes. Working universe names are not metadata values.
6. Keep failed sources quarantined. A future study gets its own ID, provenance and review; do not edit a rejected item into apparent success.
7. Validate the backlog before committing changes. Review declared hashes against private sources when available, and preserve the validation receipt outside the repository.

Stage 21's source recovery reverified 848 historical artwork paths, 345 Stage 15 evidence records, 19 Stage 16 manifest entries, 142 Stage 20 artifacts and the merged Stage 17 source/evidence declarations. The historical front ear-tag proof and its independent reconstruction match exact bytes. Newly inspected records are baselined explicitly rather than presented as prior hash matches. Source-only/decoder validation and artistic approval remain distinct.

The current backlog digest reader checks 129 source/evidence bindings across 71 unique private paths. The preserved Stage 22 snapshot still checks 117 bindings across 65 paths. JSON decision records are evidence for a trusted operator, not cryptographic owner authentication. The backlog validator does not decode these sources or promote them. Stage 21 and Stage 23 native PNGs have separate bounded CRC/decompression and full raster decode receipts; the Stage 22 authored adapter decodes the two art-approved outputs again within unchanged proof limits.

```powershell
node --experimental-strip-types packages/art-generator/tooling/artwork-backlog.ts docs/art-production/ARTWORK_BACKLOG_v1.json packages/art-generator/specs/lammb-traits-v1.json C:/LAMMB-Studio
```

Omit the final argument for portable declaration/specification validation without private source I/O. Require the workstation RAM gate before substantial local validation.

Stage 21 generated exactly three studies. Stage 22 records explicit owner art-direction approval of Magma Hoodie and Refined Pixel Drip, and explicit rejection/quarantine of Skeletal Correction for human-like skull/dentition. The original generation authorization and technical review events remain intact. Approved normal identity inputs retain their positive reference roles; the rejected skeletal output remains negative QA evidence. All three remain unapproved for production. The exposed volcanic design and old rejected skeletons remain preserved.

The creative family specification is `UNIVERSE_ART_DIRECTION_v1.md`. Its Burnouts, Boneheads, Glitched, Rewired and other family names/lore are provisional creative directions. `STAGE22_PRODUCTION_MODEL.md` defines the authored-frame compatibility and metadata boundaries; `SHEEP_SKELETAL_ANATOMY_v1.md` establishes the reference-backed correction guide. The next owner gates concern Pixel Drip coverage and the Magma Hoodie logical incompatibility. No new generation, automatic retries, collection generation, production promotion or minting follow this backlog.

## Stage 23 bounded append

`STAGE23_CHARACTER_EVOLUTION.md` records the three authorized studies. Ovine Skeletal is `NEEDS_REFINEMENT`; Pixel Drip Evolution and Utility Vest are proposed `PRODUCTION_CANDIDATE` studies. All three remain `UNREVIEWED` by the owner and `NOT_PRODUCTION_REGISTERED`. These QA classes are development judgments, not rarity tiers, NFT assignments or acceptance of anatomy.

`validateArtworkStudyAppend` allows one to three new studies in this version transition, requires a byte-equivalent prior record/evidence prefix, approved historical raster-input bindings, new output hashes and dated technical reviews bound to new generation evidence. A technically rejected output must be negative QA only. Private source verification must still check the declared evidence and PNG hashes. This bounded append is separate from the existing dated owner-decision update contract; it does not authenticate an owner, certify aesthetic quality or permit production promotion.
