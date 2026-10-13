# Stage 35 — Source-bound metadata completion

PR30 was rebase merged after exact-head classify/verify success, unchanged
six-file scope, no blocking reviews and preserved Netlify skip markers.
Reviewed head: 1d9ae05747a41527360e2731a770e6e3f4a151de.
Resulting main: 2545d730ddba57752990b30a84aa857e76324e3c.
The merged tree equals the reviewed tree:
4aaad382f9709c4de8cd36b572072b4d8425dd0d.
Browser acceptance was **skipped, not executed** on PR30.

## Owner-approved source scopes

The [new approval history](STAGE35_OWNER_APPROVAL_HISTORY.json) preserves the
previous two events verbatim and appends the Task035 directive with a previous
event digest. The original history, Stage31C catalog, Stage34 pending proposals
and 121-item backlog remain unchanged. These are operator records of the owner
directive, not cryptographic owner authentication.

The [development catalog](../../packages/art-generator/fixtures/stage35-approved-authored-catalog.json)
adds these exact source restrictions:

- Olive Green: Amused, Utility Vest, Magma Hoodie and After-hours Observer.
- Charcoal Studio Gradient: Amused, Utility Vest and Magma Hoodie.
- Scorched Hoodie: Magma Hoodie only.

Olive Green and Charcoal Studio Gradient retain their existing IDs, labels,
appearance definitions and prior four-source approvals. Neither is interpreted
as CCFF00 Glow/Radioactive Green. The former
proposed-lammb-clothing-scorched-hoodie proposal becomes the stable approved
development ID lammb-source-clothing-scorched-hoodie, bound to one image.
All source definitions have null weights/counts, no interchangeable layer,
generator activation or production registration.

## Four complete authored recipes

| Character            | Wool         | Expression   | Clothing        | Background               | Mutation                 |
| -------------------- | ------------ | ------------ | --------------- | ------------------------ | ------------------------ |
| Amused               | Ivory Curls  | Amused       | Black Hoodie    | Charcoal Studio Gradient | Absent; Organic material |
| Utility Vest         | Ivory Curls  | Heavy Lidded | Utility Vest    | Charcoal Studio Gradient | Absent; Organic material |
| Magma Hoodie         | Singed Curls | Heavy Lidded | Scorched Hoodie | Charcoal Studio Gradient | Magma; Basalt and Wool   |
| After-hours Observer | Ivory Curls  | Heavy Lidded | Lab Coat        | Containment Lab          | Absent; Organic material |

All four have visible Olive Green eyes and sheep anatomy. None has an ear tag or
independent accessory; empty accessory attributes remain omitted. Pixel
Corruption is NONE. Magma fissures are heat/material effects, not digital
corruption. Pose stays a source restriction, not an invented public trait.

Independent native inspection of After-hours Observer confirms industrial
containment architecture and chartreuse laboratory lighting. Its environment
uses the existing Containment Lab ID, never the studio-gradient extension.
Its integrated environmental lighting and structured dark coat cannot be
extracted into arbitrary interchangeable backgrounds or garments.

Magma Hoodie is one owner-approved integrated mutation frame. Existing ordinary
Magma eye/clothing rules and their frequencies remain intact. This source-bound
recipe creates no ordinary Black Hoodie compatibility exception. Singed Curls
uses the existing wool definition. The separate exposed Magma native master
remains retained at SHA256
d8b85e65943c819c2fcbb3a56a2ff4539cf5ed350c203101799544bf0389f4d5.

## Native and delivery integrity

| Character            | Native SHA256                                                    | 3072px delivery SHA256                                           |
| -------------------- | ---------------------------------------------------------------- | ---------------------------------------------------------------- |
| Amused               | 082a2de341b74e93ebe94be380acb8b6ec8aad660d64aefe64ed80d83ea6b631 | 682ac185fe6516e1b7d1629083ea66dd97a80b7b4efdc61cda97fdbd226765f5 |
| Utility Vest         | 9a858dda8c1c7293a6a0acb517c60b7e8aafb5d091bc15ae867f76350d81b52d | 6f7df2855f15d0295cfb527d287130a9f75bc0949e58de90eedb0dfde53f5937 |
| Magma Hoodie         | 7afa4e0ba9e3ed52fbe443ace411fa9a2d25625c749bf1f716ab5034d8531492 | 669e984dfd71d13b81a19d9b79e02afd092c71a252dc50b77268b2e064e12981 |
| After-hours Observer | f9fbf9d8087cefa28c0a31bd6f72bd35ce29911f40fdb488b7184d3bb5b532fa | 2a09dbd70e3a69baf999c3b97ceab62ee403a32c4d8a8367f46bb6954500fd34 |

Each 1254×1254 native PNG remains byte-identical and independently decoded pixels
match. Four fresh single-process NoHalo CPU replays reproduced the preserved
3072×3072 delivery bytes exactly. Total replay time was 15.59 seconds; maximum
measured process RSS was 213.68 MiB. GPU allocation by this method is zero.
No new native detail, off-frame anatomy, source padding or ImageGen is introduced.
Codec pins and transformation parameters remain those of Stage34.

The previous four proofs retain their native/delivery hashes and complete
metadata. There are now **eight complete development recipes**, eight delivery
images and **zero production-registered assets**. The complete-recipe shortfall
to 5280 is 5272; this does not assert visual uniqueness or collection capacity.

## Metadata and security validation

[Complete recipe snapshots](STAGE35_COMPLETE_RECIPES.json) include nine internal
verified/absent facets, digest-bound metadata and an explicit separate owner
production-registration gate. Amused, Utility Vest and Observer export eight
public attributes. Magma exports nine because both Mutation and Material are
visible. A fixed eight-attribute count would omit truthful information.

The adapter validates exact source, renderer receipt, source-specific trait
scope, art approval, backlog/spec digests and approval chain before producing
metadata. Incorrect source/decoded/output hashes, false backgrounds, invented
traits, cross-source garment reuse, altered provenance, duplicate outputs,
weights, token assignments and promotion are rejected. Historical Stage34
pending metadata remains historical; callers cannot mutate it into approval.

JSON includes name, description, image, external_url and string attributes.
[OpenSea's media and traits reference](https://docs.opensea.io/docs/media-and-traits)
supports this structure. Image URLs remain unpublished artwork.invalid
placeholders containing the exact delivery SHA256. URI reachability, token
mapping, publication and mint activation are not claimed. The reviewed PNG
derivatives meet the documented 3000px media guidance; their dimensions do not
establish improved native detail.

[Validation evidence](STAGE35_VALIDATION_REPORT.json) records current provenance
checks, four fresh replays and eight artifact bindings. Square/circular
64/128/256 review sheets retain the same image pixels as Stage34. All four
identities remain readable; Observer has a smaller face with an authored
environment. Intentional portrait crops and inherited tight margins remain
visual diagnostics. One earlier thumbnail near-pair remains flagged; no new
artwork or similarity-driven rejection occurred.

## Deployment and review boundary

The PR title and every newest nonempty applicable commit retain [skip netlify].
[Netlify documents this Git-trigger skip procedure](https://docs.netlify.com/deploy/manage-deploys/manage-deploys-overview/#skip-a-deploy).
GitHub CI remains enabled. No Netlify settings, deployments, retries, API/CLI
deploys, billing, domains or secrets were changed. This is a guarded operational
procedure, not a site-wide disabled-build guarantee.

No website, Chamber, Task017, Trait Bible frequency, grail reservation, existing
artwork or weighted-generator changes are included. Stage35 remains a draft
engineering PR for owner review. Native resampling and complete development
metadata do not grant production registration or final derivative art approval.
