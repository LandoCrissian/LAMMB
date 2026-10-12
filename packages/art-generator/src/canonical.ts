import { createHash } from 'node:crypto';

export const compareText = (a: string, b: string) =>
  a < b ? -1 : a > b ? 1 : 0;

export function normalizeText(value: string): string {
  // Printable ASCII already has valid scalars, LF policy and NFC form.
  if (typeof value === 'string' && /^[\x20-\x7E]*$/.test(value)) return value;
  if (
    /[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/.test(
      value,
    )
  ) {
    throw new Error('Canonical strings require valid Unicode scalars');
  }
  return value.replace(/\r\n?/g, '\n').normalize('NFC');
}

// Compact UTF-8 JSON, normalized strings, sorted keys, significant array order.
// Integers only; no BigInt, undefined, sparse arrays, non-JSON objects or cycles.
export function canonicalJson(input: unknown): string {
  const ancestors = new Set<object>();
  // Repeated keys/trait labels dominate large reconstruction bundles. Cache only
  // immutable short strings within this call, never objects or prior outputs.
  const strings = new Map<string, { normalized: string; encoded: string }>();
  const shapes = new Map<
    string,
    { original: string; normalized: string; encoded: string }[]
  >();
  const encodeText = (original: string) => {
    const cached = strings.get(original);
    if (cached) return cached;
    const normalized = normalizeText(original);
    const result = { normalized, encoded: JSON.stringify(normalized) };
    if (original.length <= 256 && strings.size < 512)
      strings.set(original, result);
    return result;
  };
  function encode(value: unknown, depth = 0): string {
    if (depth > 64) throw new Error('Canonical nesting limit exceeded');
    if (value === null) return 'null';
    if (typeof value === 'string') return encodeText(value).encoded;
    if (typeof value === 'boolean') return value ? 'true' : 'false';
    if (typeof value === 'number' && Number.isSafeInteger(value))
      return String(value === 0 ? 0 : value);
    if (typeof value !== 'object' || value === null)
      throw new Error('Unsupported canonical value');
    if (ancestors.has(value)) throw new Error('Cyclic canonical value');
    ancestors.add(value);
    try {
      if (Array.isArray(value)) {
        if (Object.getOwnPropertySymbols(value).length)
          throw new Error('Symbol keys are unsupported');
        const keys = Object.keys(value);
        if (
          keys.length !== value.length ||
          keys.some((key, index) => key !== String(index))
        )
          throw new Error('Sparse or decorated array');
        if (
          keys.some(
            (key) => !('value' in Object.getOwnPropertyDescriptor(value, key)!),
          )
        )
          throw new Error('Accessor properties are unsupported');
        return `[${value.map((item) => encode(item, depth + 1)).join(',')}]`;
      }
      if (
        Object.getPrototypeOf(value) !== Object.prototype &&
        Object.getPrototypeOf(value) !== null
      )
        throw new Error('Non-JSON object');
      if (Object.getOwnPropertySymbols(value).length)
        throw new Error('Symbol keys are unsupported');
      const object = value as Record<string, unknown>;
      const originalKeys = Object.keys(object);
      if (
        originalKeys.some(
          (key) => !('value' in Object.getOwnPropertyDescriptor(object, key)!),
        )
      )
        throw new Error('Accessor properties are unsupported');
      // Key strings are immutable; descriptors/values/prototypes are checked on
      // every object. Reusing a validated key order never reuses object data.
      const shape =
        originalKeys.length <= 32 &&
        originalKeys.every((key) => key.length <= 256)
          ? JSON.stringify(originalKeys)
          : null;
      let keys = shape === null ? undefined : shapes.get(shape);
      if (!keys) {
        keys = originalKeys
          .map((key) => ({ original: key, ...encodeText(key) }))
          .sort((a, b) => compareText(a.normalized, b.normalized));
        if (new Set(keys.map((key) => key.normalized)).size !== keys.length)
          throw new Error('Normalized key collision');
        if (shape !== null && shape.length <= 2048 && shapes.size < 64)
          shapes.set(shape, keys);
      }
      return `{${keys.map((key) => `${key.encoded}:${encode(object[key.original], depth + 1)}`).join(',')}}`;
    } finally {
      ancestors.delete(value);
    }
  }
  return encode(input);
}

export const sha256Bytes = (bytes: Uint8Array | string) =>
  createHash('sha256').update(bytes).digest('hex');
export const canonicalSha256 = (value: unknown) =>
  sha256Bytes(canonicalJson(value));
