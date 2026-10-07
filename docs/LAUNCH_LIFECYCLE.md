# Launch lifecycle

## Locked product decisions

LAMMB is **The 5,280 Ascent** on Robinhood Chain (4663), with 5,280 supply, a 0 ETH primary mint (gas applies), OpenSea as the marketplace target, and delayed reveal. There is no token, staking, points, DAO or invented roadmap utility.

The global lifecycle vocabulary remains:

```text
PRE_ASCENT → ASCENT → MINT → RECOVERY → BLACKOUT → REVEAL → REVEALED
```

This is the intended narrative order, not an implemented transition engine or an approved transition policy. No date, countdown, social metric, client action or recovered-count threshold changes state. The future authority mechanism is unresolved.

## The 5,280 Ascent

| Altitude | Locked meaning                             |
| -------- | ------------------------------------------ |
| 0 FT     | Initial / pre-ascent experience            |
| 2,640 FT | Halfway milestone                          |
| 5,279 FT | Intentional final pause: **ONE FOOT LEFT** |
| 5,280 FT | Mint-launch altitude                       |

Altitude is deliberate, authorized launch data. Likes, retweets, followers, Discord activity, referrals, quests and points never determine it. It is independent of specimen recovery counts. The current schema permits ASCENT at integer altitudes 0 through 5,279; MINT explicitly requires 5,280. This presentation constraint is not a future chain enforcement rule.

`packages/collection/src/launch.ts` derives the milestone tuple from canonical supply. Validation requires the exact IDs, values and ordering. When development altitude is supplied, milestone history must include every reached canonical milestone once, in altitude order and nondecreasing timestamp order. History is supplied data, not fabricated by rendering. The development study at 5,279 includes clearly labeled synthetic dates; those dates are not a launch schedule. Future unavailable altitude requires unavailable history too.

## Validated state payloads

`createLaunchSnapshotSchema` extends the Task 001 state vocabulary. `launchSnapshotSchema` injects canonical supply. Every strict record requires version `1`, explicit development snapshot authority and a collector presentation. Unknown fields, unsupported versions, missing payloads and incompatible combinations fail closed before presentation derivation. No defaults silently create missing values.

| Global state | Required presentation payload                                                    |
| ------------ | -------------------------------------------------------------------------------- |
| PRE_ASCENT   | Canonical initial altitude and exact milestone tuple                             |
| ASCENT       | Authority-bearing altitude and milestone history, exact milestone tuple          |
| MINT         | Canonical launch altitude, NOT_CONNECTED mint integration, SEALED_SPECIMEN       |
| RECOVERY     | Authority-bearing recovered count and canonical supply                           |
| BLACKOUT     | Explicit message text and message version                                        |
| REVEAL       | PRESENTATION_ONLY availability and versioned title/detail                        |
| REVEALED     | PLACEHOLDERS_ONLY collection, UNAVAILABLE public traits, SCHEMA_ONLY share cards |

`createLaunchPresentation` parses an unknown snapshot and derives a typed view model, including formatted values, next milestone, reached markers, source labels and display boundaries. React renders visual variants; it does not decide launch rules. Invalid input throws before a partial presentation can be rendered. A future live reader must handle invalid input by withholding live actions/data, never silently substituting development fixtures.

`apps/web/src/config/launch.ts` keeps the homepage at PRE_ASCENT. `/development/launch` statically renders seven source-reviewed studies simultaneously. Its anchor links navigate the document; they do not select or mutate global state. It is marked DEVELOPMENT / NOT LIVE and excluded from indexing. No query parameter, environment override, local storage, state writer, API, clock or scheduler exists.

## Specimen recovery

The intended mint initially delivers an unrevealed **SEALED SPECIMEN**. No final traits or rarity are exposed. The recovery presentation is **SPECIMENS RECOVERED: x / 5,280**. Current UI displays **— / 5,280**, explicitly labeled future onchain supply unavailable; it performs no chain read and never substitutes zero for unknown supply.

Narrative markers 1,000, 2,640, 4,000, 5,000, 5,279 and 5,280 do not imply sellout or trigger another state. Development counts are accepted only with fixture authority and visible sample labeling. Even a development count of 5,280 remains RECOVERY. Counts must be integers from zero through canonical supply. The completion condition and authoritative supply-reader design remain unresolved.

## Blackout

BLACKOUT is a deliberate global state after the intended collection-complete condition. Neither that condition nor its authority is approved. A full recovered count is insufficient to enter blackout in this implementation. The view uses a versioned explicit message, minimal sealed-specimen study and text that remains readable with motion disabled. There is no automatic timer or transition.

## Break the Seal

The current REVEAL view is a presentation of the intended passage from sealed specimen through blackout to LAMMB reveal and a future collector share experience. There is no interactive reveal control, ownership check, metadata mutation, IPFS publication, contract reveal or OpenSea refresh. Replaceable abstract seal/gallery studies contain no NFT art or final traits.

## Global vs collector reveal state

A global state describes the collection's launch phase. A collector state describes an individual reveal presentation; it is neither a global transition nor proof of ownership. Version `1` explicitly uses `UNOWNED_PRESENTATION` and displays that no ownership is verified.

| Global presentation                   | Permitted collector presentation       |
| ------------------------------------- | -------------------------------------- |
| PRE_ASCENT / ASCENT / MINT / RECOVERY | sealed                                 |
| BLACKOUT                              | blackout                               |
| REVEAL                                | ready_to_reveal / revealing / revealed |
| REVEALED                              | revealed                               |

`collectorRevealPresentationSchema` validates all five collector states. During global REVEAL, individual presentations may be ready, showing a reveal study, or showing a revealed study. This compatibility table covers current unowned studies only. The future mapping for authenticated collectors, unminted visitors, partial reveals, retries and ownership changes needs independent approval. No animation or asynchronous operation is started by `revealing`.

## Data authority

| Vocabulary              | Meaning in Task 002                                                                                                                   |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| STATIC_CANONICAL        | Approved constants: initial/launch altitude, milestone definitions, supply and collection facts                                       |
| DEVELOPMENT_FIXTURE     | Explicit fixture ID; all selected launch states, study text/statuses and supplied example events/counts are development presentations |
| FUTURE_ONCHAIN          | Required future supply source, currently UNAVAILABLE with value null                                                                  |
| FUTURE_SERVER_AUTHORITY | Required future altitude/history source, currently UNAVAILABLE with value null                                                        |

Dynamic datums are strict unions: a value with fixture authority, or null with the appropriate unavailable future authority. Changing a fixture label to FUTURE_ONCHAIN while retaining a number is rejected. Dynamic fixture IDs must match the snapshot fixture ID. This version deliberately cannot represent a live numeric onchain/server datum; live readers and their authentication require future reviewed changes. Validation establishes structural consistency, not honest provenance or authorization.

Each panel carries DEVELOPMENT / NOT LIVE. Numeric datum labels appear beside values; canonical milestones and supply are separately labeled. Recovered-count absence is shown as unavailable, with no numeric progress meter. Fixtures never become live merely because the app runs in a production build.

## Current design direction

The presentation follows altitude → sealed specimens → recovery → blackout → Break the Seal → revealed collection/share foundation. The implementation is mobile-first, uses system fonts and replaceable visual studies, supports keyboard anchors and a skip link, and uses no animation. Reduced-motion preferences disable smooth scrolling. No wallet or external production service is needed.

The preferred fairness research sequence is commit → mint/allocation → reveal shuffle → public verification. Its unapproved schema boundary is documented in [art pipeline](ART_PIPELINE.md). The consolidated PARTNER_GTD model and public share-card boundary are documented in [collection](COLLECTION.md).

## Unresolved decisions

Progression authority, revision persistence, authorized transition policy, timing, completion condition, authoritative supply reads, blackout entry/exit, ownership/reveal synchronization, partial reveal/error behavior, specimen artwork/metadata, fairness protocol, partner deduplication and collector sharing delivery remain unresolved. None is shipped by the presentation model.

`launchStateChangeSchema` retains Task 001's future attributed audit-record boundary. It does not authenticate actors, prove timestamps, persist events, authorize transitions or enforce revision ordering. A future control service must authorize actors, persist append-only records, check expected revisions and reject conflicts before exposing trustworthy state.
