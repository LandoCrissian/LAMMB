import { mkdtemp, mkdir, writeFile, rm, symlink } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { basename, dirname, join, resolve } from 'node:path';
import { deflateSync } from 'node:zlib';
import sharp from 'sharp';
import { beforeAll, describe, expect, it } from 'vitest';
import spec from '../packages/art-generator/specs/lammb-traits-v1.json';
import {
  canonicalSha256,
  sha256Bytes,
} from '../packages/art-generator/src/canonical.ts';
import {
  decodeApprovedPng,
  inspectPng,
  pngProofBudget,
  readProofSource,
} from '../packages/art-generator/src/png-ingestion.ts';
import {
  configurePngProofWorker,
  pngContactRenderer,
} from '../packages/art-generator/src/png-proof.ts';
import { pngProofSchema } from '../packages/art-generator/src/png-proof-schema.ts';
import type { PngProofRequest } from '../packages/art-generator/src/png-proof-schema.ts';
import { createPngProofMetadata } from '../packages/art-generator/src/png-proof-metadata.ts';
import recipeReviews from '../packages/art-generator/fixtures/stage30-recipe-reviews.json';
import stage16Request from '../packages/art-generator/fixtures/stage16-png-proof.json';
import stage17Registry from '../packages/art-generator/fixtures/stage17-asset-registry.json';
import { resolveRegisteredProof } from '../packages/art-generator/src/asset-registry.ts';
import {
  recipeReviewSchema,
  reconcileRecipeAcceptance,
} from '../packages/art-generator/tooling/recipe-acceptance.ts';

// Tiny synthetic pixels only: no collection artwork, production approval or GPU.
const encode = (bytes: Buffer, w: number, h: number, c: 3 | 4) =>
  sharp(bytes, { raw: { width: w, height: h, channels: c } })
    .png({ compressionLevel: 9, adaptiveFiltering: false, palette: false })
    .toBuffer();
let request: PngProofRequest;
let sources: Map<string, Uint8Array>;
let expectedRaw: Buffer;
beforeAll(async () => {
  configurePngProofWorker();
  const raw = Buffer.alloc(5 * 5 * 3);
  for (let i = 0; i < raw.length; i += 3) {
    raw[i] = 50;
    raw[i + 1] = 100;
    raw[i + 2] = 150;
  }
  const joint = Buffer.alloc(3 * 3 * 4);
  joint.set([200, 50, 20, 128], 4 * 4);
  const mask = Buffer.alloc(5 * 5 * 3);
  mask.set([128, 128, 128], (2 * 5 + 2) * 3);
  expectedRaw = Buffer.from(raw);
  expectedRaw.set([125, 75, 85], (2 * 5 + 2) * 3);
  const data = await Promise.all([
    encode(raw, 5, 5, 3),
    encode(joint, 3, 3, 4),
    encode(mask, 5, 5, 3),
  ]);
  const declaration = (
    id: string,
    b: Buffer,
    w: number,
    h: number,
    c: 3 | 4,
    state: 'APPROVED_ART_DIRECTION' | 'VALIDATED_RECONSTRUCTION_INPUT',
  ) => ({
    id,
    path: id + '.png',
    sha256: sha256Bytes(b),
    dimensions: { width: w, height: h },
    channels: c,
    colorPolicy: 'SRGB_8BIT_UNTAGGED_OR_STANDARD_SRGB',
    approval: {
      state,
      sha256: sha256Bytes(b),
      evidence: 'Synthetic unit test; never approved collection art',
    },
    productionRegistered: false,
  });
  const base = declaration(
      'dev-png-test-base',
      data[0]!,
      5,
      5,
      3,
      'APPROVED_ART_DIRECTION',
    ),
    jointSource = declaration(
      'dev-png-test-joint',
      data[1]!,
      3,
      3,
      4,
      'VALIDATED_RECONSTRUCTION_INPUT',
    ),
    maskSource = declaration(
      'dev-png-test-mask',
      data[2]!,
      5,
      5,
      3,
      'VALIDATED_RECONSTRUCTION_INPUT',
    );
  request = pngProofSchema.parse({
    schemaVersion: 1,
    purpose: 'DEVELOPMENT_ONLY',
    renderer: { id: 'png-contact-proof', version: '1.0.0' },
    canvas: { width: 5, height: 5 },
    base,
    joint: jointSource,
    mask: maskSource,
    registration: {
      poseFamily: 'FRONT',
      baseSha256: base.sha256,
      jointSha256: jointSource.sha256,
      maskSha256: maskSource.sha256,
      roi: { x: 1, y: 1, width: 3, height: 3 },
      polygon: [
        [1, 1],
        [4, 1],
        [4, 4],
        [1, 4],
      ],
      transform: 'IDENTITY_NO_RESAMPLING',
      colorMath: 'SRGB_BYTE_INTEGER_SOURCE_OVER',
      alpha: 'STRAIGHT_RGBA_ZERO_RGB_AT_ZERO_ALPHA',
      maskPolicy: 'EXACT_SAVED_MASK_EQUALS_JOINT_ALPHA',
      evidence: 'Synthetic contact',
    },
    expectedOutputSha256: sha256Bytes(await encode(expectedRaw, 5, 5, 3)),
    productionRegistered: false,
  });
  sources = new Map([
    [base.id, data[0]!],
    [jointSource.id, data[1]!],
    [maskSource.id, data[2]!],
  ]);
});

describe('source-bound development recipe reconciliation', () => {
  // These test bytes exercise receipt/metadata logic only. The decoder and
  // renderer tests below use actual synthetic PNGs; native artwork is private.
  // Stage30's private acceptance receipt independently renders all four natives.
  const bytes = Buffer.from('receipt-only unit test; not a rendered PNG');
  const context = (index = 0) => {
    const row = recipeReviews.recipes[index]!;
    const p = pngProofSchema.parse(structuredClone(row.request));
    p.expectedOutputSha256 = sha256Bytes(bytes);
    const r = recipeReviewSchema.parse(structuredClone(row.review));
    r.requestSha256 = canonicalSha256(p);
    return { p, r };
  };
  const reconcile = (
    { p, r }: ReturnType<typeof context>,
    pin = canonicalSha256(r),
  ) => reconcileRecipeAcceptance(r, p, spec, bytes, pin);

  it('pins the four saved requests, source evidence and reviewed observations', () => {
    expect(recipeReviews.recipes).toHaveLength(4);
    expect(recipeReviews.specSha256).toBe(canonicalSha256(spec));
    expect(recipeReviews.registrySha256).toBe(canonicalSha256(stage17Registry));
    for (const row of recipeReviews.recipes) {
      expect(row.reviewSha256).toBe(canonicalSha256(row.review));
      expect(row.review.requestSha256).toBe(canonicalSha256(row.request));
      expect(row.provenance.every((e) => /^[0-9a-f]{64}$/.test(e.sha256))).toBe(
        true,
      );
      expect(row.request).toEqual(
        row.id === 'proof-front-stage16'
          ? stage16Request
          : resolveRegisteredProof(stage17Registry, row.id).request,
      );
    }
    expect(
      new Set(recipeReviews.recipes.map((x) => x.request.expectedOutputSha256))
        .size,
    ).toBe(4);
  });
  it.each([0, 1, 2, 3])(
    'keeps recipe %i incomplete and emits only supported visible facets',
    (index) => {
      const result = reconcile(context(index));
      expect(result.status).toBe('INCOMPLETE');
      expect(result.completeMetadataVector).toBe(false);
      expect(result.unresolved.map((x) => x.category)).toEqual([
        'eyes',
        'environments',
      ]);
      expect(result.supportedTraitIds).toHaveLength(7);
      expect(result.metadata.attributes).toHaveLength(5);
      expect(result.metadata.attributes).toContainEqual({
        trait_type: 'Wool',
        value: ['Ivory Curls', 'Ash Curls', 'Rolled Locks', 'Ivory Curls'][
          index
        ],
      });
      expect(result.metadata.attributes).toContainEqual({
        trait_type: 'Ear Tag',
        value: '5280',
      });
      expect(
        result.metadata.attributes.some(
          (x) =>
            x.value === 'NONE' || ['Eyes', 'Background'].includes(x.trait_type),
        ),
      ).toBe(false);
      expect(result.metadata.image).toContain(sha256Bytes(bytes));
      expect(result.productionRegistered).toBe(false);
      expect(result.tokenAssignment).toBeNull();
      expect(result).not.toHaveProperty('technicallyRenderable');
    },
  );
  it('rejects silent eye/background completion against the reviewed pin', () => {
    const c = context(),
      pin = canonicalSha256(c.r);
    const eye = c.r.slots.find((x) => x.category === 'eyes')!;
    eye.status = 'SUPPORTED_VISIBLE';
    eye.traitId = 'lammb-eyes-radioactive';
    eye.missingEvidence = [];
    expect(() => reconcile(c, pin)).toThrow('RECIPE_REVIEW_SHA256');
  });
  it('rejects changed source/contact declarations and altered specifications', () => {
    const c = context();
    c.p.registration.roi.x++;
    expect(() => reconcile(c)).toThrow('RECIPE_REQUEST_BINDING');
    const d = context(),
      changed = structuredClone(spec);
    changed.referenceEvidence[0]!.note += ' changed review';
    expect(() =>
      reconcileRecipeAcceptance(d.r, d.p, changed, bytes, canonicalSha256(d.r)),
    ).toThrow('RECIPE_SPEC_BINDING');
  });
  it('rejects a changed final output even if declarations are unchanged', () => {
    const c = context();
    expect(() =>
      reconcileRecipeAcceptance(
        c.r,
        c.p,
        spec,
        Buffer.from('different bytes'),
        canonicalSha256(c.r),
      ),
    ).toThrow('RECIPE_OUTPUT_BINDING');
  });
  it('rejects source family and pose mislabeling', () => {
    const c = context(1);
    c.r.sourceFamily.woolTraitId = 'lammb-wool-ivory';
    expect(() => reconcile(c)).toThrow('RECIPE_KNOWN_SOURCE_FAMILY');
    const d = context();
    d.r.sourceFamily.pose = 'FRONT';
    expect(() => reconcile(d)).toThrow('RECIPE_POSE');
  });
  it('rejects an unrecognized native source even with mutually consistent declared hashes', () => {
    const c = context();
    c.p.base.sha256 = 'a'.repeat(64);
    c.p.base.approval.sha256 = c.p.base.sha256;
    c.p.registration.baseSha256 = c.p.base.sha256;
    c.r.requestSha256 = canonicalSha256(c.p);
    expect(() => reconcile(c)).toThrow('RECIPE_KNOWN_SOURCE_FAMILY');
  });
  it('rejects missing approval and production promotion', () => {
    const c = context();
    c.p.base.approval.state = 'VALIDATED_RECONSTRUCTION_INPUT';
    c.r.requestSha256 = canonicalSha256(c.p);
    expect(() => reconcile(c)).toThrow('Base needs explicit artistic approval');
    expect(() =>
      recipeReviewSchema.parse({ ...context().r, productionRegistered: true }),
    ).toThrow();
    expect(() =>
      pngProofSchema.parse({ ...context().p, productionRegistered: true }),
    ).toThrow();
  });
  it('rejects duplicate/missing categories', () => {
    const c = context();
    c.r.slots[1] = structuredClone(c.r.slots[0]!);
    expect(() => reconcile(c)).toThrow('RECIPE_CATEGORY_COVERAGE');
  });
  it('requires explicit unresolved evidence and prohibits filled unresolved slots', () => {
    const c = context();
    c.r.slots.find((x) => x.category === 'eyes')!.missingEvidence = [];
    expect(() => reconcile(c)).toThrow('RECIPE_UNRESOLVED_VALUE');
    const d = context();
    d.r.slots.find((x) => x.category === 'environments')!.traitId =
      'lammb-environments-graphite';
    expect(() => reconcile(d)).toThrow('RECIPE_UNRESOLVED_VALUE');
  });
  it('rejects wrong facets, category substitutions and invented absences', () => {
    const c = context();
    c.r.slots.find((x) => x.category === 'wool')!.traitId = 'lammb-wool-ash';
    expect(() => reconcile(c)).toThrow('RECIPE_SOURCE_FACETS');
    const d = context();
    d.r.slots.find((x) => x.category === 'wool')!.traitId =
      'lammb-clothing-hoodie';
    expect(() => reconcile(d)).toThrow('RECIPE_TRAIT_CATEGORY');
    const e = context();
    e.r.slots.find((x) => x.category === 'wool')!.status = 'SUPPORTED_ABSENT';
    expect(() => reconcile(e)).toThrow('RECIPE_ABSENCE');
  });
  it('omits absence facets without altering the internal collection IDs', () => {
    const c = context();
    c.r.slots.find((x) => x.category === 'mutations')!.status =
      'SUPPORTED_VISIBLE';
    expect(() => reconcile(c)).toThrow('RECIPE_ABSENT_FACET');
    const result = reconcile(context());
    expect(result.supportedTraitIds).toContain('lammb-mutations-none');
    expect(result.supportedTraitIds).toContain('lammb-pixel-corruption-none');
    expect(
      result.metadata.attributes.some(
        (x) => x.trait_type === 'Pixel Corruption',
      ),
    ).toBe(false);
  });
});

function crc(data: Uint8Array) {
  let c = 0xffffffff;
  for (const b of data) {
    c ^= b;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  }
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(name: string, data: Buffer) {
  const c = Buffer.alloc(data.length + 12);
  c.writeUInt32BE(data.length);
  c.write(name, 4, 'ascii');
  data.copy(c, 8);
  c.writeUInt32BE(crc(c.subarray(4, c.length - 4)), c.length - 4);
  return c;
}
function tinyPng({
  width = 1,
  height = 1,
  depth = 8,
  type = 2,
  interlace = 0,
  scan = Buffer.from([0, 1, 2, 3]),
  extras = [] as Buffer[],
} = {}) {
  const h = Buffer.alloc(13);
  h.writeUInt32BE(width);
  h.writeUInt32BE(height, 4);
  h[8] = depth;
  h[9] = type;
  h[12] = interlace;
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', h),
    ...extras,
    chunk('IDAT', deflateSync(scan)),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}
const rebound = (
  p: PngProofRequest,
  b: Buffer,
  role: 'base' | 'joint' | 'mask',
) => {
  const q = structuredClone(p);
  q[role].sha256 = sha256Bytes(b);
  q[role].approval.sha256 = q[role].sha256;
  q.registration[`${role === 'joint' ? 'joint' : role}Sha256`] = q[role].sha256;
  return q;
};

describe('bounded PNG ingestion', () => {
  it('actually decodes approved RGB and RGBA bytes', async () => {
    for (const s of [request.base, request.joint, request.mask]) {
      const d = await decodeApprovedPng(sources.get(s.id)!, s);
      expect(d.bytes.length).toBe(
        s.dimensions.width * s.dimensions.height * s.channels,
      );
    }
  });
  it('checks digest before decoding', async () => {
    await expect(
      decodeApprovedPng(sources.get(request.base.id)!, {
        ...request.base,
        sha256: 'a'.repeat(64),
      }),
    ).rejects.toThrow('SOURCE_SHA256');
  });
  it('invalidates an approval whose digest changed', async () => {
    await expect(
      decodeApprovedPng(sources.get(request.base.id)!, {
        ...request.base,
        approval: { ...request.base.approval, sha256: 'a'.repeat(64) },
      }),
    ).rejects.toThrow('SOURCE_SHA256');
  });
  it.each(['REJECTED', 'DRAFT', 'PRODUCTION_REGISTERED', 'MISSING'])(
    'rejects unsupported approval state %s',
    async (state) => {
      await expect(
        decodeApprovedPng(sources.get(request.base.id)!, {
          ...request.base,
          approval: { ...request.base.approval, state },
        }),
      ).rejects.toThrow('SOURCE_DECLARATION');
    },
  );
  it('retains a hard encoded-byte limit', () => {
    expect(() =>
      inspectPng(Buffer.alloc(pngProofBudget.maxSourceBytes + 1)),
    ).toThrow('SOURCE_BYTES');
  });
  it('rejects wrong declared dimensions', async () => {
    await expect(
      decodeApprovedPng(sources.get(request.base.id)!, {
        ...request.base,
        dimensions: { width: 4, height: 5 },
      }),
    ).rejects.toThrow('SOURCE_DIMENSIONS');
  });
  it('rejects wrong declared channels', async () => {
    await expect(
      decodeApprovedPng(sources.get(request.base.id)!, {
        ...request.base,
        channels: 4,
      }),
    ).rejects.toThrow('SOURCE_DIMENSIONS');
  });
  it.each([
    ['signature', () => Buffer.alloc(50), 'PNG_SIGNATURE'],
    ['truncated', () => tinyPng().subarray(0, -4), 'PNG_TRUNCATED'],
    [
      'CRC',
      () => {
        const b = tinyPng();
        b[29] = b[29]! ^ 1;
        return b;
      },
      'PNG_CRC',
    ],
    [
      'pixel bomb',
      () => tinyPng({ width: 32768, height: 32768 }),
      'PIXEL_BUDGET',
    ],
    ['16-bit', () => tinyPng({ depth: 16 }), 'COLOR_MODE'],
    ['palette', () => tinyPng({ type: 3 }), 'COLOR_MODE'],
    ['interlace', () => tinyPng({ interlace: 1 }), 'COLOR_MODE'],
    [
      'APNG',
      () => tinyPng({ extras: [chunk('acTL', Buffer.alloc(8))] }),
      'UNSUPPORTED_PNG_FEATURE',
    ],
    [
      'ICC',
      () => tinyPng({ extras: [chunk('iCCP', Buffer.from('fake'))] }),
      'UNSUPPORTED_PNG_FEATURE',
    ],
    [
      'EXIF',
      () => tinyPng({ extras: [chunk('eXIf', Buffer.alloc(8))] }),
      'UNSUPPORTED_PNG_FEATURE',
    ],
    [
      'non-sRGB gamma',
      () => tinyPng({ extras: [chunk('gAMA', Buffer.from([0, 0, 0, 1]))] }),
      'COLOR_PROFILE',
    ],
    [
      'unknown critical',
      () => tinyPng({ extras: [chunk('ABCD', Buffer.alloc(0))] }),
      'UNKNOWN_CRITICAL_CHUNK',
    ],
    [
      'compressed text',
      () =>
        tinyPng({
          extras: [
            chunk(
              'zTXt',
              Buffer.concat([
                Buffer.from([120, 0, 0]),
                deflateSync(Buffer.alloc(1024 * 1024)),
              ]),
            ),
          ],
        }),
      'UNSUPPORTED_ANCILLARY_CHUNK',
    ],
    [
      'international text',
      () => tinyPng({ extras: [chunk('iTXt', Buffer.alloc(12))] }),
      'UNSUPPORTED_ANCILLARY_CHUNK',
    ],
    [
      'unknown ancillary',
      () => tinyPng({ extras: [chunk('abCd', Buffer.alloc(0))] }),
      'UNSUPPORTED_ANCILLARY_CHUNK',
    ],
    [
      'duplicate color declaration',
      () =>
        tinyPng({
          extras: [
            chunk('sRGB', Buffer.from([0])),
            chunk('sRGB', Buffer.from([0])),
          ],
        }),
      'DUPLICATE_ANCILLARY_CHUNK',
    ],
    [
      'invalid physical dimensions',
      () => tinyPng({ extras: [chunk('pHYs', Buffer.alloc(8))] }),
      'PNG_PHYSICAL_DIMENSIONS',
    ],
    [
      'over-expansion',
      () => tinyPng({ scan: Buffer.alloc(1024 * 1024) }),
      'PNG_DEFLATE',
    ],
    [
      'short scanline',
      () => tinyPng({ scan: Buffer.alloc(3) }),
      'PNG_SCANLINE_SIZE',
    ],
    [
      'invalid filter',
      () => tinyPng({ scan: Buffer.from([5, 1, 2, 3]) }),
      'PNG_FILTER',
    ],
    [
      'trailing data',
      () => Buffer.concat([tinyPng(), Buffer.alloc(1)]),
      'PNG_END',
    ],
  ] as const)('rejects %s', (_name, create, code) => {
    expect(() => inspectPng(create())).toThrow(code);
  });
  it('does not leak local paths on file errors', async () => {
    await expect(
      readProofSource(
        join(tmpdir(), 'nonexistent-stage16-private'),
        request.base,
      ),
    ).rejects.toThrow('SOURCE_IO');
  });
  it('rejects traversal and URL source declarations', async () => {
    for (const path of [
      '../escape.png',
      'https://example.com/a.png',
      '/absolute.png',
    ])
      await expect(
        readProofSource(tmpdir(), { ...request.base, path }),
      ).rejects.toThrow('SOURCE_DECLARATION');
  });
  it('reads confined originals and refuses directory links', async () => {
    const root = await mkdtemp(join(tmpdir(), 'lammb-png-proof-'));
    try {
      await mkdir(join(root, 'real'));
      await writeFile(
        join(root, 'real', 'base.png'),
        sources.get(request.base.id)!,
      );
      expect(
        await readProofSource(root, { ...request.base, path: 'real/base.png' }),
      ).toEqual(sources.get(request.base.id));
      await symlink(
        join(root, 'real'),
        join(root, 'linked'),
        process.platform === 'win32' ? 'junction' : 'dir',
      );
      await expect(
        readProofSource(root, { ...request.base, path: 'linked/base.png' }),
      ).rejects.toThrow('SOURCE_LINK');
    } finally {
      expect(dirname(resolve(root))).toBe(resolve(tmpdir()));
      expect(basename(root)).toMatch(/^lammb-png-proof-/);
      await rm(root, { recursive: true, force: true });
    }
  });
});

describe('registered contact proof', () => {
  it('reconstructs exact pixels and encoded bytes twice without mutating sources', async () => {
    const before = [...sources].map(([id, b]) => [id, sha256Bytes(b)]);
    const first = await pngContactRenderer.render(request, sources),
      second = await pngContactRenderer.render(
        structuredClone(request),
        new Map([...sources].map(([id, b]) => [id, Buffer.from(b)])),
      );
    expect(first.raw).toEqual(expectedRaw);
    expect(second.output).toEqual(first.output);
    expect(first.receipt.pixelPreservation).toEqual({
      totalPixels: 25,
      changedPixels: 1,
      maskPixels: 1,
      semiTransparentPixels: 1,
      outsideMaskChangedPixels: 0,
    });
    expect([...sources].map(([id, b]) => [id, sha256Bytes(b)])).toEqual(before);
  });
  it('rejects production promotion', async () => {
    await expect(
      pngContactRenderer.render({ ...request, purpose: 'PRODUCTION' }, sources),
    ).rejects.toThrow('REGISTRATION_DECLARATION');
  });
  it('rejects receiver substitution and clipping', async () => {
    const p = structuredClone(request);
    p.registration.baseSha256 = 'a'.repeat(64);
    await expect(pngContactRenderer.render(p, sources)).rejects.toThrow(
      'REGISTRATION_DECLARATION',
    );
    p.registration.baseSha256 = p.base.sha256;
    p.registration.roi.x = 4;
    await expect(pngContactRenderer.render(p, sources)).rejects.toThrow(
      'REGISTRATION_DECLARATION',
    );
  });
  it('rejects missing and extra inputs', async () => {
    await expect(pngContactRenderer.render(request, new Map())).rejects.toThrow(
      'SOURCE_SET',
    );
    const extras = new Map(sources);
    extras.set('unexpected', Buffer.alloc(0));
    await expect(pngContactRenderer.render(request, extras)).rejects.toThrow(
      'SOURCE_SET',
    );
  });
  it('checks source byte budget before hashing or cloning', async () => {
    const s = new Map(sources);
    s.set(request.base.id, Buffer.alloc(pngProofBudget.maxSourceBytes + 1));
    await expect(pngContactRenderer.render(request, s)).rejects.toThrow(
      'SOURCE_BYTES',
    );
  });
  it('checks aggregate byte budget before decoding', async () => {
    let p = structuredClone(request);
    const s = new Map(sources);
    for (const [i, role] of (['base', 'joint', 'mask'] as const).entries()) {
      const b = Buffer.alloc(pngProofBudget.maxSourceBytes, i);
      p = rebound(p, b, role);
      s.set(p[role].id, b);
    }
    await expect(pngContactRenderer.render(p, s)).rejects.toThrow(
      'TOTAL_SOURCE_BYTES',
    );
  });
  it('rejects alpha-mask mismatch', async () => {
    const d = Buffer.alloc(5 * 5 * 3);
    d.set([129, 129, 129], (2 * 5 + 2) * 3);
    const b = await encode(d, 5, 5, 3),
      p = rebound(request, b, 'mask'),
      input = new Map(sources);
    input.set(p.mask.id, b);
    await expect(pngContactRenderer.render(p, input)).rejects.toThrow(
      'ALPHA_MASK_MISMATCH',
    );
  });
  it('rejects contaminated RGB under zero alpha', async () => {
    const j = Buffer.alloc(3 * 3 * 4);
    j.set([200, 50, 20, 128], 16);
    j[0] = 255;
    const b = await encode(j, 3, 3, 4),
      p = rebound(request, b, 'joint'),
      input = new Map(sources);
    input.set(p.joint.id, b);
    await expect(pngContactRenderer.render(p, input)).rejects.toThrow(
      'ZERO_ALPHA_RGB',
    );
  });
  it('rejects an effect outside the saved polygon', async () => {
    const p = structuredClone(request);
    p.registration.polygon = [
      [1, 1],
      [2, 1],
      [2, 2],
      [1, 2],
    ];
    await expect(pngContactRenderer.render(p, sources)).rejects.toThrow(
      'MASK_OUTSIDE_DOMAIN',
    );
  });
  it('rejects an unexpected final hash', async () => {
    await expect(
      pngContactRenderer.render(
        { ...request, expectedOutputSha256: 'a'.repeat(64) },
        sources,
      ),
    ).rejects.toThrow('OUTPUT_RECONSTRUCTION_SHA256');
  });
  it('binds four visible metadata facets to exact image and unchanged Trait Bible', async () => {
    const rendered = await pngContactRenderer.render(request, sources),
      m = createPngProofMetadata(
        spec,
        rendered.output,
        request.expectedOutputSha256,
      );
    expect(m.metadata.attributes).toEqual([
      { trait_type: 'Species', value: 'Sheep' },
      { trait_type: 'Wool', value: 'Ivory Curls' },
      { trait_type: 'Clothing', value: 'Black Hoodie' },
      { trait_type: 'Ear Tag', value: '5280' },
    ]);
    expect(m.binding.tokenAssignment).toBeNull();
    expect(m.metadata.image).toContain(request.expectedOutputSha256);
    expect(Object.keys(m.metadata)).toEqual([
      'name',
      'description',
      'image',
      'external_url',
      'attributes',
    ]);
    expect(() =>
      createPngProofMetadata(spec, rendered.output, 'a'.repeat(64)),
    ).toThrow('METADATA_IMAGE_SHA256');
  });
});
