# Cinematic website artwork — Task 005D

## Authorization and limits

OWNER_TASK_005D_ASSET_PRODUCTION_AND_WEBSITE_PREVIEW authorizes these newly generated website previews. Every asset remains pending owner visual review; productionNFTArtworkApproved is false. No final characters, traits, rarity, token ownership or live inventory are represented. The source concept sheet is a style/shape reference only and is not served as a page background.

## Input audit and asset specification

The existing web specimens are 99–114×147 JPEG-derived crops. Studio contains 13 preserved concept sheets and extracted reference panels, not standalone high-resolution sealed art. They were audited read-only. The latest promised homepage reference was not supplied; fidelity to it remains unverified. The written Task 005D requirements and prior owner-supplied direction are the available specification.

The front, side and rear require at least 1024×1536 native PNG masters with transparent margins; supplied masters meet this. Matching means a consistent material/design family, not exact 3D rotation. The background requires a detailed landscape scenic plate; supplied native size is 1681×936. The graffiti wordmark requires readable LAMMB lettering and real alpha; supplied native size is 1942×809. Four distinct destination scenes require at least 1536×1024 masters. No missing view is fabricated by flipping an existing file or by enlarging the old crops.

## Published files and integrity

Public outputs are optimized WebP. Native PNG sources remain byte-identical in ignored `artifacts/generated/task-005d/source`, with original generation IDs retained in the public provenance manifest. Existing Sharp 0.35.5 performs downsampling only (never enlarging), WebP quality 88, alpha quality 100, effort 5. This adds no dependency. Next Image supplies responsive variants at runtime.

Public dimensions, bytes and SHA-256 are listed below; native dimensions and hashes follow. These integrity digests identify exact files, not fairness or production approval.

| Asset      | Web dimensions | Alpha | Bytes  | Web SHA-256                                                        |
| ---------- | -------------- | ----- | ------ | ------------------------------------------------------------------ |
| front      | 1024×1536      | True  | 392190 | `ee0c364cd8740ce879fd0fa939c6fa2ee0616b42ce0afc18935b259e62cdcfbf` |
| side       | 1024×1536      | True  | 268908 | `8c18df539c1c7b6f939cd4221235fb057f07c5d5618725eadf76aa313b05fdf2` |
| rear       | 1024×1536      | True  | 402924 | `d5fecc6b92af4251ef814f0022347bd0f19dabbaee48b094a8154fbeb8c8f248` |
| skyline    | 1681×936       | False | 232882 | `dd13d2fc17b1773c2448c9d929920194ff44ffa205ec3d89ccc9abc78becbe6d` |
| wordmark   | 1536×640       | True  | 209354 | `3682a311226d6a71142258daefc717de0d8dd5d421ec4e2cba9df18adf9f997d` |
| collection | 768×512        | False | 95128  | `d1be73466c9c72817931648f7c8fee5d6677d972f09ecc623d0d0a111b24d8ac` |
| universe   | 768×512        | False | 82590  | `40011dc41633b82c4db16681bcfc6dfddacb402c0af0ca47d66b6812bb2cc4ed` |
| ascent     | 768×512        | False | 79880  | `97a3ecff28282e631e943cfdeed314c067809b537ff45d73961d5cf5588241da` |
| community  | 768×512        | False | 109472 | `5d76144582696afa2b3654e6893fc80661c4f863d71d6378840d1d71f2576313` |

| Master                | Native dimensions | Bytes   | Native SHA-256                                                     |
| --------------------- | ----------------- | ------- | ------------------------------------------------------------------ |
| front-master.png      | 1024×1536         | 2691048 | `f3906c265ff26036a64832bb2a3a395f3cd0c02f84dc388ff235a29ad8dd4bd2` |
| side-master.png       | 1024×1536         | 2211604 | `ec59c94f49f7fb8b601537a72f8f7a9b310b34b13206c123886d3424d3186bef` |
| rear-master.png       | 1024×1536         | 2852560 | `950ff4c2d0625341e06bf56461f8388d29825569692f057db51da353aa3fa2c2` |
| skyline-master.png    | 1681×936          | 2355090 | `ce0377950049cc894f0943b4da835160d93bd83404eebc40f6f573e338859d17` |
| wordmark-master.png   | 1942×809          | 861350  | `25c473c1fc3a7904333f0e5f3a5f7db0fc494c1fb3f1b05445a9b32c6a8269f7` |
| collection-master.png | 1536×1024         | 2388833 | `265d0049580a480c7fb2a7a7511032f47cc4e551e746571bc9bd161415d55b77` |
| universe-master.png   | 1536×1024         | 2418079 | `7f5c11c22468a948a6d9bb669ae1a8e0aa9eb754c1132696b12b8841c36076cb` |
| ascent-master.png     | 1536×1024         | 2554136 | `74af80c56117fa158ed4b337d0a59d43168b812fad4dc8248a0505e97a12a098` |
| community-master.png  | 1536×1024         | 2734680 | `81b688bbcdf86d6935fcfa40b74fb4946e1c54631e13cdec867e526b3225259b` |

## Image-generation prompt specifications

Built-in `image_gen.imagegen` was used once per asset. No local ComfyUI/GPU inference, model downloads, custom nodes or software installation. All requests excluded crowns, Colorado text/signage, exposed post-reveal characters, UI, watermarks and invented launch claims. Specimen/wordmark requests used transparent_background=true; scenery used false. The following are concise prompt specifications, not a claim that inference can be deterministically rerun.

| Asset      | Generation ID                                 | Prompt specification                                                                                                                                                                                                                                      |
| ---------- | --------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| front      | exec-8bd30dbb-0371-4f01-b06e-3f78da0c2a39.png | Native standalone black industrial sealed specimen, front/three-quarter, chartreuse dripping smile, graphite materials and cool/warm cinematic rim lighting; real alpha; small 5280 stencil. Existing front crop is shape guidance, not an upscale input. |
| side       | exec-d8d48fc4-12f6-48b4-832e-9e815306c36b.png | Matching side illustration using the new front master as reference; reinforced dark frame, chartreuse LAMMB lettering and 5280 stencil; real alpha; independently illustrated geometry.                                                                   |
| rear       | exec-f9146cde-8ae5-42a7-b1f8-78c31fbf2d01.png | Matching rear illustration using the front master; closed armor, SAME SHEEP / DIFFERENT / MINDSET lettering and 5280 stencil; real alpha; independently illustrated geometry.                                                                             |
| skyline    | exec-55f409aa-dd75-490e-b327-e7ecbb4fc0b7.png | Separate detailed night mountain/city plate; moon upper right, amber city lights, dark left copy area and stone overlook; no words, specimen, people or characters.                                                                                       |
| wordmark   | exec-bf1dee1a-18b4-4bae-8d79-c8a1fcf4d9a7.png | Exact LAMMB lettering, radioactive chartreuse ragged graffiti brushwork, controlled paint drips and fine spatter, wide horizontal composition; real alpha, no other text or symbol.                                                                       |
| collection | exec-8eae8f27-6b4a-40dd-8b58-2d539942c2c7.png | Landscape vault scene guided by the front master: sealed industrial containers, dripping smile emblems, cool rim lights and reflected chartreuse; illustrative scenery, no actual inventory count.                                                        |
| universe   | exec-3caf0652-33df-4279-9fb5-5e18084b1d82.png | Empty black industrial lab passage and closed door, chartreuse light shafts, restrained violet accents and atmospheric depth; no character silhouette or readable text.                                                                                   |
| ascent     | exec-dcee76c9-2e7a-4b6c-8908-36079677c830.png | Moonlit mountain ridge and thin chartreuse path to a summit; scenic anticipation, no UI progress meter, numbers or live altitude claim.                                                                                                                   |
| community  | exec-95c6839c-ce17-49a6-b772-21c33bfdb4a6.png | Empty rooftop gathering place, city/mountains, one chartreuse dripping smile on worn masonry; no people, characters, words or social/registration controls.                                                                                               |

## Preservation and review

`apps/web/public/art/cinematic-preview/provenance.json` is the versioned source/output inventory used by rendering and integrity tests. Masters and the offline encoding preparation script are retained under ignored Task 005D artifacts. The source LAMMB-REF-003 SHA-256 is `5f7becf4b2effc8c59be38da8d0ab52cfd957d6765a3eb85abdb1933b7a80bd2`; its original Studio bytes and historical Task 005C preservation copy remain unchanged. Side, rear and Collection use the new front master as a design reference; all are independent illustrations rather than geometrically exact views.

Browser evidence and final review report stay in `artifacts/generated/task-005d/final`. Screenshots cannot approve artwork. Remaining visual differences are recorded in the review report; latest-reference comparison, physical iPhone/Safari testing and production art approval remain owner-review work. No deployment is authorized.
