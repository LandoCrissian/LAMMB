import {
  mkdtemp,
  readFile,
  readdir,
  rename,
  symlink,
  unlink,
  writeFile,
} from 'node:fs/promises';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  bindGeometryIndex,
  bytesHash,
  genesisDigest,
  imageCid,
  loadSelection,
  parseGenesisJson,
  serializeGenesis,
  validateGeometry,
} from '../packages/art-generator/src/genesis-model.ts';
import {
  adaptMetadata,
  restoreTask070,
  safeRelativePath,
  validateAdapted,
  verifyArtifact,
} from '../packages/art-generator/src/genesis-adapter.ts';
import {
  developmentRecord,
  registrySnapshot,
  transitionRecord,
  validateRegistryRecord,
  validateSnapshot,
} from '../packages/art-generator/src/genesis-registry.ts';
import {
  appendDryRunSnapshot,
  appendProductionSnapshot,
  createDryRunStore,
  createProductionStore,
  readDryRunStore,
} from '../packages/art-generator/src/genesis-store.ts';
import { cleanupGenesisFixture, genesisFixture } from './genesis-fixture.ts';
import type { GenesisFixture } from './genesis-fixture.ts';

let f: GenesisFixture;
beforeAll(async () => {
  f = await genesisFixture();
});
afterAll(async () => {
  if (f) await cleanupGenesisFixture(f);
});
const clonedManifest = () => structuredClone(f.manifest);
const development = () => developmentRecord(f.composition, f.context);
const accepted = () =>
  transitionRecord(development(), 'OWNER_ACCEPTED', f.context);
const validated = () =>
  transitionRecord(accepted(), 'VALIDATED_FOR_REGISTRATION', f.context, {
    artifact: f.proof,
  });
const snapshot = () => registrySnapshot([validated()], f.context);
const store = async () => {
  const root = await mkdtemp(join(f.root, 'store-'));
  // createDryRunStore's exclusive mkdir is intentionally not used on an existing directory.
  return root;
};

describe('versioned exact-value metadata adapter', () => {
  it('reads a 720-entry frozen scope without executing registrations', () => {
    expect(f.manifest.entries).toHaveLength(720);
    expect(f.context.selectionSha256).toBe(bytesHash(f.manifestRaw));
    expect(development().status).toBe('DEVELOPMENT');
  });
  it('preserves every source field and the exact original JSON bytes', () => {
    const restored = restoreTask070(f.composition, f.context);
    expect(restored.sourceMetadataJson).toBe(f.metadataRaw);
    expect(restored.entry).toEqual(f.manifest.entries[0]);
    expect(restored.entry.rendererVersion).toEqual(
      f.manifest.entries[0]!.rendererVersion,
    );
  });
  it('preserves Unicode and CRLF values without normalization', () => {
    expect(f.composition.metadata.description).toBe(f.metadata.description);
    expect(f.composition.metadata.description).not.toBe(
      f.metadata.description.normalize('NFC').replace(/\r\n/g, '\n'),
    );
  });
  it('separates source byte hashes from canonical production metadata hashes', () => {
    expect(f.composition.sourceMetadataSha256).toBe(bytesHash(f.metadataRaw));
    expect(f.composition.effectiveMetadataSha256).toBe(
      genesisDigest(f.metadata),
    );
    expect(f.composition.sourceMetadataSha256).not.toBe(
      f.composition.effectiveMetadataSha256,
    );
  });
  it('replays the adapter deterministically without changing identifiers', () => {
    const again = adaptMetadata(
      f.context,
      f.composition.compositionId,
      f.metadataRaw,
      f.proof,
    );
    expect(serializeGenesis(again)).toBe(serializeGenesis(f.composition));
    expect(again.compositionId).toBe(
      f.manifest.entries[0]!.stableCompositionId,
    );
  });
  const badMetadata: [string, (x: typeof f.metadata) => unknown][] = [
    [
      'fabricated trait label',
      (x) => ({ ...x, attributes: [{ trait_type: 'Rarity', value: '1%' }] }),
    ],
    ['unknown field', (x) => ({ ...x, token_id: 1 })],
    [
      'wrong external URL',
      (x) => ({ ...x, external_url: 'https://other.invalid' }),
    ],
    ['invalid URI', (x) => ({ ...x, image: 'javascript:alert(1)' })],
    [
      'fabricated supported-trait value',
      (x) => ({ ...x, attributes: [{ trait_type: 'Species', value: 'Cat' }] }),
    ],
    [
      'duplicate trait label',
      (x) => ({ ...x, attributes: [x.attributes[0], x.attributes[0]] }),
    ],
    [
      'different image assignment',
      (x) => ({ ...x, image: 'ipfs://' + imageCid(bytesHash('other PNG')) }),
    ],
    ['missing attributes', (x) => ({ ...x, attributes: [] })],
  ];
  it.each(badMetadata)('rejects %s', (_, mutate) => {
    expect(() =>
      adaptMetadata(
        f.context,
        f.composition.compositionId,
        JSON.stringify(mutate(f.metadata)),
        f.proof,
      ),
    ).toThrow();
  });
  it('rejects a caller-forged serializable artifact proof', () => {
    expect(() =>
      adaptMetadata(f.context, f.composition.compositionId, f.metadataRaw, {
        ...f.proof,
      }),
    ).toThrow('ARTIFACT_PROOF');
  });
  it.each([
    [
      'composition identity',
      (v: typeof f.composition) => {
        v.compositionId = 'OTHER-IDENTITY';
      },
    ],
    [
      'classification',
      (v: typeof f.composition) => {
        v.classification = 'GRAIL';
      },
    ],
    [
      'PNG hash',
      (v: typeof f.composition) => {
        v.pngSha256 = bytesHash('stale');
      },
    ],
    [
      'pixel hash',
      (v: typeof f.composition) => {
        v.pixelSha256 = bytesHash('stale');
      },
    ],
    [
      'original JSON',
      (v: typeof f.composition) => {
        v.extensions.task070.sourceMetadataJson += ' ';
      },
    ],
    [
      'recipe provenance',
      (v: typeof f.composition) => {
        v.provenance.recipe = {};
      },
    ],
    [
      'recovery reference',
      (v: typeof f.composition) => {
        v.provenance.recovery = {};
      },
    ],
    [
      'geometry digest',
      (v: typeof f.composition) => {
        v.verification = {
          ...v.verification,
          geometrySha256: bytesHash('fake'),
        };
      },
    ],
    [
      'grid digest',
      (v: typeof f.composition) => {
        v.verification = { ...v.verification, gridSha256: bytesHash('fake') };
      },
    ],
    [
      'source-binding digest',
      (v: typeof f.composition) => {
        v.verification = {
          ...v.verification,
          sourceBindingsSha256: bytesHash('fake'),
        };
      },
    ],
  ])('rejects changed %s after adaptation', (_, mutate) => {
    const v = structuredClone(f.composition);
    mutate(v);
    expect(() => validateAdapted(v, f.context)).toThrow();
  });
  it('rejects unknown extension namespaces instead of stripping them', () => {
    const v = {
      ...f.composition,
      extensions: { ...f.composition.extensions, invented: { approve: true } },
    };
    expect(() => validateAdapted(v, f.context)).toThrow('ADAPTER_SCHEMA');
  });
});

describe('selection and approval trust boundary', () => {
  it.each([
    [
      'duplicate composition IDs',
      (m: typeof f.manifest) => {
        m.entries[1]!.stableCompositionId = m.entries[0]!.stableCompositionId;
      },
    ],
    [
      'duplicate PNG assignments',
      (m: typeof f.manifest) => {
        m.entries[1]!.pngSha256 = m.entries[0]!.pngSha256;
        m.entries[1]!.acceptedImageHash = m.entries[0]!.pngSha256;
      },
    ],
    [
      'duplicate pixels',
      (m: typeof f.manifest) => {
        m.entries[1]!.pixelSha256 = m.entries[0]!.pixelSha256;
      },
    ],
    [
      'missing recipe provenance',
      (m: typeof f.manifest) => {
        m.entries[0]!.effectiveRecipe = {};
      },
    ],
    [
      'missing renderer',
      (m: typeof f.manifest) => {
        m.entries[0]!.rendererVersion = {};
      },
    ],
    [
      'missing recovery',
      (m: typeof f.manifest) => {
        m.entries[0]!.recoveryArchiveReference = {};
      },
    ],
    [
      'unresolvable recovery evidence',
      (m: typeof f.manifest) => {
        m.entries[0]!.recoveryArchiveReference = {
          note: 'archive not identified',
        };
      },
    ],
    [
      'invalid supply totals',
      (m: typeof f.manifest) => {
        m.entries.pop();
      },
    ],
    [
      'wrong classification distribution',
      (m: typeof f.manifest) => {
        m.entries[0]!.classification = 'GRAIL';
      },
    ],
    [
      'stale accepted image',
      (m: typeof f.manifest) => {
        m.entries[0]!.acceptedImageHash = bytesHash('old PNG');
      },
    ],
  ])('rejects %s even if a caller pins the malformed document', (_, mutate) => {
    const m = clonedManifest();
    mutate(m);
    const raw = JSON.stringify(m);
    expect(() => loadSelection(raw, bytesHash(raw))).toThrow();
  });
  it.each(['HOLD', 'SUPERSEDED', 'REWORK', 'REJECT'])(
    'rejects %s as selected artwork',
    (status) => {
      const m = clonedManifest();
      const raw = JSON.stringify({
        ...m,
        entries: [
          { ...m.entries[0], artisticReviewStatus: status },
          ...m.entries.slice(1),
        ],
      });
      expect(() => loadSelection(raw, bytesHash(raw))).toThrow(
        'SELECTION_SCHEMA',
      );
    },
  );
  it('rejects selection schema version mismatch', () => {
    const raw = JSON.stringify({ ...f.manifest, schemaVersion: 'future/9' });
    expect(() => loadSelection(raw, bytesHash(raw))).toThrow(
      'SELECTION_SCHEMA',
    );
  });
  it('rejects unknown selection-entry fields', () => {
    const m = clonedManifest();
    const raw = JSON.stringify({
      ...m,
      entries: [{ ...m.entries[0], invented: true }, ...m.entries.slice(1)],
    });
    expect(() => loadSelection(raw, bytesHash(raw))).toThrow(
      'SELECTION_SCHEMA',
    );
  });
  it('rejects silent superseded-parent substitution against the frozen digest', () => {
    const m = clonedManifest();
    m.entries[0]!.stableCompositionId = 'PG50-D010';
    expect(() =>
      loadSelection(JSON.stringify(m), f.context.selectionSha256),
    ).toThrow('SELECTION_DIGEST');
  });
  it('keeps a valid source in DEVELOPMENT if no approval evidence is supplied', () => {
    const noApproval = loadSelection(f.manifestRaw, bytesHash(f.manifestRaw));
    const indexRaw = JSON.stringify(f.index);
    const c = bindGeometryIndex(noApproval, indexRaw, bytesHash(indexRaw));
    const d = developmentRecord(f.composition, c);
    expect(d.status).toBe('DEVELOPMENT');
    expect(() => transitionRecord(d, 'OWNER_ACCEPTED', c)).toThrow(
      'OWNER_APPROVAL_REQUIRED',
    );
  });
  it('rejects stale approval file hashes', () => {
    expect(() =>
      loadSelection(f.manifestRaw, f.context.selectionSha256, {
        raw: f.approvalRaw,
        expectedSha256: bytesHash('old approval'),
      }),
    ).toThrow('APPROVAL_DIGEST');
  });
  it('rejects an approval tied to another selection', () => {
    const raw = JSON.stringify({
      ...f.approval,
      exactSelectionManifestSha256: bytesHash('different manifest'),
    });
    expect(() =>
      loadSelection(f.manifestRaw, f.context.selectionSha256, {
        raw,
        expectedSha256: bytesHash(raw),
      }),
    ).toThrow('APPROVAL_SCOPE');
  });
});

describe('physical peg geometry and source IO', () => {
  it('verifies actual PNG CRC, decoded pixels, source files and layer/grid bindings', () => {
    expect(f.proof.pngSha256).toBe(bytesHash(f.png));
    expect(
      validateGeometry(f.context, f.composition.compositionId, f.geometryRaw)
        .contactCount,
    ).toBe(1);
  });
  const cases: [string, (g: typeof f.geometry) => void][] = [
    [
      'out-of-bounds address',
      (g) => {
        g.layers.eyes[0]![0] = 4096;
      },
    ],
    [
      'duplicate address',
      (g) => {
        g.layers.eyes.push([...g.layers.eyes[0]!]);
      },
    ],
    [
      'nonexistent paint',
      (g) => {
        g.layers.eyes[0]![1] = 191;
      },
    ],
    [
      'wrong layer order',
      (g) => {
        g.layerOrder.reverse();
      },
    ],
    [
      'background intrusion',
      (g) => {
        (g.layers.background as number[][]).push([100, 1]);
      },
    ],
    [
      'missing body contact',
      (g) => {
        g.layers.clothing = [[164, 1]];
      },
    ],
    [
      'false contact count',
      (g) => {
        g.contactCount = 9;
      },
    ],
    [
      'broken source binding',
      (g) => {
        g.sourceBindings[0]!.sha256 = bytesHash('wrong source');
      },
    ],
    [
      'changed grid digest',
      (g) => {
        g.gridSha256 = bytesHash('wrong grid');
      },
    ],
  ];
  it.each(cases)(
    'rejects %s despite an explicitly pinned witness',
    (_, mutate) => {
      const g = structuredClone(f.geometry);
      mutate(g);
      const raw = JSON.stringify(g);
      const index = structuredClone(f.index);
      index.files[0]!.sha256 = bytesHash(raw);
      index.files[0]!.gridSha256 = g.gridSha256;
      index.files[0]!.sourceBindingsSha256 = genesisDigest(g.sourceBindings);
      const c = bindGeometryIndex(
        f.base,
        JSON.stringify(index),
        bytesHash(JSON.stringify(index)),
      );
      expect(() =>
        validateGeometry(c, f.composition.compositionId, raw),
      ).toThrow();
    },
  );
  it('rejects a mutated witness against its existing hash pin', () => {
    expect(() =>
      validateGeometry(
        f.context,
        f.composition.compositionId,
        f.geometryRaw + ' ',
      ),
    ).toThrow('GEOMETRY_DIGEST');
  });
  it.each([
    '../escape.json',
    '/absolute.json',
    'C:/absolute.json',
    'a\\b',
    'a//b',
    './same',
  ])('rejects unsafe relative path %s', (value) => {
    expect(() => safeRelativePath(value)).toThrow('RELATIVE_PATH');
  });
  it('detects unexpected source-file modification', async () => {
    const local = await genesisFixture();
    try {
      await writeFile(local.sourcePath, '{"changed":true}');
      await expect(
        verifyArtifact(local.context, local.composition.compositionId, {
          sourceRoots: [local.root],
          geometryRoot: local.geometryRoot,
        }),
      ).rejects.toThrow('SOURCE_FILE_DIGEST');
    } finally {
      await cleanupGenesisFixture(local);
    }
  });
  it('detects artwork modification without rewriting the accepted PNG', async () => {
    const local = await genesisFixture();
    try {
      await writeFile(local.pngPath, Buffer.from('bad PNG'));
      await expect(
        verifyArtifact(local.context, local.composition.compositionId, {
          sourceRoots: [local.root],
          geometryRoot: local.geometryRoot,
        }),
      ).rejects.toThrow('PNG_DIGEST');
    } finally {
      await cleanupGenesisFixture(local);
    }
  });
  it('refuses roots that do not contain the exact source path', async () => {
    await expect(
      verifyArtifact(f.context, f.composition.compositionId, {
        sourceRoots: [f.geometryRoot],
        geometryRoot: f.geometryRoot,
      }),
    ).rejects.toThrow('FILE_OUTSIDE_TRUSTED_ROOT');
  });
  it('refuses a directory junction as the geometry root', async () => {
    const link = join(f.root, 'geometry-link');
    await symlink(f.geometryRoot, link, 'junction');
    await expect(
      verifyArtifact(f.context, f.composition.compositionId, {
        sourceRoots: [f.root],
        geometryRoot: link,
      }),
    ).rejects.toThrow('FILE_ROOT_LINK');
  });
});

describe('explicit registry states and execution authority', () => {
  it('advances only through the three authorized readiness states', () => {
    const v = validated();
    expect(v.status).toBe('VALIDATED_FOR_REGISTRATION');
    expect(v.history.map((e) => e.to)).toEqual([
      'OWNER_ACCEPTED',
      'VALIDATED_FOR_REGISTRATION',
    ]);
    expect(v.ownerAcceptanceReference?.scope).toBe('COLLECTION_LEVEL');
    expect(v.registeredAt).toBeNull();
    expect(f.manifest.entries[0]!.exactOwnerDecision).toBeNull();
  });
  it.each(['VALIDATED_FOR_REGISTRATION', 'REGISTERED'] as const)(
    'blocks state skipping to %s',
    (to) => {
      expect(() => transitionRecord(development(), to, f.context)).toThrow(
        'STATE_TRANSITION',
      );
    },
  );
  it('rejects missing current artifact proof', () => {
    expect(() =>
      transitionRecord(accepted(), 'VALIDATED_FOR_REGISTRATION', f.context),
    ).toThrow('CURRENT_ARTIFACT_PROOF');
  });
  it('rejects a forged current-proof object', () => {
    expect(() =>
      transitionRecord(accepted(), 'VALIDATED_FOR_REGISTRATION', f.context, {
        artifact: { ...f.proof },
      }),
    ).toThrow('CURRENT_ARTIFACT_PROOF');
  });
  it('blocks repeated registration attempts without an execution grant', () => {
    const v = validated(),
      before = serializeGenesis(v);
    for (let i = 0; i < 2; i++)
      expect(() => transitionRecord(v, 'REGISTERED', f.context)).toThrow(
        'EXECUTION_NOT_AUTHORIZED',
      );
    expect(serializeGenesis(v)).toBe(before);
  });
  it('requires a request-bound grant even when a host verifier is supplied', () => {
    expect(() =>
      transitionRecord(validated(), 'REGISTERED', f.context, {
        mode: 'AUTHORIZED_EXECUTION',
        executionAuthority: { verify: () => true },
        executionEvidence: {
          authorityId: 'synthetic',
          intentSha256: bytesHash('stale intent'),
          publicAuthorization: 'not a grant',
        },
      }),
    ).toThrow('EXECUTION_GRANT');
  });
  it('refuses a backdated registration clock', () => {
    expect(() =>
      transitionRecord(validated(), 'REGISTERED', f.context, {
        mode: 'AUTHORIZED_EXECUTION',
        executionAuthority: { verify: () => false },
        executionEvidence: {
          authorityId: 'synthetic',
          intentSha256: bytesHash('no grant'),
          publicAuthorization: 'none',
        },
        clock: () => '2000-01-01T00:00:00.000Z',
      }),
    ).toThrow('REGISTRATION_CLOCK');
  });
  it('revokes only a predeployment readiness copy and preserves the original', () => {
    const v = validated(),
      before = serializeGenesis(v);
    const revoked = transitionRecord(v, 'REVOKED_PREDEPLOYMENT', f.context, {
      deploymentState: 'UNDEPLOYED',
    });
    expect(revoked.status).toBe('REVOKED_PREDEPLOYMENT');
    expect(serializeGenesis(v)).toBe(before);
    expect(() =>
      transitionRecord(revoked, 'OWNER_ACCEPTED', f.context),
    ).toThrow('STATE_TRANSITION');
    expect(() =>
      transitionRecord(v, 'REVOKED_PREDEPLOYMENT', f.context, {
        deploymentState: 'DEPLOYED',
      }),
    ).toThrow('POSTDEPLOYMENT_TRANSITION');
  });
  it('detects forged history and unauthorized registered states', () => {
    const r = validated();
    r.status = 'REGISTERED';
    expect(() => validateRegistryRecord(r, f.context)).toThrow(
      'REGISTRY_RECORD_INTEGRITY',
    );
    const other = validated();
    other.history[0]!.evidenceSha256 = bytesHash('forged approval');
    expect(() => validateRegistryRecord(other, f.context)).toThrow();
  });
  it('rejects registry schema changes and unknown fields', () => {
    const s = snapshot();
    expect(() =>
      validateSnapshot(
        { ...s, schemaVersion: 'bad' } as unknown as typeof s,
        f.context,
      ),
    ).toThrow('REGISTRY_SNAPSHOT_SCHEMA');
    const withUnknownField = { ...s, magicApproval: true };
    expect(() => validateSnapshot(withUnknownField, f.context)).toThrow(
      'REGISTRY_SNAPSHOT_SCHEMA',
    );
  });
  it('rejects duplicate registrations, images and invalid complete totals', () => {
    expect(() =>
      registrySnapshot([validated(), validated()], f.context),
    ).toThrow('REGISTRY_DUPLICATE');
    expect(() => registrySnapshot([validated()], f.context, true)).toThrow(
      'SUPPLY_TOTALS',
    );
  });
});

describe('immutable journal: compare-and-swap, interruption and concurrency', () => {
  it('rejects erasing validated history and empty collection snapshots', async () => {
    const root = await store();
    const first = await appendDryRunSnapshot(root, snapshot(), f.context, null);
    await expect(
      appendDryRunSnapshot(
        root,
        registrySnapshot([development()], f.context),
        f.context,
        first.head,
      ),
    ).rejects.toThrow('STORE_HISTORY_REWRITE');
    expect(() => registrySnapshot([], f.context)).toThrow(
      'REGISTRY_SNAPSHOT_SCHEMA',
    );
  });
  it('checks an externally retained head before accepting a truncated tail', async () => {
    const root = await store();
    const first = await appendDryRunSnapshot(
      root,
      registrySnapshot([development()], f.context),
      f.context,
      null,
    );
    const second = await appendDryRunSnapshot(
      root,
      snapshot(),
      f.context,
      first.head,
    );
    await expect(
      readDryRunStore(root, f.context, second.head),
    ).resolves.toHaveProperty('head', second.head);
    const latest = (await readdir(root)).find((name) =>
      name.startsWith('000001-'),
    )!;
    await unlink(join(root, latest));
    await expect(readDryRunStore(root, f.context, second.head)).rejects.toThrow(
      'STORE_HEAD_PIN',
    );
    await expect(
      appendDryRunSnapshot(
        root,
        registrySnapshot([development()], f.context),
        f.context,
        second.head,
      ),
    ).rejects.toThrow('STORE_CAS_CONFLICT');
  });
  it('rejects an invented expected head even on an identical-payload retry', async () => {
    const root = await store();
    const first = await appendDryRunSnapshot(root, snapshot(), f.context, null);
    await expect(
      appendDryRunSnapshot(root, snapshot(), f.context, {
        ...first.head!,
        digest: bytesHash('invented'),
      }),
    ).rejects.toThrow('STORE_CAS_CONFLICT');
  });
  it('publishes a synced immutable snapshot and retries idempotently', async () => {
    const root = await store(),
      s = snapshot();
    const first = await appendDryRunSnapshot(root, s, f.context, null);
    const retry = await appendDryRunSnapshot(root, s, f.context, null);
    expect(retry.idempotent).toBe(true);
    expect(retry.head).toEqual(first.head);
    expect(
      (await readdir(root)).filter((p) => p.endsWith('.json')),
    ).toHaveLength(1);
  });
  it('rejects a stale compare-and-swap without changing existing bytes', async () => {
    const root = await store(),
      s = snapshot();
    const first = await appendDryRunSnapshot(root, s, f.context, null);
    const revoked = registrySnapshot(
      [transitionRecord(validated(), 'REVOKED_PREDEPLOYMENT', f.context)],
      f.context,
    );
    await expect(
      appendDryRunSnapshot(root, revoked, f.context, null),
    ).rejects.toThrow('STORE_CAS_CONFLICT');
    expect((await readDryRunStore(root, f.context)).head).toEqual(first.head);
  });
  it('preserves the previous generation when a write is interrupted before publication', async () => {
    const root = await store();
    const d = registrySnapshot([development()], f.context);
    const first = await appendDryRunSnapshot(root, d, f.context, null);
    await expect(
      appendDryRunSnapshot(root, snapshot(), f.context, first.head, {
        beforePublish: async () => {
          throw new Error('INJECTED_WRITE_INTERRUPT');
        },
      }),
    ).rejects.toThrow('INJECTED_WRITE_INTERRUPT');
    expect((await readDryRunStore(root, f.context)).head).toEqual(first.head);
    expect(
      (await readdir(root)).filter((p) => p.startsWith('.pending-')),
    ).toEqual([]);
    const good = await appendDryRunSnapshot(
      root,
      snapshot(),
      f.context,
      first.head,
    );
    expect(good.head!.generation).toBe(1);
  });
  it('serializes concurrent writers with an exclusive lock', async () => {
    const root = await store();
    let started!: () => void, release!: () => void;
    const ready = new Promise<void>((r) => {
      started = r;
    });
    const finish = new Promise<void>((r) => {
      release = r;
    });
    const one = appendDryRunSnapshot(root, snapshot(), f.context, null, {
      beforePublish: async () => {
        started();
        await finish;
      },
    });
    await ready;
    await expect(
      appendDryRunSnapshot(root, snapshot(), f.context, null),
    ).rejects.toThrow('STORE_LOCK_BUSY');
    release();
    await one;
    expect((await readDryRunStore(root, f.context)).head!.generation).toBe(0);
  });
  it('does not automatically break a stale lock or trust an interrupted temporary file', async () => {
    const root = await store();
    await writeFile(join(root, '.pending-' + randomUUID()), 'truncated');
    await writeFile(join(root, '.write.lock'), 'synthetic crashed writer');
    expect((await readDryRunStore(root, f.context)).head).toBeNull();
    await expect(
      appendDryRunSnapshot(root, snapshot(), f.context, null),
    ).rejects.toThrow('STORE_LOCK_BUSY');
  });
  it('detects modified registry bytes', async () => {
    const root = await store();
    await appendDryRunSnapshot(root, snapshot(), f.context, null);
    const name = (await readdir(root)).find((p) => p.endsWith('.json'))!;
    const content = await readFile(join(root, name));
    await writeFile(
      join(root, name),
      Buffer.concat([content, Buffer.from(' ')]),
    );
    await expect(readDryRunStore(root, f.context)).rejects.toThrow(
      'STORE_COMMIT_DIGEST',
    );
  });
  it('rejects a missing generation rather than silently rolling back', async () => {
    const root = await store();
    await appendDryRunSnapshot(root, snapshot(), f.context, null);
    const name = (await readdir(root)).find((p) => p.endsWith('.json'))!;
    await rename(
      join(root, name),
      join(root, name.replace(/^000000/, '000001')),
    );
    await expect(readDryRunStore(root, f.context)).rejects.toThrow(
      'STORE_GENERATION_GAP',
    );
  });
  it('rejects unrecognized journal entries', async () => {
    const root = await store();
    await writeFile(join(root, 'unknown-commit.json'), '{}');
    await expect(readDryRunStore(root, f.context)).rejects.toThrow(
      'STORE_UNEXPECTED_FILE',
    );
  });
  it('refuses to create a store over any existing directory', async () => {
    await expect(createDryRunStore(f.root)).rejects.toThrow();
  });
  it('requires independent host authorization for production store creation and writes', async () => {
    const authority = { verify: () => false };
    const evidence = {
      authorityId: 'synthetic',
      intentSha256: bytesHash('not approved'),
      publicAuthorization: 'none',
    };
    await expect(
      createProductionStore(
        join(f.root, 'forbidden-production'),
        f.context,
        authority,
        evidence,
      ),
    ).rejects.toThrow('STORE_WRITE_AUTHORIZATION');
    await expect(
      appendProductionSnapshot(
        f.root,
        snapshot(),
        f.context,
        null,
        authority,
        evidence,
      ),
    ).rejects.toThrow('STORE_WRITE_AUTHORIZATION');
  });
});

describe('canonical serialization security', () => {
  it.each(['{"a":1,"a":2}', '{"a":1,"\\u0061":2}', '{"x":[{"a":1,"a":2}]}'])(
    'rejects ambiguous duplicate JSON keys: %s',
    (raw) => {
      expect(() => parseGenesisJson(raw)).toThrow('JSON_DUPLICATE_KEY');
    },
  );
  it('does not confuse JSON-looking string values or separate objects with duplicate keys', () => {
    expect(
      parseGenesisJson('{"a":"{\\\"a\\\":1}","b":[{"a":1},{"a":2}]}'),
    ).toEqual({ a: '{"a":1}', b: [{ a: 1 }, { a: 2 }] });
  });
  it('has deterministic field ordering while preserving significant array order', () => {
    expect(serializeGenesis({ b: 2, a: [2, 1] })).toBe('{"a":[2,1],"b":2}');
    expect(serializeGenesis({ a: [2, 1], b: 2 })).toBe(
      serializeGenesis({ b: 2, a: [2, 1] }),
    );
  });
  it.each([
    NaN,
    Infinity,
    -Infinity,
    -0,
    Number.MAX_SAFE_INTEGER + 1,
    undefined,
    1n,
    new Date(),
  ])('rejects a non-JSON or unsafe value %s', (v) => {
    expect(() => serializeGenesis(v)).toThrow();
  });
  it('rejects cycles, sparse arrays, accessors and prototype-polluting fields', () => {
    const cycle: unknown[] = [];
    cycle.push(cycle);
    expect(() => serializeGenesis(cycle)).toThrow('SERIALIZATION_CYCLE');
    expect(() => serializeGenesis(Array(2))).toThrow('SERIALIZATION_ARRAY');
    expect(() =>
      serializeGenesis({
        get unsafe() {
          throw new Error('must not execute');
        },
      }),
    ).toThrow('SERIALIZATION_PROPERTY');
    expect(() => parseGenesisJson('{"__proto__":{"approve":true}}')).toThrow(
      'SERIALIZATION_PROPERTY',
    );
    expect(() => parseGenesisJson('{bad')).toThrow('JSON_SYNTAX');
  });
});
