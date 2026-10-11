import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { z } from 'zod';
import {
  assetRegistrySchema,
  renderRegisteredProof,
} from '../src/asset-registry.ts';
import { canonicalSha256, sha256Bytes } from '../src/canonical.ts';
import {
  decodeApprovedPng,
  readProofSource,
  requireProof,
  pngProofBudget,
} from '../src/png-ingestion.ts';
import { configurePngProofWorker, loadPngProof } from '../src/png-proof.ts';
import {
  framingPilotProfile as profile,
  translatePilotRgb,
  encodePilotOutput,
  decodePilotOutput,
} from '../src/framing-pilot.ts';

const repository = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
const [sourceRoot] = process.argv.slice(2);
requireProof(
  sourceRoot && resolve(sourceRoot) === resolve('C:/LAMMB-Studio'),
  'STAGE18_LOCAL_SOURCE_ROOT',
);
const output = join(
  sourceRoot,
  'reports/ART_016_STAGE18_FRAMING_PILOT_001/pilot-001',
);
const ram: { stage: string; availableRamMiB: number }[] = [];
function gate(stage: string) {
  const value =
    Number(
      execFileSync(
        'powershell.exe',
        [
          '-NoProfile',
          '-Command',
          '(Get-CimInstance Win32_OperatingSystem).FreePhysicalMemory',
        ],
        { encoding: 'utf8' },
      ).trim(),
    ) / 1024;
  console.log(`AVAILABLE_RAM_MIB: ${value} (${stage})`);
  ram.push({ stage, availableRamMiB: value });
  requireProof(value >= 2048, 'STOP_FOR_OWNER_REVIEW_RAM');
}
gate('preflight');
configurePngProofWorker();
const started = performance.now();
await mkdir(output);
const save = (name: string, bytes: string | Uint8Array) =>
  writeFile(join(output, name), bytes, { flag: 'wx' });
const saveJson = (name: string, value: unknown) =>
  save(name, JSON.stringify(value, null, 2) + '\n');
const registry = assetRegistrySchema.parse(
  JSON.parse(
    await readFile(
      join(
        repository,
        'packages/art-generator/fixtures/stage17-asset-registry.json',
      ),
      'utf8',
    ),
  ),
);
const point = z.tuple([
  z.number().int().min(0).max(1253),
  z.number().int().min(0).max(1253),
]);
const polygon = z.array(point).min(3).max(128);
const candidateSchema = z
  .object({
    schemaVersion: z.literal(1),
    purpose: z.literal('DEVELOPMENT_ONLY_OWNER_REVIEW'),
    sourceSha256: z.literal(
      '34a8b9369ce4ccbf6c5f07bff54e176660798ec668a45f97b6a8f793961a592a',
    ),
    reviewStatus: z.literal(
      'TECHNICAL_DIRECTOR_CANDIDATE_OWNER_APPROVAL_PENDING',
    ),
    productionRegistered: z.literal(false),
    sourceDimensions: z.tuple([z.literal(1254), z.literal(1254)]),
    canvasDimensions: z.tuple([z.literal(1392), z.literal(1392)]),
    translation: z.tuple([z.literal(81), z.literal(59)]),
    uncertaintyPx: z.number().int().min(1).max(20),
    head: polygon,
    leftEar: polygon,
    rightEar: polygon,
    protectedFace: polygon,
    hoodie: polygon,
    uncertainEdgeRegions: z
      .array(
        z.object({
          id: z.string(),
          rect: z.tuple([
            z.number().int().min(0),
            z.number().int().min(0),
            z.number().int().positive(),
            z.number().int().positive(),
          ]),
          status: z.string(),
        }),
      )
      .max(8),
    backgroundSampleRects: z
      .array(
        z.tuple([
          z.number().int().min(0),
          z.number().int().min(0),
          z.number().int().positive(),
          z.number().int().positive(),
        ]),
      )
      .max(16),
    landmarks: z
      .array(
        z.object({
          id: z.string(),
          point,
          uncertaintyPx: z.number().positive(),
          status: z.literal('OBSERVED_MANUAL'),
        }),
      )
      .max(32),
  })
  .passthrough();
const candidates = candidateSchema.parse(
  JSON.parse(
    await readFile(
      join(
        repository,
        'packages/art-generator/fixtures/stage18-semantic-candidates.json',
      ),
      'utf8',
    ),
  ),
);
const inside = (x: number, y: number, poly: [number, number][]) => {
  let value = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const a = poly[i]!,
      b = poly[j]!;
    if (
      a[1] > y !== b[1] > y &&
      x < ((b[0] - a[0]) * (y - a[1])) / (b[1] - a[1]) + a[0]
    )
      value = !value;
  }
  return value;
};
gate('source-decoding');
const historical = await renderRegisteredProof(
  sourceRoot,
  registry,
  'proof-canonical',
  canonicalSha256(registry),
);
requireProof(
  historical.request.base.sha256 === candidates.sourceSha256,
  'STAGE18_IDENTITY_SHA256',
);
const sourceBytes = await loadPngProof(sourceRoot, historical.request);
const native = await decodeApprovedPng(
  sourceBytes.get(historical.request.base.id)!,
  historical.request.base,
);
const contact = await decodeApprovedPng(
  sourceBytes.get(historical.request.joint.id)!,
  historical.request.joint,
);
const contactMask = await decodeApprovedPng(
  sourceBytes.get(historical.request.mask.id)!,
  historical.request.mask,
);
const taggedBytes = await readProofSource(
  sourceRoot,
  historical.resolved.historical.source,
);
const tagged = await decodeApprovedPng(
  taggedBytes,
  historical.resolved.historical.source,
);
requireProof(
  tagged.bytes.equals(historical.raw),
  'STAGE18_HISTORICAL_PIXEL_MATCH',
);

gate('semantic-candidate-rasterization');
const n = profile.sourceSide,
  s = profile.canvasSide;
const masks = Object.fromEntries(
  [
    'critical-identity',
    'protected-face',
    'ear-geometry',
    'background',
    'contact-keepout',
    'decorative-overflow',
    'uncertain-off-frame',
  ].map((name) => [name, Buffer.alloc(n * n * 3)]),
);
for (const region of [
  ...candidates.uncertainEdgeRegions,
  ...candidates.backgroundSampleRects.map((rect) => ({ rect })),
])
  requireProof(
    region.rect[0] + region.rect[2] <= n &&
      region.rect[1] + region.rect[3] <= n,
    'SEMANTIC_RECT_BOUNDS',
  );
for (let y = 0; y < n; y++)
  for (let x = 0; x < n; x++) {
    const ear =
      inside(x + 0.5, y + 0.5, candidates.leftEar) ||
      inside(x + 0.5, y + 0.5, candidates.rightEar);
    const head = inside(x + 0.5, y + 0.5, candidates.head);
    const face = inside(x + 0.5, y + 0.5, candidates.protectedFace);
    const hoodie = inside(x + 0.5, y + 0.5, candidates.hoodie);
    const keepout = inside(
      x + 0.5,
      y + 0.5,
      historical.request.registration.polygon,
    );
    const uncertain = candidates.uncertainEdgeRegions.some(
      ({ rect: [rx, ry, rw, rh] }) =>
        x >= rx && x < rx + rw && y >= ry && y < ry + rh,
    );
    const flags = [
      head || ear,
      face,
      ear,
      !head && !ear && !hoodie && !uncertain && !keepout,
      keepout,
      hoodie,
      uncertain,
    ];
    Object.values(masks).forEach((mask, i) => {
      if (flags[i]) mask.fill(255, (y * n + x) * 3, (y * n + x) * 3 + 3);
    });
  }
const maskHashes = [];
for (const [name, mask] of Object.entries(masks)) {
  const encoded = await sharp(mask, {
    raw: { width: n, height: n, channels: 3 },
  })
    .png()
    .toBuffer();
  await save('mask-' + name + '-CANDIDATE.png', encoded);
  maskHashes.push({
    name,
    sha256: sha256Bytes(encoded),
    dimensions: [n, n],
    state: 'CANDIDATE_OWNER_REVIEW_NOT_PRODUCTION',
    nativeMaskPixels: mask.filter((_v, i) => i % 3 === 0 && mask[i] !== 0)
      .length,
  });
}

// Six-term least-squares RGB background field from manually reviewed background
// rectangles. No source background or anatomy is replaced by this field.
const basis = (x: number, y: number) => [
  1,
  x / (n - 1),
  y / (n - 1),
  (x * y) / (n - 1) ** 2,
  (x / (n - 1)) ** 2,
  (y / (n - 1)) ** 2,
];
const normal = Array.from({ length: 6 }, () => Array<number>(9).fill(0));
let samples = 0;
for (const [rx, ry, rw, rh] of candidates.backgroundSampleRects)
  for (let y = ry; y < ry + rh; y += 8)
    for (let x = rx; x < rx + rw; x += 8) {
      requireProof(
        masks.background![(y * n + x) * 3],
        'BACKGROUND_SAMPLE_NOT_SEMANTIC_BACKGROUND',
      );
      const b = basis(x, y);
      samples++;
      for (let row = 0; row < 6; row++) {
        for (let c = 0; c < 6; c++) normal[row]![c]! += b[row]! * b[c]!;
        for (let c = 0; c < 3; c++)
          normal[row]![6 + c]! += b[row]! * native.bytes[(y * n + x) * 3 + c]!;
      }
    }
for (let pivot = 0; pivot < 6; pivot++) {
  let row = pivot;
  for (let k = pivot + 1; k < 6; k++)
    if (Math.abs(normal[k]![pivot]!) > Math.abs(normal[row]![pivot]!)) row = k;
  [normal[row], normal[pivot]] = [normal[pivot]!, normal[row]!];
  const divisor = normal[pivot]![pivot]!;
  requireProof(Math.abs(divisor) > 1e-8, 'BACKGROUND_SINGULAR_FIT');
  normal[pivot] = normal[pivot]!.map((value) => value / divisor);
  for (let r = 0; r < 6; r++)
    if (r !== pivot) {
      const factor = normal[r]![pivot]!;
      normal[r] = normal[r]!.map(
        (value, c) => value - factor * normal[pivot]![c]!,
      );
    }
}
const coefficients = normal.map((row) => row.slice(6));
const predict = (x: number, y: number, channel: number) =>
  basis(x, y).reduce(
    (total, value, index) => total + value * coefficients[index]![channel]!,
    0,
  );
function backgroundField() {
  const raw = Buffer.alloc(s * s * 3);
  for (let y = 0; y < s; y++)
    for (let x = 0; x < s; x++) {
      const sx = x - profile.dx,
        sy = y - profile.dy;
      const cx = Math.max(0, Math.min(n - 1, sx)),
        cy = Math.max(0, Math.min(n - 1, sy));
      const anchored = Boolean(masks.background![(cy * n + cx) * 3]);
      const weight = Math.max(0, 1 - Math.hypot(cx - sx, cy - sy) / 96);
      for (let c = 0; c < 3; c++) {
        const correction = anchored
          ? (native.bytes[(cy * n + cx) * 3 + c]! - predict(cx, cy, c)) * weight
          : 0;
        raw[(y * s + x) * 3 + c] = Math.max(
          0,
          Math.min(255, Math.round(predict(sx, sy, c) + correction)),
        );
      }
    }
  return raw;
}
gate('canvas-and-contact-replay');
const background = backgroundField();
const pilotRaw = translatePilotRgb(tagged.bytes, background);
const independent = translatePilotRgb(native.bytes, backgroundField());
const roi = historical.request.registration.roi;
const translatedRoi = { ...roi, x: roi.x + profile.dx, y: roi.y + profile.dy };
for (let p = 0; p < contact.width * contact.height; p++) {
  const i =
    ((translatedRoi.y + Math.floor(p / contact.width)) * s +
      translatedRoi.x +
      (p % contact.width)) *
    3;
  const alpha = contact.bytes[p * 4 + 3]!;
  for (let c = 0; c < 3; c++)
    independent[i + c] = Math.floor(
      (contact.bytes[p * 4 + c]! * alpha +
        independent[i + c]! * (255 - alpha) +
        127) /
        255,
    );
}
requireProof(
  independent.equals(pilotRaw),
  'STAGE18_INDEPENDENT_CONTACT_REPLAY',
);
let sourceRegionChanged = 0,
  unauthorizedNativeChanges = 0,
  faceChanged = 0,
  facePixels = 0;
for (let y = 0; y < n; y++)
  for (let x = 0; x < n; x++) {
    const source = (y * n + x) * 3,
      destination = ((y + profile.dy) * s + x + profile.dx) * 3;
    const changed = [0, 1, 2].some(
      (c) => native.bytes[source + c] !== pilotRaw[destination + c],
    );
    if (
      [0, 1, 2].some(
        (c) => tagged.bytes[source + c] !== pilotRaw[destination + c],
      )
    )
      sourceRegionChanged++;
    if (changed && !contactMask.bytes[source]) unauthorizedNativeChanges++;
    if (masks['protected-face']![source]) {
      facePixels++;
      if (changed) faceChanged++;
    }
  }
requireProof(
  !sourceRegionChanged && !unauthorizedNativeChanges && !faceChanged,
  'STAGE18_PROTECTED_PIXELS',
);
const translatedMask = translatePilotRgb(
  contactMask.bytes,
  Buffer.alloc(s * s * 3),
);
const outputBytes = await encodePilotOutput(pilotRaw);
const replayBytes = await encodePilotOutput(independent);
requireProof(outputBytes.equals(replayBytes), 'STAGE18_ENCODED_REPLAY');
const decoded = await decodePilotOutput(outputBytes, sha256Bytes(outputBytes));
requireProof(decoded.equals(pilotRaw), 'STAGE18_INDEPENDENT_OUTPUT_DECODE');
await save('stage18-framing-pilot-NOT-PRODUCTION.png', outputBytes);
await save(
  'translated-contact-mask.png',
  await encodePilotOutput(translatedMask),
);

const translatedPolygon = historical.request.registration.polygon.map(
  ([x, y]) => [x + profile.dx, y + profile.dy],
);
const framing = [];
for (const name of ['critical-identity', 'ear-geometry', 'contact-keepout']) {
  let pixels = 0,
    minimumSquareInset = Infinity,
    minimumCircleInset = Infinity,
    clippedPixels = 0;
  const mask = masks[name]!;
  for (let y = 0; y < n; y++)
    for (let x = 0; x < n; x++)
      if (mask[(y * n + x) * 3]) {
        pixels++;
        const tx = x + profile.dx,
          ty = y + profile.dy;
        const radial = s / 2 - Math.hypot(tx - (s - 1) / 2, ty - (s - 1) / 2);
        minimumSquareInset = Math.min(
          minimumSquareInset,
          tx,
          ty,
          s - 1 - tx,
          s - 1 - ty,
        );
        minimumCircleInset = Math.min(minimumCircleInset, radial);
        if (radial < 0) clippedPixels++;
      }
  framing.push({
    name,
    pixels,
    minimumSquareInset,
    minimumCircleInset,
    minimumSquareInsetPercent: (minimumSquareInset / s) * 100,
    minimumCircleInsetPercent: (minimumCircleInset / s) * 100,
    circularClippedCandidatePixels: clippedPixels,
    uncertaintyPx: candidates.uncertaintyPx,
    proposed2PercentSquareObservedCandidate:
      minimumSquareInset - candidates.uncertaintyPx >= s * 0.02,
    proposed2PercentCircleObservedCandidate:
      minimumCircleInset - candidates.uncertaintyPx >= s * 0.02,
    aspiration8PercentCircle:
      minimumCircleInset - candidates.uncertaintyPx >= s * 0.08,
    certification:
      'NOT_CERTIFIED_OWNER_MASK_PENDING_AND_SOURCE_FRINGE_INCOMPLETE',
  });
}

gate('review-derivatives');
const overlay = Buffer.alloc(n * n * 4);
for (let p = 0; p < n * n; p++) {
  const uncertain = masks['uncertain-off-frame']![p * 3],
    face = masks['protected-face']![p * 3],
    ear = masks['ear-geometry']![p * 3],
    keepout = masks['contact-keepout']![p * 3],
    head = masks['critical-identity']![p * 3];
  const color = uncertain
    ? [255, 64, 64]
    : keepout
      ? [220, 60, 255]
      : face
        ? [0, 180, 255]
        : ear
          ? [255, 180, 0]
          : head
            ? [204, 255, 0]
            : [0, 0, 0];
  overlay.set(
    [...color, uncertain || keepout || face || ear || head ? 65 : 0],
    p * 4,
  );
}
await save(
  'semantic-candidates-overlay.png',
  await sharp(taggedBytes)
    .composite([{ input: overlay, raw: { width: n, height: n, channels: 4 } }])
    .png()
    .toBuffer(),
);
for (const size of [64, 128, 256]) {
  const square = await sharp(outputBytes)
    .resize(size, size, { kernel: 'lanczos3' })
    .png()
    .toBuffer();
  const circle = await sharp(square)
    .ensureAlpha()
    .composite([
      {
        input: Buffer.from(
          `<svg width="${size}" height="${size}"><circle cx="${size / 2}" cy="${size / 2}" r="${size / 2}" fill="white"/></svg>`,
        ),
        blend: 'dest-in',
      },
    ])
    .png()
    .toBuffer();
  await save(`pilot-${size}-square.png`, square);
  await save(`pilot-${size}-circle.png`, circle);
}
const compare = await sharp({
  create: { width: 1200, height: 650, channels: 3, background: '#181818' },
})
  .composite([
    {
      input: await sharp(taggedBytes).resize(580, 580).png().toBuffer(),
      left: 10,
      top: 55,
    },
    {
      input: await sharp(outputBytes).resize(580, 580).png().toBuffer(),
      left: 610,
      top: 55,
    },
    {
      input: Buffer.from(
        '<svg width="1200" height="45"><g fill="#CCFF00" font-family="sans-serif" font-size="18"><text x="10" y="27">APPROVED SOURCE — 1254 NATIVE</text><text x="610" y="27">1392 CANVAS PILOT — ART QA PENDING</text></g></svg>',
      ),
      left: 0,
      top: 0,
    },
  ])
  .png()
  .toBuffer();
await save('comparison-original-vs-pilot.png', compare);
await saveJson('semantic-candidate-manifest.json', {
  ...candidates,
  maskHashes,
  review:
    'Technical director must inspect overlay; owner has not approved these masks.',
});
await saveJson('contact-registration.json', {
  nativeSourceRegistration: historical.request.registration,
  sourceRegistrationSha256: canonicalSha256(historical.request),
  canvas: [s, s],
  translation: [profile.dx, profile.dy],
  roi: translatedRoi,
  polygon: translatedPolygon,
  maskSha256: sha256Bytes(await encodePilotOutput(translatedMask)),
  contactRgbaSourceSha256: historical.request.joint.sha256,
  contactUnchanged: true,
  resampling: false,
  purpose: 'DEVELOPMENT_ONLY_NOT_REGISTERED',
});
gate('complete');
const results = {
  purpose: 'DEVELOPMENT_ONLY_ART_REVIEW_REQUIRED',
  main: 'bf71f22c881ae409179f8c37efab89809c74a5af',
  sourceHashes: historical.receipt.sources,
  approvedHybridSha256: sha256Bytes(taggedBytes),
  nativeSourceDimensions: [n, n],
  canvasDimensions: [s, s],
  translation: [profile.dx, profile.dy],
  padding: { left: 81, top: 59, right: 57, bottom: 79 },
  outputSha256: sha256Bytes(outputBytes),
  outputBytes: outputBytes.length,
  nativeRegionPixelPreservation: {
    taggedNativePixels: n * n,
    changedTaggedNativePixels: sourceRegionChanged,
    unauthorizedCanonicalChangesOutsideContactMask: unauthorizedNativeChanges,
    protectedFacePixels: facePixels,
    changedFacePixels: faceChanged,
  },
  reconstruction: {
    pixelIdentical: true,
    pngBytesIdentical: true,
    boundedDecodePixelIdentical: true,
  },
  framing,
  headDisplayScaleRelativeToSource: n / s,
  displaySizeReductionPercent: (1 - n / s) * 100,
  background: {
    method:
      'Six-term least-squares native background fit; bounded edge anchoring outside source only',
    sampleRects: candidates.backgroundSampleRects,
    samples,
    coefficients,
    anchorDecayPx: 96,
    rounding: 'Math.round then clamp 0..255',
    nativeBackgroundModified: false,
    newBackgroundPixels: s * s - n * n,
  },
  semanticMasks:
    'Manual candidates; owner approval pending. Not bright-pixel threshold masks; cannot recover off-frame anatomy.',
  sourceEdgeLimitations: candidates.uncertainEdgeRegions,
  budgets: {
    productionUnchanged: pngProofBudget,
    developmentOutputOnly: profile,
    sourceRgbDecodedBytes: n * n * 3,
    pilotRgbDecodedBytes: s * s * 3,
    hypotheticalPilotRgbaDecodedBytes: s * s * 4,
    pixelIncreasePercent: ((s * s) / (n * n) - 1) * 100,
  },
  peakRssMiB: process.resourceUsage().maxRSS / 1024,
  totalRuntimeMs: performance.now() - started,
  ram,
  minimumSampledAvailableRamMiB: Math.min(
    ...ram.map((row) => row.availableRamMiB),
  ),
  continuousMinimumRam: 'NOT_MEASURED_BOUNDARY_SAMPLES_ONLY',
  codecVersions: sharp.versions,
  node: process.version,
  artQa:
    'PENDING_VISUAL_REVIEW; coordinate correctness is not anatomical or aesthetic approval',
  imagegenCalls: 0,
  originalMastersModified: false,
  productionRegistered: false,
};
await saveJson('results.json', results);
console.log(
  JSON.stringify({
    output,
    outputSha256: results.outputSha256,
    pixelPreservation: results.nativeRegionPixelPreservation,
    framing,
    peakRssMiB: results.peakRssMiB,
    totalRuntimeMs: results.totalRuntimeMs,
  }),
);
