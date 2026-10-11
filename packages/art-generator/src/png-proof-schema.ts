import { z } from 'zod';
import { pngSourceSchema } from './png-ingestion.ts';
import { sha256Schema } from './schema.ts';

const coordinate = z.number().int().min(0).max(1254);
export const pngProofSchema = z
  .strictObject({
    schemaVersion: z.literal(1),
    purpose: z.literal('DEVELOPMENT_ONLY'),
    renderer: z.strictObject({
      id: z.literal('png-contact-proof'),
      version: z.literal('1.0.0'),
    }),
    canvas: z.strictObject({
      width: z.number().int().positive().max(1254),
      height: z.number().int().positive().max(1254),
    }),
    base: pngSourceSchema,
    joint: pngSourceSchema,
    mask: pngSourceSchema,
    registration: z.strictObject({
      poseFamily: z.enum(['FRONT', 'ORIGINAL_THREE_QUARTER']),
      baseSha256: sha256Schema,
      jointSha256: sha256Schema,
      maskSha256: sha256Schema,
      roi: z.strictObject({
        x: coordinate,
        y: coordinate,
        width: z.number().int().positive().max(1254),
        height: z.number().int().positive().max(1254),
      }),
      polygon: z
        .array(z.tuple([coordinate, coordinate]))
        .min(3)
        .max(64),
      transform: z.literal('IDENTITY_NO_RESAMPLING'),
      colorMath: z.literal('SRGB_BYTE_INTEGER_SOURCE_OVER'),
      alpha: z.literal('STRAIGHT_RGBA_ZERO_RGB_AT_ZERO_ALPHA'),
      maskPolicy: z.literal('EXACT_SAVED_MASK_EQUALS_JOINT_ALPHA'),
      evidence: z.string().min(1).max(240),
    }),
    expectedOutputSha256: sha256Schema,
    productionRegistered: z.literal(false),
  })
  .superRefine((p, context) => {
    const fail = (message: string) =>
      context.addIssue({ code: 'custom', message });
    if (p.base.approval.state !== 'APPROVED_ART_DIRECTION')
      fail('Base needs explicit artistic approval');
    if (
      p.joint.approval.state !== 'VALIDATED_RECONSTRUCTION_INPUT' ||
      p.mask.approval.state !== 'VALIDATED_RECONSTRUCTION_INPUT'
    )
      fail('Joint/mask need reconstruction evidence');
    if (
      p.base.channels !== 3 ||
      p.mask.channels !== 3 ||
      p.joint.channels !== 4
    )
      fail('Expected RGB base/mask and RGBA joint');
    if (
      p.canvas.width !== p.canvas.height ||
      [p.base, p.mask].some(
        (s) =>
          s.dimensions.width !== p.canvas.width ||
          s.dimensions.height !== p.canvas.height,
      )
    )
      fail('Canvas registration mismatch');
    const r = p.registration.roi;
    if (
      r.x + r.width > p.canvas.width ||
      r.y + r.height > p.canvas.height ||
      p.joint.dimensions.width !== r.width ||
      p.joint.dimensions.height !== r.height
    )
      fail('Joint would clip or resample');
    if (
      p.registration.polygon.some(
        ([x, y]) =>
          x < r.x || y < r.y || x > r.x + r.width || y > r.y + r.height,
      )
    )
      fail('Polygon outside joint ROI');
    if (
      p.registration.baseSha256 !== p.base.sha256 ||
      p.registration.jointSha256 !== p.joint.sha256 ||
      p.registration.maskSha256 !== p.mask.sha256
    )
      fail('Contact is bound to exact receiver/source hashes');
    if (
      new Set([p.base.id, p.joint.id, p.mask.id]).size !== 3 ||
      new Set([p.base.path, p.joint.path, p.mask.path]).size !== 3
    )
      fail('Duplicate binding');
  });
export type PngProofRequest = z.infer<typeof pngProofSchema>;
