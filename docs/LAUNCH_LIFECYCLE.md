# Launch lifecycle

## Approved concept

The core launch experience is **The 5,280 Ascent**. Its conceptual progression is:

```text
0 FT → 2,640 FT → 5,279 FT → 5,280 FT → mint
→ sealed specimens → specimen recovery → blackout
→ Break the Seal → reveal → collector share experience
```

These are conceptual milestones. They are not a mint counter, timed sequence, threshold trigger, game, promise, or automatic state transition. Exact mechanics are not finalized. The bootstrap does not assign altitude to activity, eligibility, or mint counts.

## Current state model

| State        | Representation                              |
| ------------ | ------------------------------------------- |
| `PRE_ASCENT` | Before the ascent; initial foundation state |
| `ASCENT`     | Ascent phase                                |
| `MINT`       | Mint phase                                  |
| `RECOVERY`   | Sealed specimen recovery phase              |
| `BLACKOUT`   | Blackout phase                              |
| `REVEAL`     | Reveal phase / Break the Seal presentation  |
| `REVEALED`   | Revealed collection phase                   |

`launchStateSchema` validates this closed vocabulary. `LaunchStatus` has an exhaustive presentation map, so adding a state requires deliberate UI coverage. All noninitial views state their missing integration or unsettled mechanics. Rendering a phase does not enable minting or verify on-chain state.

`apps/web/src/config/launch.ts` explicitly selects `PRE_ASCENT`. Changes currently require source review and a new build. There is no public environment variable, query parameter, local-storage override, state writer, clock, or transition graph. This static presentation is not a live launch control system.

`launchStateChangeSchema` describes a future audit record with unique record ID, revision, from/to states, UTC timestamp, actor reference, and reason. It rejects missing fields and unchanged states. This schema does not authenticate an actor, prove a timestamp, persist events, enforce revision ordering, or authorize any transition.

## Requirements for future state control

Changes must be deliberate and auditable. A future implementation must authorize the actor, persist append-only records, check the expected revision, reject conflicts, and expose a trustworthy state reader. Phase-specific contract readiness must be independently checked before enabling mint/reveal actions. No approved transition matrix exists yet.

## Unresolved decisions

Milestone semantics, progression authority, schedule, transition policy, blackout visibility, sealed specimen behavior, recovery mechanics, Break the Seal trigger, reveal synchronization, and collector sharing are unresolved. No launch dates or automatic behavior are committed.
