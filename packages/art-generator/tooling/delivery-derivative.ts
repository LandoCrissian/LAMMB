import sharp from 'sharp';
import { z } from 'zod';
import {
  canonicalJson,
  canonicalSha256,
  sha256Bytes,
} from '../src/canonical.ts';
import {
  inspectPng,
  pngProofBudget,
  requireProof,
} from '../src/png-ingestion.ts';
import { sha256Schema } from '../src/schema.ts';
import { openSeaMetadataSchema } from '../src/opensea-metadata.ts';
import { createCompleteSourceRecipe } from './approved-source-traits.ts';

// Fixed development delivery target only. Native ingestion/renderer limits and
// source registration stay at 1254px; derivatives cannot become native inputs.
export const deliveryBudget = Object.freeze({
  nativeDimension: 1254,
  targetDimension: 3072,
  maxNativeBytes: pngProofBudget.maxSourceBytes,
  maxDeliveryBytes: 32 * 1024 * 1024,
  maxDeliveryPixels: 3072 * 3072,
  maxIntermediatePixels: 3082 * 3082,
});
export const deliveryRequestSchema = z.strictObject({
  schemaVersion: z.literal('lammb-development-delivery-request/1.0.0'),
  purpose: z.literal('DEVELOPMENT_ONLY'),
  proofId: z.enum([
    'proof-canonical',
    'proof-broad-ash',
    'proof-rolled-locks',
    'proof-front-stage16',
  ]),
  parentRecipeSha256: sha256Schema,
  nativeProofSha256: sha256Schema,
  method: z.literal('NOHALO_EDGE_CLAMP_CPU_AFFINE'),
  dimensions: z.strictObject({
    width: z.literal(3072),
    height: z.literal(3072),
  }),
  productionRegistered: z.literal(false),
});
type RecipeContext = Parameters<typeof createCompleteSourceRecipe>;

export function validateDeliveryParent(
  input: unknown,
  native: Uint8Array,
  context: RecipeContext,
) {
  const request = deliveryRequestSchema.parse(input);
  // Reject encoded-byte budgets before parsing or decoding image contents.
  requireProof(
    native.length <= deliveryBudget.maxNativeBytes,
    'DELIVERY_NATIVE_BYTES',
  );
  const parent = createCompleteSourceRecipe(...context);
  requireProof(
    request.proofId === parent.id &&
      request.parentRecipeSha256 === canonicalSha256(parent) &&
      request.nativeProofSha256 === parent.outputSha256,
    'DELIVERY_PARENT_BINDING',
  );
  requireProof(
    sha256Bytes(native) === request.nativeProofSha256,
    'DELIVERY_NATIVE_SHA256',
  );
  const png = inspectPng(native);
  requireProof(
    png.width === 1254 && png.height === 1254 && png.channels === 3,
    'DELIVERY_NATIVE_LAYOUT',
  );
  requireProof(
    sharp.versions.sharp === '0.35.5' && sharp.versions.vips === '8.18.7',
    'DELIVERY_CODEC_VERSION',
  );
  return { request, parent };
}

function makeReceipt(
  request: z.infer<typeof deliveryRequestSchema>,
  parent: ReturnType<typeof createCompleteSourceRecipe>,
  output: Uint8Array,
  pixels: Uint8Array,
) {
  const outputSha256 = sha256Bytes(output);
  const metadata = openSeaMetadataSchema.parse({
    ...parent.metadata,
    image: 'https://artwork.invalid/lammb/delivery/' + outputSha256 + '.png',
  });
  requireProof(
    canonicalJson(metadata.attributes) ===
      canonicalJson(parent.metadata.attributes),
    'DELIVERY_VISIBLE_TRAITS',
  );
  return {
    schemaVersion: 'lammb-development-delivery-derivative/1.0.0',
    purpose: 'DEVELOPMENT_ONLY',
    proofId: request.proofId,
    classification: 'RESAMPLED_DELIVERY_DERIVATIVE',
    nativeAnatomySourceSha256: parent.sourceHashes.base,
    nativeProofSha256: parent.outputSha256,
    parentRecipeSha256: request.parentRecipeSha256,
    approvalHistorySha256: parent.approvalHistorySha256,
    approvedCatalogSha256: parent.approvedCatalogSha256,
    nativeDimensions: parent.dimensions,
    deliveryDimensions: request.dimensions,
    outputSha256,
    decodedPixelSha256: sha256Bytes(pixels),
    outputBytes: output.length,
    transformation: {
      method: request.method,
      scaleNumerator: 512,
      scaleDenominator: 209,
      offsetX: 0,
      offsetY: 0,
      origin: 'LIBVIPS_AFFINE_ZERO_OFFSETS',
      interpolator: 'nohalo',
      background: { r: 0, g: 0, b: 0 },
      sharpen: false,
      nativeAnatomyCrop: false,
      visibleCanvasPadding: false,
      boundaryCondition: 'COPY_NATIVE_RIGHT_AND_BOTTOM_EDGE',
      supportExtensionNativePixels: 4,
      intermediateNativeDimension: 1258,
      intermediateDeliveryDimension: 3082,
      originalDomainWindow: { x: 0, y: 0, width: 3072, height: 3072 },
    },
    encoding: {
      format: 'PNG_RGB8',
      compressionLevel: 9,
      adaptiveFiltering: false,
      palette: false,
    },
    codecs: {
      sharp: sharp.versions.sharp!,
      vips: sharp.versions.vips!,
      png: sharp.versions.png!,
      'zlib-ng': sharp.versions['zlib-ng']!,
    },
    cpuConcurrency: 1,
    gpuInference: false,
    nativeBytesUnchanged: true,
    nativeDetailCreated: false,
    sourceTraitVectorSha256: canonicalSha256(parent.traitVector),
    parentMetadataSha256: parent.metadataSha256,
    metadata,
    metadataSha256: canonicalSha256(metadata),
    publication: 'UNPUBLISHED_PLACEHOLDER_URI',
    tokenAssignment: null,
    derivativeOwnerApproval: 'PENDING',
    productionRegistered: false,
    generatorEnabled: false,
  };
}

async function decodeDelivery(output: Uint8Array) {
  requireProof(
    output.length <= deliveryBudget.maxDeliveryBytes,
    'DELIVERY_OUTPUT_BYTES',
  );
  requireProof(
    output.length >= 33 &&
      Buffer.from(output.subarray(0, 8)).equals(
        Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
      ),
    'DELIVERY_PNG_SIGNATURE',
  );
  const b = Buffer.from(output);
  requireProof(
    b.readUInt32BE(16) === 3072 &&
      b.readUInt32BE(20) === 3072 &&
      b[24] === 8 &&
      b[25] === 2,
    'DELIVERY_OUTPUT_LAYOUT',
  );
  try {
    const decoded = await sharp(output, {
      failOn: 'error',
      limitInputPixels: deliveryBudget.maxDeliveryPixels,
    })
      .raw()
      .toBuffer({ resolveWithObject: true });
    requireProof(
      decoded.info.width === 3072 &&
        decoded.info.height === 3072 &&
        decoded.info.channels === 3 &&
        decoded.data.length === 3072 * 3072 * 3,
      'DELIVERY_DECODED_LAYOUT',
    );
    return decoded.data;
  } catch {
    requireProof(false, 'DELIVERY_OUTPUT_DECODE');
  }
}

// Input bytes only, no path resolver/network fetch and no user-configurable
// dimensions/transforms/models. Invoke only after a fresh workstation RAM gate.
export async function renderDeliveryDerivative(
  input: unknown,
  native: Uint8Array,
  context: RecipeContext,
) {
  const { request, parent } = validateDeliveryParent(input, native, context);
  const { output, pixels } = await resampleNativeForDevelopment(native);
  requireProof(
    sha256Bytes(native) === request.nativeProofSha256,
    'DELIVERY_NATIVE_MUTATED',
  );
  return { output, receipt: makeReceipt(request, parent, output, pixels) };
}

// Shared bounded pixel operation only, not a source approval, recipe or promotion
// API. Each caller must separately verify its source-specific approval/provenance.
export async function resampleNativeForDevelopment(native: Uint8Array) {
  const header = inspectPng(native);
  requireProof(
    header.width === 1254 && header.height === 1254 && header.channels === 3,
    'DELIVERY_NATIVE_LAYOUT',
  );
  requireProof(
    sharp.versions.sharp === '0.35.5' && sharp.versions.vips === '8.18.7',
    'DELIVERY_CODEC_VERSION',
  );
  sharp.concurrency(1);
  sharp.cache(false);
  const scale = 512 / 209;
  // Four copied native support pixels are sufficient for these bounded sources.
  // Right/bottom-only support preserves origin and interior sampling exactly.
  // Only the original mapped domain is emitted; no visible padding is added.
  const padded = await sharp(native, {
    failOn: 'error',
    limitInputPixels: 1254 * 1254,
  })
    .extend({ top: 0, left: 0, right: 4, bottom: 4, extendWith: 'copy' })
    .raw()
    .toBuffer({ resolveWithObject: true });
  requireProof(
    padded.info.width === 1258 &&
      padded.info.height === 1258 &&
      padded.info.channels === 3,
    'DELIVERY_SUPPORT_LAYOUT',
  );
  const intermediate = await sharp(padded.data, {
    raw: { width: 1258, height: 1258, channels: 3 },
    limitInputPixels: deliveryBudget.maxIntermediatePixels,
  })
    .affine([scale, 0, 0, scale], {
      interpolator: sharp.interpolators.nohalo,
      background: { r: 0, g: 0, b: 0 },
      idx: 0,
      idy: 0,
      odx: 0,
      ody: 0,
    })
    .raw()
    .toBuffer({ resolveWithObject: true });
  requireProof(
    intermediate.info.width === 3082 &&
      intermediate.info.height === 3082 &&
      intermediate.info.channels === 3 &&
      intermediate.data.length === 3082 * 3082 * 3,
    'DELIVERY_INTERMEDIATE_LAYOUT',
  );
  const output = await sharp(intermediate.data, {
    raw: { width: 3082, height: 3082, channels: 3 },
    limitInputPixels: deliveryBudget.maxIntermediatePixels,
  })
    .extract({ left: 0, top: 0, width: 3072, height: 3072 })
    .png({ compressionLevel: 9, adaptiveFiltering: false, palette: false })
    .toBuffer();
  const pixels = await decodeDelivery(output);
  return { output, pixels };
}

// Receipt/hash/pixel checks do not alone prove reconstruction. Independent
// acceptance separately reloads native assets and reruns the transformation.
export async function validateDeliveryDerivative(
  receiptInput: unknown,
  native: Uint8Array,
  output: Uint8Array,
  input: unknown,
  context: RecipeContext,
  expectedOutputSha256: string,
) {
  requireProof(
    output.length <= deliveryBudget.maxDeliveryBytes,
    'DELIVERY_OUTPUT_BYTES',
  );
  requireProof(
    sha256Bytes(output) === sha256Schema.parse(expectedOutputSha256),
    'DELIVERY_OUTPUT_SHA256',
  );
  const { request, parent } = validateDeliveryParent(input, native, context),
    pixels = await decodeDelivery(output),
    expected = makeReceipt(request, parent, output, pixels);
  requireProof(
    canonicalJson(receiptInput) === canonicalJson(expected),
    'DELIVERY_RECEIPT',
  );
  return expected;
}
