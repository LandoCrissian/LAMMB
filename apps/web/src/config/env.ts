import { z } from 'zod';

const environmentSchema = z.strictObject({
  NODE_ENV: z
    .enum(['development', 'test', 'production'])
    .default('development'),
});

export function parseEnvironment(input: Record<string, string | undefined>) {
  const result = environmentSchema.safeParse({ NODE_ENV: input.NODE_ENV });
  if (!result.success) {
    // Do not include supplied values or credentials in diagnostics.
    throw new Error('Invalid environment configuration: NODE_ENV');
  }
  return Object.freeze(result.data);
}
