import { describe, expect, it } from 'vitest';
import { parseEnvironment } from '../apps/web/src/config/env';

describe('environment validation', () => {
  it('needs no credentials and validates supported execution modes', () => {
    expect(parseEnvironment({})).toEqual({ NODE_ENV: 'development' });
    for (const NODE_ENV of ['production', 'development', 'test']) {
      expect(parseEnvironment({ NODE_ENV }).NODE_ENV).toBe(NODE_ENV);
    }
  });

  it('fails closed without echoing supplied values', () => {
    expect(() =>
      parseEnvironment({ NODE_ENV: 'sensitive-invalid-value' }),
    ).toThrow('Invalid environment configuration: NODE_ENV');
    expect(() => parseEnvironment({ NODE_ENV: '' })).toThrow();
  });
});
