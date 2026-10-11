import { constants } from 'node:fs';
import { lstat, open, realpath } from 'node:fs/promises';
import { isAbsolute, join, relative, resolve } from 'node:path';
import { inflateSync } from 'node:zlib';
import sharp from 'sharp';
import { z } from 'zod';
import { sha256Bytes } from './canonical.ts';
import { relativePathSchema, sha256Schema } from './schema.ts';

// Separate, explicitly bounded proof adapter. Legacy ingestion stays at 1MiB.
// These limits do NOT authorize 3072px sources or collection production.
export const pngProofBudget = Object.freeze({
  maxSourceBytes: 4 * 1024 * 1024,
  maxTotalSourceBytes: 8 * 1024 * 1024,
  maxDimension: 1254,
  maxPixels: 1254 * 1254,
  maxChunks: 4096,
  maxOutputBytes: 4 * 1024 * 1024,
});

export class PngProofError extends Error {
  readonly code: string;
  constructor(code: string) {
    super(`PNG proof rejected: ${code}`);
    this.name = 'PngProofError';
    this.code = code;
  }
}
export function requireProof(ok: unknown, code: string): asserts ok {
  if (!ok) throw new PngProofError(code);
}

const dimension = z.number().int().positive().max(pngProofBudget.maxDimension);
export const pngSourceSchema = z.strictObject({
  id: z.string().regex(/^dev-png-[a-z0-9-]{1,80}$/),
  path: relativePathSchema,
  sha256: sha256Schema,
  dimensions: z.strictObject({ width: dimension, height: dimension }),
  channels: z.union([z.literal(3), z.literal(4)]),
  colorPolicy: z.literal('SRGB_8BIT_UNTAGGED_OR_STANDARD_SRGB'),
  approval: z.strictObject({
    state: z.enum(['APPROVED_ART_DIRECTION', 'VALIDATED_RECONSTRUCTION_INPUT']),
    sha256: sha256Schema,
    evidence: z.string().min(1).max(240),
  }),
  productionRegistered: z.literal(false),
});
export type PngSource = z.infer<typeof pngSourceSchema>;

const crcTable = Uint32Array.from({ length: 256 }, (_, value) => {
  let c = value;
  for (let bit = 0; bit < 8; bit++)
    c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
function crc32(bytes: Uint8Array) {
  let c = 0xffffffff;
  for (const byte of bytes) c = crcTable[(c ^ byte) & 255]! ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

// Verify framing, CRCs and bounded zlib expansion before entering native code.
// Narrow format: non-interlaced RGB/RGBA8, one image, no embedded ICC/EXIF.
export function inspectPng(input: Uint8Array) {
  requireProof(input.length <= pngProofBudget.maxSourceBytes, 'SOURCE_BYTES');
  const bytes = Buffer.from(input.buffer, input.byteOffset, input.byteLength);
  requireProof(
    bytes.length >= 45 &&
      bytes
        .subarray(0, 8)
        .equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])),
    'PNG_SIGNATURE',
  );
  let offset = 8;
  let count = 0;
  let width = 0;
  let height = 0;
  let channels: 3 | 4 = 3;
  let ended = false;
  let dataEnded = false;
  const ancillary = new Set<string>();
  const compressed: Buffer[] = [];
  while (offset < bytes.length) {
    requireProof(++count <= pngProofBudget.maxChunks, 'PNG_CHUNKS');
    requireProof(offset + 12 <= bytes.length, 'PNG_TRUNCATED');
    const length = bytes.readUInt32BE(offset);
    const end = offset + 12 + length;
    requireProof(end <= bytes.length, 'PNG_TRUNCATED');
    requireProof(
      bytes
        .subarray(offset + 4, offset + 8)
        .every((c) => (c >= 65 && c <= 90) || (c >= 97 && c <= 122)),
      'PNG_CHUNK_TYPE',
    );
    const type = bytes.toString('ascii', offset + 4, offset + 8);
    requireProof(
      /^[A-Za-z]{4}$/.test(type) && /[A-Z]/.test(type[2]!),
      'PNG_CHUNK_TYPE',
    );
    requireProof(
      crc32(bytes.subarray(offset + 4, end - 4)) ===
        bytes.readUInt32BE(end - 4),
      'PNG_CRC',
    );
    const data = bytes.subarray(offset + 8, end - 4);
    if (count === 1) {
      requireProof(type === 'IHDR' && length === 13, 'PNG_IHDR');
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
      requireProof(
        width > 0 &&
          height > 0 &&
          width <= pngProofBudget.maxDimension &&
          height <= pngProofBudget.maxDimension &&
          width * height <= pngProofBudget.maxPixels,
        'PIXEL_BUDGET',
      );
      requireProof(
        data[8] === 8 &&
          (data[9] === 2 || data[9] === 6) &&
          data[10] === 0 &&
          data[11] === 0 &&
          data[12] === 0,
        'COLOR_MODE',
      );
      channels = data[9] === 6 ? 4 : 3;
    } else if (type === 'IDAT') {
      requireProof(!dataEnded, 'PNG_IDAT_ORDER');
      compressed.push(data);
    } else if (type === 'IEND') {
      requireProof(
        length === 0 && compressed.length > 0 && end === bytes.length,
        'PNG_END',
      );
      ended = true;
    } else {
      if (compressed.length) dataEnded = true;
      requireProof(
        ![
          'IHDR',
          'PLTE',
          'acTL',
          'fcTL',
          'fdAT',
          'iCCP',
          'eXIf',
          'tRNS',
        ].includes(type),
        'UNSUPPORTED_PNG_FEATURE',
      );
      requireProof(
        type[0] === type[0]!.toLowerCase(),
        'UNKNOWN_CRITICAL_CHUNK',
      );
      // No compressed text or other metadata decoders outside the IDAT budget.
      // caBX is opaque source C2PA evidence, never transferred to the derivative.
      requireProof(
        ['sRGB', 'gAMA', 'pHYs', 'caBX'].includes(type),
        'UNSUPPORTED_ANCILLARY_CHUNK',
      );
      requireProof(!ancillary.has(type), 'DUPLICATE_ANCILLARY_CHUNK');
      ancillary.add(type);
      if (type === 'sRGB')
        requireProof(
          length === 1 && data[0]! <= 3 && !compressed.length,
          'COLOR_PROFILE',
        );
      if (type === 'gAMA')
        requireProof(
          length === 4 && data.readUInt32BE(0) === 45455 && !compressed.length,
          'COLOR_PROFILE',
        );
      if (type === 'pHYs')
        requireProof(
          length === 9 && data[8]! <= 1 && !compressed.length,
          'PNG_PHYSICAL_DIMENSIONS',
        );
    }
    offset = end;
  }
  requireProof(ended, 'PNG_END');
  const filteredBytes = (width * channels + 1) * height;
  try {
    const encoded = Buffer.concat(compressed);
    // Node 22 supports info:true; @types/node's sync overload still says Buffer.
    const expanded = inflateSync(encoded, {
      maxOutputLength: filteredBytes + 1,
      info: true,
    }) as unknown as { buffer: Buffer; engine: { bytesWritten: number } };
    requireProof(
      Buffer.isBuffer(expanded.buffer) &&
        typeof expanded.engine?.bytesWritten === 'number',
      'PNG_DEFLATE',
    );
    requireProof(
      expanded.buffer.length === filteredBytes &&
        expanded.engine.bytesWritten === encoded.length,
      'PNG_SCANLINE_SIZE',
    );
    for (let row = 0; row < height; row++)
      requireProof(
        expanded.buffer[row * (width * channels + 1)]! <= 4,
        'PNG_FILTER',
      );
  } catch (error) {
    if (error instanceof PngProofError) throw error;
    throw new PngProofError('PNG_DEFLATE');
  }
  return { width, height, channels, decodedBytes: width * height * channels };
}

export async function decodeApprovedPng(
  input: Uint8Array,
  declaration: unknown,
) {
  const parsed = pngSourceSchema.safeParse(declaration);
  requireProof(parsed.success, 'SOURCE_DECLARATION');
  const source = parsed.data;
  requireProof(input.length <= pngProofBudget.maxSourceBytes, 'SOURCE_BYTES');
  requireProof(
    sha256Bytes(input) === source.sha256 &&
      source.approval.sha256 === source.sha256,
    'SOURCE_SHA256',
  );
  const header = inspectPng(input);
  requireProof(
    header.width === source.dimensions.width &&
      header.height === source.dimensions.height &&
      header.channels === source.channels,
    'SOURCE_DIMENSIONS',
  );
  try {
    const image = sharp(input, {
      failOn: 'warning',
      limitInputPixels: pngProofBudget.maxPixels,
      limitInputChannels: 4,
      sequentialRead: true,
      unlimited: false,
    });
    const decoded = await image.raw().toBuffer({ resolveWithObject: true });
    requireProof(
      decoded.info.width === header.width &&
        decoded.info.height === header.height &&
        decoded.info.channels === header.channels &&
        decoded.data.length === header.decodedBytes,
      'DECODED_LAYOUT',
    );
    return { source, bytes: decoded.data, ...header };
  } catch (error) {
    if (error instanceof PngProofError) throw error;
    throw new PngProofError('PNG_DECODE');
  }
}

function contained(root: string, path: string) {
  const r = relative(root, path);
  return (
    r !== '' &&
    !isAbsolute(r) &&
    r !== '..' &&
    !r.startsWith(`..${process.platform === 'win32' ? '\\' : '/'}`)
  );
}
// No network, directory creation or writes. Caller supplies an explicit local root.
export async function readProofSource(rootInput: string, declaration: unknown) {
  try {
    return await readConfinedProofSource(rootInput, declaration);
  } catch (error) {
    if (error instanceof PngProofError) throw error;
    throw new PngProofError('SOURCE_IO');
  }
}
async function readConfinedProofSource(
  rootInput: string,
  declaration: unknown,
) {
  const parsed = pngSourceSchema.safeParse(declaration);
  requireProof(parsed.success, 'SOURCE_DECLARATION');
  return readConfinedDigestFile(rootInput, parsed.data);
}

// Evidence is a bounded local file, never a pretend PNG or a network resource.
export async function readProofEvidence(
  rootInput: string,
  declaration: unknown,
) {
  const parsed = z
    .strictObject({ path: relativePathSchema, sha256: sha256Schema })
    .safeParse(declaration);
  requireProof(parsed.success, 'EVIDENCE_DECLARATION');
  try {
    return await readConfinedDigestFile(rootInput, parsed.data);
  } catch (error) {
    if (error instanceof PngProofError) throw error;
    throw new PngProofError('EVIDENCE_IO');
  }
}

async function readConfinedDigestFile(
  rootInput: string,
  declaration: { path: string; sha256: string },
) {
  const root = resolve(rootInput);
  const target = resolve(root, declaration.path);
  requireProof(contained(root, target), 'SOURCE_PATH');
  const rootStat = await lstat(root);
  requireProof(
    rootStat.isDirectory() && !rootStat.isSymbolicLink(),
    'SOURCE_ROOT',
  );
  const resolvedRoot = await realpath(root);
  let current = root;
  for (const part of relative(root, target).split(/[\\/]/)) {
    current = join(current, part);
    const stat = await lstat(current);
    requireProof(
      !stat.isSymbolicLink() &&
        contained(resolvedRoot, await realpath(current)),
      'SOURCE_LINK',
    );
  }
  const before = await lstat(target);
  requireProof(
    before.isFile() && before.size <= pngProofBudget.maxSourceBytes,
    'SOURCE_BYTES',
  );
  const file = await open(
    target,
    constants.O_RDONLY | (constants.O_NOFOLLOW ?? 0),
  );
  try {
    const opened = await file.stat();
    requireProof(
      opened.isFile() &&
        opened.size === before.size &&
        opened.dev === before.dev &&
        opened.ino === before.ino,
      'SOURCE_CHANGED',
    );
    const bytes = Buffer.alloc(opened.size);
    let offset = 0;
    while (offset < bytes.length) {
      const read = await file.read(
        bytes,
        offset,
        bytes.length - offset,
        offset,
      );
      requireProof(read.bytesRead > 0, 'SOURCE_CHANGED');
      offset += read.bytesRead;
    }
    const after = await file.stat();
    requireProof(
      after.size === opened.size && after.mtimeMs === opened.mtimeMs,
      'SOURCE_CHANGED',
    );
    requireProof(sha256Bytes(bytes) === declaration.sha256, 'SOURCE_SHA256');
    return bytes;
  } finally {
    await file.close();
  }
}
