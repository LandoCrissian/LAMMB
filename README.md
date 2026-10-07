# LAMMB

LAMMB means **Let's All Make Money Bitches**. It is an NFT collection and launch experience built exclusively for Robinhood Chain mainnet. Task 002 extends the reviewed Task 001 foundation for `lammb.fun` with validated launch presentations and future fairness/access/share boundaries.

## Canonical product facts

| Fact                      | Approved value                                        |
| ------------------------- | ----------------------------------------------------- |
| Brand / symbol            | LAMMB                                                 |
| Domain                    | lammb.fun                                             |
| Network                   | Robinhood Chain mainnet                               |
| Chain ID                  | 4663                                                  |
| Collection supply         | 5,280                                                 |
| Primary mint price        | 0 ETH / free mint; network gas still applies          |
| Marketplace / drop target | OpenSea                                               |
| Launch model              | Delayed reveal                                        |
| Access model              | Partner GTD, allowlist if required, public allocation |
| Launch experience         | The 5,280 Ascent                                      |

`packages/collection/src/config.ts` is the single executable source of collection constants. It is parsed with a strict schema and frozen. Documentation and tests repeat approved facts for explanation and independent regression checks; application code imports the configuration. The price is a `bigint` (`0n`) for exact wei arithmetic and must be explicitly serialized at any future JSON boundary.

## Architecture

```text
apps/web/                    Next.js App Router application
packages/collection/         Canonical collection and descriptive network configuration
packages/schema/             Collection, launch, authority, fairness, access and share schemas
packages/art-generator/      Art input, recipe, and provenance schemas; empty dev fixture
packages/contracts/          Documented future contract boundary; no contract package yet
docs/                        Decisions, security principles, and unresolved work
tests/                       Unit tests for validation and foundation boundaries
.github/workflows/ci.yml      Install, format, lint, typecheck, test, and build
```

A small npm workspace separates web delivery from offline collection tooling and shared schemas. Private internal packages export TypeScript source; Next transpiles its two internal dependencies, Vitest reads source directly, and each code package typechecks independently. No package publication or orchestration service is needed. The art package is never a web dependency. No previous project architecture was copied.

## Local development

Use **Node 22.23.2** (see `.nvmrc`) and **npm 10.9.8**. Direct dependencies are exact versions; `package-lock.json` records the complete dependency graph.

```sh
npm ci
npm run dev
```

Open `http://localhost:3000`. No secrets, RPC credentials, wallet, or external service account is needed. `apps/web/.env.example` documents the current empty application environment. Next sets `NODE_ENV`; invalid values fail configuration validation before startup or build. Add any future required settings to the server validation boundary before using them. Never expose privileged values through `NEXT_PUBLIC_*`.

The shell uses current stable **Next.js 16.3.8**, React 19.3.0, strict TypeScript, local CSS, and a replaceable decorative altitude study. It uses semantic sections, a skip link, visible keyboard focus, mobile layouts, and reduced-motion support. All components render on the server. [Next.js installation reference](https://nextjs.org/docs/app/getting-started/installation).

## Verification

```sh
npm run format:check
npm run lint
npm run typecheck
npm test
npm run build
# Or run the complete sequence:
npm run verify
# Serve the local production build:
npm start
```

`npm run format` formats source. `npm run test:watch` starts the unit test watcher. CI uses `npm ci` and runs the same checks without credentials or network transactions. Building compiles and prerenders the shell locally; it does not deploy anything.

## Current implementation status

- Responsive homepage at `PRE_ASCENT`, plus seven static presentations at `/development/launch`, visibly marked DEVELOPMENT / NOT LIVE.
- Versioned strict launch payloads and a pure typed presentation model, with authority-labeled altitude/history and unavailable future onchain recovery supply. No automatic transitions or state writer.
- Validated unowned collector reveal presentations, development-only consolidated PARTNER_GTD declarations, generic fairness commitment records and a public share-card schema. No eligibility decisions, cryptographic verifier or share-card generation.
- Validated collection configuration and network description, with no RPC/provider or wallet integration.
- Schemas for art categories, frequency inputs, incompatibilities, grails, generation recipes, output hashes, and provenance manifests. The development catalog is intentionally empty.
- Formatting, strict linting/typechecking, unit tests, deterministic dependency installation, and GitHub Actions verification.

## Task 002 boundaries

No NFT contracts, deployment, chain reads/writes, wallet SDKs, production eligibility, mint/reveal actions, admin endpoint, analytics, final artwork, generator execution, final traits, rarity assignment, or working provenance verification. No tokenomics, staking, games, points, DAO mechanics, or roadmap promises. Launch authority, eligibility/deduplication policy, fairness algorithms and reveal integration remain unresolved. No dependencies were added by Task 002.

The review route renders simultaneous static studies, not a simulated live launch or client state selector. Altitude/history fixtures carry source labels and synthetic dates. Recovery shows an unavailable count, not a fake live number. The same labels remain visible in a production build.

Read [architecture](docs/ARCHITECTURE.md), [collection](docs/COLLECTION.md), [launch lifecycle](docs/LAUNCH_LIFECYCLE.md), [art pipeline](docs/ART_PIPELINE.md), and [security](docs/SECURITY.md) before extending the foundation.
