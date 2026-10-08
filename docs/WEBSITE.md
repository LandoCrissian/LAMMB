# Website foundation

## LOCKED

Canonical facts come from `packages/collection`. The seven launch states, data authority model and collector reveal distinction remain unchanged; see [launch lifecycle](LAUNCH_LIFECYCLE.md). Free primary mint requires network gas. No crowns, announced partners, final traits/rarity, countdowns or launch dates are introduced.

## DEVELOPMENT IMPLEMENTATION

| Route                 | Presentation                                                                       |
| --------------------- | ---------------------------------------------------------------------------------- |
| `/`                   | Compact cinematic viewport, canonical facts and approved sealed concept inspection |
| `/universe`           | Pre-reveal identity/story and decorative mountain/night-city vector atmosphere     |
| `/collection`         | Approved sealed concept inspection, delayed reveal and integrity boundaries        |
| `/ascent`             | Four static canonical milestones and existing PRE_ASCENT presentation              |
| `/community`          | Flock narrative, access vocabulary, future information links                       |
| `/faq`                | Native HTML question disclosures                                                   |
| `/world`              | Country registry information; no actual map or registrations                       |
| `/profile`            | Collector profile information; no authenticated gallery                            |
| `/mint`               | Unavailable mint information; no transaction controls                              |
| `/development/launch` | All seven explicitly labeled static development studies                            |

The root layout owns the skip link, one main landmark, global header and compact footer. Pages have individual headings/metadata; a custom not-found page returns visitors home. Desktop and mobile share a nine-destination hamburger navigation in a native modal dialog. Ordinary links retain Tab order; explicit Tab/Shift+Tab wrapping prevents focus leaving the dialog. Escape and the visible close control restore the trigger's focus. Native modal inertness prevents background interaction, and body scrolling is temporarily locked with cleanup on close/unmount. Selecting a destination closes navigation. Footer links and native FAQ disclosures remain usable without JavaScript.

The server-rendered architecture remains intact. Small client components handle only navigation and specimen view selection; no launch state, ownership or transaction authority moves to the client. CSS is local, mobile-first and content-driven. Natural vertical scrolling remains when a short/narrow viewport cannot fit content. No page overflow is concealed to hide failures. Focus outlines, minimum 44px actionable targets, contrast-conscious palette and reduced-motion rules are preserved. There are no external fonts/scripts, tracking or autoplay audio.

## Artwork provenance — owner-authorized preview

Task 005C explicitly authorizes the sealed specimen portion of owner-supplied `LAMMB-REF-003` for website preview. This does not approve production NFT artwork or the rest of the concept sheet. Original SHA-256: `5f7becf4b2effc8c59be38da8d0ab52cfd957d6765a3eb85abdb1933b7a80bd2`. The Studio original stays unchanged; a byte-identical preservation copy is under ignored `artifacts/generated/task-005c/source`. The whole sheet is not publicly served.

`apps/web/public/art/sealed-specimen/provenance.json` records the authorization, attachment ID, source size/dimensions/hash, native crop coordinates, output dimensions/bytes/hashes and limitations. Front (114×147), side (99×147), and rear (104×147) are crops converted to lossless RGB PNG. No repainting, upscaling, sharpening, color changes, inference or reconstructed geometry is performed. `scripts/extract-sealed-specimen.py` reproduces the extraction using an existing Pillow installation and fails on a source hash mismatch or conflicting output. Pillow is preparation tooling, not a new project/runtime dependency. Public image delivery bypasses optimization to preserve these PNG bytes.

The hero, Collection and Mint use the front view as a labeled concept preview. Activating it opens a full-screen inspection dialog; FRONT/SIDE/REAR buttons and Left/Right/Home/End keys select actual extracted 2D views. Touch activates the same buttons. A polite live caption announces the selected view. Escape/visible close restore trigger focus. This is not a 3D rotation, minted NFT, live supply display or revealed character gallery.

These source panels are small JPEG-derived previews. CSS display sizing cannot restore detail; larger screens expose that resolution limit. The post-reveal example, adjacent captions/arrows/borders, unapproved portraits, crowns, rarity charts and partner claims are excluded. All final character artwork remains pending. Decorative vector mountains/city silhouettes are atmosphere, not collection environments or final art. The owner must independently review visual fidelity and eventual larger approved web assets.

## CURRENT DESIGN DIRECTION: LAMMB World

Optional country-level self-reporting: select a country and verified owned specimens; authoritative aggregates could eventually illuminate the global flock. Country choice does not verify nationality, residency or physical location. No geometry library, registry schema, endpoint or simulated count exists in Task 005.

Future boundaries must separate:

- Approved/versioned country and territory data, map presentation and a keyboard-accessible text/list country selector. Color alone cannot convey activity.
- Authentication from current ownership verification using approved chain, collection and token identifiers. Signed-challenge replay/domain/expiry controls require review; no protocol is selected here.
- Registry write authorization from presentation. One specimen must not be counted repeatedly. Idempotency, concurrent transfer races, stale evidence, finality and chain reorganizations require approved rules.
- Transfer-aware invalidation. Old-owner registrations must expire, become unavailable or be revoked after transfer. A buyer must not inherit the seller's country or consent. Exact refresh/invalidation policy is unresolved; fail closed when ownership evidence is stale/unavailable.
- Public aggregate reads from private registrations. Display source and freshness; unknown counts are unavailable, not zero. Fixtures can never appear as live participation.

## Privacy requirements before implementation

Country plus wallet/optional X identity can enable correlation. Participation and public identity linking need separate opt-in consent, withdrawal/unlinking, visibility controls and approved retention/deletion policies. No precise coordinates, address, browser geolocation or inferred IP location. Wallet/country/X associations must not be public by default. Low-count suppression, abuse resistance, access control, rate limits and private audit retention require review; transfer histories must not expose historical locations. No analytics or location permission is requested here.

Profiles eventually consume verified ownership and public revealed metadata, preserving sealed-trait privacy. Optional X linking requires consent, authentication/OAuth security and disconnect behavior. Mint eventually consumes approved launch/access authority and verified chain/contract data. These adapters are unimplemented. An information page never authorizes minting, reveal, ownership or registration.

## Verification

Run `npm ci`, `npm run format`, `npm run format:check`, `npm run lint`, `npm run typecheck`, `npm test`, `npm run build`. New markup tests verify links, one landmark shell, explicit feature unavailability, native FAQ semantics and preservation of seven authority-labeled launch studies. They do not prove browser layout/interaction. Existing source-link security tests use an unelevated Windows junction for ancestor checks; POSIX CI retains direct file symlinks. No validation rule or Windows setting changes.

Task 005B adds `scripts/verify-website-browser.mjs`, a manual acceptance runner using an existing official Playwright installation and installed Edge/Chrome channels. It adds no package dependency, browser download or global configuration. It checks ten routes at 320/390/768/1440px, document scroll/client width, heading clipping, unique IDs, landmarks, navigation, Tab/Enter/Space/Escape/focus return, skip link, native FAQ, reduced-motion emulation, console/network errors, missing assets and 404 return navigation. Touch/mobile contexts emulate narrower devices; they do not certify physical iPhone/Safari behavior. Browser inputs and screenshots are actual engine evidence, not HTTP/string snapshots. See [review record and exact commands](TASK_005_REVIEW.md).

Task 005B evidence stays under ignored `artifacts/generated/task-005b`; Task 005C evidence uses `artifacts/generated/task-005c`. Run against the production build on localhost; never production deployment. The runner records HEAD and a digest of tracked web source files at execution and exits nonzero on failure. Browser sessions are fresh and sequential, requests outside the local origin are blocked, and Windows memory guards stop further operations under pressure. The app keeps its server-rendered architecture; the manual runner is not a runtime dependency. Task 005C adds modal inertness/focus containment, all three 2D inspection views, keyboard/touch switching and screenshots at every width. Screenshot review checks the compact composition against the owner concept direction; passing automated checks does not establish visual equivalence or owner art approval. Ascent renders the existing schema's seven lifecycle names as static narrative chapters, without modifying domain state or transition authority.

## UNRESOLVED PRODUCTION DECISIONS

Approved art/brand assets/framing; verified social/marketplace links; editorial review; launch authority/timing; geography/privacy/transfer rules; authentication/ownership/OAuth; profile visibility; contract/mint/reveal integration; hosting/CSP. No production readiness or delivery promise is made. See [Netlify diagnosis](NETLIFY_DIAGNOSIS.md).
