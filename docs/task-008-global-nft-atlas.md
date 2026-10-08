# Task 008 — Global NFT Atlas

The `/world` route is an interactive geographic atlas. Country selection explores geography only. **REGISTRY NOT YET LIVE** remains visible. There are no wallets, ownership reads, signatures, registrations, collector totals, database, geolocation, OAuth, mint transactions or new production services.

## Engine decision

| Option                               | Country geometry and interaction                                                                                        | Hosting, cost and accessibility                                                                                                                         | Decision                                                   |
| ------------------------------------ | ----------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------- |
| MapLibre GL JS 6.13.0 / BSD-3-Clause | Excellent WebGL polygon rendering, pan and pinch; needs a style and geographic sources                                  | Large runtime for this limited country view; WebGL and a separate accessible country alternative; tile hosting would introduce operational dependencies | Consider later if genuinely needed for dense live overlays |
| Leaflet 1.9.4 / BSD-2-Clause         | Mature touch map with GeoJSON layers                                                                                    | Tile-oriented interface and extra runtime/CSS; accessible list still required                                                                           | Suitable, but unnecessary for this atlas                   |
| D3 geo 3.1.1 / ISC, projected SVG    | Spherical projection, clipping and true country paths; native SVG hit testing; pointer pan/pinch implemented explicitly | D3 runs only during asset preparation; one local JSON asset, no WebGL, tile requests, API keys or runtime map dependency                                | Selected                                                   |

Primary references: [MapLibre](https://maplibre.org/maplibre-gl-js/docs/), [Leaflet](https://leafletjs.com/), [D3 geographic projection](https://d3js.org/d3-geo). D3 is a pinned **development dependency**. It adds `d3-array` and `internmap` transitively for preparation, not for the browser. No UI or animation library was added.

## Geography and reproducibility

`scripts/prepare-atlas.mjs` fetches hash-verified source bytes into an ignored preparation cache, groups source map units by `ISO_A2_EH`, and projects the original polygon vertices with Equal Earth. It emits country metadata, ISO identifiers, geographic paths and `public/maps/provenance.json`. The generated JSON is served only from the site's own origin. No tile or font vendor is contacted by the atlas. Static hosting can serve these assets; initial delivery still requires the website to be reachable. This is not a service-worker/offline-install feature.

- Natural Earth **v5.1.2**, repository commit `f1890d9f152c896d250a77557a5751a93d494776`, public domain. **50m admin-0 map units** provide the main polygons; **10m map units** supplement Gibraltar and Bouvet Island only.
- Country names, aliases and ISO codes: `node-i18n-iso-countries` **v7.14.0**, MIT. `XK` is excluded from the ISO country catalog. License copies and exact source hashes accompany the assets.
- **249** searchable ISO countries/territories, **248** with polygons. **UM** is searchable but has no source geometry; the UI does not invent it.
- Four non-ISO areas retain neutral, dashed source geometry: Kosovo, Somaliland, Northern Cyprus and Siachen Glacier. They do not acquire invented ISO identifiers or registration eligibility. These areas are explained in map notes rather than treated as selectable registry countries.
- Natural Earth uses de facto boundary treatment. Disputed borders, territory labels and admission policy require owner review before a registry launches. This generalized dataset is not a legal or navigation authority.
- Polygon islands, holes and antimeridian clipping are retained. No hand-drawn country approximations. A country highlight covers all its mapped components; automatic focus uses the largest component to avoid zooming out across the whole globe for scattered territories. Other islands remain discoverable by pan/reset.
- Microstate outlines are source-generalized and can be too small for global-scale touch hit testing. Search/list selection provides exact country identity, bounded zoom and honest geometry. It does not enlarge a country's outline or claim fabricated detail.

Reproduce assets with `node scripts/prepare-atlas.mjs` after `npm ci`. Format generated metadata and provenance with the repository formatter; the compact path asset is intentionally excluded from formatting to preserve its recorded byte digest. No generation time is embedded in the deterministic output. `tests/atlas.test.ts` verifies the path digest, ISO coverage, missing geometry, component presence and domain/gesture boundaries.

## Interaction and accessibility

Country selection uses actual SVG fill hit testing. Dragging never intentionally selects a country, and two Pointer Events control anchored pinch zoom. Pointer capture is limited to a gesture. Arrow keys pan the focused map, `+`/`−` zoom and Home/0 reset. Visible zoom/reset controls and a native search input/list provide an independent alternative to spatial interaction. Touch gestures are scoped to the map; surrounding content keeps native page scrolling and browser zoom.

Country and community state uses native URL fragments (`/world#country=FJ&community=lammb`), retaining refresh, deep links and browser history. No router replacement or custom back button. No location choice is sent to a registry or saved in local storage. Fragments are user-visible and can be shared; they are not secrets. Other navigation remains normal Next.js links.

The SVG has a concise image description and keyboard instructions; 248 polygons are not forced into the screen-reader/tab sequence. The named country list and selected-country status provide the screen-reader alternative. Mobile details use a button with `aria-expanded`/`aria-controls`; selection opens the sheet without moving focus or trapping the user. Desktop details remain visible. Native disclosures contain map notes, country search and future admission candidates. JavaScript-disabled visitors retain the geographic name list and site navigation; they do not receive a pretend functional map. Failed boundary delivery exposes retry and keeps search usable.

All labels, explanatory text and controls are at least 12px; primary search is 16px, map buttons/list links are at least 44px. Focus is visible. No autoplay, flashing, permanent animation or animation library. Reduced motion disables effects; pan/zoom are immediate responses to deliberate input. The mobile details region can extend the page when expanded; accessibility takes priority over forcing one viewport.

## Multi-collection contracts

`@lammb/schema/atlas` defines strict chain, collection, contract, token ID, country, admission, registration, collection filter and participation contracts. Chain is restricted to **4663 / Robinhood Chain**. Decimal token IDs are canonical strings bounded to uint256; they never pass through JavaScript numbers. ISO membership uses the versioned catalog.

LAMMB is the **founding collection concept**, with pending admission and a null contract. CCFF00 Squares, CCFF00 Circles, Cats on Drugs, Jiggalets and Pixel Hood are **candidates only**, not active filters or admitted projects. A collection marked ADMITTED requires a verified contract/evidence declaration; this schema validates shape, not the authenticity of that evidence. It does not replace a future authority service.

The public snapshot is `UNAVAILABLE`, with records `null`, never an empty array presented as live zero activity. A separate `DEVELOPMENT_FIXTURE` view requires a fixture identifier. Filtering tests cover multiple admitted test collections, selected country, transfer-stale records and private/withdrawn visibility. Fixtures exist in tests only; synthetic addresses are never shipped as collection addresses or shown as live data. Current public All Communities/LAMMB filters select the future view and retain the truthful empty state. A future approved collection can be added only through explicit admission and verified configuration, not inferred from the candidate list.

Collection admission, verified ownership, registration and public display are independent. One address is not one person, one collector or one country. ERC1155 quantities are not human counts; quantity and unique-record metrics need explicit policy before public aggregation.

## Acceptance evidence

The existing sequential Edge/Chrome runner now includes all six requested widths: 320, 390, 768, 1024, 1440, 1920. It retains navigation, Vault, 404, reduced-motion and no-JavaScript checks and adds native country hits, search, filters, pointer pan, keyboard zoom/reset, native two-touch pinch emulation, details, fragment history, islands/microstates, missing UM geometry and deliberate map-asset failure/retry. Evidence includes exact head, screenshot digests, browser version and unthrottled laboratory resource/LCP/CLS measurements. No field INP is inferred. Physical phones, VoiceOver/NVDA and geopolitical naming policy require independent review.

Browser jobs run in isolated Windows CI with installed Edge/Chrome and a temporary pinned Playwright driver. This avoids the Legion's constrained RAM. Tests and build results are recorded in the draft PR; no Netlify settings or production deployment are changed. Commits use `[skip netlify]`.
