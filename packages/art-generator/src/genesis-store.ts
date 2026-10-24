import { constants } from 'node:fs';
import {
  lstat,
  mkdir,
  open,
  readdir,
  realpath,
  link,
  unlink,
} from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { randomUUID } from 'node:crypto';
import {
  GenesisError,
  bytesHash,
  genesisDigest,
  parseGenesisJson,
  requireGenesis,
  serializeGenesis,
} from './genesis-model.ts';
import type { SelectionContext } from './genesis-model.ts';
import { requireCurrentArtifact } from './genesis-adapter.ts';
import type { VerifiedArtifact } from './genesis-adapter.ts';
import {
  validateExecutionEvidence,
  validateSnapshot,
} from './genesis-registry.ts';
import type {
  ExecutionAuthority,
  ExecutionEvidence,
  GenesisRegistrySnapshot,
  SnapshotWriteIntent,
} from './genesis-registry.ts';
type StorePolicy = {
  purpose: 'READINESS_DRY_RUN' | 'PRODUCTION';
  executionAuthority?: ExecutionAuthority;
};

type Envelope = {
  schemaVersion: 1;
  generation: number;
  previousDigest: string | null;
  payloadDigest: string;
  payload: GenesisRegistrySnapshot;
};
export interface RegistryHead {
  generation: number;
  digest: string;
  payloadDigest: string;
}
const commitName = /^(\d{6})-([0-9a-f]{64})\.json$/;
async function assertRoot(root: string) {
  const s = await lstat(root);
  requireGenesis(
    s.isDirectory() &&
      !s.isSymbolicLink() &&
      (await realpath(root)).toLowerCase() === resolve(root).toLowerCase(),
    'STORE_ROOT',
  );
}
export async function createDryRunStore(root: string) {
  await mkdir(root); // exclusive: never opens or replaces an existing production directory
  await assertRoot(root);
}
function requireStoreAuthorization(
  root: string,
  c: SelectionContext,
  authority: ExecutionAuthority,
  evidence: ExecutionEvidence,
  operation: SnapshotWriteIntent['operation'],
  previous: string | null,
  payload: string,
) {
  validateExecutionEvidence(evidence);
  const intent: SnapshotWriteIntent = {
    operation,
    root: resolve(root),
    selectionSha256: c.selectionSha256,
    previousCommitDigest: previous,
    payloadDigest: payload,
  };
  requireGenesis(
    authority &&
      typeof authority.verifySnapshot === 'function' &&
      evidence &&
      evidence.authorityId.length > 0 &&
      evidence.publicAuthorization.length > 0 &&
      evidence.intentSha256 === genesisDigest(intent) &&
      authority.verifySnapshot(
        Object.freeze(intent),
        Object.freeze({ ...evidence }),
      ),
    'STORE_WRITE_AUTHORIZATION',
  );
}
// Future production entry points are inert without a trusted host authorizer.
// Task071 never supplies this capability or initializes a production store.
export async function createProductionStore(
  root: string,
  c: SelectionContext,
  authority: ExecutionAuthority,
  evidence: ExecutionEvidence,
) {
  requireStoreAuthorization(
    root,
    c,
    authority,
    evidence,
    'INITIALIZE_REGISTRY',
    null,
    genesisDigest(null),
  );
  await createDryRunStore(root);
}
async function readCommit(path: string) {
  const before = await lstat(path);
  requireGenesis(
    before.isFile() &&
      !before.isSymbolicLink() &&
      before.size <= 32 * 1024 * 1024,
    'STORE_FILE',
  );
  const fd = await open(path, constants.O_RDONLY | (constants.O_NOFOLLOW ?? 0));
  try {
    const opened = await fd.stat();
    requireGenesis(
      opened.ino === before.ino &&
        opened.dev === before.dev &&
        opened.size === before.size,
      'STORE_CHANGED',
    );
    const bytes = Buffer.alloc(opened.size);
    let offset = 0;
    while (offset < bytes.length) {
      const r = await fd.read(bytes, offset, bytes.length - offset, offset);
      requireGenesis(r.bytesRead > 0, 'STORE_TRUNCATED');
      offset += r.bytesRead;
    }
    const after = await fd.stat(),
      named = await lstat(path);
    requireGenesis(
      after.size === opened.size &&
        after.mtimeMs === opened.mtimeMs &&
        named.ino === opened.ino &&
        named.dev === opened.dev &&
        !named.isSymbolicLink(),
      'STORE_CHANGED',
    );
    return bytes.toString('utf8');
  } finally {
    await fd.close();
  }
}
async function readStore(
  root: string,
  c: SelectionContext,
  policy: StorePolicy,
) {
  await assertRoot(root);
  const allNames = await readdir(root);
  requireGenesis(
    allNames.every(
      (n) =>
        commitName.test(n) ||
        n === '.write.lock' ||
        /^\.pending-[0-9a-f-]{36}$/.test(n),
    ),
    'STORE_UNEXPECTED_FILE',
  );
  const names = allNames.filter((n) => commitName.test(n)).sort();
  requireGenesis(names.length <= 64, 'STORE_GENERATION_BUDGET');
  const history: RegistryHead[] = [];
  let head: RegistryHead | null = null,
    snapshot: GenesisRegistrySnapshot | null = null;
  for (const [i, name] of names.entries()) {
    const match = commitName.exec(name)!;
    requireGenesis(Number(match[1]) === i, 'STORE_GENERATION_GAP');
    const raw = await readCommit(join(root, name));
    requireGenesis(bytesHash(raw) === match[2], 'STORE_COMMIT_DIGEST');
    const v = parseGenesisJson(raw) as Envelope;
    requireGenesis(
      v !== null &&
        typeof v === 'object' &&
        !Array.isArray(v) &&
        serializeGenesis(v) === raw &&
        Object.keys(v).sort().join('|') ===
          'generation|payload|payloadDigest|previousDigest|schemaVersion' &&
        v.schemaVersion === 1 &&
        v.generation === i &&
        v.previousDigest === (head?.digest ?? null) &&
        v.payloadDigest === genesisDigest(v.payload),
      'STORE_ENVELOPE',
    );
    validateSnapshot(v.payload, c, policy);
    head = { generation: i, digest: match[2]!, payloadDigest: v.payloadDigest };
    history.push(head);
    snapshot = v.payload;
  }
  return { head, snapshot, history };
}
function verifyExpectedHead(
  actual: RegistryHead | null,
  expected: RegistryHead | null,
) {
  requireGenesis(
    genesisDigest(actual) === genesisDigest(expected),
    'STORE_HEAD_PIN',
  );
}
export async function readDryRunStore(
  root: string,
  c: SelectionContext,
  expectedHead?: RegistryHead | null,
) {
  const result = await readStore(root, c, { purpose: 'READINESS_DRY_RUN' });
  if (expectedHead !== undefined) verifyExpectedHead(result.head, expectedHead);
  return result;
}
// A trusted receipt outside the journal detects deletion of its newest commits.
export async function readProductionStore(
  root: string,
  c: SelectionContext,
  authority: ExecutionAuthority,
  expectedHead: RegistryHead | null,
) {
  const result = await readStore(root, c, {
    purpose: 'PRODUCTION',
    executionAuthority: authority,
  });
  verifyExpectedHead(result.head, expectedHead);
  return result;
}
export async function appendDryRunSnapshot(
  root: string,
  snapshot: GenesisRegistrySnapshot,
  c: SelectionContext,
  expectedHead: RegistryHead | null,
  hooks: { beforePublish?: () => Promise<void> } = {},
) {
  return appendSnapshot(
    root,
    snapshot,
    c,
    expectedHead,
    { purpose: 'READINESS_DRY_RUN' },
    hooks,
  );
}
export async function appendProductionSnapshot(
  root: string,
  snapshot: GenesisRegistrySnapshot,
  c: SelectionContext,
  expectedHead: RegistryHead | null,
  authority: ExecutionAuthority,
  evidence: ExecutionEvidence,
  artifacts: ReadonlyMap<string, VerifiedArtifact> = new Map(),
) {
  requireStoreAuthorization(
    root,
    c,
    authority,
    evidence,
    'WRITE_REGISTRY',
    expectedHead?.digest ?? null,
    genesisDigest(snapshot),
  );
  for (const record of snapshot.records) {
    if (
      record.status === 'VALIDATED_FOR_REGISTRATION' ||
      record.status === 'REGISTERED'
    ) {
      const proof = artifacts.get(record.composition.compositionId);
      requireGenesis(
        proof,
        'CURRENT_ARTIFACT_PROOF',
        record.composition.compositionId,
      );
      requireCurrentArtifact(proof, record.composition, 300_000);
    }
  }
  return appendSnapshot(root, snapshot, c, expectedHead, {
    purpose: 'PRODUCTION',
    executionAuthority: authority,
  });
}
async function appendSnapshot(
  root: string,
  snapshot: GenesisRegistrySnapshot,
  c: SelectionContext,
  expectedHead: RegistryHead | null,
  policy: StorePolicy,
  hooks: { beforePublish?: () => Promise<void> } = {},
) {
  validateSnapshot(snapshot, c, policy);
  await assertRoot(root);
  const lockPath = join(root, '.write.lock');
  const nonce = randomUUID();
  let lock;
  try {
    lock = await open(lockPath, 'wx', 0o600);
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === 'EEXIST')
      throw new GenesisError('STORE_LOCK_BUSY');
    throw e;
  }
  const lockStat = await lock.stat();
  const temporary = join(root, '.pending-' + nonce);
  let pendingCreated = false;
  try {
    await lock.writeFile(nonce);
    await lock.sync();
    const current = await readStore(root, c, policy),
      payloadDigest = genesisDigest(snapshot);
    requireGenesis(
      expectedHead === null ||
        current.history.some(
          (h) => genesisDigest(h) === genesisDigest(expectedHead),
        ),
      'STORE_CAS_CONFLICT',
    );
    // Safe retry after an acknowledgement loss: no extra generation is created.
    if (current.head?.payloadDigest === payloadDigest)
      return { head: current.head, idempotent: true };
    requireGenesis(
      (current.head?.digest ?? null) === (expectedHead?.digest ?? null) &&
        (current.head?.generation ?? null) ===
          (expectedHead?.generation ?? null),
      'STORE_CAS_CONFLICT',
    );
    for (const previous of current.snapshot?.records ?? []) {
      const next = snapshot.records.find(
        (r) => r.registrationId === previous.registrationId,
      );
      requireGenesis(
        next &&
          genesisDigest(next.composition) ===
            genesisDigest(previous.composition) &&
          next.history.length >= previous.history.length &&
          genesisDigest(next.history.slice(0, previous.history.length)) ===
            genesisDigest(previous.history),
        'STORE_HISTORY_REWRITE',
        previous.composition.compositionId,
      );
    }
    const generation = (current.head?.generation ?? -1) + 1;
    requireGenesis(generation < 64, 'STORE_GENERATION_BUDGET');
    const envelope: Envelope = {
      schemaVersion: 1,
      generation,
      previousDigest: current.head?.digest ?? null,
      payloadDigest,
      payload: snapshot,
    };
    const raw = serializeGenesis(envelope);
    requireGenesis(Buffer.byteLength(raw) <= 32 * 1024 * 1024, 'STORE_BYTES');
    const digest = bytesHash(raw),
      final = join(
        root,
        String(generation).padStart(6, '0') + '-' + digest + '.json',
      );
    const fd = await open(temporary, 'wx', 0o600);
    pendingCreated = true;
    try {
      await fd.writeFile(raw);
      await fd.sync();
    } finally {
      await fd.close();
    }
    await hooks.beforePublish?.();
    // link is an atomic create-if-absent, unlike rename-to-existing. The bytes
    // are fully written and synced before the immutable commit becomes visible.
    await link(temporary, final);
    const verified = await readStore(root, c, policy);
    requireGenesis(verified.head?.digest === digest, 'STORE_PUBLISH_VERIFY');
    return { head: verified.head, idempotent: false };
  } finally {
    // Only this writer's exact pending file and lock are eligible for cleanup.
    if (pendingCreated) await unlink(temporary);
    await lock.close();
    const named = await lstat(lockPath);
    requireGenesis(
      named.ino === lockStat.ino &&
        named.dev === lockStat.dev &&
        !named.isSymbolicLink(),
      'STORE_LOCK_CHANGED',
    );
    await unlink(lockPath);
  }
}
