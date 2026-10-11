import { readFile, mkdir, writeFile, lstat, realpath } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { freemem, platform } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import type { OverlayOptions } from 'sharp';
import {
  assetRegistrySchema,
  renderRegisteredProof,
  createRegisteredMetadata,
} from '../src/asset-registry.ts';
import { canonicalSha256, sha256Bytes } from '../src/canonical.ts';
import {
  decodeApprovedPng,
  readProofSource,
  requireProof,
  pngProofBudget,
} from '../src/png-ingestion.ts';
import { configurePngProofWorker, loadPngProof } from '../src/png-proof.ts';

const repository = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
const [sourceRoot, outputName] = process.argv.slice(2);
requireProof(
  sourceRoot &&
    outputName &&
    /^stage17-proof-[a-z0-9-]{1,40}$/.test(outputName),
  'USAGE_SOURCE_ROOT_NEW_OUTPUT_NAME',
);
const ram: { stage: string; availableRamMiB: number }[] = [];
function gate(stage: string) {
  const availableRamMiB =
    platform() === 'win32'
      ? Number(
          execFileSync(
            'powershell.exe',
            [
              '-NoProfile',
              '-Command',
              '(Get-CimInstance Win32_OperatingSystem).FreePhysicalMemory',
            ],
            { encoding: 'utf8' },
          ).trim(),
        ) / 1024
      : freemem() / 1048576;
  console.log(`AVAILABLE_RAM_MIB: ${availableRamMiB} (${stage})`);
  ram.push({ stage, availableRamMiB });
  requireProof(availableRamMiB >= 2048, 'STOP_FOR_OWNER_REVIEW_RAM');
}
gate('preflight');
configurePngProofWorker();
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
const digest = canonicalSha256(registry);
const spec = JSON.parse(
  await readFile(
    join(repository, 'packages/art-generator/specs/lammb-traits-v1.json'),
    'utf8',
  ),
) as unknown;
const generated = join(repository, 'artifacts/generated');
for (const dir of [join(repository, 'artifacts'), generated]) {
  await mkdir(dir, { recursive: true });
  requireProof(
    !(await lstat(dir)).isSymbolicLink() && (await realpath(dir)) === dir,
    'OUTPUT_ROOT_LINK',
  );
}
const output = join(generated, outputName);
await mkdir(output);
const save = (name: string, value: unknown) =>
  writeFile(join(output, name), JSON.stringify(value, null, 2) + '\n', {
    flag: 'wx',
  });
const rows = [];
const comparison: OverlayOptions[] = [];
const overallStart = performance.now();
for (const [number, proof] of registry.proofs.entries()) {
  gate(proof.id + '-before-decoding-render');
  const started = performance.now();
  const first = await renderRegisteredProof(
    sourceRoot,
    registry,
    proof.id,
    digest,
  );
  const renderIncludingLoadMs = performance.now() - started;
  gate(proof.id + '-before-independent-reconstruction');
  const reconstructStart = performance.now();
  const sources = await loadPngProof(sourceRoot, first.request);
  const decodeStart = performance.now();
  const base = await decodeApprovedPng(
    sources.get(first.request.base.id)!,
    first.request.base,
  );
  const joint = await decodeApprovedPng(
    sources.get(first.request.joint.id)!,
    first.request.joint,
  );
  const mask = await decodeApprovedPng(
    sources.get(first.request.mask.id)!,
    first.request.mask,
  );
  const freshSourceDecodeMs = performance.now() - decodeStart;
  const independent = Buffer.from(base.bytes);
  const roi = first.request.registration.roi;
  for (let p = 0; p < joint.width * joint.height; p++) {
    const x = roi.x + (p % joint.width),
      y = roi.y + Math.floor(p / joint.width),
      i = (y * base.width + x) * 3;
    const a = joint.bytes[p * 4 + 3]!;
    requireProof(mask.bytes[i] === a, 'INDEPENDENT_MASK');
    for (let c = 0; c < 3; c++) {
      const original = base.bytes[i + c]!;
      independent[i + c] =
        original +
        Math.floor(((joint.bytes[p * 4 + c]! - original) * a + 127) / 255);
    }
  }
  requireProof(
    independent.equals(first.raw),
    'INDEPENDENT_PIXEL_RECONSTRUCTION',
  );
  const second = await sharp(independent, {
    raw: { width: base.width, height: base.height, channels: 3 },
  })
    .png({ compressionLevel: 9, adaptiveFiltering: false, palette: false })
    .toBuffer();
  const historical = await readProofSource(
    sourceRoot,
    first.resolved.historical.source,
  );
  requireProof(
    second.equals(first.output) && second.equals(historical),
    'INDEPENDENT_HISTORICAL_BYTE_RECONSTRUCTION',
  );
  const reconstructionMs = performance.now() - reconstructStart;
  const metadata = createRegisteredMetadata(
    spec,
    registry,
    proof.id,
    first.output,
  );
  const points: { name: string; x: number; y: number }[] = [];
  // Restricted bright-contour witnesses: can prove FAIL, cannot certify containment.
  const boxes = [
    {
      name: 'left-ear-bright-contour',
      x0: 0,
      x1: 0.14,
      y0: 0.45,
      y1: 0.68,
      axis: 'x',
    },
    {
      name: 'right-ear-bright-contour',
      x0: 0.86,
      x1: 1,
      y0: 0.32,
      y1: 0.55,
      axis: 'right',
    },
    {
      name: 'crown-bright-contour',
      x0: 0.16,
      x1: 0.84,
      y0: 0,
      y1: 0.28,
      axis: 'y',
    },
  ];
  for (const box of boxes) {
    let witness: { name: string; x: number; y: number } | undefined,
      best = Infinity;
    for (
      let y = Math.floor(box.y0 * base.height);
      y < Math.floor(box.y1 * base.height);
      y++
    )
      for (
        let x = Math.floor(box.x0 * base.width);
        x < Math.floor(box.x1 * base.width);
        x++
      ) {
        const i = (y * base.width + x) * 3;
        if (
          0.2126 * base.bytes[i]! +
            0.7152 * base.bytes[i + 1]! +
            0.0722 * base.bytes[i + 2]! <=
          110
        )
          continue;
        const distance =
          box.axis === 'x' ? x : box.axis === 'right' ? base.width - 1 - x : y;
        if (distance < best) {
          best = distance;
          witness = { name: box.name, x, y };
        }
      }
    if (witness) points.push(witness);
  }
  const framing = {
    policyStatus: 'PROPOSED_OWNER_REVIEW',
    nativeModified: false,
    semanticMask: 'MISSING; witnesses cannot certify PASS',
    method:
      'Decoded RGB luma >110 in constrained ear/crown search boxes; visually checked bright identity witnesses. Dark contours may extend further.',
    searchBoxes: boxes,
    witnesses: points.map((p) => ({
      ...p,
      insetPx: Math.min(p.x, p.y, base.width - 1 - p.x, base.height - 1 - p.y),
      insetPercent:
        (100 *
          Math.min(p.x, p.y, base.width - 1 - p.x, base.height - 1 - p.y)) /
        base.width,
      centerDistancePx: Math.hypot(
        p.x - (base.width - 1) / 2,
        p.y - (base.height - 1) / 2,
      ),
    })),
    squareGuard2Percent: points.some(
      (p) =>
        Math.min(p.x, p.y, base.width - 1 - p.x, base.height - 1 - p.y) <
        base.width * 0.02,
    )
      ? 'FAIL_WITNESS'
      : 'INDETERMINATE',
    aspiration8Percent: points.some(
      (p) =>
        Math.min(p.x, p.y, base.width - 1 - p.x, base.height - 1 - p.y) <
        base.width * 0.08,
    )
      ? 'FAIL_WITNESS'
      : 'INDETERMINATE',
    circularGuard2Percent: points.some(
      (p) =>
        Math.hypot(p.x - (base.width - 1) / 2, p.y - (base.height - 1) / 2) >
        base.width * 0.48,
    )
      ? 'FAIL_WITNESS'
      : 'INDETERMINATE',
    circularCriticalSilhouette: points.some(
      (p) =>
        Math.hypot(p.x - (base.width - 1) / 2, p.y - (base.height - 1) / 2) >
        base.width * 0.5,
    )
      ? 'CLIPPING_WITNESS'
      : 'INDETERMINATE',
    decorativeShoulderOverflow:
      'Evaluated separately; no production framing approval',
  };
  gate(proof.id + '-before-preview-export');
  await writeFile(join(output, proof.id + '-native.png'), first.output, {
    flag: 'wx',
  });
  await writeFile(join(output, proof.id + '-independent.png'), second, {
    flag: 'wx',
  });
  await save(proof.id + '-metadata.json', metadata.metadata);
  await save(proof.id + '-metadata-binding.json', metadata.binding);
  await save(proof.id + '-registration.json', first.request);
  await save(proof.id + '-receipt.json', first.receipt);
  await save(proof.id + '-framing.json', framing);
  for (const size of [64, 128, 256, 1024]) {
    const square = await sharp(first.output)
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
    await writeFile(join(output, `${proof.id}-${size}-square.png`), square, {
      flag: 'wx',
    });
    await writeFile(join(output, `${proof.id}-${size}-circle.png`), circle, {
      flag: 'wx',
    });
  }
  comparison.push({
    input: await sharp(sources.get(first.request.base.id)!)
      .resize(400, 400)
      .png()
      .toBuffer(),
    left: number * 400,
    top: 40,
  });
  comparison.push({
    input: await sharp(first.output).resize(400, 400).png().toBuffer(),
    left: number * 400,
    top: 480,
  });
  rows.push({
    proofId: proof.id,
    sourceHashes: first.receipt.sources,
    outputSha256: sha256Bytes(first.output),
    outputBytes: first.output.length,
    renderIncludingLoadMs,
    timings: first.timings,
    freshSourceDecodeMs,
    reconstructionMs,
    decodedSourceBytes: first.receipt.sources.reduce(
      (n, s) => n + s.decodedBytes,
      0,
    ),
    pixelPreservation: first.receipt.pixelPreservation,
    reconstruction: {
      freshSources: true,
      independentArithmetic: true,
      pixelEqual: true,
      encodedByteEqual: true,
      historicalByteEqual: true,
    },
    metadata,
    framing,
  });
  console.log(
    JSON.stringify({
      proof: proof.id,
      sha256: sha256Bytes(first.output),
      outsideMaskChangedPixels:
        first.receipt.pixelPreservation.outsideMaskChangedPixels,
      renderIncludingLoadMs,
      reconstructionMs,
    }),
  );
}
gate('before-comparison');
comparison.push({
  input: Buffer.from(
    '<svg width="1200" height="880"><g fill="#CCFF00" font-family="sans-serif" font-size="22"><text x="14" y="29">CANONICAL — SOURCE</text><text x="414" y="29">BROAD ASH — SOURCE</text><text x="814" y="29">ROLLED LOCKS — SOURCE</text><text x="14" y="469">REGISTERED EAR-TAG PROOF</text><text x="414" y="469">REGISTERED EAR-TAG PROOF</text><text x="814" y="469">REGISTERED EAR-TAG PROOF</text></g></svg>',
  ),
  left: 0,
  top: 0,
});
await writeFile(
  join(output, 'comparison.png'),
  await sharp({
    create: { width: 1200, height: 880, channels: 3, background: '#101010' },
  })
    .composite(comparison)
    .png()
    .toBuffer(),
  { flag: 'wx' },
);
await save('asset-registry.json', registry);
gate('after-export');
const results = {
  purpose: 'DEVELOPMENT_ONLY',
  registrySha256: digest,
  registryEntries: registry.assets.length,
  productionRegisteredCount: 0,
  reconstructionValidatedCount: registry.assets.filter(
    (a) => a.state === 'RECONSTRUCTION_VALIDATED',
  ).length,
  validatedRenderCount: rows.length,
  budget: pngProofBudget,
  rows,
  ram,
  minimumSampledAvailableRamMiB: Math.min(...ram.map((r) => r.availableRamMiB)),
  continuousMinimumRam: 'NOT_MEASURED; boundary samples only',
  peakRssMiB: process.resourceUsage().maxRSS / 1024,
  totalRuntimeMs: performance.now() - overallStart,
  node: process.version,
  codecVersions: sharp.versions,
  imagegenCalls: 0,
  gpuInference: false,
  productionThroughputClaimed: false,
};
await save('results.json', results);
console.log(
  JSON.stringify({
    output,
    peakRssMiB: results.peakRssMiB,
    minimumSampledAvailableRamMiB: results.minimumSampledAvailableRamMiB,
    validatedRenderCount: rows.length,
  }),
);
