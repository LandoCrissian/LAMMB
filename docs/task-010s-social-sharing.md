# Task 010S — cinematic social sharing

The homepage, Universe, World and Collection now have distinct 1200 × 630 JPEG cards. Each route emits complete Open Graph and X metadata in server-rendered HTML, with absolute lammb.fun URLs, a route canonical, descriptive image alt text, image MIME and dimensions, and `summary_large_image`. Nested Universe pages and individual dossiers have their own titles, descriptions and canonicals while sharing the Universe artwork. Other destinations reuse an appropriate card with their own page copy.

## Scope and isolation

- Authorized main at start: `723807c813270c193c95ae12afbfced3ef952d26`.
- Branch: `codex/task-010s-social-sharing`, from that exact commit in an isolated checkout.
- Task 010B inspected read-only: [PR #11](https://github.com/LandoCrissian/LAMMB/pull/11), branch `codex/task-010b-chamber-evolution`. No changed file overlaps its 13 changed files. The chamber's new metadata layout avoids its page file.
- Mint availability, launch state, NFT metadata, wallets, country registry, RMT and Netlify settings are unchanged. No merge or deployment is authorized.
- Commit and draft PR title include `[skip netlify]` to suppress branch deploys and Deploy Previews. This follows [Netlify's documented skip behavior](https://docs.netlify.com/deploy/manage-deploys/manage-deploys-overview/); no hosting configuration changes are needed.

## Asset inventory and provenance

All four files are JPEG, 1200 × 630, opaque, fully decoded and visually inspected. Sharp 0.35.5 renders original graphic compositions directly at delivery resolution. Existing raster sources are losslessly decoded for composition and downsampled; none are enlarged, repainted or enhanced. The world geography is vector data rasterized at delivery resolution. The typography and framing use near-black `#080B09`, chartreuse `#CCFF00`, and warm-white `#F4F5EB`.

| Route       | Public file               |  Bytes | SHA-256                                                            |
| ----------- | ------------------------- | -----: | ------------------------------------------------------------------ |
| /           | /social/home-v1.jpg       | 175674 | `f7844403adafd9a3180fecf8205ea2b84f1d91f5e475e7d5127dd8ee40c51d2e` |
| /universe   | /social/universe-v1.jpg   | 137150 | `f95f7ee4f6a7211e382b71cb416cc8bb009c2703b5807813cd8c39a16effe831` |
| /world      | /social/world-v1.jpg      | 180013 | `16c69364c69740f86d1bd8344f511159889110a2ab99201538441a00c9f8b630` |
| /collection | /social/collection-v1.jpg | 135895 | `790498d9fd687a15dd90298683b77376b59b671f7d581ddc39110834192dc1c1` |

Repository paths have the prefix `apps/web/public`. [The social provenance manifest](../apps/web/public/social/provenance.json) records the composition, exact source paths/hashes, original provenance manifests, approval labels and dimensions for each card.

- Home: existing 1024 × 1536 front specimen and 1536 × 640 LAMMB wordmark from Task 005D. Display sizes: 355 × 533 and 485 × 202.
- Universe: existing 1536 × 1024 empty laboratory from Task 009, downsampled to 1200 × 800 and cropped by the card canvas.
- Collection: existing 1024 × 1536 side specimen from Task 005D, displayed at 337 × 505. The specimen remains closed.
- World: unchanged `maps/countries-v1.json`, Equal Earth projection. Natural Earth geography is public domain; the original MIT/ISC attribution files remain in `public/maps`. No pins, participant totals or activity claims were invented.

The source manifests call these **owner-authorized website previews pending visual review**, not approved final NFT art. This task preserves that status. The new compositions also await owner visual approval. No revealed character, crown or Colorado signage appears. Supply is written as 5280.

The offline recipe is [prepare-social-cards.mjs](../scripts/prepare-social-cards.mjs). It verifies source hashes against their existing provenance before rendering. There was no new AI scene generation in this task; the existing generated art's identifiers remain in its source manifests. Editable SVG compositions are saved under ignored `artifacts/generated/task-010s/compositions`. Arial/Courier rasterization can differ between operating systems; the committed JPEGs and hashes are the runtime source of truth. Asset generation does not run during builds.

## Metadata results

| Route       | HTML / OG / X title                  | Canonical                    | Image                                      |
| ----------- | ------------------------------------ | ---------------------------- | ------------------------------------------ |
| /           | LAMMB — Higher Together              | https://lammb.fun            | https://lammb.fun/social/home-v1.jpg       |
| /universe   | LAMMB Labs — The Classified Universe | https://lammb.fun/universe   | https://lammb.fun/social/universe-v1.jpg   |
| /world      | LAMMB World — Global NFT Atlas       | https://lammb.fun/world      | https://lammb.fun/social/world-v1.jpg      |
| /collection | The Collection / LAMMB               | https://lammb.fun/collection | https://lammb.fun/social/collection-v1.jpg |

Descriptions accurately identify the sealed collection, fictional research, unreleased registry and mint unavailability. All 20 current page routes have consistent HTML/OG/X titles and descriptions, their own absolute canonicals and OG URLs, a JPEG image with OG width 1200/height 630/type image/jpeg, matching OG/X alt text, and summary_large_image. Titles are at most 70 characters; descriptions at most 200. Next serializes the root canonical without a trailing slash; the checker compares normalized URLs.

The helper emits complete nested objects because [Next.js replaces nested metadata objects instead of deeply merging them](https://nextjs.org/docs/app/api-reference/functions/generate-metadata). Archive dossiers use their existing summaries. The chamber and launch studies retain noindex/nofollow. Unknown dossiers and unknown routes still return 404.

## Crawler access audit

Read-only public observations at 2026-10-09 03:03 UTC:

| Check                                                           | Current lammb.fun                                                      | Local production build                       |
| --------------------------------------------------------------- | ---------------------------------------------------------------------- | -------------------------------------------- |
| Four primary destinations, Twitterbot and facebookexternalhit   | 200, text/html; Netlify; existing basic title/description only         | 200, complete metadata in head               |
| New four JPEG URLs, both user agents                            | 404, not deployed                                                      | 200, image/jpeg; exact committed SHA-256     |
| robots.txt, both user agents                                    | 404; no published robots policy                                        | 200, text/plain; User-Agent: * / Allow: /    |
| Authentication / WWW-Authenticate                               | No challenge on primary pages                                          | No challenge on pages or images              |
| X-Robots-Tag restrictions / CSP                                 | No restrictive header observed on primary pages                        | No restrictive header on pages or JPEGs      |
| Middleware / proxy / auth / Netlify configuration in repository | No middleware, proxy, crawler authentication or tracked Netlify config | No new interception or hosting configuration |

The existing front WebP was also publicly retrieved with Twitterbot: 200, image/webp, 392190 bytes. Next's existing nosniff, frame, referrer and permissions headers do not block image retrieval. A new [robots.ts](../apps/web/src/app/robots.ts) explicitly allows retrieval; prototype noindex stays in HTML so bots can read it.

These requests simulate crawler user agents. They do not prove that real X crawler IPs can bypass an account-level Netlify firewall or rate limit. Netlify account rules were not inspected or changed. **Public acceptance of the new image URLs remains pending an owner-authorized deployment.** This is an intentional limit of the no-deploy instruction.

## Validation and evidence

- `npm run build`: passed; Next 16.3.8 production compilation/static generation and the social checker passed. 20 page metadata results, four fully decoded JPEGs.
- `npm test`: 16 files, 230 tests passed.
- `npm run typecheck` and `npm run lint`: passed.
- Local production HTTP: 40 page metadata checks plus 10 robots/image checks across Twitterbot and facebookexternalhit, all passed.
- Chrome and Edge: each passed 44 desktop page audits (20 routes plus two expected 404s with JavaScript both enabled and disabled), four mobile overflow checks at 390 × 844, and four natural-image dimension checks. No page errors.
- Repository formatting and whitespace checks passed before the draft PR.
- CI runs the production metadata/image check automatically through the existing root build command; the existing workflow and Task 010B's CI files are untouched. The final handoff records the actual PR CI status.

Evidence is under ignored `artifacts/generated/task-010s/acceptance`:

- `built-metadata.json`, `http-metadata.json`, `live-audit.json`.
- `chrome/results.json` and `msedge/results.json`.
- Each browser has `home|universe|world|collection-desktop.png`, `*-mobile.png`, `*-card.png`, `social-card-review.png` and `review.html`. There are 26 screenshots total.
- Card review sheets are illustrative layouts made from actual local metadata and images; they are not screenshots of X rendering.

## Automated checks

The existing CI root build now runs [verify-social-metadata.mjs](../scripts/verify-social-metadata.mjs) after Next builds. It validates all current page routes, canonical/OG URLs, matching copy, uniqueness and presence of metadata, primary-route artwork, dimensions, MIME declaration, alt text, prototype robots behavior, image/source hashes, file size and a full pixel decode.

```sh
npm run build
npm run social:verify -- --assets-only
npm run social:verify -- --built --output artifacts/generated/task-010s/acceptance/built-metadata.json
```

For local HTTP checks, start the existing production server from the app workspace (the existing next.config.ts imports require that working directory), then run:

```sh
npm run start --workspace @lammb/web -- --hostname 127.0.0.1 --port 3017
npm run social:verify -- --base-url http://127.0.0.1:3017 --output artifacts/generated/task-010s/acceptance/http-metadata.json
node scripts/verify-social-browser.mjs --playwright-module /absolute/path/to/existing/playwright --browser chrome
node scripts/verify-social-browser.mjs --playwright-module /absolute/path/to/existing/playwright --browser msedge
```

The browser recipe uses installed browsers and an existing Playwright driver. It does not install software or open a personal browser profile.

## X caching and post-deployment verification

X can cache both page card metadata and image responses, including earlier failures. A correct new HTML response does not guarantee an immediate new card in a composer, old post or timeline. Cache timing is controlled by X; this audit cannot establish a current refresh SLA. The old [X Cards getting-started URL](https://developer.x.com/en/docs/x-for-websites/cards/guides/getting-started) and [troubleshooting URL](https://developer.twitter.com/en/docs/twitter-for-websites/cards/guides/troubleshooting-cards) redirect to the general X developer overview as of this audit. Do not depend on the old Card Validator showing a visual preview or forcing a refresh.

Image URLs are versioned. For a future artwork change, create new `*-v2.jpg` files, update metadata and provenance, and retain v1 until old cached cards expire. Versioning the image helps separate image caches; it does not force X to re-fetch the page metadata. Query parameters on a shared page may create another cache entry, but are not a reliable purge mechanism and should not replace the route canonical.

After a separately authorized deployment:

1. Confirm the deployed release SHA matches the owner-approved commit.
2. Run `npm run social:verify -- --base-url https://lammb.fun --output artifacts/generated/task-010s/acceptance/live-acceptance.json` from the same checkout. Use acceptance mode, **without --audit**; a missing image, incorrect MIME/hash, stale title or blocked route must fail. Expect 40 metadata results, 50 access checks and zero failures.
3. Independently GET each primary URL and each exact image URL with Twitterbot/1.0 and facebookexternalhit/1.1, without cookies or credentials. Check final URL, 200 response, no authentication/challenge HTML, no restrictive X-Robots-Tag, public JPEG MIME and exact hashes. Review the served robots policy and inspect HTML source, not only a hydrated DOM.
4. Check Netlify request/security logs read-only for genuine crawler requests and any denied requests or rate limits. A spoofed user-agent test alone cannot verify crawler IP access.
5. Paste each canonical URL into the X composer and inspect the available preview without publishing. Capture date/time, URL and screenshots. An owner-authorized test post, if needed, is a separate action; no post is authorized by this task.
6. If the HTTP checker passes but X remains stale, record the discrepancy and allow its cache to refresh. Re-check the exact canonical later; do not promise a forced refresh, change hosting settings or alter canonicals to chase cached output.

## Known limitations

No deployment or genuine X crawl was performed. The four lammb.fun JPEG URLs are presently 404. Artwork composition approval remains with the owner, and source website-preview authorization is distinct from final NFT artwork approval. X presentation, crop and cache timing are controlled by X. Real crawler IP/firewall behavior remains a post-deployment verification step. Desktop Chrome/Edge and emulated mobile were tested; physical iOS/Safari were not. Native font rendering can vary when rerunning offline authoring on another OS; builds use the exact committed images.
