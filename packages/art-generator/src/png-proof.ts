import sharp from 'sharp';
import { canonicalJson, canonicalSha256, sha256Bytes } from './canonical.ts';
import {
  decodeApprovedPng,
  pngProofBudget,
  requireProof,
} from './png-ingestion.ts';
import { pngProofSchema } from './png-proof-schema.ts';
import type { PngProofRequest } from './png-proof-schema.ts';

function inside(x: number, y: number, polygon: [number, number][]) {
  let yes = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const a = polygon[i]!,
      b = polygon[j]!;
    if (
      a[1] > y !== b[1] > y &&
      x < ((b[0] - a[0]) * (y - a[1])) / (b[1] - a[1]) + a[0]
    )
      yes = !yes;
  }
  return yes;
}

// Resolved registration proof, not a constructor override or an NFT assignment.
// Existing synchronous text Renderer, ingestion gates and readiness stay intact.
export const pngContactRenderer = Object.freeze({
  descriptor: Object.freeze({ id: 'png-contact-proof', version: '1.0.0' }),
  purpose: 'DEVELOPMENT_ONLY' as const,
  async render(request: unknown, inputs: ReadonlyMap<string, Uint8Array>) {
    const parsed = pngProofSchema.safeParse(JSON.parse(canonicalJson(request)));
    requireProof(parsed.success, 'REGISTRATION_DECLARATION');
    const p = parsed.data;
    const requestDigest = canonicalSha256(request);
    const declarations = [p.base, p.joint, p.mask];
    requireProof(inputs.size === 3, 'SOURCE_SET');
    let encodedTotal = 0;
    const sources = declarations.map((s) => {
      const bytes = inputs.get(s.id);
      requireProof(
        bytes && bytes.length <= pngProofBudget.maxSourceBytes,
        'SOURCE_BYTES',
      );
      encodedTotal += bytes.length;
      requireProof(
        encodedTotal <= pngProofBudget.maxTotalSourceBytes,
        'TOTAL_SOURCE_BYTES',
      );
      requireProof(sha256Bytes(bytes) === s.sha256, 'SOURCE_SHA256');
      return Buffer.from(bytes);
    });
    requireProof(
      sources.reduce((n, b) => n + b.length, 0) <=
        pngProofBudget.maxTotalSourceBytes,
      'TOTAL_SOURCE_BYTES',
    );
    const base = await decodeApprovedPng(sources[0]!, p.base);
    const joint = await decodeApprovedPng(sources[1]!, p.joint);
    const mask = await decodeApprovedPng(sources[2]!, p.mask);
    const raw = Buffer.from(base.bytes);
    const r = p.registration.roi;
    let changedPixels = 0,
      maskPixels = 0,
      semiTransparentPixels = 0;
    for (let y = 0; y < p.canvas.height; y++)
      for (let x = 0; x < p.canvas.width; x++) {
        const index = (y * p.canvas.width + x) * 3,
          a = mask.bytes[index]!;
        requireProof(
          mask.bytes[index + 1] === a && mask.bytes[index + 2] === a,
          'MASK_NOT_GRAYSCALE',
        );
        const inRoi =
          x >= r.x && x < r.x + r.width && y >= r.y && y < r.y + r.height;
        requireProof(
          !a || (inRoi && inside(x + 0.5, y + 0.5, p.registration.polygon)),
          'MASK_OUTSIDE_DOMAIN',
        );
        if (!inRoi) continue;
        const q = ((y - r.y) * r.width + x - r.x) * 4;
        requireProof(joint.bytes[q + 3] === a, 'ALPHA_MASK_MISMATCH');
        requireProof(
          a || !(joint.bytes[q] || joint.bytes[q + 1] || joint.bytes[q + 2]),
          'ZERO_ALPHA_RGB',
        );
        if (
          x === r.x ||
          y === r.y ||
          x === r.x + r.width - 1 ||
          y === r.y + r.height - 1
        )
          requireProof(a === 0, 'ROI_EDGE_ALPHA');
        if (a) maskPixels++;
        if (a > 0 && a < 255) semiTransparentPixels++;
        let changed = false;
        for (let c = 0; c < 3; c++) {
          raw[index + c] = Math.floor(
            (joint.bytes[q + c]! * a +
              base.bytes[index + c]! * (255 - a) +
              127) /
              255,
          );
          changed ||= raw[index + c] !== base.bytes[index + c];
        }
        if (changed) changedPixels++;
      }
    // Independent preservation comparison, including every pixel outside ROI.
    let outsideMaskChangedPixels = 0;
    for (let i = 0; i < raw.length; i += 3)
      if (
        mask.bytes[i] === 0 &&
        (raw[i] !== base.bytes[i] ||
          raw[i + 1] !== base.bytes[i + 1] ||
          raw[i + 2] !== base.bytes[i + 2])
      )
        outsideMaskChangedPixels++;
    requireProof(outsideMaskChangedPixels === 0, 'OUTSIDE_MASK_CHANGED');
    const output = await sharp(raw, {
      raw: { width: p.canvas.width, height: p.canvas.height, channels: 3 },
    })
      .png({ compressionLevel: 9, adaptiveFiltering: false, palette: false })
      .toBuffer();
    requireProof(
      output.length <= pngProofBudget.maxOutputBytes,
      'OUTPUT_BYTES',
    );
    requireProof(
      sha256Bytes(output) === p.expectedOutputSha256,
      'OUTPUT_RECONSTRUCTION_SHA256',
    );
    const decoded = await decodeApprovedPng(output, {
      ...p.base,
      sha256: p.expectedOutputSha256,
      approval: { ...p.base.approval, sha256: p.expectedOutputSha256 },
    });
    requireProof(decoded.bytes.equals(raw), 'OUTPUT_PIXEL_RECONSTRUCTION');
    for (const s of declarations)
      requireProof(
        sha256Bytes(inputs.get(s.id)!) === s.sha256,
        'MUTATED_SOURCE',
      );
    requireProof(canonicalSha256(request) === requestDigest, 'MUTATED_REQUEST');
    return {
      output,
      raw,
      request: p,
      receipt: {
        schemaVersion: 1,
        purpose: this.purpose,
        renderer: this.descriptor,
        registrationSha256: canonicalSha256(p),
        imageSha256: sha256Bytes(output),
        decodedPixelSha256: sha256Bytes(raw),
        dimensions: p.canvas,
        codecVersions: { ...sharp.versions },
        node: process.version,
        sources: declarations.map((s, i) => ({
          id: s.id,
          sha256: s.sha256,
          approval: s.approval,
          bytes: sources[i]!.length,
          decodedBytes: [base, joint, mask][i]!.decodedBytes,
        })),
        pixelPreservation: {
          totalPixels: p.canvas.width * p.canvas.height,
          changedPixels,
          maskPixels,
          semiTransparentPixels,
          outsideMaskChangedPixels,
        },
        colorMath: p.registration.colorMath,
        nativeResolutionPreserved: true,
        productionRegistered: false,
        imagegenReplayClaimed: false,
      },
    };
  },
});

export function configurePngProofWorker() {
  sharp.concurrency(1);
  sharp.cache(false);
}
export async function loadPngProof(root: string, request: PngProofRequest) {
  const { readProofSource } = await import('./png-ingestion.ts');
  const result = new Map<string, Uint8Array>();
  let total = 0;
  for (const s of [request.base, request.joint, request.mask]) {
    const bytes = await readProofSource(root, s);
    total += bytes.length;
    requireProof(
      total <= pngProofBudget.maxTotalSourceBytes,
      'TOTAL_SOURCE_BYTES',
    );
    result.set(s.id, bytes);
  }
  return result;
}
