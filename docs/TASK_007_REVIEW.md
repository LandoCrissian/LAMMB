# Task 007 — universe experience

Authorized main: `290974db59d9cb3f3a79597f49fe6f4bc5cb9d64`. Branch: `codex/task-007-universe-experience`. Draft review only; no merge, deployment, Netlify setting, application dependency or domain/schema change.

## Implemented journey

Home → Vault → three-view inspection → Collection/Mint/Ascent. The same sticky header and native hamburger dialog connect every public destination. Current destination text and an underlined `aria-current` link convey position without relying on color. Real links preserve deep links, refresh and browser history. A pathname-keyed menu resets presentation state and releases its body scroll lock when history changes underneath an open overlay.

The new Vault chamber layers the existing Universe corridor preview beneath the approved front specimen, with restrained hover/focus lighting. It reuses the native inspection dialog, visible close control, explicit focus containment, touch buttons, arrow/Home/End keys, Escape, live view caption and trigger-focus restoration. A native disclosure exposes all three illustrations independently. These remain separately illustrated 2D concept previews, not a minted specimen or a geometrically exact 3D model. No art bytes or provenance manifests changed.

Mobile Home reduces the wordmark to a 250px cap, moves the concise story alongside the specimen, removes decorative competing labels, retains at least 12px essential copy and 44px controls, and keeps the four existing visual destinations. Content can scroll naturally; it is not clipped into a forced viewport. The public status reads “THE VAULT IS SEALED.” with “MINT UNAVAILABLE”; footer copy says “THE FLOCK IS COMING.” No date, countdown, live count, wallet or transaction is introduced. The seven development launch studies remain explicitly labeled examples.

Without JavaScript, native destination links and static specimen/gallery content replace nonfunctional modal triggers. No new browser navigation abstraction, runtime animation library, external font or tracking is introduced. Server components render Vault and World. Client state remains limited to the existing dialog and specimen controls. Motion consists of short border/color/light transitions in response to deliberate interaction; reduced-motion preference disables them.

## World preview and future registration model

The World page uses original, approximate SVG continent silhouettes authored in `world-atlas.tsx`. It is a static schematic, not a geographic dataset, interactive map, territorial policy or activity visualization. Accessible title/description and a visible “ILLUSTRATION / NO LIVE ACTIVITY” caption make this explicit. No markers, registrations, country participation counts or geolocation exist.

The illustrated future journey is optional country selection → eligible owned specimen selection → voluntary participation. Before implementation, approved country/territory data must include a keyboard-accessible text selector. Wallet authentication must remain separate from current ownership verification. One eligible specimen can contribute only once; stale ownership, transfers, concurrent changes, finality and reorganizations require explicit fail-closed rules. Old-owner registrations must stop contributing on transfer; a buyer must independently consent and must never inherit a seller’s location. Public totals require authoritative data and freshness, not fixtures.

Country choice is self-reporting, not residence verification. No precise coordinates, inferred IP location or browser location prompt. Country/wallet/optional X associations must be private by default with separate consent, visibility controls, withdrawal, retention/deletion rules and low-count suppression. None of those adapters or policies is implemented here. See [website privacy boundaries](WEBSITE.md).

## Acceptance and evidence

`npm ci` uses the existing lockfile. `npm run verify` runs format check, lint, typecheck, all tests and production build. Lint now ignores `artifacts/generated/**`, matching Git’s existing generated-evidence exclusion; tracked application/tests/browser tooling remain linted. An old Task 006 evidence-packaging script in that ignored folder otherwise made repository lint fail. No test or source directory was excluded.

The existing Playwright installation and installed Edge/Chrome run sequentially on localhost, without existing user profiles or external requests. The browser runner now includes `/vault`, six widths (320/390/768/1024/1440/1920), Vault inspection, deep-link/refresh/back/forward, history navigation with the menu open, native fallback without JavaScript, current destination, sticky navigation, all three static illustrations and reduced motion including pseudo-elements. Existing homepage inspection, keyboard/touch/Tab/Escape/focus/inertness, FAQ, route geometry, asset/console, 404 and seven-launch-state checks remain.

Before screenshots are verified copies of Task 006’s existing final Edge captures. Their captured commit is `45f5427380942375ddc2f26bde5902a84db1bb71`; its tracked website files are byte-identical to authorized main. The baseline helper verifies the web-source digest and each PNG digest before copying. These are reused evidence, not claimed as newly captured. `artifacts/generated/task-007/before/evidence.json` records both revisions and verification.

New captures record actual tested HEAD, tracked website SHA-256, PNG digests, browser versions, viewport and RAM samples. Evidence belongs under ignored `artifacts/generated/task-007/acceptance/<browser>`. Before/after comparison uses full-page height, asset bytes and actual screenshots. Performance samples are unthrottled localhost DPR1 observations, not field Core Web Vitals or mobile network guarantees. LCP and non-input layout-shift sums are laboratory observations; no valid field INP is available. Physical iPhone/Safari, hardware safe-area and real assistive-technology testing remain owner review items.

```powershell
npm ci
npm run verify
# From apps/web, start only the local production preview:
$env:NEXT_TELEMETRY_DISABLED='1'
node ../../node_modules/next/dist/bin/next start --hostname 127.0.0.1 --port 3005
# In a separate terminal from the repository root, run sequentially:
node scripts/verify-website-browser.mjs --playwright-module C:/Users/RMT/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright --browser msedge --output task-007/acceptance
node scripts/verify-website-browser.mjs --playwright-module C:/Users/RMT/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright --browser chrome --output task-007/acceptance
```

Stop the owned local server after acceptance. The existing runner requires 2GiB available RAM before launching and stops further operations if samples cross 1GiB. Do not lower the guard or change Windows memory settings. Commits and draft PR title retain `[skip netlify]`; no deploy is authorized. Exact-head results, CI and any unresolved limitations are recorded with the draft PR, not inferred from this reproduction guide.

## Local resource limitation and isolated acceptance

Local implementation checks passed: locked install, format, lint, typecheck, 204 tests and production build. An initial Edge 320px probe covered all eleven routes and passed geometry/assets, menu keyboard/touch/Escape/focus and homepage inspection checks. It revealed that native closed disclosure images must be excluded from visible-image checks, and that client-side history transitions require explicit URL waits. Those test corrections are made. Screenshot review also moved the mobile Vault chamber ahead of its explanatory facts. Initial captures under `refinements-03` are preliminary, not final acceptance.

Before the next local run, available RAM dropped below the existing 2GiB browser-launch guard. No browser was launched by that blocked attempt. With owner authorization to free RAM, a verified standalone background Edge instance was stopped. Codex/ChatGPT, their Node tools and WebView2 were protected. Windows denied attempts to close an elevated Task Manager and Spotify in the other session; no elevation or credentials were used. The local preview was shut down.

The CI browser job provides an isolated acceptance environment without further Legion memory pressure. GitHub’s [Windows 2025 runner inventory](https://github.com/actions/runner-images/blob/main/images/windows/Windows2025-Readme.md) includes installed Edge and Chrome. The job installs only pinned `playwright-core@1.62.1` under `RUNNER_TEMP`, with install scripts and browser downloads disabled. This lightweight, test-only driver is justified by the local RAM constraint; no application package/lockfile or Legion installation changes. No browser binaries, fonts or heavy libraries are installed. Both verification and browser jobs check out the exact PR head using a read-only token and no persisted Git credentials.

`verify-website-ci.mjs` starts an owned preview bound to 127.0.0.1, waits for readiness, runs Edge/Chrome sequentially, and stops that preview in `finally`. The existing RAM guard remains active on the runner. Artifacts contain screenshot digests, exact HEAD, environment, run ID, geometry, interactions and lab measurements, with 14-day retention. They are Actions review artifacts, not a production deployment. Acceptance requires successful job results and separate visual inspection of the actual captures; workflow configuration alone is not evidence of success. Final results and exact artifact links are recorded with the draft PR.
