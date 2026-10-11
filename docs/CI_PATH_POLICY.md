# Path-aware CI acceptance

The classifier in `.github/workflows/ci.yml` permits isolated NFT source, fixture,
specification, tooling and documentation changes to skip the Chamber browser
matrix. The explicit collection-test allowlist has the same treatment. Core
verification still runs locked installation, formatting, lint, typecheck, all
unit tests and the production build for every event.

Website, Chamber, shared packages, dependency manifests, lockfiles, package-manager
configuration, workflows and unknown paths require both installed browsers.
Unknown files inside the NFT workspace also require browsers. Main pushes always
require browsers. An empty diff or missing base requires browsers; a malformed,
mutable or unavailable base causes classification to fail. Classification errors
cannot emit a successful skip decision.

Diffs use NUL-separated paths and disable rename detection. A rename is therefore
examined as a deletion and addition: moving website or dependency code into an NFT
directory cannot conceal its original path. Dependency/configuration filenames
are denied before checking allowed paths, including deeply nested files.

## Policy tests

`tests/ci-path-classifier.test.ts` extracts and executes the actual workflow Bash
body against inert temporary Git histories. It includes the original 23 review
scenarios and additional source additions/deletions, nested dependency changes,
renames, unknown paths and malformed base references. A workflow-invariant test
also checks unconditional core verification and the browser dependency gate.

Run the focused suite with:

```sh
npm test -- tests/ci-path-classifier.test.ts --maxWorkers=1 --no-file-parallelism
```

Existing Bash and Git are required; the suite does not install either. On Windows
it locates Bash in the existing Git for Windows installation. The tests perform
no browser launches, image rendering or application builds. The classifier itself
and its tests are outside the NFT skip allowlist, so changes to either require
full browser validation.

## Acceptance and required checks

A policy-skipped browser job is **not executed browser coverage**. A classifier
failure makes the CI run fail; its dependent browser jobs cannot establish
coverage. Verify failure also prevents browser execution. Never interpret either
condition as successful browser acceptance.

At the 2026-10-11 review, main was unprotected, required-check contexts were empty,
and repository rulesets/effective main rules were empty. No settings were changed.
There is no configured required-check deadlock today, but there is also no
platform-enforced merge gate. The owner still requires exact-head classifier,
verify and applicable browser success before merge.

If protection is later configured, require classification and verification as
well as the agreed browser policy. Inspect the actual check contexts on an NFT
PR with the matrix skipped before choosing required names; do not assume matrix
check names or skipped statuses satisfy protection. A green browser check alone
must not permit a failed classifier to bypass owner acceptance.

## Existing Edge failure evidence

Run `38122288003`, head `e532cd177f5e927d18e48b436cf945a807dfd2c6`, passed
classification, verification and Chrome. Edge passed startup and the Chamber
sub-suite, then failed general website image readiness at 1024px after 57 pages.
Its `msedge/results.json` records `net::ERR_NO_BUFFER_SPACE` on the optimized
wordmark request. The image was complete with zero natural width. This is a
browser transport/resource failure, not an installation failure or a demonstrated
CI-patch application regression. The exact resource exhaustion mechanism remains
unresolved. The head server log also contains `NoFallbackError`; the artifact does
not establish a causal link between it and the failed request.

The Edge artifact's SHA256 is
`f79c06d07d6832c28e8127aa6cb850fdf3cc23d264375ade50da1dca0f00aac1`.
Earlier PR17 evidence also recorded `ERR_NO_BUFFER_SPACE`, while other attempts
failed at different Chamber interactions. These failures remain real failures;
no assertions, browser requirements or timeouts are changed by this policy.

If a new exact-head run has a browser-only failure, preserve its logs/artifact and
diagnose it before considering a single justified retry or an owner-approved,
separate infrastructure investigation. Do not relabel the run green or claim merge
readiness while applicable acceptance is failed or pending.

## PR17 unblocking sequence

1. Obtain owner approval and merge PR18 only after its applicable acceptance.
2. Fetch and verify the resulting main commit and its full push validation.
3. Rebase existing PR17 from its verified head onto that main; preserve the seven
   registry files, historical source hashes and exact PNG reconstruction evidence.
4. Require a new synchronize-event run at the new PR17 head, successful
   classification with `browser_required=false`, successful core verification and
   honestly reported policy-skipped browser coverage.
5. Recheck the actual required-check contexts and return PR17 for separate owner
   merge approval.

Do not rerun an old PR17 event as proof that it used the new policy. Do not merge
either PR automatically.
