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

## Accessibility and browser limits

Source/markup inspection confirms shared semantic landmarks, one H1, skip target, visible focus rules, minimum 44px navigation targets, native FAQ details, labeled decorative slots, navigation disclosure state, Escape/focus-return handling, and no fake feature controls. CSS text contrast calculations: ink/background 17.37:1; muted/background 9.60:1; muted/surface 8.87:1; accent/surface 15.96:1; dark text/accent 17.26:1. These measure declared palette pairs, not every rendered state or a full accessibility audit. Reduced-motion CSS disables animation/transition and smooth scrolling.

**Browser results: NOT RUN at 320, 390, 768 and 1440px.** No browser surface is exposed through computer-use; IAB, Edge and Chrome each report unavailable, and the Codex local-preview open request is queued. The owner was asked to enable access; no connection is available at verification time. Overflow, visual composition, interactive keyboard/menu behavior, reduced-motion emulation and browser console errors remain required owner-review gates. Successful HTTP/markup/build results are not substituted for those checks.

## Netlify

Initial root requests returned generic Netlify 404 with working DNS/TLS and www redirect. After the owner linked the new repository, root and `/development/launch` were independently verified as HTTP 200; the latter retains seven states. Account settings and deploy history remain inaccessible: NETLIFY_ACCOUNT_ACCESS_UNAVAILABLE. No causal claim about unobserved publish/routing settings. Evidence and exact owner inspection steps: [Netlify diagnosis](NETLIFY_DIAGNOSIS.md).

## Scope and unresolved decisions

No web-ready character art is approved in the repository; clearly labeled abstract CSS slots and the existing altitude SVG are used. No concept mockup or AI character artwork is introduced. Future World, Profile and Mint are information-only routes, without registration, wallet/authentication/OAuth, ownership, database, counts or transactions. Country registry privacy, opt-in identity linking and transfer-aware invalidation are documented, not implemented.

No launch authority changes, state mutation, partner/rarity/date promises, chain/RPC/wallet code, tracking, credentials, domain/production configuration changes or deployment. The existing five high-severity development lint-chain advisories are reported by locked install; no forced dependency change is made.

Pending: browser review, approved artwork/framing, official social/marketplace links, final editorial review, hosting/runtime/CSP review, registry geography/privacy/transfer rules and later authenticated mint/reveal/profile integrations. See [website boundaries](WEBSITE.md). Draft PR is for exact-head owner review, not production acceptance.
