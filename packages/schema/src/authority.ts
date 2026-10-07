import { z } from 'zod';

export const dataAuthoritySchema = z.enum([
  'STATIC_CANONICAL',
  'DEVELOPMENT_FIXTURE',
  'FUTURE_ONCHAIN',
  'FUTURE_SERVER_AUTHORITY',
]);

export const fixtureAuthoritySchema = z.strictObject({
  kind: z.literal('DEVELOPMENT_FIXTURE'),
  fixtureId: z.string().regex(/^[a-z0-9][a-z0-9-]{0,79}$/),
});

export function canonicalDatumSchema<T extends z.ZodType>(value: T) {
  return z.strictObject({
    value,
    dataAuthority: z.literal('STATIC_CANONICAL'),
  });
}

// Future sources cannot carry a value until an authorized reader is implemented.
// This validates provenance declarations, not the honesty/authenticity of a source.
export function pendingDatumSchema<T extends z.ZodType>(
  value: T,
  futureAuthority: 'FUTURE_ONCHAIN' | 'FUTURE_SERVER_AUTHORITY',
) {
  return z.union([
    z.strictObject({ value, dataAuthority: fixtureAuthoritySchema }),
    z.strictObject({
      value: z.null(),
      dataAuthority: z.strictObject({
        kind: z.literal(futureAuthority),
        status: z.literal('UNAVAILABLE'),
      }),
    }),
  ]);
}
