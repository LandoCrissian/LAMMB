# Stage 33 — Netlify deployment freeze

The owner prohibits production deployments, previews, manual/API/CLI deploys and
retries until explicit manual deployment authorization. No Netlify settings,
billing, domains or secrets were changed.

## Verified repository procedure

Netlify's existing PR28 preview check demonstrated that automatic integration was
active. There is no tracked `netlify.toml` or repository deployment workflow.
Netlify documents two separate Git-trigger suppression controls:

- Include `[skip netlify]` in a PR title before creating/updating that PR.
- Include `[skip netlify]` in the newest nonempty commit message before pushing a
  branch or merging it into main. The newest commit covers a multi-commit push.

Use both controls for every operation during this freeze. Never substitute
`[skip ci]`: GitHub verification must continue. Do not retry Netlify deployments.
Before pushing, inspect the remote head, local worktree, commit message and PR
title. Use an explicit lease when rewriting a branch. Before merging, require
exact-head GitHub classify/verify success and verify the reviewed file tree.
After merging, fetch main and verify the skip marker survived in the newest
commit. Check GitHub's new-head status/check contexts for unexpected Netlify work.

GitHub rebase merging drops originally empty commits. An empty skip-marker commit
is therefore insufficient. For PR28, the existing nonempty commit was reworded;
its file tree remained exactly unchanged.

## PR28 evidence

| Binding                       | Value                                                                          |
| ----------------------------- | ------------------------------------------------------------------------------ |
| Authorized main before merge  | `c63631d2659bbe7bb723e57b93f7bcca9786f6c8`                                     |
| Originally reviewed PR28 head | `d27f8f5cbfc32f837a4f214850f3d815916079f4`                                     |
| Message-only freeze head      | `76fb2556d85786538ed62e1d2cfa008b556b7481`                                     |
| Unchanged reviewed file tree  | `6315d1348ad75bce9e00d026bb264b41ace6d639`                                     |
| Fresh exact-head CI           | [38335806564](https://github.com/LandoCrissian/LAMMB/actions/runs/38335806564) |
| Result                        | classify/verify succeeded; browser acceptance skipped, not executed            |
| Rebase-merged main            | `94def30c63b3ea75a34ff313cdae38ffca58748f`                                     |

The merged tree equals the reviewed tree. Its commit message ends with
`[skip netlify]`. GitHub readback showed no Netlify statuses/checks on the new
message-only head or merged main. The earlier successful preview belongs to the
old head; it is not evidence of a deployment during this task.

## Limits and owner control

This is an operator-controlled repository procedure, **not a site-wide disabled
build setting**. Other actors' untagged commits, build hooks, manual operations or
deployment API calls are not technically blocked. No authenticated Netlify
deploy-list capability was available; absence of GitHub checks is observational
evidence, not an exhaustive Netlify account audit. No deployment was requested by
this task.

If this procedure cannot be followed, stop before any push or merge. A global
site-level stop-build change requires separate owner authorization. Freezing
publishing alone would still permit builds/previews and is insufficient.
Removing skip markers or deploying manually requires explicit owner deployment
authorization. GitHub Actions and required test coverage remain unchanged.

## Official references

- [Netlify: skip a deploy](https://docs.netlify.com/deploy/manage-deploys/manage-deploys-overview/#skip-a-deploy)
- [GitHub: workflow skip commands](https://docs.github.com/en/actions/how-tos/manage-workflow-runs/skip-workflow-runs)
- [GitHub: rebase merge behavior](https://docs.github.com/en/pull-requests/reference/pull-request-merges)
