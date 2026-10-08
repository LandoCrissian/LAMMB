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

Task 005D authorizes separate website-preview assets made with the built-in image-generation tool when the existing files cannot support a detailed hero. The Studio inventory contained 13 owner-supplied concept sheets and extracted panels, but no standalone high-resolution sealed master. The historical Task 005C front/side/rear crops (99–114 pixels wide) stay unchanged for provenance and are no longer used by the homepage or inspection.

Nine separate previews now live in `apps/web/public/art/cinematic-preview`: a native front/three-quarter specimen master, matching side and rear illustrations, mountain/city scenic plate, transparent graffiti wordmark, and four distinct Collection/Universe/Ascent/Community destination illustrations. No full-page mockup, post-reveal character, crown or Colorado text/sign appears. The source-sheet digest, native-master and public-file dimensions/hashes, creation tool, optimization and preview-only permission are recorded in `provenance.json`. Native PNG masters are preserved in ignored `artifacts/generated/task-005d/source`. See [asset inventory and prompt specifications](WEBSITE_ART.md).

These are newly generated native illustrations, not enlarged tiny crops, final NFT artwork or production approvals. The specimen shape reference was the owner-authorized sealed region of LAMMB-REF-003; side/rear use the new front master as design guidance. The three views are independently illustrated 2D previews, with visible design variation; they are not exact 3D geometry. No local GPU inference, new model, software, custom node or dependency was used.

The homepage composes a scenic image, transparent wordmark/specimen and genuine text/links in DOM/CSS. The scenery contains no webpage controls or baked-in copy. A desktop two-column hero, compact fact strip, four destination panels and footer replace the old abstract presentation. Mobile uses its own grid composition and retains natural scrolling. Supply typography is `5280`, including launch-study rendering; canonical numeric values, schemas and launch authority are unchanged. Hero copy includes free mint plus the gas caveat, Robinhood Chain, sealed specimens and delayed reveal. Mint/trailer transactions are unavailable; links lead only to implemented information pages.

Next Image supplies responsive delivery and reserved image dimensions. Existing Sharp 0.35.5 was used offline only to downsample where appropriate and encode WebP, preserving alpha for the specimen and wordmark. This is asset optimization, not reconstruction. The public source files total 1,873,328 bytes; only the selected inspection view is visible, and side/rear load on selection. No remote artwork or external font is requested.

Activating the specimen opens the existing full-screen native dialog. FRONT/SIDE/REAR buttons and Left/Right/Home/End keys select the available illustrations. Touch activates the same controls. A polite live caption announces the view; Escape and the visible close restore trigger focus, with background inertness and explicit focus wrapping. Reduced motion and safe-area padding are preserved. This is not a minted specimen, ownership claim or live supply display.

The latest promised visual specification was not attached or supplied as a local path during this implementation. Written Task 005D requirements and the previously supplied concept direction informed the work. Therefore direct side-by-side fidelity to that missing latest image remains unverified; browser checks and visual refinements do not constitute owner approval. Physical iPhone/Safari and assistive-technology review remain pending.

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

## Task 006 production audit and precision polish

The existing cinematic layout and all public artwork remain unchanged. Confirmed corrections raise essential homepage/fact/preview/footer labels to at least 12px, separate the Universe statement from its following copy, preserve the scenery's right focal point at tablet width, and match the desktop wordmark's responsive request to its 480px display cap. This does not change collection facts, launch authority, routing, interactions or future-feature boundaries.

The manual browser runner additionally accepts an explicitly authorized `https://lammb.fun` read-only audit, six widths including 1024/1920px, and a clearly labeled homepage-only lab probe. Fresh contexts restrict requests to the selected origin; no existing profiles, credentials, tracking, browser download or deployment are used. Full acceptance still covers all ten routes and existing interaction checks. Route response headers, LCP observations, layout shifts, transferred script/image/CSS bytes, font requests, image geometry and small-text evidence are recorded. These are laboratory observations, not field Core Web Vitals; field INP is unavailable. See [Task 006 review and commands](TASK_006_REVIEW.md).

## UNRESOLVED PRODUCTION DECISIONS

Approved art/brand assets/framing; verified social/marketplace links; editorial review; launch authority/timing; geography/privacy/transfer rules; authentication/ownership/OAuth; profile visibility; contract/mint/reveal integration; hosting/CSP. No production readiness or delivery promise is made. See [Netlify diagnosis](NETLIFY_DIAGNOSIS.md).
