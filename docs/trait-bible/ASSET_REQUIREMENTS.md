# Production source asset inventory

79 logical source templates are MISSING. No SHA256 or approval declaration is fabricated. All proposed sources use `lammb-bust-three-quarter-v1`, 3072×3072, sRGB, full-frame source-over placement without implicit scaling. Backgrounds/curated scenes are opaque; character/effect sources require actual alpha. Layer order: background 0, anatomy 10, clothing 20, wool 30, expression 40, eyes 50, accessory configuration 60, structural effects 70, pixel effects 80. Replacement anatomy reuses its exclusive slot.

ImageGen must not be assumed to return aligned layers or requested native resolution. Preserve native masters, record actual dimensions and generation evidence, align/mask deliberately, decode/QA and obtain digest-bound approval before ingestion. Clear layers and exact backgrounds/tag typography use reviewed deterministic tools rather than hallucinated pixels.

| Stable source ID                             | Category         | Role   | Production method               | Alpha     | Order | Variant declarations |
| -------------------------------------------- | ---------------- | ------ | ------------------------------- | --------- | ----- | -------------------- |
| asset-lammb-base-anatomy-sheep               | base_anatomy     | LAYER  | BUILT_IN_IMAGEGEN_AND_ALIGNMENT | REQUIRED  | 10    | 0                    |
| asset-lammb-wool-ivory                       | wool             | LAYER  | BUILT_IN_IMAGEGEN_AND_ALIGNMENT | REQUIRED  | 30    | 7                    |
| asset-lammb-wool-ash                         | wool             | LAYER  | BUILT_IN_IMAGEGEN_AND_ALIGNMENT | REQUIRED  | 30    | 7                    |
| asset-lammb-wool-charcoal                    | wool             | LAYER  | BUILT_IN_IMAGEGEN_AND_ALIGNMENT | REQUIRED  | 30    | 7                    |
| asset-lammb-wool-pink                        | wool             | LAYER  | BUILT_IN_IMAGEGEN_AND_ALIGNMENT | REQUIRED  | 30    | 6                    |
| asset-lammb-wool-chartreuse                  | wool             | LAYER  | BUILT_IN_IMAGEGEN_AND_ALIGNMENT | REQUIRED  | 30    | 7                    |
| asset-lammb-wool-frosted                     | wool             | LAYER  | BUILT_IN_IMAGEGEN_AND_ALIGNMENT | REQUIRED  | 30    | 7                    |
| asset-lammb-wool-locks                       | wool             | LAYER  | BUILT_IN_IMAGEGEN_AND_ALIGNMENT | REQUIRED  | 30    | 6                    |
| asset-lammb-wool-singed                      | wool             | LAYER  | BUILT_IN_IMAGEGEN_AND_ALIGNMENT | REQUIRED  | 30    | 7                    |
| asset-lammb-eyes-radioactive                 | eyes             | LAYER  | BUILT_IN_IMAGEGEN_AND_ALIGNMENT | REQUIRED  | 50    | 7                    |
| asset-lammb-eyes-amber                       | eyes             | LAYER  | BUILT_IN_IMAGEGEN_AND_ALIGNMENT | REQUIRED  | 50    | 7                    |
| asset-lammb-eyes-red                         | eyes             | LAYER  | BUILT_IN_IMAGEGEN_AND_ALIGNMENT | REQUIRED  | 50    | 7                    |
| asset-lammb-eyes-ice                         | eyes             | LAYER  | BUILT_IN_IMAGEGEN_AND_ALIGNMENT | REQUIRED  | 50    | 7                    |
| asset-lammb-eyes-violet                      | eyes             | LAYER  | BUILT_IN_IMAGEGEN_AND_ALIGNMENT | REQUIRED  | 50    | 7                    |
| asset-lammb-eyes-onyx                        | eyes             | LAYER  | BUILT_IN_IMAGEGEN_AND_ALIGNMENT | REQUIRED  | 50    | 7                    |
| asset-lammb-eyes-split                       | eyes             | LAYER  | BUILT_IN_IMAGEGEN_AND_ALIGNMENT | REQUIRED  | 50    | 7                    |
| asset-lammb-eyes-compound                    | eyes             | LAYER  | BUILT_IN_IMAGEGEN_AND_ALIGNMENT | REQUIRED  | 50    | 1                    |
| asset-lammb-expressions-heavy-lidded         | expressions      | LAYER  | BUILT_IN_IMAGEGEN_AND_ALIGNMENT | REQUIRED  | 40    | 8                    |
| asset-lammb-expressions-side-eye             | expressions      | LAYER  | BUILT_IN_IMAGEGEN_AND_ALIGNMENT | REQUIRED  | 40    | 8                    |
| asset-lammb-expressions-smirk                | expressions      | LAYER  | BUILT_IN_IMAGEGEN_AND_ALIGNMENT | REQUIRED  | 40    | 6                    |
| asset-lammb-expressions-stoic                | expressions      | LAYER  | BUILT_IN_IMAGEGEN_AND_ALIGNMENT | REQUIRED  | 40    | 8                    |
| asset-lammb-expressions-amused               | expressions      | LAYER  | BUILT_IN_IMAGEGEN_AND_ALIGNMENT | REQUIRED  | 40    | 6                    |
| asset-lammb-expressions-defiant              | expressions      | LAYER  | BUILT_IN_IMAGEGEN_AND_ALIGNMENT | REQUIRED  | 40    | 7                    |
| asset-lammb-clothing-hoodie                  | clothing         | LAYER  | BUILT_IN_IMAGEGEN_AND_ALIGNMENT | REQUIRED  | 20    | 7                    |
| asset-lammb-clothing-bomber                  | clothing         | LAYER  | BUILT_IN_IMAGEGEN_AND_ALIGNMENT | REQUIRED  | 20    | 7                    |
| asset-lammb-clothing-lab-jacket              | clothing         | LAYER  | BUILT_IN_IMAGEGEN_AND_ALIGNMENT | REQUIRED  | 20    | 8                    |
| asset-lammb-clothing-utility-vest            | clothing         | LAYER  | BUILT_IN_IMAGEGEN_AND_ALIGNMENT | REQUIRED  | 20    | 8                    |
| asset-lammb-clothing-crewneck                | clothing         | LAYER  | BUILT_IN_IMAGEGEN_AND_ALIGNMENT | REQUIRED  | 20    | 7                    |
| asset-lammb-clothing-long-coat               | clothing         | LAYER  | BUILT_IN_IMAGEGEN_AND_ALIGNMENT | REQUIRED  | 20    | 7                    |
| asset-lammb-clothing-shell                   | clothing         | LAYER  | BUILT_IN_IMAGEGEN_AND_ALIGNMENT | REQUIRED  | 20    | 7                    |
| asset-lammb-clothing-none                    | clothing         | LAYER  | DETERMINISTIC_CLEAR_LAYER       | REQUIRED  | 20    | 0                    |
| asset-lammb-accessories-none                 | accessories      | LAYER  | DETERMINISTIC_CLEAR_LAYER       | REQUIRED  | 60    | 0                    |
| asset-lammb-accessories-beanie               | accessories      | LAYER  | BUILT_IN_IMAGEGEN_AND_ALIGNMENT | REQUIRED  | 60    | 6                    |
| asset-lammb-accessories-backward-cap         | accessories      | LAYER  | BUILT_IN_IMAGEGEN_AND_ALIGNMENT | REQUIRED  | 60    | 7                    |
| asset-lammb-accessories-shades               | accessories      | LAYER  | BUILT_IN_IMAGEGEN_AND_ALIGNMENT | REQUIRED  | 60    | 7                    |
| asset-lammb-accessories-cap-shades           | accessories      | LAYER  | BUILT_IN_IMAGEGEN_AND_ALIGNMENT | REQUIRED  | 60    | 7                    |
| asset-lammb-accessories-ear-tag              | accessories      | LAYER  | DETERMINISTIC_VECTOR            | REQUIRED  | 60    | 0                    |
| asset-lammb-accessories-silver-chain         | accessories      | LAYER  | BUILT_IN_IMAGEGEN_AND_ALIGNMENT | REQUIRED  | 60    | 8                    |
| asset-lammb-accessories-gold-tooth           | accessories      | LAYER  | BUILT_IN_IMAGEGEN_AND_ALIGNMENT | REQUIRED  | 60    | 5                    |
| asset-lammb-accessories-visor                | accessories      | LAYER  | BUILT_IN_IMAGEGEN_AND_ALIGNMENT | REQUIRED  | 60    | 7                    |
| asset-lammb-accessories-headset              | accessories      | LAYER  | BUILT_IN_IMAGEGEN_AND_ALIGNMENT | REQUIRED  | 60    | 6                    |
| asset-lammb-accessories-work-cap             | accessories      | LAYER  | BUILT_IN_IMAGEGEN_AND_ALIGNMENT | REQUIRED  | 60    | 7                    |
| asset-lammb-accessories-ear-cuff             | accessories      | LAYER  | BUILT_IN_IMAGEGEN_AND_ALIGNMENT | REQUIRED  | 60    | 8                    |
| asset-lammb-mutations-none                   | mutations        | EFFECT | DETERMINISTIC_CLEAR_LAYER       | REQUIRED  | 70    | 0                    |
| asset-lammb-mutations-skeletal               | mutations        | EFFECT | BUILT_IN_IMAGEGEN_AND_ALIGNMENT | REQUIRED  | 70    | 0                    |
| asset-lammb-mutations-cybernetic             | mutations        | EFFECT | BUILT_IN_IMAGEGEN_AND_ALIGNMENT | REQUIRED  | 70    | 0                    |
| asset-lammb-mutations-magma                  | mutations        | EFFECT | BUILT_IN_IMAGEGEN_AND_ALIGNMENT | REQUIRED  | 70    | 0                    |
| asset-lammb-mutations-crystalline            | mutations        | EFFECT | BUILT_IN_IMAGEGEN_AND_ALIGNMENT | REQUIRED  | 70    | 0                    |
| asset-lammb-mutations-botanical              | mutations        | EFFECT | BUILT_IN_IMAGEGEN_AND_ALIGNMENT | REQUIRED  | 70    | 0                    |
| asset-lammb-mutations-void                   | mutations        | EFFECT | BUILT_IN_IMAGEGEN_AND_ALIGNMENT | REQUIRED  | 70    | 0                    |
| asset-lammb-mutations-multi-eye              | mutations        | EFFECT | BUILT_IN_IMAGEGEN_AND_ALIGNMENT | REQUIRED  | 70    | 0                    |
| asset-lammb-pixel-corruption-none            | pixel_corruption | EFFECT | DETERMINISTIC_CLEAR_LAYER       | REQUIRED  | 80    | 0                    |
| asset-lammb-pixel-corruption-touch           | pixel_corruption | EFFECT | BUILT_IN_IMAGEGEN_AND_ALIGNMENT | REQUIRED  | 80    | 0                    |
| asset-lammb-pixel-corruption-bleed           | pixel_corruption | EFFECT | BUILT_IN_IMAGEGEN_AND_ALIGNMENT | REQUIRED  | 80    | 0                    |
| asset-lammb-pixel-corruption-fracture        | pixel_corruption | EFFECT | BUILT_IN_IMAGEGEN_AND_ALIGNMENT | REQUIRED  | 80    | 0                    |
| asset-lammb-pixel-corruption-glitched        | pixel_corruption | EFFECT | BUILT_IN_IMAGEGEN_AND_ALIGNMENT | REQUIRED  | 80    | 0                    |
| asset-lammb-pixel-corruption-reality-failure | pixel_corruption | EFFECT | BUILT_IN_IMAGEGEN_AND_ALIGNMENT | REQUIRED  | 80    | 0                    |
| asset-lammb-environments-chartreuse          | environments     | SCENE  | DETERMINISTIC_VECTOR            | FORBIDDEN | 0     | 0                    |
| asset-lammb-environments-near-black          | environments     | SCENE  | DETERMINISTIC_VECTOR            | FORBIDDEN | 0     | 0                    |
| asset-lammb-environments-graphite            | environments     | SCENE  | DETERMINISTIC_VECTOR            | FORBIDDEN | 0     | 0                    |
| asset-lammb-environments-lab                 | environments     | SCENE  | BUILT_IN_IMAGEGEN_AND_ALIGNMENT | FORBIDDEN | 0     | 0                    |
| asset-lammb-environments-night               | environments     | SCENE  | BUILT_IN_IMAGEGEN_AND_ALIGNMENT | FORBIDDEN | 0     | 0                    |
| asset-lammb-environments-event-horizon       | environments     | SCENE  | BUILT_IN_IMAGEGEN_AND_ALIGNMENT | FORBIDDEN | 0     | 0                    |
| asset-lammb-anatomy-skeletal                 | base_anatomy     | LAYER  | BUILT_IN_IMAGEGEN_AND_ALIGNMENT | REQUIRED  | 10    | 0                    |
| asset-lammb-anatomy-cybernetic               | base_anatomy     | LAYER  | BUILT_IN_IMAGEGEN_AND_ALIGNMENT | REQUIRED  | 10    | 0                    |
| asset-lammb-anatomy-magma                    | base_anatomy     | LAYER  | BUILT_IN_IMAGEGEN_AND_ALIGNMENT | REQUIRED  | 10    | 0                    |
| asset-lammb-anatomy-crystalline              | base_anatomy     | LAYER  | BUILT_IN_IMAGEGEN_AND_ALIGNMENT | REQUIRED  | 10    | 0                    |
| asset-lammb-anatomy-botanical                | base_anatomy     | LAYER  | BUILT_IN_IMAGEGEN_AND_ALIGNMENT | REQUIRED  | 10    | 0                    |
| asset-lammb-anatomy-void                     | base_anatomy     | LAYER  | BUILT_IN_IMAGEGEN_AND_ALIGNMENT | REQUIRED  | 10    | 0                    |
| asset-lammb-anatomy-multi-eye                | base_anatomy     | LAYER  | BUILT_IN_IMAGEGEN_AND_ALIGNMENT | REQUIRED  | 10    | 0                    |
| asset-lammb-grail-event-horizon              | environments     | SCENE  | BUILT_IN_IMAGEGEN_AND_ALIGNMENT | FORBIDDEN | 0     | 0                    |
| asset-lammb-grail-recursion                  | environments     | SCENE  | BUILT_IN_IMAGEGEN_AND_ALIGNMENT | FORBIDDEN | 0     | 0                    |
| asset-lammb-grail-cooled-core                | environments     | SCENE  | BUILT_IN_IMAGEGEN_AND_ALIGNMENT | FORBIDDEN | 0     | 0                    |
| asset-lammb-grail-refraction                 | environments     | SCENE  | BUILT_IN_IMAGEGEN_AND_ALIGNMENT | FORBIDDEN | 0     | 0                    |
| asset-lammb-grail-seed-vault                 | environments     | SCENE  | BUILT_IN_IMAGEGEN_AND_ALIGNMENT | FORBIDDEN | 0     | 0                    |
| asset-lammb-grail-observer-array             | environments     | SCENE  | BUILT_IN_IMAGEGEN_AND_ALIGNMENT | FORBIDDEN | 0     | 0                    |
| asset-lammb-accessories-cap-tag              | accessories      | LAYER  | BUILT_IN_IMAGEGEN_AND_ALIGNMENT | REQUIRED  | 60    | 7                    |
| asset-lammb-accessories-beanie-chain         | accessories      | LAYER  | BUILT_IN_IMAGEGEN_AND_ALIGNMENT | REQUIRED  | 60    | 6                    |
| asset-lammb-accessories-shades-gold          | accessories      | LAYER  | BUILT_IN_IMAGEGEN_AND_ALIGNMENT | REQUIRED  | 60    | 5                    |

284 anatomy-family variant bindings are explicitly listed in `lammb-traits-v1.json`. These replace the corresponding generic templates during future reviewed production compilation, not additional independent traits. Their absence blocks pixel production. The current engine cannot condition an asset substitution on both the selected expression/accessory and mutation; no automatic variant resolution is implemented here.

| Variant ID                                         | Template                             | Anatomy family              | Status  |
| -------------------------------------------------- | ------------------------------------ | --------------------------- | ------- |
| variant-lammb-wool-ivory-none                      | asset-lammb-wool-ivory               | lammb-mutations-none        | MISSING |
| variant-lammb-wool-ivory-skeletal                  | asset-lammb-wool-ivory               | lammb-mutations-skeletal    | MISSING |
| variant-lammb-wool-ivory-cybernetic                | asset-lammb-wool-ivory               | lammb-mutations-cybernetic  | MISSING |
| variant-lammb-wool-ivory-crystalline               | asset-lammb-wool-ivory               | lammb-mutations-crystalline | MISSING |
| variant-lammb-wool-ivory-botanical                 | asset-lammb-wool-ivory               | lammb-mutations-botanical   | MISSING |
| variant-lammb-wool-ivory-void                      | asset-lammb-wool-ivory               | lammb-mutations-void        | MISSING |
| variant-lammb-wool-ivory-multi-eye                 | asset-lammb-wool-ivory               | lammb-mutations-multi-eye   | MISSING |
| variant-lammb-wool-ash-none                        | asset-lammb-wool-ash                 | lammb-mutations-none        | MISSING |
| variant-lammb-wool-ash-skeletal                    | asset-lammb-wool-ash                 | lammb-mutations-skeletal    | MISSING |
| variant-lammb-wool-ash-cybernetic                  | asset-lammb-wool-ash                 | lammb-mutations-cybernetic  | MISSING |
| variant-lammb-wool-ash-magma                       | asset-lammb-wool-ash                 | lammb-mutations-magma       | MISSING |
| variant-lammb-wool-ash-crystalline                 | asset-lammb-wool-ash                 | lammb-mutations-crystalline | MISSING |
| variant-lammb-wool-ash-botanical                   | asset-lammb-wool-ash                 | lammb-mutations-botanical   | MISSING |
| variant-lammb-wool-ash-multi-eye                   | asset-lammb-wool-ash                 | lammb-mutations-multi-eye   | MISSING |
| variant-lammb-wool-charcoal-none                   | asset-lammb-wool-charcoal            | lammb-mutations-none        | MISSING |
| variant-lammb-wool-charcoal-skeletal               | asset-lammb-wool-charcoal            | lammb-mutations-skeletal    | MISSING |
| variant-lammb-wool-charcoal-cybernetic             | asset-lammb-wool-charcoal            | lammb-mutations-cybernetic  | MISSING |
| variant-lammb-wool-charcoal-magma                  | asset-lammb-wool-charcoal            | lammb-mutations-magma       | MISSING |
| variant-lammb-wool-charcoal-crystalline            | asset-lammb-wool-charcoal            | lammb-mutations-crystalline | MISSING |
| variant-lammb-wool-charcoal-botanical              | asset-lammb-wool-charcoal            | lammb-mutations-botanical   | MISSING |
| variant-lammb-wool-charcoal-multi-eye              | asset-lammb-wool-charcoal            | lammb-mutations-multi-eye   | MISSING |
| variant-lammb-wool-pink-none                       | asset-lammb-wool-pink                | lammb-mutations-none        | MISSING |
| variant-lammb-wool-pink-skeletal                   | asset-lammb-wool-pink                | lammb-mutations-skeletal    | MISSING |
| variant-lammb-wool-pink-cybernetic                 | asset-lammb-wool-pink                | lammb-mutations-cybernetic  | MISSING |
| variant-lammb-wool-pink-crystalline                | asset-lammb-wool-pink                | lammb-mutations-crystalline | MISSING |
| variant-lammb-wool-pink-botanical                  | asset-lammb-wool-pink                | lammb-mutations-botanical   | MISSING |
| variant-lammb-wool-pink-multi-eye                  | asset-lammb-wool-pink                | lammb-mutations-multi-eye   | MISSING |
| variant-lammb-wool-chartreuse-none                 | asset-lammb-wool-chartreuse          | lammb-mutations-none        | MISSING |
| variant-lammb-wool-chartreuse-skeletal             | asset-lammb-wool-chartreuse          | lammb-mutations-skeletal    | MISSING |
| variant-lammb-wool-chartreuse-cybernetic           | asset-lammb-wool-chartreuse          | lammb-mutations-cybernetic  | MISSING |
| variant-lammb-wool-chartreuse-crystalline          | asset-lammb-wool-chartreuse          | lammb-mutations-crystalline | MISSING |
| variant-lammb-wool-chartreuse-botanical            | asset-lammb-wool-chartreuse          | lammb-mutations-botanical   | MISSING |
| variant-lammb-wool-chartreuse-void                 | asset-lammb-wool-chartreuse          | lammb-mutations-void        | MISSING |
| variant-lammb-wool-chartreuse-multi-eye            | asset-lammb-wool-chartreuse          | lammb-mutations-multi-eye   | MISSING |
| variant-lammb-wool-frosted-none                    | asset-lammb-wool-frosted             | lammb-mutations-none        | MISSING |
| variant-lammb-wool-frosted-skeletal                | asset-lammb-wool-frosted             | lammb-mutations-skeletal    | MISSING |
| variant-lammb-wool-frosted-cybernetic              | asset-lammb-wool-frosted             | lammb-mutations-cybernetic  | MISSING |
| variant-lammb-wool-frosted-crystalline             | asset-lammb-wool-frosted             | lammb-mutations-crystalline | MISSING |
| variant-lammb-wool-frosted-botanical               | asset-lammb-wool-frosted             | lammb-mutations-botanical   | MISSING |
| variant-lammb-wool-frosted-void                    | asset-lammb-wool-frosted             | lammb-mutations-void        | MISSING |
| variant-lammb-wool-frosted-multi-eye               | asset-lammb-wool-frosted             | lammb-mutations-multi-eye   | MISSING |
| variant-lammb-wool-locks-none                      | asset-lammb-wool-locks               | lammb-mutations-none        | MISSING |
| variant-lammb-wool-locks-skeletal                  | asset-lammb-wool-locks               | lammb-mutations-skeletal    | MISSING |
| variant-lammb-wool-locks-cybernetic                | asset-lammb-wool-locks               | lammb-mutations-cybernetic  | MISSING |
| variant-lammb-wool-locks-crystalline               | asset-lammb-wool-locks               | lammb-mutations-crystalline | MISSING |
| variant-lammb-wool-locks-botanical                 | asset-lammb-wool-locks               | lammb-mutations-botanical   | MISSING |
| variant-lammb-wool-locks-multi-eye                 | asset-lammb-wool-locks               | lammb-mutations-multi-eye   | MISSING |
| variant-lammb-wool-singed-none                     | asset-lammb-wool-singed              | lammb-mutations-none        | MISSING |
| variant-lammb-wool-singed-skeletal                 | asset-lammb-wool-singed              | lammb-mutations-skeletal    | MISSING |
| variant-lammb-wool-singed-cybernetic               | asset-lammb-wool-singed              | lammb-mutations-cybernetic  | MISSING |
| variant-lammb-wool-singed-magma                    | asset-lammb-wool-singed              | lammb-mutations-magma       | MISSING |
| variant-lammb-wool-singed-crystalline              | asset-lammb-wool-singed              | lammb-mutations-crystalline | MISSING |
| variant-lammb-wool-singed-botanical                | asset-lammb-wool-singed              | lammb-mutations-botanical   | MISSING |
| variant-lammb-wool-singed-multi-eye                | asset-lammb-wool-singed              | lammb-mutations-multi-eye   | MISSING |
| variant-lammb-eyes-radioactive-none                | asset-lammb-eyes-radioactive         | lammb-mutations-none        | MISSING |
| variant-lammb-eyes-radioactive-skeletal            | asset-lammb-eyes-radioactive         | lammb-mutations-skeletal    | MISSING |
| variant-lammb-eyes-radioactive-cybernetic          | asset-lammb-eyes-radioactive         | lammb-mutations-cybernetic  | MISSING |
| variant-lammb-eyes-radioactive-magma               | asset-lammb-eyes-radioactive         | lammb-mutations-magma       | MISSING |
| variant-lammb-eyes-radioactive-crystalline         | asset-lammb-eyes-radioactive         | lammb-mutations-crystalline | MISSING |
| variant-lammb-eyes-radioactive-botanical           | asset-lammb-eyes-radioactive         | lammb-mutations-botanical   | MISSING |
| variant-lammb-eyes-radioactive-void                | asset-lammb-eyes-radioactive         | lammb-mutations-void        | MISSING |
| variant-lammb-eyes-amber-none                      | asset-lammb-eyes-amber               | lammb-mutations-none        | MISSING |
| variant-lammb-eyes-amber-skeletal                  | asset-lammb-eyes-amber               | lammb-mutations-skeletal    | MISSING |
| variant-lammb-eyes-amber-cybernetic                | asset-lammb-eyes-amber               | lammb-mutations-cybernetic  | MISSING |
| variant-lammb-eyes-amber-magma                     | asset-lammb-eyes-amber               | lammb-mutations-magma       | MISSING |
| variant-lammb-eyes-amber-crystalline               | asset-lammb-eyes-amber               | lammb-mutations-crystalline | MISSING |
| variant-lammb-eyes-amber-botanical                 | asset-lammb-eyes-amber               | lammb-mutations-botanical   | MISSING |
| variant-lammb-eyes-amber-void                      | asset-lammb-eyes-amber               | lammb-mutations-void        | MISSING |
| variant-lammb-eyes-red-none                        | asset-lammb-eyes-red                 | lammb-mutations-none        | MISSING |
| variant-lammb-eyes-red-skeletal                    | asset-lammb-eyes-red                 | lammb-mutations-skeletal    | MISSING |
| variant-lammb-eyes-red-cybernetic                  | asset-lammb-eyes-red                 | lammb-mutations-cybernetic  | MISSING |
| variant-lammb-eyes-red-magma                       | asset-lammb-eyes-red                 | lammb-mutations-magma       | MISSING |
| variant-lammb-eyes-red-crystalline                 | asset-lammb-eyes-red                 | lammb-mutations-crystalline | MISSING |
| variant-lammb-eyes-red-botanical                   | asset-lammb-eyes-red                 | lammb-mutations-botanical   | MISSING |
| variant-lammb-eyes-red-void                        | asset-lammb-eyes-red                 | lammb-mutations-void        | MISSING |
| variant-lammb-eyes-ice-none                        | asset-lammb-eyes-ice                 | lammb-mutations-none        | MISSING |
| variant-lammb-eyes-ice-skeletal                    | asset-lammb-eyes-ice                 | lammb-mutations-skeletal    | MISSING |
| variant-lammb-eyes-ice-cybernetic                  | asset-lammb-eyes-ice                 | lammb-mutations-cybernetic  | MISSING |
| variant-lammb-eyes-ice-magma                       | asset-lammb-eyes-ice                 | lammb-mutations-magma       | MISSING |
| variant-lammb-eyes-ice-crystalline                 | asset-lammb-eyes-ice                 | lammb-mutations-crystalline | MISSING |
| variant-lammb-eyes-ice-botanical                   | asset-lammb-eyes-ice                 | lammb-mutations-botanical   | MISSING |
| variant-lammb-eyes-ice-void                        | asset-lammb-eyes-ice                 | lammb-mutations-void        | MISSING |
| variant-lammb-eyes-violet-none                     | asset-lammb-eyes-violet              | lammb-mutations-none        | MISSING |
| variant-lammb-eyes-violet-skeletal                 | asset-lammb-eyes-violet              | lammb-mutations-skeletal    | MISSING |
| variant-lammb-eyes-violet-cybernetic               | asset-lammb-eyes-violet              | lammb-mutations-cybernetic  | MISSING |
| variant-lammb-eyes-violet-magma                    | asset-lammb-eyes-violet              | lammb-mutations-magma       | MISSING |
| variant-lammb-eyes-violet-crystalline              | asset-lammb-eyes-violet              | lammb-mutations-crystalline | MISSING |
| variant-lammb-eyes-violet-botanical                | asset-lammb-eyes-violet              | lammb-mutations-botanical   | MISSING |
| variant-lammb-eyes-violet-void                     | asset-lammb-eyes-violet              | lammb-mutations-void        | MISSING |
| variant-lammb-eyes-onyx-none                       | asset-lammb-eyes-onyx                | lammb-mutations-none        | MISSING |
| variant-lammb-eyes-onyx-skeletal                   | asset-lammb-eyes-onyx                | lammb-mutations-skeletal    | MISSING |
| variant-lammb-eyes-onyx-cybernetic                 | asset-lammb-eyes-onyx                | lammb-mutations-cybernetic  | MISSING |
| variant-lammb-eyes-onyx-magma                      | asset-lammb-eyes-onyx                | lammb-mutations-magma       | MISSING |
| variant-lammb-eyes-onyx-crystalline                | asset-lammb-eyes-onyx                | lammb-mutations-crystalline | MISSING |
| variant-lammb-eyes-onyx-botanical                  | asset-lammb-eyes-onyx                | lammb-mutations-botanical   | MISSING |
| variant-lammb-eyes-onyx-void                       | asset-lammb-eyes-onyx                | lammb-mutations-void        | MISSING |
| variant-lammb-eyes-split-none                      | asset-lammb-eyes-split               | lammb-mutations-none        | MISSING |
| variant-lammb-eyes-split-skeletal                  | asset-lammb-eyes-split               | lammb-mutations-skeletal    | MISSING |
| variant-lammb-eyes-split-cybernetic                | asset-lammb-eyes-split               | lammb-mutations-cybernetic  | MISSING |
| variant-lammb-eyes-split-magma                     | asset-lammb-eyes-split               | lammb-mutations-magma       | MISSING |
| variant-lammb-eyes-split-crystalline               | asset-lammb-eyes-split               | lammb-mutations-crystalline | MISSING |
| variant-lammb-eyes-split-botanical                 | asset-lammb-eyes-split               | lammb-mutations-botanical   | MISSING |
| variant-lammb-eyes-split-void                      | asset-lammb-eyes-split               | lammb-mutations-void        | MISSING |
| variant-lammb-eyes-compound-multi-eye              | asset-lammb-eyes-compound            | lammb-mutations-multi-eye   | MISSING |
| variant-lammb-expressions-heavy-lidded-none        | asset-lammb-expressions-heavy-lidded | lammb-mutations-none        | MISSING |
| variant-lammb-expressions-heavy-lidded-skeletal    | asset-lammb-expressions-heavy-lidded | lammb-mutations-skeletal    | MISSING |
| variant-lammb-expressions-heavy-lidded-cybernetic  | asset-lammb-expressions-heavy-lidded | lammb-mutations-cybernetic  | MISSING |
| variant-lammb-expressions-heavy-lidded-magma       | asset-lammb-expressions-heavy-lidded | lammb-mutations-magma       | MISSING |
| variant-lammb-expressions-heavy-lidded-crystalline | asset-lammb-expressions-heavy-lidded | lammb-mutations-crystalline | MISSING |
| variant-lammb-expressions-heavy-lidded-botanical   | asset-lammb-expressions-heavy-lidded | lammb-mutations-botanical   | MISSING |
| variant-lammb-expressions-heavy-lidded-void        | asset-lammb-expressions-heavy-lidded | lammb-mutations-void        | MISSING |
| variant-lammb-expressions-heavy-lidded-multi-eye   | asset-lammb-expressions-heavy-lidded | lammb-mutations-multi-eye   | MISSING |
| variant-lammb-expressions-side-eye-none            | asset-lammb-expressions-side-eye     | lammb-mutations-none        | MISSING |
| variant-lammb-expressions-side-eye-skeletal        | asset-lammb-expressions-side-eye     | lammb-mutations-skeletal    | MISSING |
| variant-lammb-expressions-side-eye-cybernetic      | asset-lammb-expressions-side-eye     | lammb-mutations-cybernetic  | MISSING |
| variant-lammb-expressions-side-eye-magma           | asset-lammb-expressions-side-eye     | lammb-mutations-magma       | MISSING |
| variant-lammb-expressions-side-eye-crystalline     | asset-lammb-expressions-side-eye     | lammb-mutations-crystalline | MISSING |
| variant-lammb-expressions-side-eye-botanical       | asset-lammb-expressions-side-eye     | lammb-mutations-botanical   | MISSING |
| variant-lammb-expressions-side-eye-void            | asset-lammb-expressions-side-eye     | lammb-mutations-void        | MISSING |
| variant-lammb-expressions-side-eye-multi-eye       | asset-lammb-expressions-side-eye     | lammb-mutations-multi-eye   | MISSING |
| variant-lammb-expressions-smirk-none               | asset-lammb-expressions-smirk        | lammb-mutations-none        | MISSING |
| variant-lammb-expressions-smirk-cybernetic         | asset-lammb-expressions-smirk        | lammb-mutations-cybernetic  | MISSING |
| variant-lammb-expressions-smirk-magma              | asset-lammb-expressions-smirk        | lammb-mutations-magma       | MISSING |
| variant-lammb-expressions-smirk-crystalline        | asset-lammb-expressions-smirk        | lammb-mutations-crystalline | MISSING |
| variant-lammb-expressions-smirk-botanical          | asset-lammb-expressions-smirk        | lammb-mutations-botanical   | MISSING |
| variant-lammb-expressions-smirk-multi-eye          | asset-lammb-expressions-smirk        | lammb-mutations-multi-eye   | MISSING |
| variant-lammb-expressions-stoic-none               | asset-lammb-expressions-stoic        | lammb-mutations-none        | MISSING |
| variant-lammb-expressions-stoic-skeletal           | asset-lammb-expressions-stoic        | lammb-mutations-skeletal    | MISSING |
| variant-lammb-expressions-stoic-cybernetic         | asset-lammb-expressions-stoic        | lammb-mutations-cybernetic  | MISSING |
| variant-lammb-expressions-stoic-magma              | asset-lammb-expressions-stoic        | lammb-mutations-magma       | MISSING |
| variant-lammb-expressions-stoic-crystalline        | asset-lammb-expressions-stoic        | lammb-mutations-crystalline | MISSING |
| variant-lammb-expressions-stoic-botanical          | asset-lammb-expressions-stoic        | lammb-mutations-botanical   | MISSING |
| variant-lammb-expressions-stoic-void               | asset-lammb-expressions-stoic        | lammb-mutations-void        | MISSING |
| variant-lammb-expressions-stoic-multi-eye          | asset-lammb-expressions-stoic        | lammb-mutations-multi-eye   | MISSING |
| variant-lammb-expressions-amused-none              | asset-lammb-expressions-amused       | lammb-mutations-none        | MISSING |
| variant-lammb-expressions-amused-cybernetic        | asset-lammb-expressions-amused       | lammb-mutations-cybernetic  | MISSING |
| variant-lammb-expressions-amused-magma             | asset-lammb-expressions-amused       | lammb-mutations-magma       | MISSING |
| variant-lammb-expressions-amused-crystalline       | asset-lammb-expressions-amused       | lammb-mutations-crystalline | MISSING |
| variant-lammb-expressions-amused-botanical         | asset-lammb-expressions-amused       | lammb-mutations-botanical   | MISSING |
| variant-lammb-expressions-amused-multi-eye         | asset-lammb-expressions-amused       | lammb-mutations-multi-eye   | MISSING |
| variant-lammb-expressions-defiant-none             | asset-lammb-expressions-defiant      | lammb-mutations-none        | MISSING |
| variant-lammb-expressions-defiant-skeletal         | asset-lammb-expressions-defiant      | lammb-mutations-skeletal    | MISSING |
| variant-lammb-expressions-defiant-cybernetic       | asset-lammb-expressions-defiant      | lammb-mutations-cybernetic  | MISSING |
| variant-lammb-expressions-defiant-magma            | asset-lammb-expressions-defiant      | lammb-mutations-magma       | MISSING |
| variant-lammb-expressions-defiant-crystalline      | asset-lammb-expressions-defiant      | lammb-mutations-crystalline | MISSING |
| variant-lammb-expressions-defiant-botanical        | asset-lammb-expressions-defiant      | lammb-mutations-botanical   | MISSING |
| variant-lammb-expressions-defiant-multi-eye        | asset-lammb-expressions-defiant      | lammb-mutations-multi-eye   | MISSING |
| variant-lammb-clothing-hoodie-none                 | asset-lammb-clothing-hoodie          | lammb-mutations-none        | MISSING |
| variant-lammb-clothing-hoodie-skeletal             | asset-lammb-clothing-hoodie          | lammb-mutations-skeletal    | MISSING |
| variant-lammb-clothing-hoodie-cybernetic           | asset-lammb-clothing-hoodie          | lammb-mutations-cybernetic  | MISSING |
| variant-lammb-clothing-hoodie-crystalline          | asset-lammb-clothing-hoodie          | lammb-mutations-crystalline | MISSING |
| variant-lammb-clothing-hoodie-botanical            | asset-lammb-clothing-hoodie          | lammb-mutations-botanical   | MISSING |
| variant-lammb-clothing-hoodie-void                 | asset-lammb-clothing-hoodie          | lammb-mutations-void        | MISSING |
| variant-lammb-clothing-hoodie-multi-eye            | asset-lammb-clothing-hoodie          | lammb-mutations-multi-eye   | MISSING |
| variant-lammb-clothing-bomber-none                 | asset-lammb-clothing-bomber          | lammb-mutations-none        | MISSING |
| variant-lammb-clothing-bomber-skeletal             | asset-lammb-clothing-bomber          | lammb-mutations-skeletal    | MISSING |
| variant-lammb-clothing-bomber-cybernetic           | asset-lammb-clothing-bomber          | lammb-mutations-cybernetic  | MISSING |
| variant-lammb-clothing-bomber-crystalline          | asset-lammb-clothing-bomber          | lammb-mutations-crystalline | MISSING |
| variant-lammb-clothing-bomber-botanical            | asset-lammb-clothing-bomber          | lammb-mutations-botanical   | MISSING |
| variant-lammb-clothing-bomber-void                 | asset-lammb-clothing-bomber          | lammb-mutations-void        | MISSING |
| variant-lammb-clothing-bomber-multi-eye            | asset-lammb-clothing-bomber          | lammb-mutations-multi-eye   | MISSING |
| variant-lammb-clothing-lab-jacket-none             | asset-lammb-clothing-lab-jacket      | lammb-mutations-none        | MISSING |
| variant-lammb-clothing-lab-jacket-skeletal         | asset-lammb-clothing-lab-jacket      | lammb-mutations-skeletal    | MISSING |
| variant-lammb-clothing-lab-jacket-cybernetic       | asset-lammb-clothing-lab-jacket      | lammb-mutations-cybernetic  | MISSING |
| variant-lammb-clothing-lab-jacket-magma            | asset-lammb-clothing-lab-jacket      | lammb-mutations-magma       | MISSING |
| variant-lammb-clothing-lab-jacket-crystalline      | asset-lammb-clothing-lab-jacket      | lammb-mutations-crystalline | MISSING |
| variant-lammb-clothing-lab-jacket-botanical        | asset-lammb-clothing-lab-jacket      | lammb-mutations-botanical   | MISSING |
| variant-lammb-clothing-lab-jacket-void             | asset-lammb-clothing-lab-jacket      | lammb-mutations-void        | MISSING |
| variant-lammb-clothing-lab-jacket-multi-eye        | asset-lammb-clothing-lab-jacket      | lammb-mutations-multi-eye   | MISSING |
| variant-lammb-clothing-utility-vest-none           | asset-lammb-clothing-utility-vest    | lammb-mutations-none        | MISSING |
| variant-lammb-clothing-utility-vest-skeletal       | asset-lammb-clothing-utility-vest    | lammb-mutations-skeletal    | MISSING |
| variant-lammb-clothing-utility-vest-cybernetic     | asset-lammb-clothing-utility-vest    | lammb-mutations-cybernetic  | MISSING |
| variant-lammb-clothing-utility-vest-magma          | asset-lammb-clothing-utility-vest    | lammb-mutations-magma       | MISSING |
| variant-lammb-clothing-utility-vest-crystalline    | asset-lammb-clothing-utility-vest    | lammb-mutations-crystalline | MISSING |
| variant-lammb-clothing-utility-vest-botanical      | asset-lammb-clothing-utility-vest    | lammb-mutations-botanical   | MISSING |
| variant-lammb-clothing-utility-vest-void           | asset-lammb-clothing-utility-vest    | lammb-mutations-void        | MISSING |
| variant-lammb-clothing-utility-vest-multi-eye      | asset-lammb-clothing-utility-vest    | lammb-mutations-multi-eye   | MISSING |
| variant-lammb-clothing-crewneck-none               | asset-lammb-clothing-crewneck        | lammb-mutations-none        | MISSING |
| variant-lammb-clothing-crewneck-skeletal           | asset-lammb-clothing-crewneck        | lammb-mutations-skeletal    | MISSING |
| variant-lammb-clothing-crewneck-cybernetic         | asset-lammb-clothing-crewneck        | lammb-mutations-cybernetic  | MISSING |
| variant-lammb-clothing-crewneck-crystalline        | asset-lammb-clothing-crewneck        | lammb-mutations-crystalline | MISSING |
| variant-lammb-clothing-crewneck-botanical          | asset-lammb-clothing-crewneck        | lammb-mutations-botanical   | MISSING |
| variant-lammb-clothing-crewneck-void               | asset-lammb-clothing-crewneck        | lammb-mutations-void        | MISSING |
| variant-lammb-clothing-crewneck-multi-eye          | asset-lammb-clothing-crewneck        | lammb-mutations-multi-eye   | MISSING |
| variant-lammb-clothing-long-coat-none              | asset-lammb-clothing-long-coat       | lammb-mutations-none        | MISSING |
| variant-lammb-clothing-long-coat-skeletal          | asset-lammb-clothing-long-coat       | lammb-mutations-skeletal    | MISSING |
| variant-lammb-clothing-long-coat-cybernetic        | asset-lammb-clothing-long-coat       | lammb-mutations-cybernetic  | MISSING |
| variant-lammb-clothing-long-coat-crystalline       | asset-lammb-clothing-long-coat       | lammb-mutations-crystalline | MISSING |
| variant-lammb-clothing-long-coat-botanical         | asset-lammb-clothing-long-coat       | lammb-mutations-botanical   | MISSING |
| variant-lammb-clothing-long-coat-void              | asset-lammb-clothing-long-coat       | lammb-mutations-void        | MISSING |
| variant-lammb-clothing-long-coat-multi-eye         | asset-lammb-clothing-long-coat       | lammb-mutations-multi-eye   | MISSING |
| variant-lammb-clothing-shell-none                  | asset-lammb-clothing-shell           | lammb-mutations-none        | MISSING |
| variant-lammb-clothing-shell-skeletal              | asset-lammb-clothing-shell           | lammb-mutations-skeletal    | MISSING |
| variant-lammb-clothing-shell-cybernetic            | asset-lammb-clothing-shell           | lammb-mutations-cybernetic  | MISSING |
| variant-lammb-clothing-shell-crystalline           | asset-lammb-clothing-shell           | lammb-mutations-crystalline | MISSING |
| variant-lammb-clothing-shell-botanical             | asset-lammb-clothing-shell           | lammb-mutations-botanical   | MISSING |
| variant-lammb-clothing-shell-void                  | asset-lammb-clothing-shell           | lammb-mutations-void        | MISSING |
| variant-lammb-clothing-shell-multi-eye             | asset-lammb-clothing-shell           | lammb-mutations-multi-eye   | MISSING |
| variant-lammb-accessories-beanie-none              | asset-lammb-accessories-beanie       | lammb-mutations-none        | MISSING |
| variant-lammb-accessories-beanie-skeletal          | asset-lammb-accessories-beanie       | lammb-mutations-skeletal    | MISSING |
| variant-lammb-accessories-beanie-cybernetic        | asset-lammb-accessories-beanie       | lammb-mutations-cybernetic  | MISSING |
| variant-lammb-accessories-beanie-magma             | asset-lammb-accessories-beanie       | lammb-mutations-magma       | MISSING |
| variant-lammb-accessories-beanie-crystalline       | asset-lammb-accessories-beanie       | lammb-mutations-crystalline | MISSING |
| variant-lammb-accessories-beanie-void              | asset-lammb-accessories-beanie       | lammb-mutations-void        | MISSING |
| variant-lammb-accessories-backward-cap-none        | asset-lammb-accessories-backward-cap | lammb-mutations-none        | MISSING |
| variant-lammb-accessories-backward-cap-skeletal    | asset-lammb-accessories-backward-cap | lammb-mutations-skeletal    | MISSING |
| variant-lammb-accessories-backward-cap-cybernetic  | asset-lammb-accessories-backward-cap | lammb-mutations-cybernetic  | MISSING |
| variant-lammb-accessories-backward-cap-magma       | asset-lammb-accessories-backward-cap | lammb-mutations-magma       | MISSING |
| variant-lammb-accessories-backward-cap-crystalline | asset-lammb-accessories-backward-cap | lammb-mutations-crystalline | MISSING |
| variant-lammb-accessories-backward-cap-botanical   | asset-lammb-accessories-backward-cap | lammb-mutations-botanical   | MISSING |
| variant-lammb-accessories-backward-cap-void        | asset-lammb-accessories-backward-cap | lammb-mutations-void        | MISSING |
| variant-lammb-accessories-shades-none              | asset-lammb-accessories-shades       | lammb-mutations-none        | MISSING |
| variant-lammb-accessories-shades-skeletal          | asset-lammb-accessories-shades       | lammb-mutations-skeletal    | MISSING |
| variant-lammb-accessories-shades-cybernetic        | asset-lammb-accessories-shades       | lammb-mutations-cybernetic  | MISSING |
| variant-lammb-accessories-shades-magma             | asset-lammb-accessories-shades       | lammb-mutations-magma       | MISSING |
| variant-lammb-accessories-shades-crystalline       | asset-lammb-accessories-shades       | lammb-mutations-crystalline | MISSING |
| variant-lammb-accessories-shades-botanical         | asset-lammb-accessories-shades       | lammb-mutations-botanical   | MISSING |
| variant-lammb-accessories-shades-void              | asset-lammb-accessories-shades       | lammb-mutations-void        | MISSING |
| variant-lammb-accessories-cap-shades-none          | asset-lammb-accessories-cap-shades   | lammb-mutations-none        | MISSING |
| variant-lammb-accessories-cap-shades-skeletal      | asset-lammb-accessories-cap-shades   | lammb-mutations-skeletal    | MISSING |
| variant-lammb-accessories-cap-shades-cybernetic    | asset-lammb-accessories-cap-shades   | lammb-mutations-cybernetic  | MISSING |
| variant-lammb-accessories-cap-shades-magma         | asset-lammb-accessories-cap-shades   | lammb-mutations-magma       | MISSING |
| variant-lammb-accessories-cap-shades-crystalline   | asset-lammb-accessories-cap-shades   | lammb-mutations-crystalline | MISSING |
| variant-lammb-accessories-cap-shades-botanical     | asset-lammb-accessories-cap-shades   | lammb-mutations-botanical   | MISSING |
| variant-lammb-accessories-cap-shades-void          | asset-lammb-accessories-cap-shades   | lammb-mutations-void        | MISSING |
| variant-lammb-accessories-silver-chain-none        | asset-lammb-accessories-silver-chain | lammb-mutations-none        | MISSING |
| variant-lammb-accessories-silver-chain-skeletal    | asset-lammb-accessories-silver-chain | lammb-mutations-skeletal    | MISSING |
| variant-lammb-accessories-silver-chain-cybernetic  | asset-lammb-accessories-silver-chain | lammb-mutations-cybernetic  | MISSING |
| variant-lammb-accessories-silver-chain-magma       | asset-lammb-accessories-silver-chain | lammb-mutations-magma       | MISSING |
| variant-lammb-accessories-silver-chain-crystalline | asset-lammb-accessories-silver-chain | lammb-mutations-crystalline | MISSING |
| variant-lammb-accessories-silver-chain-botanical   | asset-lammb-accessories-silver-chain | lammb-mutations-botanical   | MISSING |
| variant-lammb-accessories-silver-chain-void        | asset-lammb-accessories-silver-chain | lammb-mutations-void        | MISSING |
| variant-lammb-accessories-silver-chain-multi-eye   | asset-lammb-accessories-silver-chain | lammb-mutations-multi-eye   | MISSING |
| variant-lammb-accessories-gold-tooth-none          | asset-lammb-accessories-gold-tooth   | lammb-mutations-none        | MISSING |
| variant-lammb-accessories-gold-tooth-skeletal      | asset-lammb-accessories-gold-tooth   | lammb-mutations-skeletal    | MISSING |
| variant-lammb-accessories-gold-tooth-cybernetic    | asset-lammb-accessories-gold-tooth   | lammb-mutations-cybernetic  | MISSING |
| variant-lammb-accessories-gold-tooth-magma         | asset-lammb-accessories-gold-tooth   | lammb-mutations-magma       | MISSING |
| variant-lammb-accessories-gold-tooth-botanical     | asset-lammb-accessories-gold-tooth   | lammb-mutations-botanical   | MISSING |
| variant-lammb-accessories-visor-none               | asset-lammb-accessories-visor        | lammb-mutations-none        | MISSING |
| variant-lammb-accessories-visor-skeletal           | asset-lammb-accessories-visor        | lammb-mutations-skeletal    | MISSING |
| variant-lammb-accessories-visor-cybernetic         | asset-lammb-accessories-visor        | lammb-mutations-cybernetic  | MISSING |
| variant-lammb-accessories-visor-magma              | asset-lammb-accessories-visor        | lammb-mutations-magma       | MISSING |
| variant-lammb-accessories-visor-crystalline        | asset-lammb-accessories-visor        | lammb-mutations-crystalline | MISSING |
| variant-lammb-accessories-visor-botanical          | asset-lammb-accessories-visor        | lammb-mutations-botanical   | MISSING |
| variant-lammb-accessories-visor-void               | asset-lammb-accessories-visor        | lammb-mutations-void        | MISSING |
| variant-lammb-accessories-headset-none             | asset-lammb-accessories-headset      | lammb-mutations-none        | MISSING |
| variant-lammb-accessories-headset-skeletal         | asset-lammb-accessories-headset      | lammb-mutations-skeletal    | MISSING |
| variant-lammb-accessories-headset-magma            | asset-lammb-accessories-headset      | lammb-mutations-magma       | MISSING |
| variant-lammb-accessories-headset-crystalline      | asset-lammb-accessories-headset      | lammb-mutations-crystalline | MISSING |
| variant-lammb-accessories-headset-botanical        | asset-lammb-accessories-headset      | lammb-mutations-botanical   | MISSING |
| variant-lammb-accessories-headset-void             | asset-lammb-accessories-headset      | lammb-mutations-void        | MISSING |
| variant-lammb-accessories-work-cap-none            | asset-lammb-accessories-work-cap     | lammb-mutations-none        | MISSING |
| variant-lammb-accessories-work-cap-skeletal        | asset-lammb-accessories-work-cap     | lammb-mutations-skeletal    | MISSING |
| variant-lammb-accessories-work-cap-cybernetic      | asset-lammb-accessories-work-cap     | lammb-mutations-cybernetic  | MISSING |
| variant-lammb-accessories-work-cap-magma           | asset-lammb-accessories-work-cap     | lammb-mutations-magma       | MISSING |
| variant-lammb-accessories-work-cap-crystalline     | asset-lammb-accessories-work-cap     | lammb-mutations-crystalline | MISSING |
| variant-lammb-accessories-work-cap-botanical       | asset-lammb-accessories-work-cap     | lammb-mutations-botanical   | MISSING |
| variant-lammb-accessories-work-cap-void            | asset-lammb-accessories-work-cap     | lammb-mutations-void        | MISSING |
| variant-lammb-accessories-ear-cuff-none            | asset-lammb-accessories-ear-cuff     | lammb-mutations-none        | MISSING |
| variant-lammb-accessories-ear-cuff-skeletal        | asset-lammb-accessories-ear-cuff     | lammb-mutations-skeletal    | MISSING |
| variant-lammb-accessories-ear-cuff-cybernetic      | asset-lammb-accessories-ear-cuff     | lammb-mutations-cybernetic  | MISSING |
| variant-lammb-accessories-ear-cuff-magma           | asset-lammb-accessories-ear-cuff     | lammb-mutations-magma       | MISSING |
| variant-lammb-accessories-ear-cuff-crystalline     | asset-lammb-accessories-ear-cuff     | lammb-mutations-crystalline | MISSING |
| variant-lammb-accessories-ear-cuff-botanical       | asset-lammb-accessories-ear-cuff     | lammb-mutations-botanical   | MISSING |
| variant-lammb-accessories-ear-cuff-void            | asset-lammb-accessories-ear-cuff     | lammb-mutations-void        | MISSING |
| variant-lammb-accessories-ear-cuff-multi-eye       | asset-lammb-accessories-ear-cuff     | lammb-mutations-multi-eye   | MISSING |
| variant-lammb-accessories-cap-tag-none             | asset-lammb-accessories-cap-tag      | lammb-mutations-none        | MISSING |
| variant-lammb-accessories-cap-tag-skeletal         | asset-lammb-accessories-cap-tag      | lammb-mutations-skeletal    | MISSING |
| variant-lammb-accessories-cap-tag-cybernetic       | asset-lammb-accessories-cap-tag      | lammb-mutations-cybernetic  | MISSING |
| variant-lammb-accessories-cap-tag-magma            | asset-lammb-accessories-cap-tag      | lammb-mutations-magma       | MISSING |
| variant-lammb-accessories-cap-tag-crystalline      | asset-lammb-accessories-cap-tag      | lammb-mutations-crystalline | MISSING |
| variant-lammb-accessories-cap-tag-botanical        | asset-lammb-accessories-cap-tag      | lammb-mutations-botanical   | MISSING |
| variant-lammb-accessories-cap-tag-void             | asset-lammb-accessories-cap-tag      | lammb-mutations-void        | MISSING |
| variant-lammb-accessories-beanie-chain-none        | asset-lammb-accessories-beanie-chain | lammb-mutations-none        | MISSING |
| variant-lammb-accessories-beanie-chain-skeletal    | asset-lammb-accessories-beanie-chain | lammb-mutations-skeletal    | MISSING |
| variant-lammb-accessories-beanie-chain-cybernetic  | asset-lammb-accessories-beanie-chain | lammb-mutations-cybernetic  | MISSING |
| variant-lammb-accessories-beanie-chain-magma       | asset-lammb-accessories-beanie-chain | lammb-mutations-magma       | MISSING |
| variant-lammb-accessories-beanie-chain-crystalline | asset-lammb-accessories-beanie-chain | lammb-mutations-crystalline | MISSING |
| variant-lammb-accessories-beanie-chain-void        | asset-lammb-accessories-beanie-chain | lammb-mutations-void        | MISSING |
| variant-lammb-accessories-shades-gold-none         | asset-lammb-accessories-shades-gold  | lammb-mutations-none        | MISSING |
| variant-lammb-accessories-shades-gold-skeletal     | asset-lammb-accessories-shades-gold  | lammb-mutations-skeletal    | MISSING |
| variant-lammb-accessories-shades-gold-cybernetic   | asset-lammb-accessories-shades-gold  | lammb-mutations-cybernetic  | MISSING |
| variant-lammb-accessories-shades-gold-magma        | asset-lammb-accessories-shades-gold  | lammb-mutations-magma       | MISSING |
| variant-lammb-accessories-shades-gold-botanical    | asset-lammb-accessories-shades-gold  | lammb-mutations-botanical   | MISSING |
