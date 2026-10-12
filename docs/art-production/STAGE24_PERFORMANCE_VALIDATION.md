# Stage 24 — performance correction and preservation evidence

Reviewed baseline: main `11d1396d516eb9e140d1c25ff2ff42402f0c413e`; original PR #22 head `9dd67ef5a18679b8a286e39ee60aac05c9fb959d`. This collection-only change retains the generator's wire format, source bounds, independent reconstruction, Trait Bible v1.1.0, frequencies, compatibility and grail reservations. It adds no dependency or CI change.

## Confirmed CI failure and measured bottleneck

PR #22 run `38192204638` failed the unchanged Trait Bible adversarial test at its 20-second limit in both recorded attempts. The first run reported 20,585ms for the case; the other 481 tests passed. Classification passed with `browser_required=false`; Chamber browser jobs were skipped, not executed. Verification/build did not complete successfully after the test failure.

The authorized main's run `38190104641` passed this case in 14,661ms and passed verification. Its Edge Chamber movement timeout is a separate retained baseline failure; this task does not modify or rerun Chamber acceptance locally. These observations establish resource-sensitive runtime, not proof that the PR failure was harmless or exclusively infrastructure. Hosted-runner CPU contention was not directly measured.

The original timed test generates a 5280-specimen bundle, runs a valid independent adversarial reconstruction/trace, then verifies rejection of separately forged attempt and identity records through further independent reconstruction. Its repeated construction and canonical comparison are meaningful security checks. CPU profiling on the Legion attributed the dominant samples to canonical object encoding and Unicode string normalization; file/spec reads took about 25ms, and raw hashing was much smaller than reconstruction. The change optimizes this measured hot path rather than removing generation or caching an accepted collection.

## Narrow implementation and safety limits

`canonicalJson` retains descriptor, prototype, symbol, cycle, depth, integer, sparse-array and normalized-key-collision checks. Every object and current value is checked on every traversal. Printable ASCII can bypass Unicode normalization because it already satisfies the same scalar/newline/NFC policy; other text follows the existing checks and normalization.

Within **one call only**, repeated immutable strings use a cache limited to 512 entries and 256-character source strings. Repeated validated key shapes use at most 64 entries, at most 32 keys per shape, at most 256 characters per key and a 2048-character shape signature. Values, mutable objects, generator results and previous calls are never cached. Invalid key collisions throw before insertion. There is no global cache or change to entropy, ordering, hashing, fixture files, frequencies or timeout settings.

New canonical tests exercise mutations between calls, accessors/symbols/cycles after a repeated shape, heterogeneous Unicode/CR key shapes beyond the cache capacities, normalized-key collisions and invalid surrogates. Existing negative security assertions remain in place. Backlog tests separately enforce the three owner decisions and reject forged sources/evidence, old-history changes, provenance/compatibility changes and production promotion.

## Matched local performance

The same profiling harness ran against an existing clean checkout whose complete Git tree equals authorized main, and against the changed Stage 24 tree. Both measurements below omit CPU-profiler instrumentation, run sequentially, and execute the positive/negative operations corresponding to the original timed case. Node 22.23.2 ran on the i7-11800H Legion; these are local measurements, not a hosted-runner guarantee.

| Measurement                                                    | Authorized-main tree | Optimized Stage 24 |
| -------------------------------------------------------------- | -------------------: | -----------------: |
| Original-case operations                                       |            9682.64ms |          6985.00ms |
| Initial generation                                             |            1525.84ms |          1150.52ms |
| Valid audit/reconstruction/trace                               |            2945.05ms |          2048.41ms |
| Forged-attempt reconstruction/rejection                        |            2373.16ms |          1708.32ms |
| Forged-identity reconstruction/rejection                       |            2419.18ms |          1630.28ms |
| Peak process RSS, including additional diagnostic verification |            617.23MiB |          561.94MiB |

Three fresh executions of the **original Vitest case**, with its unchanged 20-second timeout and assertions, passed at 7203.14ms, 7293.52ms and 7118.09ms with one worker. The maximum used about 36.5% of the deadline. These selected-case runs do not claim to execute the other 92 tests in that file; full targeted-suite and exact-head CI results belong in the final acceptance report.

The final recovery validation passed all 368 tests across the eight generator, ingestion, pipeline, Trait Bible, PNG-proof and asset-registry suites with one worker. The original adversarial case passed again in 7221ms within the complete 93-test Trait Bible suite. Changed-file lint and the generator plus eight-test-file TypeScript checks passed. Immutable snapshots, all four matched artifact buffers and the unchanged specification/registry/lockfile/test timeout were independently checked; no local Chamber/browser suite or website build was run. Exact-head remote CI still supplies the release-verification gate.

## Deterministic and artwork preservation

Main and optimized harness outputs are byte-equivalent canonical bundles: 16,984,594 bytes, SHA256 `c979deda42d1228944081f9c494fdbf6e202c3d89319b64b893a07eb526f6164`. Each has exactly 5280 unique logical specimens, 7803 candidates, 119 accepted gold configurations and an adversarial report equal to preserved `ADVERSARIAL_015B.json`. Logical identities are not proof of finished-image visual uniqueness. The proposed gold frequency remains provisional; no frequency is forced to a historical target.

Historical Stage 17 registration/evidence and all current backlog declarations were checked against private sources: 130 bindings across 72 unique paths passed. Each of the three native 1254×1254 ear-tag proofs was reconstructed twice from its preserved compatible base/contact/mask sources. Both fresh buffers equal the historical PNG bytes, with zero outside-mask changed pixels:

| Proof        | Historical/reconstructed PNG SHA256                                | Verified visible wool |
| ------------ | ------------------------------------------------------------------ | --------------------- |
| Canonical    | `89ba9dba1070fe9cc8fab0be82b947ba8cc37f17d14b25dcf9260ee5cbde173b` | Ivory Curls           |
| Broad Ash    | `be31a4ee0745486208859ecdefcbec819f555ceb73579367e4bcc6e2d6367227` | Ash Curls             |
| Rolled Locks | `b24074f881d853e5be351f53ec8d22d39208cdd99e0b52a5940bc49b13c3b040` | Rolled Locks          |

The registry canonical SHA256 remains `83c0c9be5ac1c79a6761ae957d8c55d3bf56698ab88a25988945ec094724c4c7`. Development metadata retains the correct Sheep/Wool/Black Hoodie/5280 facets, image-hash binding, unpublished placeholder URI and null token assignment. Fresh proof validation took 2205.41ms with 156.88MiB peak RSS, Sharp 0.35.5/libvips 8.18.7, one CPU worker and unchanged decoding limits. No new artwork file or production promotion resulted.

## Evidence and acceptance limits

Private evidence is preserved at `C:/LAMMB-Studio/reports/TASK_024_STAGE24_APPROVALS_PERFORMANCE_001`: CPU profile/hotspot receipts, matched before/after artifacts, individual test receipts, owner decision transcription, historical proof results and the earlier RAM-stop checkpoint. The immutable v0.3.0 backlog snapshot equals the preserved pre-decision bytes; current version 0.4.0 appends only the authorized owner decisions/evidence. Its original historical capture `mainSha` remains unchanged.

Every substantial workload requires a freshly printed available-RAM measurement of at least 2048MiB. Failed gates stopped work without terminating user processes or lowering the threshold. Recovery continued only under the owner's fresh authorization. Validation remains collection-specific locally; remote CI retains its existing full verification/build policy. Skipped Chamber jobs are never reported as executed coverage.

Owner evidence is a trusted-operator transcription, not a signed administrative authentication system. The plans and approvals do not register production assets or certify sheep anatomy. Exact-head classification/verification, unchanged main, clean committed scope and owner review are still required before merge readiness. No merge, deployment, ImageGen, collection batch, website/game change or Task 017 change is part of this task.
