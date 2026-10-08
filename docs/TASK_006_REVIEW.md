# Task 006: production audit and precision polish

## Scope

Authorized main: `92972362de3c157b68b934786eae3ee40cdb5d0e`. Branch: `codex/task-006-website-polish`. The existing cinematic composition, nine artwork files and provenance, collection/domain schemas, seven launch studies and interaction architecture are preserved. No new feature, dependency, artwork, wallet, authentication, database, blockchain service, 3D implementation, merge or deployment.

## Production baseline

Observed `https://lammb.fun` on 2026-10-08 UTC. All nine requested public routes returned HTTP 200 with the expected titles and cinematic content. All nine downloaded public preview artworks matched the authorized main files and published provenance digests byte for byte. Actual Edge checks covered ten routes (including the development studies) at 320, 390, 768, 1024, 1440 and 1920px. Navigation, three specimen views, FAQ, reduced motion, custom 404, console/network and geometry checks passed. No broken route, missing artwork, horizontal overflow or clipped heading was found in those checks.

Public headers include `server: Netlify`, durable/Next.js/edge cache status, `x-nf-request-id`, `x-nextjs-date`, HSTS, `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, referrer policy and camera/microphone/geolocation restrictions. Full headers, route titles and HTML/art hashes are retained in `artifacts/generated/task-006/production-baseline/http-assets.json`. The request ID identifies a request; the Next.js date identifies cached rendering. Neither is a deploy ID or Git SHA. Public evidence confirms content/art consistency but cannot prove the exact deployed application commit. No account-only deploy identifier or authenticated hosting configuration was accessed or changed.

## Confirmed corrections

| Issue                                                        | Evidence                                                                                                                      | Correction                                                                                                                                                                  |
| ------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Essential small print is difficult to read                   | Mobile gas caveat 9.6px; fact labels 8.8px; preview explanation 9.28px; destination descriptions 9.44px; footer status 10.4px | Minimum 12px for those labels and existing preview/footer copy. Mobile story and inspection label also reach 12px. Decorative kickers retain their existing scale.          |
| Universe headline crowds the following paragraph             | 320px and desktop screenshots show no block separation below “BUILT DIFFERENT.”                                               | Scoped 16px top margin on its following paragraph.                                                                                                                          |
| Tablet scenery clips the moon at the right edge              | Actual 768px screenshot                                                                                                       | Retain the existing 95% horizontal scenic focal point instead of switching to centered cropping at 768px.                                                                   |
| Desktop wordmark requests more pixels than its display needs | 1920px DPR1 request selects 1080px for a 480px display                                                                        | Declare the 480px desktop cap in `sizes`; the browser still selects larger sources for higher pixel densities. DPR1 selects 640px, retaining resolution above display size. |

Local before/after homepage image transfer at 1920px was 358338/339954 bytes, a measured 18384-byte reduction. Other tested DPR1 widths selected the same source sizes. This is an asset-delivery improvement, not a claimed field LCP improvement. Source images and artwork hashes did not change.

Before/after screenshot pairs for significant visual corrections:

- Small print: `local-before/msedge/home-390.png` / `local-after/msedge/home-390.png`.
- Tablet framing: `local-before/msedge/home-768.png` / `local-after/msedge/home-768.png`.
- Universe spacing: `production-baseline/msedge/universe-320.png` / `refinements/universe-320.png`, and the corresponding `universe-1440.png` pair.

All paths above are relative to ignored `artifacts/generated/task-006`. They are local review evidence, not public download URLs. Exact-head final captures and screenshot SHA-256 values belong in `acceptance/<browser>/results.json`; source digests distinguish preliminary captures from committed final acceptance.

## Performance evidence and limits

Production homepage observations below use Edge 154.0.4258.62 / Playwright 1.62.1, DPR1, unthrottled fresh contexts, one navigation per width, observed after network idle. Requests outside the selected origin are blocked. These are laboratory samples on the Legion, with Netlify caching observed. They do not represent percentile field data, mobile radio conditions or a guaranteed performance budget.

| Width | Observed LCP ms | Non-input layout-shift sum | Script transfer bytes | Image transfer bytes | Font requests |
| ----- | --------------: | -------------------------: | --------------------: | -------------------: | ------------: |
| 320   |            1300 |                          0 |                141869 |               181634 |             0 |
| 390   |             644 |                          0 |                141361 |               181634 |             0 |
| 768   |             496 |                          0 |                141361 |               145864 |             0 |
| 1024  |             656 |                          0 |                141274 |               198382 |             0 |
| 1440  |             600 |                          0 |                141524 |               293072 |             0 |
| 1920  |             608 |                          0 |                141488 |               385518 |             0 |

The homepage scenic image was the observed LCP element. Layout shifts observed without recent input were zero; the runner's sum is not a general implementation of CLS session-window scoring. `transferSize` includes response overhead and covers measured script/image requests, not all page data. No external font downloads occurred. Stylesheets and accessible render-blocking resource timing are recorded; the corrected local build transferred 8880 CSS bytes in the initial lab probe. Production and localhost transfer sizes/timings must not be compared as identical delivery conditions. No valid field INP dataset is available; functional interaction tests are not an INP measurement.

## Accessibility and visual review

The existing skip link, one main landmark and page heading, semantic navigation, named modal, explicit focus wrapping, native background inertness, visible focus, Escape/focus restoration, touch view controls, polite view announcements, native FAQ disclosures and reduced-motion behavior are retained. The browser record captures headings, destinations, image descriptions, actionable dimensions and keyboard/touch checks. No color-only status or simulated live data is introduced.

Declared solid foreground/background pairs were calculated using WCAG relative luminance: muted text on surface 8.09:1, gas caveat on fact strip 11.17:1, chartreuse on surface 16.07:1, dark button text on chartreuse 17.19:1. These calculations do not certify every image-backed pixel. Screenshot inspection is separate from passing assertions. Increasing small labels adds natural wrapping/height at narrow widths; controls and copy remain accessible rather than forcing a single viewport.

Physical iPhone/Safari, device safe-area hardware and real screen-reader behavior remain untested. The available browser tooling does not include an installed axe package; no dependency was added to claim certification. Independently illustrated specimen views retain the documented 2D variation and are not a geometric 3D model. Fine decorative labels, final artwork/editorial approval and future product/launch decisions remain owner decisions.

## Reproduction and acceptance

Use the existing official Playwright installation and installed Edge/Chrome. No downloads or global configuration are required. The runner records HEAD, tracked web-source digest, browser version, viewport, screenshot digests and RAM samples. `--home-only` deliberately omits interaction acceptance and is labeled accordingly. Full runs exit nonzero on failed assertions or the RAM floor.

```powershell
npm ci
npx --no-install prettier --write apps/web/src/app/homepage.css apps/web/src/app/cinematic.css apps/web/src/app/page.tsx scripts/verify-website-browser.mjs docs/WEBSITE.md docs/TASK_006_REVIEW.md
npm run verify
# verify runs format:check, lint, typecheck, 201 tests and the production build.
$env:NEXT_TELEMETRY_DISABLED='1'
npm run start --workspace @lammb/web -- --hostname 127.0.0.1 --port 3005
```

From a separate terminal, sequentially:

```powershell
node scripts/verify-website-browser.mjs --playwright-module C:/Users/RMT/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright --browser msedge --origin https://lammb.fun --widths 320,390,768,1024,1440,1920 --output task-006/production-baseline
node scripts/verify-website-browser.mjs --playwright-module C:/Users/RMT/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright --browser msedge --widths 320,390,768,1024,1440,1920 --home-only --output task-006/local-before
# Capture local-before only from the authorized baseline build before edits.
node scripts/verify-website-browser.mjs --playwright-module C:/Users/RMT/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright --browser msedge --widths 320,390,768,1024,1440,1920 --home-only --output task-006/local-after
node scripts/verify-website-browser.mjs --playwright-module C:/Users/RMT/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright --browser msedge --widths 320,390,768,1024,1440,1920 --output task-006/acceptance
node scripts/verify-website-browser.mjs --playwright-module C:/Users/RMT/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright --browser chrome --widths 320,390,768,1024,1440,1920 --output task-006/acceptance
```

Stop the owned localhost server with Ctrl+C after acceptance. Final browser results, exact-head CI and working-tree status are reported with the draft PR. Bulk captures stay ignored. Commits and the draft PR title include `[skip netlify]` to prevent automatic Netlify builds; hosting settings and production are not modified.
