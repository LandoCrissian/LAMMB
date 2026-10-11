import { crc32, inflateSync } from 'node:zlib';
import sharp from 'sharp';
import { sha256Bytes } from './canonical.ts';
import { requireProof } from './png-ingestion.ts';

// Output-only development profile. Never used by production source ingestion,
// asset registration or the existing 1254px contact renderer.
export const framingPilotProfile = Object.freeze({
  purpose: 'DEVELOPMENT_ONLY',
  sourceSide: 1254,
  canvasSide: 1392,
  dx: 81,
  dy: 59,
  maxBytes: 4 * 1024 * 1024,
  maxPixels: 1392 * 1392,
  maxChunks: 4096,
  productionRegistered: false,
});

export function translatePilotRgb(native: Uint8Array, background: Uint8Array) {
  const p = framingPilotProfile;
  requireProof(native.length === p.sourceSide ** 2 * 3, 'PILOT_SOURCE_LAYOUT');
  requireProof(background.length === p.maxPixels * 3, 'PILOT_CANVAS_LAYOUT');
  const result = Buffer.from(background);
  for (let y = 0; y < p.sourceSide; y++) {
    result.set(
      native.subarray(y * p.sourceSide * 3, (y + 1) * p.sourceSide * 3),
      ((y + p.dy) * p.canvasSide + p.dx) * 3,
    );
  }
  return result;
}

// Strict RGB8 PNGs emitted by this development profile only. CRC, chunk order,
// exact scanline size and bounded inflate are checked before native decoding.
export function inspectPilotOutput(input: Uint8Array) {
  const p = framingPilotProfile;
  requireProof(input.length <= p.maxBytes, 'PILOT_ENCODED_BUDGET');
  const bytes = Buffer.from(input.buffer, input.byteOffset, input.byteLength);
  requireProof(
    bytes.length >= 45 &&
      bytes
        .subarray(0, 8)
        .equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])),
    'PILOT_SIGNATURE',
  );
  let offset = 8;
  let chunks = 0;
  let ended = false;
  let physical = false;
  const compressed: Buffer[] = [];
  while (offset < bytes.length) {
    requireProof(++chunks <= p.maxChunks, 'PILOT_CHUNKS');
    requireProof(offset + 12 <= bytes.length, 'PILOT_TRUNCATED');
    const length = bytes.readUInt32BE(offset);
    const end = offset + 12 + length;
    requireProof(end <= bytes.length, 'PILOT_TRUNCATED');
    requireProof(
      crc32(bytes.subarray(offset + 4, end - 4)) ===
        bytes.readUInt32BE(end - 4),
      'PILOT_CRC',
    );
    const type = bytes.toString('ascii', offset + 4, offset + 8);
    const data = bytes.subarray(offset + 8, end - 4);
    if (chunks === 1) {
      requireProof(type === 'IHDR' && length === 13, 'PILOT_IHDR');
      requireProof(
        data.readUInt32BE(0) === p.canvasSide &&
          data.readUInt32BE(4) === p.canvasSide,
        'PILOT_PIXEL_BUDGET',
      );
      requireProof(
        data[8] === 8 &&
          data[9] === 2 &&
          data[10] === 0 &&
          data[11] === 0 &&
          data[12] === 0,
        'PILOT_COLOR_MODE',
      );
    } else if (type === 'IDAT') {
      requireProof(!ended, 'PILOT_ORDER');
      compressed.push(data);
    } else if (type === 'pHYs') {
      requireProof(
        !physical && !compressed.length && length === 9 && data[8]! <= 1,
        'PILOT_PHYSICAL_DIMENSIONS',
      );
      physical = true;
    } else if (type === 'IEND') {
      requireProof(
        !ended && length === 0 && compressed.length > 0 && end === bytes.length,
        'PILOT_END',
      );
      ended = true;
    } else {
      requireProof(false, 'PILOT_UNSUPPORTED_CHUNK');
    }
    offset = end;
  }
  requireProof(ended, 'PILOT_END');
  const filteredBytes = (p.canvasSide * 3 + 1) * p.canvasSide;
  try {
    const compressedBytes = Buffer.concat(compressed);
    const inflated = inflateSync(compressedBytes, {
      maxOutputLength: filteredBytes + 1,
      info: true,
    }) as unknown as { buffer: Buffer; engine: { bytesWritten: number } };
    requireProof(
      inflated.buffer.length === filteredBytes &&
        inflated.engine.bytesWritten === compressedBytes.length,
      'PILOT_SCANLINE_SIZE',
    );
    for (let y = 0; y < p.canvasSide; y++)
      requireProof(
        inflated.buffer[y * (p.canvasSide * 3 + 1)]! <= 4,
        'PILOT_FILTER',
      );
  } catch {
    requireProof(false, 'PILOT_BOUNDED_DEFLATE');
  }
  return { width: p.canvasSide, height: p.canvasSide, channels: 3 as const };
}

export async function encodePilotOutput(rgb: Uint8Array) {
  const p = framingPilotProfile;
  requireProof(rgb.length === p.maxPixels * 3, 'PILOT_CANVAS_LAYOUT');
  const output = await sharp(rgb, {
    raw: { width: p.canvasSide, height: p.canvasSide, channels: 3 },
  })
    .png({ compressionLevel: 9, adaptiveFiltering: false, palette: false })
    .toBuffer();
  inspectPilotOutput(output);
  return output;
}

export async function decodePilotOutput(
  input: Uint8Array,
  expectedSha256: string,
) {
  requireProof(
    input.length <= framingPilotProfile.maxBytes,
    'PILOT_ENCODED_BUDGET',
  );
  requireProof(sha256Bytes(input) === expectedSha256, 'PILOT_OUTPUT_SHA256');
  const layout = inspectPilotOutput(input);
  const decoded = await sharp(input, {
    failOn: 'warning',
    limitInputPixels: framingPilotProfile.maxPixels,
    limitInputChannels: 3,
    sequentialRead: true,
    unlimited: false,
  })
    .raw()
    .toBuffer({ resolveWithObject: true });
  requireProof(
    decoded.info.width === layout.width &&
      decoded.info.height === layout.height &&
      decoded.info.channels === 3 &&
      decoded.data.length === framingPilotProfile.maxPixels * 3,
    'PILOT_DECODED_LAYOUT',
  );
  return decoded.data;
}
