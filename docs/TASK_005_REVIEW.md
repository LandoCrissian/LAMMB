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

## Scope and unresolved decisions

No web-ready character art is approved in the repository; clearly labeled abstract CSS slots and the existing altitude SVG are used. No concept mockup or AI character artwork is introduced. Future World, Profile and Mint are information-only routes, without registration, wallet/authentication/OAuth, ownership, database, counts or transactions. Country registry privacy, opt-in identity linking and transfer-aware invalidation are documented, not implemented.

No launch authority changes, state mutation, partner/rarity/date promises, chain/RPC/wallet code, tracking, credentials, domain/production configuration changes or deployment. The existing five high-severity development lint-chain advisories are reported by locked install; no forced dependency change is made.

Pending: owner visual review, approved artwork/framing, physical-device/Safari and assistive-technology review, official social/marketplace links, final editorial review, hosting/runtime/CSP review, registry geography/privacy/transfer rules and later authenticated mint/reveal/profile integrations. See [website boundaries](WEBSITE.md). Draft PR is for exact-head owner review, not production acceptance.
