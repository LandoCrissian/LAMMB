# Genesis production registry and execution boundary

This is registration infrastructure for review. Task071's only executable CLI produces a readiness simulation. No real production directory is initialized and no selected artwork enters `REGISTERED`.

## Records and states

Each `lammb-genesis-registry-record/1` carries its composition ID, classification, accepted PNG and pixel hashes, canonical effective metadata hash, recipe/source/renderer/recovery provenance, owner-acceptance reference, registration status, history and nullable registration timestamp. Its deterministic `LGR1-` identifier hashes the frozen selection digest and stable composition ID; it is not a blockchain token ID.

| Transition                                           | Required evidence                                                                                                                                                  |
| ---------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| DEVELOPMENT → OWNER_ACCEPTED                         | Exact pinned Task070 collection-level owner authorization covering this unchanged selected entry                                                                   |
| OWNER_ACCEPTED → VALIDATED_FOR_REGISTRATION          | Fresh in-process source-verification capability matching PNG, pixels, geometry, source bindings and selection                                                      |
| VALIDATED_FOR_REGISTRATION → REGISTERED              | Separately authorized execution mode, trusted execution verifier, signed exact-state grant, current timestamp and artifact verification no older than five minutes |
| Unregistered readiness state → REVOKED_PREDEPLOYMENT | Pinned owner scope and explicit predeployment rollback event                                                                                                       |
| REGISTERED → REVOKED_PREDEPLOYMENT                   | Separate signed revocation grant while undeployed                                                                                                                  |
| REVOKED_PREDEPLOYMENT → any state                    | Prohibited; create an explicitly reviewed new version instead                                                                                                      |

Skipping states, erasing history, repeating a registration transition, changing accepted bytes, revoking after deployment or backdating registration fails. Historical validation reconstructs every event and checks its hash and authority. Repeated identical journal writes are idempotent; repeated registration transitions are not accepted as new registrations.

The frozen Task070 authorization is collection-level, not 720 fabricated individual decisions. Its exact historical per-image decision and timestamp fields remain null. Missing approval can be read in DEVELOPMENT; present but invalid or stale approval fails. The registry does not reinterpret a recommendation as owner approval.

## Trusted host and signed grants

Application code, externally reviewed digest pins, the operating-system account and the configured execution public key are trust boundaries. JSON is not a capability. `VerifiedArtifact` is branded by a private WeakMap after current source verification; deserialized proof fields cannot authorize privileged transitions.

`createEd25519ExecutionAuthority` accepts only a public Ed25519 key, pinned by its SPKI DER SHA-256, and explicit allowed operations. Grants bind schema version, authority ID, operation, exact intent digest, nonce, issue time and expiry. Execution intents include frozen selection, registration ID, prior-record digest and current occurrence time. Store intents bind absolute root, previous commit and payload digest. Fresh grants have a maximum five-minute lifetime; historical event verification checks the signed event's occurrence time without treating an expired grant as reusable execution authority. State/CAS binding makes acknowledged retries idempotent and prevents reusing a grant for another record or state.

Task071 provides no real execution key, signing endpoint or production authorization. A future trusted host must provision that public-key policy independently of the dataset, authenticate the operator and reject unauthorized requests before obtaining signatures. Passing a permissive custom verifier from compromised application code is outside this module's threat boundary. No local-file format can defend against an administrator replacing both code and trusted configuration.

Public-only Ed25519 verification uses Node's `crypto.verify` API; no wallet or private key is loaded by production code. Unit tests generate ephemeral non-wallet keys only. [Node 22 crypto documentation](https://nodejs.org/docs/latest-v22.x/api/crypto.html).

## Immutable journal and recovery

Snapshots use immutable `generation-fileSHA.json` files containing previous digest, payload digest and versioned payload. Writers acquire an exclusive lock, verify the expected head and prior history, write an exclusive pending file, fsync it, publish with atomic create-if-absent `link`, then read and verify the entire chain. Snapshots cannot drop prior records or rewrite their composition/history. File sizes, generations and paths are bounded.

Only the writer's own verified lock and pending file are removed. Stale locks are never broken automatically. Interrupted pending files do not become committed state; concurrency conflicts and corruption fail closed. An identical payload can be retried from a known ancestor after an acknowledgement loss, but an invented or truncated expected head fails.

Keep the latest head receipt in an independently verified backup outside the journal. `readProductionStore` requires that trusted head pin, detecting tail removal that an internal hash chain alone cannot detect. A complete rollback of both the directory and its external trusted receipt cannot be detected locally. Generation files remain append-only; predeployment revocation is a new explicit event, not destructive rollback.

File fsync and atomic link prevent partially written commits from being accepted; they do not promise directory-entry durability after Windows power loss. Require independent backup and exact-head recovery before proceeding after a crash. The store does not claim a cross-platform database transaction or distributed lock. Use one protected local filesystem and a single trusted service owner; production ACL provisioning is a separate reviewed operating step. [Node 22 filesystem documentation](https://nodejs.org/docs/latest-v22.x/api/fs.html).

Future production initialization and writes additionally require signed root/head/payload grants; validated/registered records require fresh current artifact capabilities. No writable production path is reachable from the readiness CLI.

## Adoption and rollback

1. Review the feature branch, actual 720-record validation, approval pins, geometry derivation and recovery evidence.
2. Independently approve the production execution host, public-key fingerprint, access policy and exact code commit. No execution grant exists in Task071.
3. Reverify all immutable source bytes and metadata, then obtain a separately authorized registration run bound to the accepted digests.
4. Preserve the latest journal head and every registration receipt off device. Test recovery before allowing any deployment work.

Before adoption, rollback consists of not merging or reverting this additive code. Historical development validators and records remain unchanged. After future registration but before deployment, use authorized revocation with complete history. Do not delete or rewrite previous generations, accepted artwork, metadata proposals or preservation pins.

Registration readiness does not implement minting, reveal, contract deployment, public metadata publication or final token assignment. The repository's legacy 5,280 supply settings are deliberately unchanged; the separate mint migration must enforce 720 across all mint paths.
