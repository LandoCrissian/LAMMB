# Architecture

## Locked product decisions

The canonical collection facts, seven global lifecycle names, four altitude milestones and delayed sealed-specimen reveal experience are locked. See [collection](COLLECTION.md) and [launch lifecycle](LAUNCH_LIFECYCLE.md) for their semantics. Task 002 extends Task 001's package boundaries.

## Current design direction

Task 001 uses npm workspaces because the web app, canonical collection configuration, reusable domain schemas, and future offline generation tooling have separate responsibilities. There is no Turborepo, Docker, database, queue, deployment platform configuration, or production service infrastructure.

| Boundary                 | Owns                                                                  | Depends on                             |
| ------------------------ | --------------------------------------------------------------------- | -------------------------------------- |
| `apps/web`               | Presentation, metadata, environment validation, web security headers  | `collection`, `schema`, Next/React/Zod |
| `packages/collection`    | Canonical facts and descriptive Robinhood Chain network configuration | `schema`                               |
| `packages/schema`        | Runtime validation and inferred TypeScript domain types               | Zod                                    |
| `packages/art-generator` | Art input, recipe, output, and provenance schemas                     | Zod                                    |
| `packages/contracts`     | Reserved contract design/code boundary                                | Nothing in Task 001                    |
| `tests`                  | Cross-boundary unit verification                                      | Source packages and Vitest             |

Private packages use explicit subpath exports instead of broad barrel imports. They contain TypeScript source, not checked-in compiled output. The app imports no generation tooling, secrets, or RPC provider. Next transpiles internal app dependencies; strict TypeScript checks all source independently. Root configuration and tests also typecheck. `next typegen` generates route types before app typechecking, including on a clean checkout.

Collection facts flow from the validated frozen configuration into network description, schemas, page content, and metadata. A reviewed static launch snapshot passes through `launchSnapshotSchema` into the pure `createLaunchPresentation` view model, then server-rendered React visual variants. Phase rules and milestone calculations are centralized outside React. Strict versioned payloads reject missing data and unknown fields. The homepage stays PRE_ASCENT; `/development/launch` renders seven development studies with anchor navigation. There is no state mutation endpoint, scheduler, clock-based progression, browser override, or mint control.

Every study snapshot has development authority. Each variable datum additionally carries fixture authority or an unavailable future source. Canonical numeric facts use STATIC_CANONICAL. Future sources can contain only null in this version. A future live reader requires approved authority checks and a deliberate schema evolution; it cannot turn a fixture into onchain data by changing a label. See [data authority](LAUNCH_LIFECYCLE.md#data-authority).

Future integrations have separate responsibilities: an authorized launch reader/control service; onchain recovered-supply reader; eligibility adapter with approved cross-partner deduplication; ownership reader; metadata/reveal publisher; fairness protocol/verifier; public collection catalog; share-card renderer. These are boundaries, not services implemented here. UI presentation never authorizes any of them. The web imports no art recipes and the strict share-card schema cannot accept internal generation fields.

The initial art component is a decorative altitude study, separate from collection assets. It is replaceable without changing collection schemas. CSS is mobile-first, uses system fonts and reduced-motion preferences, and adds restrained chartreuse pixel accents without flashing effects.

## Verification and delivery

Exact dependencies plus the npm lockfile support reproducible installs. CI installs with `npm ci`, then checks formatting, lint, types, unit tests, and production build. CI has read-only repository permissions and no deployment step. Build artifacts and environment files are ignored. Contract tooling will have its own verification when its design is approved; the current reserved directory is not an executable workspace package.

TypeScript 6.0.3 and ESLint 9.39.5 are pinned to the supported peer ranges of the current Next lint plugins and TypeScript ESLint parser. ESLint 9 emits an upstream deprecation notice; the bundled React, import, and accessibility plugins do not yet declare support for ESLint 10. Do not force incompatible peer dependencies. Upgrade the lint toolchain together when compatibility is available. Workflow actions are pinned to immutable commit SHAs.

## Unresolved decisions

- Hosting provider and operational topology for future production delivery.
- Persistence and authorized service for auditable launch state changes.
- Partner eligibility verification, proof format, allocation policy, and privacy retention.
- Mint/reveal interface and contract architecture.
- Approved artwork, generation algorithms, metadata serialization, and provenance publication.
- End-to-end wallet/transaction tests and operational monitoring once those flows exist.

None of these decisions is implemented or promised by the bootstrap.
