import { readFile, mkdir, writeFile, lstat, realpath } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { freemem, platform } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { canonicalSha256, sha256Bytes } from '../src/canonical.ts';
import {
  decodeApprovedPng,
  pngProofBudget,
  requireProof,
  readProofSource,
} from '../src/png-ingestion.ts';
import { pngProofSchema } from '../src/png-proof-schema.ts';
import {
  configurePngProofWorker,
  loadPngProof,
  pngContactRenderer,
} from '../src/png-proof.ts';
import { createPngProofMetadata } from '../src/png-proof-metadata.ts';

const repository = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
const [sourceRoot, outputName] = process.argv.slice(2);
requireProof(
  sourceRoot &&
    outputName &&
    /^stage16-proof-[a-z0-9-]{1,40}$/.test(outputName),
  'USAGE_SOURCE_ROOT_AND_NEW_OUTPUT_NAME',
);
const samples: { stage: string; availableRamMiB: number }[] = [];
function gate(stage: string) {
  const available =
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
  samples.push({ stage, availableRamMiB: available });
  requireProof(available >= 2048, 'STOP_FOR_OWNER_REVIEW_RAM');
}
gate('preflight');
configurePngProofWorker();
const requestPath = join(
  repository,
  'packages/art-generator/fixtures/stage16-png-proof.json',
);
const request = pngProofSchema.parse(
  JSON.parse(await readFile(requestPath, 'utf8')),
);
const start = performance.now();
gate('before_source_loading');
const sources = await loadPngProof(sourceRoot, request);
gate('before_render');
const firstStart = performance.now();
const first = await pngContactRenderer.render(request, sources);
const renderMs = performance.now() - firstStart;

// Independent arithmetic implementation with freshly loaded/decoded sources.
// Does not call pngContactRenderer again or reuse its raw output as an input.
gate('before_independent_reconstruction');
const reconstructionStart = performance.now();
const fresh = await loadPngProof(sourceRoot, request);
const base = await decodeApprovedPng(fresh.get(request.base.id)!, request.base);
const joint = await decodeApprovedPng(
  fresh.get(request.joint.id)!,
  request.joint,
);
const mask = await decodeApprovedPng(fresh.get(request.mask.id)!, request.mask);
const independent = Buffer.from(base.bytes);
const roi = request.registration.roi;
for (let p = 0; p < joint.width * joint.height; p++) {
  const x = roi.x + (p % joint.width),
    y = roi.y + Math.floor(p / joint.width),
    i = (y * base.width + x) * 3;
  const alpha = joint.bytes[p * 4 + 3]!;
  requireProof(alpha === mask.bytes[i], 'RECONSTRUCTION_MASK');
  for (let c = 0; c < 3; c++) {
    const original = base.bytes[i + c]!;
    independent[i + c] =
      original +
      Math.floor(((joint.bytes[p * 4 + c]! - original) * alpha + 127) / 255);
  }
}
requireProof(independent.equals(first.raw), 'INDEPENDENT_PIXEL_RECONSTRUCTION');
const second = await sharp(independent, {
  raw: { width: base.width, height: base.height, channels: 3 },
})
  .png({ compressionLevel: 9, adaptiveFiltering: false, palette: false })
  .toBuffer();
requireProof(
  second.equals(first.output) &&
    sha256Bytes(second) === request.expectedOutputSha256,
  'INDEPENDENT_ENCODED_RECONSTRUCTION',
);
const historical = await readProofSource(sourceRoot, {
  ...request.base,
  path: 'ART_016_STAGE7_FRONT_TAG_001/lammb-016-stage7-front-ear-tag-hybrid-native.png',
  sha256: request.expectedOutputSha256,
  approval: { ...request.base.approval, sha256: request.expectedOutputSha256 },
});
requireProof(
  historical.equals(first.output),
  'HISTORICAL_NATIVE_PROOF_MISMATCH',
);
const reconstructionMs = performance.now() - reconstructionStart;
gate('before_metadata_and_export');
const spec = JSON.parse(
  await readFile(
    join(repository, 'packages/art-generator/specs/lammb-traits-v1.json'),
    'utf8',
  ),
) as unknown;
const metadata = createPngProofMetadata(
  spec,
  first.output,
  request.expectedOutputSha256,
);

// Exclusive development-only output. No approved source or prior run overwritten.
const generated = join(repository, 'artifacts/generated');
for (const dir of [join(repository, 'artifacts'), generated]) {
  await mkdir(dir, { recursive: true });
  requireProof(
    !(await lstat(dir)).isSymbolicLink() && (await realpath(dir)) === dir,
    'OUTPUT_ROOT_LINK',
  );
}
const output = join(generated, outputName);
await mkdir(output); // EEXIST is intentional: never silently replace a proof.
await writeFile(join(output, 'lammb-front-ear-tag-native.png'), first.output, {
  flag: 'wx',
});
await writeFile(join(output, 'independent-reconstruction.png'), second, {
  flag: 'wx',
});
const save = async (name: string, value: unknown) =>
  writeFile(join(output, name), JSON.stringify(value, null, 2) + '\n', {
    flag: 'wx',
  });
await save('metadata.json', metadata.metadata);
await save('metadata-binding.json', metadata.binding);
await save('registration.json', request);
await save('provenance.json', first.receipt);
gate('after_export');
const runtime = {
  status: 'PASS_SINGLE_CONTACT_PROOF',
  node: process.version,
  codecVersions: sharp.versions,
  sourceBytes: first.receipt.sources,
  totalDecodedSourceBytes: first.receipt.sources.reduce(
    (n, s) => n + s.decodedBytes,
    0,
  ),
  sourceBudget: pngProofBudget,
  renderMs,
  reconstructionMs,
  totalRuntimeMs: performance.now() - start,
  peakRssMiB: process.resourceUsage().maxRSS / 1024,
  availableRamSamples: samples,
  minimumSampledAvailableRamMiB: Math.min(
    ...samples.map((s) => s.availableRamMiB),
  ),
  continuousMinimumRam: 'NOT_MEASURED; boundary samples only',
  outputBytes: first.output.length,
  outputSha256: sha256Bytes(first.output),
  registrationSha256: canonicalSha256(request),
  pixelPreservation: first.receipt.pixelPreservation,
  reconstruction: {
    freshInputs: true,
    independentArithmetic: true,
    decodedPixelEqual: true,
    encodedByteEqual: true,
    historicalStage7ByteEqual: true,
  },
  originalFilesChanged: false,
  productionRegistered: false,
  collectionThroughputClaimed: false,
  gpuInference: false,
  imagegenCalls: 0,
};
await save('runtime-and-reconstruction.json', runtime);
console.log(
  JSON.stringify({
    output,
    outputSha256: runtime.outputSha256,
    renderMs,
    reconstructionMs,
    peakRssMiB: runtime.peakRssMiB,
    minimumSampledAvailableRamMiB: runtime.minimumSampledAvailableRamMiB,
    pixelPreservation: runtime.pixelPreservation,
  }),
);
