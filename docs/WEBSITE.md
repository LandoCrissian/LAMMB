# Website foundation

## LOCKED

Canonical facts come from `packages/collection`. The seven launch states, data authority model and collector reveal distinction remain unchanged; see [launch lifecycle](LAUNCH_LIFECYCLE.md). Free primary mint requires network gas. No crowns, announced partners, final traits/rarity, countdowns or launch dates are introduced.

## DEVELOPMENT IMPLEMENTATION

| Route                 | Presentation                                                               |
| --------------------- | -------------------------------------------------------------------------- |
| `/`                   | Identity, canonical facts, sealed visual slot, Ascent and PRE_ASCENT study |
| `/universe`           | Character DNA and visual direction; replaceable artwork slots              |
| `/collection`         | Sealed/reveal narrative, gallery and provenance boundaries                 |
| `/ascent`             | Four static canonical milestones and existing PRE_ASCENT presentation      |
| `/community`          | Flock narrative, access vocabulary, future information links               |
| `/faq`                | Native HTML question disclosures                                           |
| `/world`              | Country registry information; no actual map or registrations               |
| `/profile`            | Collector profile information; no authenticated gallery                    |
| `/mint`               | Unavailable mint information; no transaction controls                      |
| `/development/launch` | All seven explicitly labeled static development studies                    |

The root layout owns the skip link, one main landmark, global header and footer. Pages have individual headings/metadata; a custom not-found page returns visitors home. The only client component is navigation: ordinary keyboard activation, `aria-expanded`/`aria-controls`, route indication, Escape closes and restores button focus, and choosing a link closes it. It is a disclosure, not a modal or ARIA menu; links retain ordinary Tab order. Below 1100px navigation collapses; footer links remain accessible without JavaScript. FAQ disclosures require no client JavaScript.

CSS is local and mobile-first. Grid tracks use `minmax(0, ...)`; content wraps and page overflow is never hidden to mask failures. Only decorative drawings clip their own bounds. Focus outlines, 44px navigation targets, contrast-conscious palette and reduced-motion rules are included. There are no external fonts/images/scripts, tracking or animations. Client navigation imports only a small array, not collection validation or offline generation tools.

## Artwork provenance

No approved web-ready character assets exist in the repository. Owner concept sheets in LAMMB Studio are not implicitly publication-approved. The site uses explicitly captioned CSS specimen/identity/system/scene slots and the existing decorative altitude SVG. These are abstract studies, not NFT art. No mockup, panel, new character art or extracted portrait is copied to public assets. Replacement requires approved web artwork, source/permission reference, digest, accessible text and crop/sizing review. Historical concept percentages and trait labels establish no production promise.

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

Screenshots and digest-bound results stay under ignored `artifacts/generated/task-005b`. Run against the production build on localhost; never production deployment. The runner records HEAD and a digest of tracked web source files at execution and exits nonzero on failure. Browser sessions are fresh and sequential, requests outside the local origin are blocked, and Windows memory guards stop further operations under pressure. The app keeps its server-rendered architecture; the manual runner is not a runtime dependency. Screenshot review refines editorial layouts, legible supporting labels and abstract Colorado/pixel/scene treatments while retaining all approval labels. Ascent renders the existing schema's seven lifecycle names as static narrative chapters, without modifying domain state or transition authority.

## UNRESOLVED PRODUCTION DECISIONS

Approved art/brand assets/framing; verified social/marketplace links; editorial review; launch authority/timing; geography/privacy/transfer rules; authentication/ownership/OAuth; profile visibility; contract/mint/reveal integration; hosting/CSP. No production readiness or delivery promise is made. See [Netlify diagnosis](NETLIFY_DIAGNOSIS.md).
