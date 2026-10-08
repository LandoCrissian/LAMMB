# Task 005 review record

Authorized main: `5d7d35556d672452ab5755834ef68319835b3447`. Branch: `codex/task-005-website-foundation`. No merge or deployment is performed by this task.

The commit message and draft PR title include `[skip netlify]` to suppress automatic branch deploys and Deploy Previews, respectively, following [Netlify's documented skip mechanism](https://docs.netlify.com/deploy/manage-deploys/manage-deploys-overview/#skip-a-deploy). GitHub verification CI remains enabled. Netlify project configuration is not changed.

## Local checks

| Command / check                           | Result                                                                                  |
| ----------------------------------------- | --------------------------------------------------------------------------------------- |
| `npm ci`                                  | PASS; locked npm 10.9.8 / Node 22.23.2; no graph changes                                |
| `npm run format` / `npm run format:check` | PASS                                                                                    |
| `npm run lint`                            | PASS                                                                                    |
| `npm run typecheck`                       | PASS across web and packages                                                            |
| `npm test`                                | PASS; 195 tests / 11 files                                                              |
| `npm run build`                           | PASS; all ten website routes prerendered                                                |
| Local production HTTP                     | All ten routes 200, individual titles, one main/H1, unavailable mint label              |
| Missing route                             | Custom not-found page, HTTP 404                                                         |
| Response security                         | Frame DENY, MIME sniffing denied, referrer policy, camera/microphone/geolocation denied |
| Local server                              | Bound only to 127.0.0.1; stopped after inspection                                       |
| Dependencies                              | NONE added; package files/lock, CI, Next config and domain models unchanged             |

Initially the new wording assertion was corrected. A pre-existing Windows source-file-symlink test failed with EPERM. The test now exercises the existing source-ancestor guard with an unelevated directory junction on Windows, while POSIX CI retains file symlinks; no test skipped, validation change or permission change.

## Accessibility and browser evidence — Task 005B

Source/markup inspection confirms shared semantic landmarks, one H1, skip target, visible focus rules, minimum 44px navigation targets, native FAQ details, labeled decorative slots, navigation disclosure state, Escape/focus-return handling, and no fake feature controls. CSS text contrast calculations: ink/background 17.37:1; muted/background 9.60:1; muted/surface 8.87:1; accent/surface 15.96:1; dark text/accent 17.26:1. These measure declared palette pairs, not every rendered state or a full accessibility audit. Reduced-motion CSS disables animation/transition and smooth scrolling.

Task 005 initially had no browser connector. Task 005B explicitly authorized an isolated Playwright fallback. Pre-install inspection found 75.34 GiB free disk and 3.41 GiB available RAM, bundled official Playwright 1.62.1 and installed Edge/Chrome. No dependency, browser binary or software was installed. Existing profiles were not used; one headless browser and one isolated context/page run sequentially. All network requests are restricted to the localhost test origin. Windows settings, Studio and other repositories are untouched.

Baseline screenshots of all ten routes at 320/390/768/1440px established zero page overflow or clipped headings. The screenshots revealed repeated boxed layouts, undersized supporting labels and weak distinction between placeholder compositions. Refinements replace destination cards with editorial rows, increase label sizes, add restrained midnight/Colorado geometry, distinguish identity/pixel/environment studies and show the seven canonical lifecycle chapters on Ascent. A revised desktop screenshot exposed cropped decorative specimen corners; size limits were corrected before final acceptance. No reference artwork was published or character generated. The Studio reference contact sheet was viewed only for direction.

The initial Edge refinement review passed 40 route/viewport cases and 28 interaction checks, with 58 screenshots and a sampled minimum of 2.407 GiB available RAM. Final acceptance uses the committed runner below against the production build; its per-browser `results.json` records the exact HEAD at execution, browser versions, website source digest, viewport geometry, console/network events, memory samples and screenshot SHA-256 values. Full homepage and other-route images plus menu/focus/FAQ/reduced-motion/404 views remain under ignored `artifacts/generated/task-005b/final/{msedge,chrome}/`. Final outcomes are recorded in the PR and generated acceptance report, not inferred from HTTP or source inspection.

```powershell
npm run start --workspace @lammb/web -- --hostname 127.0.0.1 --port 3005
# Separate terminal, using the already-bundled Playwright module:
node scripts/verify-website-browser.mjs --playwright-module C:/Users/RMT/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright --browser msedge --output task-005b/final
node scripts/verify-website-browser.mjs --playwright-module C:/Users/RMT/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright --browser chrome --output task-005b/final
```

The runner fails on page overflow, viewport-clipped heading text, duplicate IDs, missing images, invalid landmarks, menu/keyboard/focus/FAQ/reduced-motion failures or unexpected console/network errors. The deliberately requested unknown route must return 404; its expected console 404 is retained and identified separately. Browser contexts and the owned server are closed afterward. Prelaunch Windows RAM must be at least 2 GiB; sampling below 1 GiB prevents the next operation. These are browser-test guards, not GPU-inference authorization.

Mobile widths use touch/mobile viewport emulation in real Edge and Chrome engines; no physical iPhone/Safari, WebKit, Firefox or screen-reader certification is claimed. Owner visual approval and production artwork remain separate gates.

## Netlify

Initial root requests returned generic Netlify 404 with working DNS/TLS and www redirect. After the owner linked the new repository, root and `/development/launch` were independently verified as HTTP 200; the latter retains seven states. Account settings and deploy history remain inaccessible: NETLIFY_ACCOUNT_ACCESS_UNAVAILABLE. No causal claim about unobserved publish/routing settings. Evidence and exact owner inspection steps: [Netlify diagnosis](NETLIFY_DIAGNOSIS.md).

## Task 005 / 005B scope history and unresolved decisions

No web-ready character art is approved in the repository; clearly labeled abstract CSS slots and the existing altitude SVG are used. No concept mockup or AI character artwork is introduced. Future World, Profile and Mint are information-only routes, without registration, wallet/authentication/OAuth, ownership, database, counts or transactions. Country registry privacy, opt-in identity linking and transfer-aware invalidation are documented, not implemented.

No launch authority changes, state mutation, partner/rarity/date promises, chain/RPC/wallet code, tracking, credentials, domain/production configuration changes or deployment. The existing five high-severity development lint-chain advisories are reported by locked install; no forced dependency change is made.

Pending: owner visual review, approved artwork/framing, physical-device/Safari and assistive-technology review, official social/marketplace links, final editorial review, hosting/runtime/CSP review, registry geography/privacy/transfer rules and later authenticated mint/reveal/profile integrations. See [website boundaries](WEBSITE.md). Draft PR is for exact-head owner review, not production acceptance.

## Task 005C — cinematic sealed specimen experience

Authorized start: main `5d7d35556d672452ab5755834ef68319835b3447`, PR #5 head `62fd457ce671d380cc0830951d107f38543e610d`. Existing branch and draft PR only. No merge, deployment, account/domain configuration, dependency graph, canonical schema or offline generator changes.

The homepage now presents one desktop composition rather than a long sequence of landing-page sections: LAMMB typography, collection facts, deliberate exploration links, mountain/night-city vector atmosphere and the actual sealed specimen concept. Narrow screens put the specimen beside the sealed/reveal narrative and retain natural scrolling for facts/footer. The global footer is compact. Universe becomes a pre-reveal narrative; Collection and Mint present the sealed concept rather than repeated abstract gallery boxes. World/Profile remain future information pages. The seven existing launch presentations remain unchanged.

The owner explicitly authorized only the sealed views from `LAMMB-REF-003` for website preview. The 523,211-byte source is 1280×853 JPEG, SHA-256 `5f7becf4b2effc8c59be38da8d0ab52cfd957d6765a3eb85abdb1933b7a80bd2`. Original bytes remain unchanged in Studio and are preserved in ignored `artifacts/generated/task-005c/source/LAMMB-REF-003.jpg`. Native crop bounds (right/bottom exclusive): front `[899,43,1013,190]`, side `[1015,43,1114,190]`, rear `[1120,43,1224,190]`. Exact derivative hashes/dimensions and permission are in `apps/web/public/art/sealed-specimen/provenance.json`. The full sheet, adjacent annotations, reveal transformation and post-reveal character are not publicly served. No source art is repainted, resized, filtered or regenerated. Reproduction command using already-installed tooling:

```powershell
& C:/Users/RMT/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/python.exe scripts/extract-sealed-specimen.py C:/LAMMB-Studio/references/originals/LAMMB-REF-003.jpg
```

Desktop/mobile hamburger navigation and specimen inspection use native full-screen modal dialogs, explicit Tab wrapping, background inertness, scroll lock with cleanup, visible close controls and Escape/focus restoration. Inspection uses three actual 2D views, not simulated rotation or missing geometry. Buttons, touch and Left/Right/Home/End keys switch views, with a polite live caption. Only local presentation state changes; there are no wallet/mint/ownership/registration actions.

An initial browser review exposed native Tab traversal reaching browser chrome and a low mobile focal point. Explicit focus wrapping and a mobile two-column narrative/specimen composition corrected them. A second Edge review passed 40 route/viewport cases, 32 interaction checks and 80 screenshots; minimum sampled available RAM was 3.501 GiB. Screenshots then identified a decorative label overlapping the specimen heading at mobile/tablet widths; spacing was corrected. Final evidence is captured on the committed head, separately from these preliminary reviews:

```powershell
npm ci
npm run format
npm run format:check
npm run lint
npm run typecheck
npm test
npm run build
npm run start --workspace @lammb/web -- --hostname 127.0.0.1 --port 3005
node scripts/verify-website-browser.mjs --playwright-module C:/Users/RMT/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright --browser msedge --output task-005c/final
node scripts/verify-website-browser.mjs --playwright-module C:/Users/RMT/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright --browser chrome --output task-005c/final
```

The existing isolated browser setup adds no binaries/dependencies and uses no personal profiles. Each browser runs sequentially against localhost only. The acceptance runner records exact HEAD/web source digest, screenshot hashes, geometry, console warnings/errors and RAM samples. It checks all ten routes, nine navigation destinations, keyboard/touch modal controls, Tab/Shift+Tab containment and blocked background focus, Escape/focus return, three distinct image sources, reduced motion, FAQ, seven launch studies and custom 404. Full-page route images, viewport home/menu and all specimen views are in ignored `artifacts/generated/task-005c/final/{msedge,chrome}`. `ACCEPTANCE.md`/`ACCEPTANCE.json` record final outcomes, changed paths, asset provenance, exact-head CI and screenshot index; the final ZIP provides a local review bundle.

Vitest now has 198 tests across 12 files, including exact public asset digests/dimensions, native crop bounds, three-view-only publication, preview authorization and explicit separation from final art. These tests do not substitute for browser behavior. Locked install retains five inherited high-severity development lint-chain advisories; no forced upgrade is performed.

Visual differences from the owner concept are explicit: source specimen panels are only 99–114×147 pixels and remain soft at larger display sizes; the backdrop is decorative vector mountain/city atmosphere rather than the concept's detailed illustrated scenery; typography uses installed font fallbacks rather than a finalized custom graffiti wordmark; no revealed character, countdown, connected wallet, named partners or rarity chart appears. The compact page and inspection are a functional interpretation, not a claim of visual equivalence or approved final production art. A larger owner-approved specimen export, final brand assets and independent physical iPhone/Safari/screen-reader review remain unresolved. Final visual approval belongs to the owner.

## Task 005D — native cinematic homepage implementation

Authorized main remains `5d7d35556d672452ab5755834ef68319835b3447`; authorized PR #5 start is `bda000670081c8273bf20e5000476bb3746a47b1`. Existing branch/draft PR only. No merge, deployment, Netlify configuration, other repository, collection schema, generator, dependency, wallet, OAuth, database, tracking or launch-state authority change.

The existing crop sources cannot serve as detailed hero masters. A read-only Studio inventory found 13 original reference sheets, extracted panels and no native standalone sealed master. Task 005D therefore uses built-in image generation to create nine separate native website-preview assets. The original sealed design guides the object, not an upscaling operation. Each master is preserved offline, and its generation identifier/dimensions/SHA-256 and public WebP digest are recorded. Transparency is retained for three views and the graffiti wordmark. Every asset remains pending owner visual review and is explicitly excluded from production NFT artwork approval. Exact inventory and prompt specifications: [website artwork](WEBSITE_ART.md).

The new homepage uses separate scenic, specimen, wordmark and destination imagery beneath real DOM text, facts and links. No baked-in mockup controls, revealed character, crown, Colorado label/sign, invented count, countdown or functional mint/trailer is introduced. Supply renders as 5280, including the existing launch studies; canonical numeric values and seven-state schemas remain unchanged. Desktop and mobile have deliberate compositions, hamburger navigation, safe-area padding and natural scrolling. The existing native specimen dialog retains keyboard/touch controls, Escape/focus return, background inertness and reduced motion. The three views are independently illustrated concepts, not exact 3D geometry.

Initial actual Edge screenshots passed 40 route/viewport cases and 32 interaction checks. Visual review then identified an overly tall desktop hero and a mobile scenic background selected too small for cover framing. Hero typography/object scale and mobile image sizing were corrected, narrow-screen labels/action spacing tightened, and unused old homepage CSS removed. Final browser evidence is produced separately on the committed head at 320/390/768/1440 widths, with source and screenshot digests, viewport/full-page homepage and inspection screenshots, measured page length, image transfer sizes and observed layout shifts. Browser contexts are isolated, sequential and local-origin-only; no global browser or Windows configuration changes.

The owner-promised latest visual reference was not attached or provided as a path during the work. The written requirements and previously supplied concept direction are the available specification. Direct side-by-side fidelity to that missing image remains unverified; this is an implementation for owner visual review, not a claim of equivalence or artwork approval. Physical iPhone/Safari, screen-reader and high-DPR art review remain pending.

Final commands are `npm run format`, `npm run format:check`, `npm run lint`, `npm run typecheck`, `npm test -- --maxWorkers=2`, `npm run build`, and the existing browser runner with `--output task-005d/acceptance` for installed `msedge` and `chrome`. Native masters, preparation tooling and final ACCEPTANCE.md/JSON/screenshots stay under ignored `artifacts/generated/task-005d`; published files, source code and docs are committed. The existing PR title and every new commit retain `[skip netlify]` to prevent preview/branch deployment while preserving GitHub CI, as documented by [Netlify](https://docs.netlify.com/deploy/manage-deploys/manage-deploys-overview/).

The first exact-head Edge run completed every case but failed the aggregate network check on an aborted image request. Evidence is retained under task-005d/final. The runner now waits for image decoding between keyboard view changes and for the return-home image/network to settle before context teardown; failures are not suppressed. Final acceptance evidence is kept separately under task-005d/acceptance.
