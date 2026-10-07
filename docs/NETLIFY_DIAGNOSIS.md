# Netlify read-only diagnosis — Task 005

## Evidence — 2026-10-07 UTC

Start fetch confirmed authorized main `5d7d35556d672452ab5755834ef68319835b3447`. No tracked Netlify configuration/site ID exists. No Netlify connector or browser account access is available (IAB/Edge/Chrome each unavailable): **NETLIFY_ACCOUNT_ACCESS_UNAVAILABLE**.

| Check                   | Initial evidence                                                                           | Meaning                                                          |
| ----------------------- | ------------------------------------------------------------------------------------------ | ---------------------------------------------------------------- |
| Apex DNS                | A `52.52.192.191`, `13.52.188.95`                                                          | Resolves locally; intended site association unproved             |
| HEAD apex, 23:28:39 UTC | HTTP 404; `Server: Netlify`; Netlify Edge status 404; request `01M4CB55A4ZH56R7DJR529RM74` | HTTPS reaches Netlify; not a DNS lookup/TLS connection failure   |
| GET apex                | Generic Netlify “Page not found” HTML                                                      | Root application not served; cause not uniquely identified       |
| `www`, 23:29:51 UTC     | Same A records; HTTP 301 to apex                                                           | Hostname redirect works while apex fails                         |
| Web search/open cache   | Old Solana/Pump site                                                                       | Stale indexed content, not current deployment or canonical facts |

The owner then reported linking the new repository and fixing the site. Fresh HEAD/GET at **23:34:31 UTC** returned **200**, title **LAMMB — Higher Together**, `/_next/` assets, Next.js/Netlify cache headers and repository security headers. Request `01M4CBFWTCM972REZ5XM6PMYEW`. This independently confirms the observed root 404 resolved after the owner's action. This task made no production change.

A repository/deployed-artifact linkage problem is consistent with the sequence, but historical root cause is not proved. Linked repo/branch, resolved build/base/package/publish settings, deploy history, domain-site association and runtime version remain uninspected. Publish, framework routing or edge blocking can all yield a generic 404. See the [404 guide](https://docs.netlify.com/resources/troubleshooting/page-not-found-error-guide/) and [request chain](https://docs.netlify.com/resources/troubleshooting/request-chain/).

## Exact owner verification steps — read only

1. In `app.netlify.com`, open the project whose **Domain management** lists `lammb.fun`. Record project/site ID, default `*.netlify.app` URL, apex/alias association and HTTPS status. Compare direct root/deep URLs on both hosts.
2. Inspect **Project configuration → Developer settings → Continuous deployment → Build settings**. Record linked repository URL, production branch, base/package directory, build command and publish directory. Verify `LandoCrissian/LAMMB` / `main`; a page title does not prove linkage.
3. Compare with the workspace: repository root owns npm lockfile/install and `npm run build`; app is `apps/web`, output `.next` there. For root-based builds, expected package directory is `apps/web`, publish `apps/web/.next` relative to root. This is an inspection reference, not applied settings. Netlify's [monorepo guidance](https://docs.netlify.com/build/configure-builds/monorepos/) recommends root base plus app package directory.
4. In **Deploys**, open the currently **published production** deploy. Record ID, commit, branch, status and resolved runtime/build settings from the log. Inspect Deploy File Explorer and Next runtime/function evidence. Do not confuse a preview/failed deploy with production.
5. Review framework detection and [Next.js/OpenNext adapter](https://docs.netlify.com/build/frameworks/framework-setup-guides/nextjs/overview/). This is App Router, not plain SPA/static export; absence of a handwritten root `index.html` alone cannot diagnose a modern Next deployment. Do not add `/* /index.html 200` or force static export to conceal routing failures.
6. Direct-request and refresh `/` and `/development/launch`. Default-host root 404 suggests artifact/runtime investigation; default 200 but custom host failure suggests association/domain handling; root 200 with deep 404 suggests routing/runtime configuration. Check edge block rules if generic 404s persist. These are diagnostic branches, not conclusions about unobserved settings.

Do not save settings, relink, trigger builds/deploys, alter DNS/variables or copy credentials. The owner's repair is acknowledged; no further production mutation is needed for this PR.
