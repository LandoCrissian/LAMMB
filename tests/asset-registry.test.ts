import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import sharp from 'sharp';
import { beforeAll, describe, expect, it } from 'vitest';
import registryFixture from '../packages/art-generator/fixtures/stage17-asset-registry.json';
import spec from '../packages/art-generator/specs/lammb-traits-v1.json';
import {
  assetRegistrySchema,
  createRegisteredMetadata,
  renderRegisteredProof,
  resolveRegisteredProof,
} from '../packages/art-generator/src/asset-registry.ts';
import type { AssetRegistry } from '../packages/art-generator/src/asset-registry.ts';
import {
  canonicalSha256,
  sha256Bytes,
} from '../packages/art-generator/src/canonical.ts';
import { configurePngProofWorker } from '../packages/art-generator/src/png-proof.ts';
import pilotFixture from '../packages/art-generator/fixtures/stage20-production-pilot.json';
import {
  productionPilotSchema,
  createPilotMetadata,
  verifyPilotApproval,
  renderPilotCandidate,
} from '../packages/art-generator/src/production-pilot.ts';

describe('bounded development artwork pilot', () => {
  const pilot = () =>
    productionPilotSchema.parse(structuredClone(pilotFixture));
  const candidate = () => {
    const c = pilot().candidates[0]!;
    c.source.sha256 = sha256Bytes(Buffer.from('test output'));
    c.source.approval.sha256 = c.source.sha256;
    return c;
  };
  it('keeps authored variants separate from registered contacts and final approval', () => {
    const p = pilot();
    expect(p.candidates).toHaveLength(19);
    expect(
      p.candidates.filter((c) => c.mode === 'REGISTERED_CONTACT'),
    ).toHaveLength(3);
    expect(
      p.candidates.filter((c) => c.observed.mutation !== 'NONE'),
    ).toHaveLength(5);
    expect(
      p.candidates.every(
        (c) => !c.productionRegistered && c.qa.finalOwnerApproval === null,
      ),
    ).toBe(true);
  });
  it.each([
    'duplicate identity',
    'duplicate image',
    'production promotion',
    'token assignment',
    'unsafe path',
    'unregistered contact',
    'missing art approval',
    'oversized dimensions',
    'batch expansion',
  ])('rejects %s', (kind) => {
    const p = pilot();
    switch (kind) {
      case 'duplicate identity':
        p.candidates[1]!.id = p.candidates[0]!.id;
        break;
      case 'duplicate image':
        p.candidates[1]!.source.sha256 = p.candidates[0]!.source.sha256;
        break;
      case 'production promotion':
        Object.assign(p.candidates[0]!, { productionRegistered: true });
        break;
      case 'token assignment':
        Object.assign(p.candidates[0]!, { tokenId: 1 });
        break;
      case 'unsafe path':
        p.candidates[0]!.source.path = '../outside.png';
        break;
      case 'unregistered contact':
        p.candidates[0]!.mode = 'REGISTERED_CONTACT';
        break;
      case 'missing art approval':
        p.candidates[0]!.source.approval.state =
          'VALIDATED_RECONSTRUCTION_INPUT';
        break;
      case 'oversized dimensions':
        p.candidates[0]!.source.dimensions.width = 1392;
        break;
      case 'batch expansion':
        p.candidates.push(p.candidates[0]!, p.candidates[1]!);
        break;
    }
    expect(productionPilotSchema.safeParse(p).success).toBe(false);
  });
  it('rejects unknown, absent, incompatible and incomplete visible facets', () => {
    for (const [traitId, facets] of [
      ['made-up', ['Species']],
      ['lammb-clothing-none', ['Clothing']],
      ['lammb-wool-ash', ['Background']],
      ['lammb-accessories-beanie-chain', ['Headwear']],
    ] as const) {
      const c = candidate();
      c.visibleClaims = [
        { traitId, facets: [...facets], observation: 'Unit test observation' },
      ];
      expect(() =>
        createPilotMetadata(spec, c, Buffer.from('test output')),
      ).toThrow();
    }
    const c = candidate();
    c.visibleClaims.push({
      traitId: 'lammb-mutations-magma',
      facets: ['Mutation'],
      observation: 'Incompatible with Ivory and hoodie',
    });
    expect(() =>
      createPilotMetadata(spec, c, Buffer.from('test output')),
    ).toThrow('PILOT_MUTATION_CATEGORY');
  });
  it('rejects duplicate categories and closed-mouth gold claims', () => {
    const c = candidate();
    c.visibleClaims.push({
      traitId: 'lammb-wool-ash',
      facets: ['Wool'],
      observation: 'Conflicts with Ivory',
    });
    expect(() =>
      createPilotMetadata(spec, c, Buffer.from('test output')),
    ).toThrow('PILOT_DUPLICATE_CATEGORY');
    c.visibleClaims.pop();
    c.visibleClaims.push(
      {
        traitId: 'lammb-expressions-heavy-lidded',
        facets: ['Expression'],
        observation: 'Closed mouth',
      },
      {
        traitId: 'lammb-accessories-shades-gold',
        facets: ['Eyewear', 'Dental Accent'],
        observation: 'Gold not visible',
      },
    );
    expect(() =>
      createPilotMetadata(spec, c, Buffer.from('test output')),
    ).toThrow('PILOT_INCOMPATIBLE_TRAITS');
  });
  it('binds image bytes and omits unmapped expressions and absent facets', () => {
    const c = candidate();
    expect(() => createPilotMetadata(spec, c, Buffer.from('wrong'))).toThrow(
      'PILOT_METADATA_IMAGE_SHA256',
    );
    const m = createPilotMetadata(spec, c, Buffer.from('test output'));
    expect(m.metadata.attributes.map((a) => a.trait_type)).toEqual([
      'Species',
      'Wool',
      'Clothing',
    ]);
    expect(m.binding.completeCollectionVector).toBe(false);
    expect(m.binding.tokenAssignment).toBeNull();
    expect(m.metadata.image).toContain('.invalid/');
  });
  it('decodes approved authored PNG and preserves exact bytes; rejects evidence and source changes', async () => {
    const root = await mkdtemp(join(tmpdir(), 'lammb-pilot-'));
    try {
      const bytes = await sharp({
        create: { width: 3, height: 3, channels: 3, background: '#222222' },
      })
        .png()
        .toBuffer();
      const p = pilot(),
        c = p.candidates[0]!;
      p.candidates = [c];
      c.source.path = 'source.png';
      c.source.dimensions = { width: 3, height: 3 };
      c.source.sha256 = sha256Bytes(bytes);
      c.source.approval.sha256 = c.source.sha256;
      p.approvalInventory.path = 'approval.json';
      const record = {
        assets: [
          {
            assetId: c.historicalAssetId,
            sha256: c.source.sha256,
            aliases: [join(root, c.source.path)],
            principalArtwork: true,
            approvalStatus: 'APPROVED_ART_DIRECTION',
          },
        ],
      };
      // Historical inventories also contain long hash-derived reference IDs.
      record.assets.push({
        ...record.assets[0]!,
        assetId: `lammb-audit-sha256-${'a'.repeat(64)}`,
        principalArtwork: false,
      });
      const withReference = Buffer.from(JSON.stringify(record));
      p.approvalInventory.sha256 = sha256Bytes(withReference);
      const initialApproval = withReference;
      await writeFile(join(root, c.source.path), bytes);
      await writeFile(join(root, 'approval.json'), initialApproval);
      const digest = canonicalSha256(p);
      const result = await renderPilotCandidate(
        root,
        p,
        c.id,
        digest,
        spec,
        registryFixture,
      );
      expect(Buffer.from(result.bytes).equals(bytes)).toBe(true);
      expect(result.receipt.decodedBytes).toBe(27);
      await expect(
        verifyPilotApproval(root, p, c.id, '0'.repeat(64)),
      ).rejects.toThrow('PILOT_MANIFEST_SHA256');
      for (const status of [
        'REJECTED',
        'CONDITIONAL_APPROVAL',
        'PRODUCTION_REGISTERED',
      ]) {
        record.assets[0]!.approvalStatus = status;
        const updated = Buffer.from(JSON.stringify(record));
        p.approvalInventory.sha256 = sha256Bytes(updated);
        await writeFile(join(root, 'approval.json'), updated);
        await expect(
          verifyPilotApproval(root, p, c.id, canonicalSha256(p)),
        ).rejects.toThrow('PILOT_ART_APPROVAL');
      }
      await writeFile(join(root, 'approval.json'), initialApproval);
      p.approvalInventory.sha256 = sha256Bytes(initialApproval);
      await writeFile(join(root, 'source.png'), Buffer.from('changed'));
      await expect(
        renderPilotCandidate(root, p, c.id, digest, spec, registryFixture),
      ).rejects.toThrow('SOURCE_SHA256');
      const malformed = Buffer.from('not PNG');
      c.source.sha256 = sha256Bytes(malformed);
      c.source.approval.sha256 = c.source.sha256;
      record.assets[0]!.approvalStatus = 'APPROVED_ART_DIRECTION';
      record.assets[0]!.sha256 = c.source.sha256;
      const newApproval = Buffer.from(JSON.stringify(record));
      p.approvalInventory.sha256 = sha256Bytes(newApproval);
      await writeFile(join(root, 'approval.json'), newApproval);
      await writeFile(join(root, 'source.png'), malformed);
      await expect(
        renderPilotCandidate(
          root,
          p,
          c.id,
          canonicalSha256(p),
          spec,
          registryFixture,
        ),
      ).rejects.toThrow('PNG_SIGNATURE');
    } finally {
      expect(root.startsWith(join(tmpdir(), 'lammb-pilot-'))).toBe(true);
      await rm(root, { recursive: true, force: true });
    }
  });
});

const clone = () => structuredClone(assetRegistrySchema.parse(registryFixture));
describe('source-specific registry trust and compatibility boundaries', () => {
  it('keeps artistic approval separate from production registration', () => {
    const r = clone();
    expect(r.assets).toHaveLength(8);
    expect(
      r.assets.filter((a) => a.state === 'RECONSTRUCTION_VALIDATED'),
    ).toHaveLength(5);
    expect(r.assets.some((a) => a.state === 'PRODUCTION_REGISTERED')).toBe(
      false,
    );
    for (const p of r.proofs)
      expect(
        resolveRegisteredProof(r, p.id).request.registration.poseFamily,
      ).toBe('ORIGINAL_THREE_QUARTER');
  });
  const cases: [string, (r: AssetRegistry) => void][] = [
    [
      'unreviewed production promotion',
      (r) => {
        r.assets[0]!.state = 'PRODUCTION_REGISTERED';
      },
    ],
    [
      'conditional base approval',
      (r) => {
        r.assets[0]!.state = 'CONDITIONAL_ART_APPROVAL';
      },
    ],
    [
      'rejected base',
      (r) => {
        r.assets[0]!.state = 'REJECTED';
      },
    ],
    [
      'missing approval record',
      (r) => {
        r.assets[0]!.approvalEvidenceIds = [];
      },
    ],
    [
      'unknown approval record',
      (r) => {
        r.assets[0]!.approvalEvidenceIds = ['missing-record'];
      },
    ],
    [
      'missing reconstruction evidence',
      (r) => {
        r.assets[3]!.reconstructionEvidenceIds = [];
      },
    ],
    [
      'framing record used as artistic approval',
      (r) => {
        r.assets[0]!.approvalEvidenceIds = ['framing-proposal'];
      },
    ],
    [
      'wrong source classification',
      (r) => {
        r.assets[0]!.classification = 'CONTACT_DERIVATIVE';
      },
    ],
    [
      'wrong historical color layout',
      (r) => {
        r.assets[5]!.source.channels = 4;
      },
    ],
    [
      'incorrect approval hash',
      (r) => {
        r.assets[0]!.source.approval.sha256 = '0'.repeat(64);
      },
    ],
    [
      'incorrect source/contact hash binding',
      (r) => {
        r.assets[0]!.source.sha256 = '0'.repeat(64);
        r.assets[0]!.source.approval.sha256 = '0'.repeat(64);
      },
    ],
    [
      'unregistered source',
      (r) => {
        r.proofs[0]!.baseId = 'absent-base';
      },
    ],
    [
      'duplicate binding',
      (r) => {
        r.assets[1]!.source.id = r.assets[0]!.source.id;
      },
    ],
    [
      'incompatible contact receiver',
      (r) => {
        r.assets[3]!.compatibleBaseIds = ['broad-ash'];
      },
    ],
    [
      'front contact on three-quarter receiver',
      (r) => {
        r.assets[3]!.families.pose = 'FRONT';
      },
    ],
    [
      'incorrect registered pose',
      (r) => {
        r.proofs[0]!.registration.poseFamily = 'FRONT';
      },
    ],
    [
      'absent asset registration',
      (r) => {
        r.assets[0]!.registrationIds = [];
      },
    ],
    [
      'out-of-bounds ROI',
      (r) => {
        r.proofs[0]!.registration.roi.x = 1250;
      },
    ],
    [
      'polygon outside ROI',
      (r) => {
        r.proofs[0]!.registration.polygon[0] = [0, 0];
      },
    ],
    [
      'decoded dimension mismatch',
      (r) => {
        r.assets[0]!.decodedDimensions.width = 100;
      },
    ],
    [
      'hidden/new accessory facet',
      (r) => {
        r.proofs[0]!.visibleTraitIds[3] = 'lammb-accessories-gold-teeth';
      },
    ],
    [
      'Ivory metadata for Ash source',
      (r) => {
        r.proofs[1]!.visibleTraitIds[1] = 'lammb-wool-ivory';
      },
    ],
    [
      'Ivory metadata for Rolled Locks',
      (r) => {
        r.proofs[2]!.visibleTraitIds[1] = 'lammb-wool-ivory';
      },
    ],
    [
      'output with wrong family',
      (r) => {
        r.assets[6]!.families.wool = 'IVORY_CURLS';
      },
    ],
    [
      'dependency cycle',
      (r) => {
        r.assets[0]!.dependencies = [r.assets[5]!.id];
      },
    ],
    [
      'missing historical dependency',
      (r) => {
        r.assets[5]!.dependencies = [];
      },
    ],
  ];
  it.each(cases)('rejects %s', (_name, mutate) => {
    const r = clone();
    mutate(r);
    expect(assetRegistrySchema.safeParse(r).success).toBe(false);
  });
  it('rejects undeclared proof selection', () =>
    expect(() => resolveRegisteredProof(clone(), 'unregistered')).toThrow(
      'UNREGISTERED_PROOF',
    ));
});

let registry: AssetRegistry;
let files: Map<string, Buffer>;
let expected: Buffer;
beforeAll(async () => {
  configurePngProofWorker();
  const encode = (b: Buffer, w: number, h: number, c: 3 | 4) =>
    sharp(b, { raw: { width: w, height: h, channels: c } })
      .png({ compressionLevel: 9, adaptiveFiltering: false, palette: false })
      .toBuffer();
  const raw = Buffer.alloc(75);
  for (let i = 0; i < 75; i += 3) raw.set([50, 100, 150], i);
  const joint = Buffer.alloc(36);
  joint.set([200, 50, 20, 128], 16);
  const mask = Buffer.alloc(75);
  mask.set([128, 128, 128], 36);
  const final = Buffer.from(raw);
  final.set([125, 75, 85], 36);
  const bytes = await Promise.all([
    encode(raw, 5, 5, 3),
    encode(joint, 3, 3, 4),
    encode(mask, 5, 5, 3),
    encode(final, 5, 5, 3),
  ]);
  expected = bytes[3]!;
  const r = clone();
  const p = r.proofs[0]!;
  r.proofs = [p];
  r.assets = r.assets.filter((a) =>
    [p.baseId, p.contactId, p.maskId, p.historicalOutputId].includes(a.id),
  );
  files = new Map();
  for (const [i, a] of r.assets.entries()) {
    a.source.path = `source-${i}.png`;
    a.source.sha256 = sha256Bytes(bytes[i]!);
    a.source.approval.sha256 = a.source.sha256;
    a.source.dimensions = { width: i === 1 ? 3 : 5, height: i === 1 ? 3 : 5 };
    a.decodedDimensions = { ...a.source.dimensions };
    a.landmarks = [];
    a.registrationIds = [p.id];
    if (a.compatibleBaseIds.length) a.compatibleBaseIds = [p.baseId];
    files.set(a.source.path, bytes[i]!);
  }
  p.registration.baseSha256 = r.assets[0]!.source.sha256;
  p.registration.jointSha256 = r.assets[1]!.source.sha256;
  p.registration.maskSha256 = r.assets[2]!.source.sha256;
  p.registration.roi = { x: 1, y: 1, width: 3, height: 3 };
  p.registration.polygon = [
    [1, 1],
    [4, 1],
    [4, 4],
    [1, 4],
  ];
  for (const [i, e] of r.evidence.entries()) {
    const b = Buffer.from(`Synthetic review evidence ${i}; not collection art`);
    e.path = `evidence-${i}.txt`;
    e.sha256 = sha256Bytes(b);
    files.set(e.path, b);
  }
  registry = assetRegistrySchema.parse(r);
});
async function withSources(run: (root: string) => Promise<void>) {
  const root = await mkdtemp(join(tmpdir(), 'lammb-registry-'));
  try {
    for (const [p, b] of files) await writeFile(join(root, p), b);
    await run(root);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}
describe('registered PNG resolution and visible metadata', () => {
  it('reconstructs exact native bytes, preserves outside-mask pixels, and resolves metadata', async () =>
    withSources(async (root) => {
      const hash = canonicalSha256(registry);
      const a = await renderRegisteredProof(
        root,
        registry,
        registry.proofs[0]!.id,
        hash,
      );
      const b = await renderRegisteredProof(
        root,
        structuredClone(registry),
        registry.proofs[0]!.id,
        hash,
      );
      expect(a.output.equals(expected)).toBe(true);
      expect(b.output.equals(a.output)).toBe(true);
      expect(a.receipt.pixelPreservation).toMatchObject({
        changedPixels: 1,
        outsideMaskChangedPixels: 0,
      });
      expect(
        createRegisteredMetadata(
          spec,
          registry,
          registry.proofs[0]!.id,
          a.output,
        ).metadata.attributes,
      ).toHaveLength(4);
    }));
  it('rejects a substituted registry before decoding', async () =>
    withSources(async (root) => {
      await expect(
        renderRegisteredProof(
          root,
          registry,
          registry.proofs[0]!.id,
          '0'.repeat(64),
        ),
      ).rejects.toThrow('REGISTRY_SHA256');
    }));
  it('rejects substituted approval evidence', async () =>
    withSources(async (root) => {
      await writeFile(join(root, registry.evidence[0]!.path), 'forged');
      await expect(
        renderRegisteredProof(
          root,
          registry,
          registry.proofs[0]!.id,
          canonicalSha256(registry),
        ),
      ).rejects.toThrow('SOURCE_SHA256');
    }));
  it('rejects a hash mismatch before PNG decoding', async () =>
    withSources(async (root) => {
      await writeFile(join(root, registry.assets[0]!.source.path), 'changed');
      await expect(
        renderRegisteredProof(
          root,
          registry,
          registry.proofs[0]!.id,
          canonicalSha256(registry),
        ),
      ).rejects.toThrow('SOURCE_SHA256');
    }));
  it('rejects missing local sources', async () =>
    withSources(async (root) => {
      await rm(join(root, registry.assets[1]!.source.path));
      await expect(
        renderRegisteredProof(
          root,
          registry,
          registry.proofs[0]!.id,
          canonicalSha256(registry),
        ),
      ).rejects.toThrow('SOURCE_IO');
    }));
  it('rejects malformed PNG even with a matching declared hash', async () =>
    withSources(async (root) => {
      const r = structuredClone(registry),
        b = Buffer.from('not a PNG'),
        a = r.assets[0]!;
      a.source.sha256 = sha256Bytes(b);
      a.source.approval.sha256 = a.source.sha256;
      r.proofs[0]!.registration.baseSha256 = a.source.sha256;
      await writeFile(join(root, a.source.path), b);
      await expect(
        renderRegisteredProof(root, r, r.proofs[0]!.id, canonicalSha256(r)),
      ).rejects.toThrow('PNG_SIGNATURE');
    }));
  it('rejects oversized source before decoding or unbounded allocation', async () =>
    withSources(async (root) => {
      const b = Buffer.alloc(4 * 1024 * 1024 + 1);
      await writeFile(join(root, registry.assets[0]!.source.path), b);
      await expect(
        renderRegisteredProof(
          root,
          registry,
          registry.proofs[0]!.id,
          canonicalSha256(registry),
        ),
      ).rejects.toThrow('SOURCE_BYTES');
    }));
  it('rejects contact alpha that disagrees with the registered mask', async () =>
    withSources(async (root) => {
      const r = structuredClone(registry),
        a = r.assets[1]!,
        raw = Buffer.alloc(36);
      raw.set([200, 50, 20, 127], 16);
      const b = await sharp(raw, { raw: { width: 3, height: 3, channels: 4 } })
        .png()
        .toBuffer();
      a.source.sha256 = sha256Bytes(b);
      a.source.approval.sha256 = a.source.sha256;
      r.proofs[0]!.registration.jointSha256 = a.source.sha256;
      await writeFile(join(root, a.source.path), b);
      await expect(
        renderRegisteredProof(root, r, r.proofs[0]!.id, canonicalSha256(r)),
      ).rejects.toThrow('ALPHA_MASK_MISMATCH');
    }));
  it('rejects metadata for different image bytes', () =>
    expect(() =>
      createRegisteredMetadata(
        spec,
        registry,
        registry.proofs[0]!.id,
        Buffer.from('wrong'),
      ),
    ).toThrow('METADATA_IMAGE_SHA256'));
  it.each([
    ['proof-broad-ash', 'Ash Curls'],
    ['proof-rolled-locks', 'Rolled Locks'],
  ])('derives the truthful wool facet for %s', (id, wool) => {
    // Tiny bytes stand in only for the expected hash; no production artwork is used in tests.
    const r = clone();
    const proof = r.proofs.find((p) => p.id === id)!;
    const h = r.assets.find((a) => a.id === proof.historicalOutputId)!;
    h.source.sha256 = sha256Bytes(expected);
    h.source.approval.sha256 = h.source.sha256;
    const m = createRegisteredMetadata(spec, r, id, expected);
    expect(m.metadata.attributes).toContainEqual({
      trait_type: 'Wool',
      value: wool,
    });
    expect(m.metadata.attributes.map((a) => a.trait_type)).toEqual([
      'Species',
      'Wool',
      'Clothing',
      'Ear Tag',
    ]);
    expect(m.binding.tokenAssignment).toBeNull();
  });
});
