import { createHash } from 'node:crypto';
import { z } from 'zod';

export class GenesisError extends Error {
  readonly code: string;
  readonly compositionId: string | null;
  readonly field: string | null;
  constructor(
    code: string,
    compositionId: string | null = null,
    field: string | null = null,
  ) {
    super([code, compositionId, field].filter(Boolean).join(':'));
    this.name = 'GenesisError';
    this.code = code;
    this.compositionId = compositionId;
    this.field = field;
  }
}
export function requireGenesis(
  value: unknown,
  code: string,
  id: string | null = null,
  field: string | null = null,
): asserts value {
  if (!value) throw new GenesisError(code, id, field);
}
export const bytesHash = (value: string | Uint8Array) =>
  createHash('sha256').update(value).digest('hex');

// Versioned exact-value serialization: no Unicode, whitespace or trait coercion.
// Array order is significant. Unsafe numbers, accessors and exotic objects fail.
export function serializeGenesis(input: unknown): string {
  const ancestors = new Set<object>();
  let nodes = 0;
  const text = (value: string) => {
    requireGenesis(
      !/[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/.test(
        value,
      ),
      'SERIALIZATION_UNICODE',
    );
    return JSON.stringify(value);
  };
  const encode = (v: unknown, depth: number): string => {
    requireGenesis(++nodes <= 2_000_000 && depth <= 64, 'SERIALIZATION_BUDGET');
    if (v === null) return 'null';
    if (typeof v === 'string') return text(v);
    if (typeof v === 'boolean') return v ? 'true' : 'false';
    if (typeof v === 'number') {
      requireGenesis(
        Number.isFinite(v) &&
          !Object.is(v, -0) &&
          (!Number.isInteger(v) || Number.isSafeInteger(v)),
        'SERIALIZATION_NUMBER',
      );
      return JSON.stringify(v);
    }
    requireGenesis(typeof v === 'object' && v !== null, 'SERIALIZATION_VALUE');
    requireGenesis(!ancestors.has(v), 'SERIALIZATION_CYCLE');
    requireGenesis(
      Object.getOwnPropertySymbols(v).length === 0,
      'SERIALIZATION_SYMBOL',
    );
    ancestors.add(v);
    try {
      const keys = Object.keys(v);
      for (const key of keys)
        requireGenesis(
          'value' in Object.getOwnPropertyDescriptor(v, key)! &&
            !['__proto__', 'constructor', 'prototype'].includes(key),
          'SERIALIZATION_PROPERTY',
        );
      if (Array.isArray(v)) {
        requireGenesis(
          keys.length === v.length && keys.every((k, i) => k === String(i)),
          'SERIALIZATION_ARRAY',
        );
        return '[' + v.map((x) => encode(x, depth + 1)).join(',') + ']';
      }
      requireGenesis(
        Object.getPrototypeOf(v) === Object.prototype ||
          Object.getPrototypeOf(v) === null,
        'SERIALIZATION_OBJECT',
      );
      const obj = v as Record<string, unknown>;
      return (
        '{' +
        keys
          .sort()
          .map((k) => text(k) + ':' + encode(obj[k], depth + 1))
          .join(',') +
        '}'
      );
    } finally {
      ancestors.delete(v);
    }
  };
  return encode(input, 0);
}
export const genesisDigest = (value: unknown) =>
  bytesHash(serializeGenesis(value));
export function parseGenesisJson(raw: string): unknown {
  try {
    const v: unknown = JSON.parse(raw);
    // JSON.parse accepts duplicate keys by keeping the last value. Reject that
    // ambiguity, including escaped spellings of the same key, before adapting.
    const objects: (Set<string> | null)[] = [];
    for (const token of raw.matchAll(/"(?:[^"\\]|\\[\s\S])*"|[{}[\]]/g)) {
      const value = token[0];
      if (value === '{') objects.push(new Set());
      else if (value === '[') objects.push(null);
      else if (value === '}' || value === ']') objects.pop();
      else if (/^\s*:/.test(raw.slice(token.index + value.length))) {
        const keys = objects.at(-1),
          key = JSON.parse(value) as string;
        requireGenesis(keys && !keys.has(key), 'JSON_DUPLICATE_KEY');
        keys.add(key);
      }
    }
    serializeGenesis(v);
    return v;
  } catch (e) {
    if (e instanceof GenesisError) throw e;
    throw new GenesisError('JSON_SYNTAX');
  }
}
export function parseSchema<T>(
  schema: z.ZodType<T>,
  value: unknown,
  code: string,
  id: string | null = null,
): T {
  const parsed = schema.safeParse(value);
  if (!parsed.success)
    throw new GenesisError(
      code,
      id,
      parsed.error.issues.map((e) => e.path.join('.')).sort()[0] ?? '',
    );
  return parsed.data;
}
const sha = z.string().regex(/^[0-9a-f]{64}$/);
export const compositionIdSchema = z.string().regex(/^[A-Z][A-Z0-9-]{1,79}$/);
const reference = z.string().min(1).max(4096);
const jsonObject = z.record(z.string(), z.json());
export const classifications = ['ORDINARY', 'ULTIMATE', 'GRAIL'] as const;
export const genesisTraitNames = [
  'Accessories',
  'Additional Organisms',
  'Authored Structure',
  'Background',
  'Background Light Pattern',
  'Board Colour',
  'Clothing',
  'Construction',
  'Engineered Optic Colour',
  'Expression',
  'Eye Colour',
  'Eye State',
  'Eye Treatment',
  'Face Identity',
  'Head Construction',
  'Head Structure',
  'Headwear',
  'Illuminated Background',
  'Integrated Motif',
  'Integrated Structure',
  'Localized Effect',
  'Mutation',
  'Mutation Study',
  'Physical Board',
  'Physical Board Color',
  'Pose',
  'Sclera Detail',
  'Skin Appearance',
  'Species',
  'Visible Eye Pigments',
  'Visible Iris Colour',
  'Visible Sensor Colour',
  'Wool Colour',
  'Wool Colours',
  'Wool Detail',
  'Wool Structure',
] as const;
export const genesisMetadataSchema = z.strictObject({
  name: z.string().min(1).max(160),
  description: z.string().min(1).max(2000),
  image: z.string().regex(/^ipfs:\/\/b[a-z2-7]{58}$/),
  external_url: z.literal('https://lammb.fun'),
  attributes: z
    .array(
      z.strictObject({
        trait_type: z.enum(genesisTraitNames),
        value: z.string().min(1).max(2400),
      }),
    )
    .min(1)
    .max(24),
});
export const task070EntrySchema = z.strictObject({
  stableCompositionId: compositionIdSchema,
  stableLineageId: reference,
  classification: z.enum(classifications),
  characterLineage: reference,
  characterFamily: reference.nullable(),
  sourceFace: reference.nullable(),
  nativePngLocation: reference,
  pngSha256: sha,
  pixelSha256: sha,
  effectiveRecipe: jsonObject,
  recipeContainers: z.array(jsonObject),
  sourceReferences: z.array(jsonObject),
  rendererVersion: jsonObject,
  effectiveHistoricalMetadataReference: reference,
  effectiveHistoricalMetadataSha256: sha,
  preparedMetadataReference: reference,
  preparedMetadataSha256: sha,
  ownerApprovalScope: reference,
  exactOwnerDecision: z.null(),
  exactOwnerDecisionTimestamp: z.null(),
  ownerAcceptanceState: reference,
  artisticReviewStatus: z.enum([
    'RECOMMEND_ACCEPT',
    'REWORK_RECOMMEND_ACCEPT',
    'NEEDS_OWNER_DECISION',
  ]),
  similarityReviewStatus: reference,
  recoveryArchiveReference: jsonObject,
  pfpReferences: z.array(jsonObject).length(4),
  productionRegistered: z.literal(false),
  finalTokenId: z.null(),
  rarityWeight: z.null(),
  acceptedImageHash: sha,
});
export type Task070Entry = z.infer<typeof task070EntrySchema>;
export const task070SelectionSchema = z.strictObject({
  schemaVersion: z.literal('lammb-task070-exact-selection-acceptance/2.0'),
  purpose: z.literal(
    'HASH_BOUND_COLLECTION_SELECTION_ACCEPTANCE_NOT_EXECUTED_PRODUCTION_REGISTRY',
  ),
  sourceTask069DeliverySha256: sha,
  sourceTask069IndexSha256: sha,
  counts: z.strictObject({
    ordinary: z.literal(690),
    ultimate: z.literal(24),
    grails: z.literal(6),
    total: z.literal(720),
  }),
  productionRegistrations: z.literal(0),
  tokenIdsAssigned: z.literal(false),
  entries: z.array(task070EntrySchema).length(720),
  supersedesPendingCandidateManifestSha256: sha,
  approvalBasis: reference,
});
export interface SelectionContext {
  readonly selectionSha256: string;
  readonly approvalSha256: string | null;
}
type ContextData = {
  entries: Map<string, Task070Entry>;
  geometry: Map<
    string,
    {
      path: string;
      sha256: string;
      gridSha256: string;
      sourceBindingsSha256: string;
    }
  > | null;
};
const contexts = new WeakMap<SelectionContext, ContextData>();
function contextData(c: SelectionContext): ContextData {
  const data = contexts.get(c);
  requireGenesis(data, 'UNTRUSTED_CONTEXT');
  return data;
}
export function sourceRecipeBinding(e: Task070Entry) {
  const r = e.effectiveRecipe;
  const path = r.path ?? r.reference ?? r.sourcePath;
  const hash = r.sha256 ?? r.containerSha256 ?? r.sourceSha256;
  requireGenesis(
    typeof path === 'string' && typeof hash === 'string',
    'RECIPE_REFERENCE',
    e.stableCompositionId,
  );
  return {
    path: path.split('#')[0]!,
    sha256: parseSchema(sha, hash, 'RECIPE_HASH', e.stableCompositionId),
  };
}
export function assertSupply(entries: { classification: string }[]) {
  const n = (kind: string) =>
    entries.filter((e) => e.classification === kind).length;
  requireGenesis(
    entries.length === 720 &&
      n('ORDINARY') === 690 &&
      n('ULTIMATE') === 24 &&
      n('GRAIL') === 6,
    'SUPPLY_TOTALS',
  );
}
function hasRecoveryBinding(value: unknown): boolean {
  if (Array.isArray(value)) return value.some(hasRecoveryBinding);
  if (value !== null && typeof value === 'object') {
    const v = value as Record<string, unknown>;
    if (
      typeof v.driveId === 'string' &&
      /^[A-Za-z0-9_-]{10,200}$/.test(v.driveId) &&
      typeof v.archiveSha256 === 'string' &&
      /^[0-9a-f]{64}$/.test(v.archiveSha256) &&
      typeof v.member === 'string' &&
      v.member.length > 0 &&
      v.member.length <= 4096 &&
      !v.member.includes('\u0000')
    )
      return true;
    return Object.values(v).some(hasRecoveryBinding);
  }
  return false;
}
export function loadSelection(
  raw: string,
  expectedSha256: string,
  approval?: { raw: string; expectedSha256: string },
): SelectionContext {
  requireGenesis(Buffer.byteLength(raw) <= 16 * 1024 * 1024, 'SELECTION_BYTES');
  requireGenesis(bytesHash(raw) === expectedSha256, 'SELECTION_DIGEST');
  const manifest = parseSchema(
    task070SelectionSchema,
    parseGenesisJson(raw),
    'SELECTION_SCHEMA',
  );
  assertSupply(manifest.entries);
  for (const key of [
    'stableCompositionId',
    'pngSha256',
    'pixelSha256',
  ] as const)
    requireGenesis(
      new Set(manifest.entries.map((e) => e[key])).size === 720,
      'DUPLICATE_' + key,
    );
  for (const e of manifest.entries) {
    requireGenesis(
      e.acceptedImageHash === e.pngSha256,
      'ACCEPTED_IMAGE_HASH',
      e.stableCompositionId,
    );
    sourceRecipeBinding(e);
    requireGenesis(
      Object.keys(e.rendererVersion).length > 0 &&
        e.recoveryArchiveReference.reviewedCompositionId ===
          e.stableCompositionId &&
        e.recoveryArchiveReference.pngSha256 === e.pngSha256 &&
        e.recoveryArchiveReference.pixelSha256 === e.pixelSha256,
      'PROVENANCE_OR_RECOVERY',
      e.stableCompositionId,
    );
    requireGenesis(
      hasRecoveryBinding(e.recoveryArchiveReference),
      'RECOVERY_ARCHIVE_MEMBER',
      e.stableCompositionId,
    );
  }
  let approvalSha256: string | null = null;
  if (approval) {
    requireGenesis(
      bytesHash(approval.raw) === approval.expectedSha256,
      'APPROVAL_DIGEST',
    );
    const a = parseSchema(
      jsonObject,
      parseGenesisJson(approval.raw),
      'APPROVAL_SCHEMA',
    );
    requireGenesis(
      a.exactSelectionManifestSha256 === expectedSha256 &&
        a.exactSelectionCoveredCount === 720 &&
        a.effectiveScope ===
          'COLLECTION_LEVEL_TASK070_CURRENT_720_SELECTION_HASH_RECONCILED',
      'APPROVAL_SCOPE',
    );
    requireGenesis(
      manifest.entries.every(
        (e) =>
          e.ownerApprovalScope === a.effectiveScope &&
          e.ownerAcceptanceState ===
            'EXACT_SELECTION_COVERED_BY_CURRENT_COLLECTION_LEVEL_OWNER_AUTHORIZATION',
      ),
      'APPROVAL_ENTRY_SCOPE',
    );
    approvalSha256 = approval.expectedSha256;
  }
  const context = Object.freeze({
    selectionSha256: expectedSha256,
    approvalSha256,
  });
  contexts.set(context, {
    entries: new Map(manifest.entries.map((e) => [e.stableCompositionId, e])),
    geometry: null,
  });
  return context;
}
export const entryIds = (c: SelectionContext) =>
  [...contextData(c).entries.keys()].sort();
export function selectionEntry(c: SelectionContext, id: string): Task070Entry {
  const e = contextData(c).entries.get(id);
  requireGenesis(e, 'UNKNOWN_COMPOSITION', id);
  return JSON.parse(serializeGenesis(e)) as Task070Entry;
}
export function bindGeometryIndex(
  c: SelectionContext,
  raw: string,
  expectedSha256: string,
) {
  requireGenesis(Buffer.byteLength(raw) <= 1024 * 1024, 'GEOMETRY_INDEX_BYTES');
  requireGenesis(bytesHash(raw) === expectedSha256, 'GEOMETRY_INDEX_DIGEST');
  const index = parseSchema(
    z.strictObject({
      schemaVersion: z.literal(2),
      selectionSha256: sha,
      files: z
        .array(
          z.strictObject({
            id: compositionIdSchema,
            path: reference,
            sha256: sha,
            gridSha256: sha,
            sourceBindingsSha256: sha,
          }),
        )
        .length(720),
    }),
    parseGenesisJson(raw),
    'GEOMETRY_INDEX_SCHEMA',
  );
  requireGenesis(
    index.selectionSha256 === c.selectionSha256 &&
      new Set(index.files.map((f) => f.id)).size === 720 &&
      index.files.every((f) => contextData(c).entries.has(f.id)),
    'GEOMETRY_INDEX_SELECTION',
  );
  const next = Object.freeze({ ...c });
  contexts.set(next, {
    entries: contextData(c).entries,
    geometry: new Map(index.files.map((f) => [f.id, f])),
  });
  return next;
}
export function geometryFile(c: SelectionContext, id: string) {
  const file = contextData(c).geometry?.get(id);
  requireGenesis(file, 'GEOMETRY_INDEX_MISSING', id);
  return { ...file };
}
export const layerOrder = [
  'background',
  'clothing',
  'skin',
  'wool',
  'eyes',
  'expression',
  'headwear',
  'jewelry',
  'effects',
] as const;
const cells = z
  .array(
    z.tuple([
      z.number().int().min(0).max(4095),
      z.number().int().min(0).max(191),
    ]),
  )
  .max(4096);
export const geometrySchema = z.strictObject({
  schemaVersion: z.literal(1),
  id: compositionIdSchema,
  selectionSha256: sha,
  pngSha256: sha,
  pixelSha256: sha,
  sourceBindings: z
    .array(z.strictObject({ path: reference, sha256: sha }))
    .min(1)
    .max(64),
  grid: z.tuple([z.literal(64), z.literal(64)]),
  layerOrder: z.array(z.enum(layerOrder)).length(9),
  paintNames: z.array(reference).min(2).max(192),
  palette: z
    .array(
      z
        .tuple([
          z.number().int().min(0).max(255),
          z.number().int().min(0).max(255),
          z.number().int().min(0).max(255),
        ])
        .nullable(),
    )
    .min(2)
    .max(192),
  layers: z.strictObject({
    background: cells,
    clothing: cells,
    skin: cells,
    wool: cells,
    eyes: cells,
    expression: cells,
    headwear: cells,
    jewelry: cells,
    effects: cells,
  }),
  gridSha256: sha,
  contactCount: z.number().int().positive().max(4096),
  derivation: z.enum([
    'EXACT_EDITABLE_FRAME',
    'EXISTING_ASSEMBLY_COMPATIBILITY_ENGINE',
    'EXISTING_HISTORICAL_SOURCE_COMPOSITION',
  ]),
});
export function validateGeometry(c: SelectionContext, id: string, raw: string) {
  requireGenesis(
    Buffer.byteLength(raw) <= 2 * 1024 * 1024,
    'GEOMETRY_BYTES',
    id,
  );
  const expected = contextData(c).geometry?.get(id);
  requireGenesis(
    expected && bytesHash(raw) === expected.sha256,
    'GEOMETRY_DIGEST',
    id,
  );
  const g = parseSchema(
    geometrySchema,
    parseGenesisJson(raw),
    'GEOMETRY_SCHEMA',
    id,
  );
  const e = selectionEntry(c, id),
    binding = sourceRecipeBinding(e);
  requireGenesis(
    g.id === id &&
      g.selectionSha256 === c.selectionSha256 &&
      g.pngSha256 === e.pngSha256 &&
      g.pixelSha256 === e.pixelSha256 &&
      g.gridSha256 === expected.gridSha256 &&
      genesisDigest(g.sourceBindings) === expected.sourceBindingsSha256 &&
      g.sourceBindings.some(
        (s) => s.path === binding.path && s.sha256 === binding.sha256,
      ),
    'GEOMETRY_SOURCE_BINDING',
    id,
  );
  requireGenesis(
    g.layerOrder.join('|') === layerOrder.join('|') &&
      g.paintNames.length === g.palette.length &&
      new Set(g.paintNames).size === g.paintNames.length,
    'GEOMETRY_PALETTE_OR_ORDER',
    id,
  );
  const off = g.paintNames.indexOf('off');
  requireGenesis(
    off >= 0 &&
      g.palette[off] === null &&
      g.palette.every((p, i) => i === off || p !== null),
    'GEOMETRY_OFF_PAINT',
    id,
  );
  const grid = Array<number>(4096).fill(off),
    owners = Array<number>(4096).fill(0);
  for (let layer = 0; layer < layerOrder.length; layer++) {
    const cs = g.layers[layerOrder[layer]!];
    requireGenesis(
      new Set(cs.map((cell) => cell[0])).size === cs.length &&
        cs.every((cell) => cell[1] < g.paintNames.length),
      'GEOMETRY_ADDRESSES',
      id,
    );
    if (layer === 0) continue;
    for (const [address, paint] of cs) {
      grid[address] = paint;
      owners[address] = layer;
    }
  }
  const forbidden = new Set<number>();
  for (let y = 0; y < 64; y++) {
    const occupied = Array.from({ length: 64 }, (_, x) => x).filter(
      (x) => owners[x + 64 * y] !== 0,
    );
    if (!occupied.length) continue;
    for (let x = occupied[0]!; x <= occupied[occupied.length - 1]!; x++)
      for (let dy = -2; dy <= 2; dy++)
        for (let dx = -2; dx <= 2; dx++)
          if (x + dx >= 0 && x + dx < 64 && y + dy >= 0 && y + dy < 64)
            forbidden.add(x + dx + (y + dy) * 64);
  }
  for (const [address, paint] of g.layers.background) {
    requireGenesis(
      !forbidden.has(address),
      'GEOMETRY_BACKGROUND_OCCLUSION',
      id,
    );
    grid[address] = paint;
  }
  const skin = new Set(g.layers.skin.map((x) => x[0]));
  const contacts = g.layers.clothing.filter((x) => skin.has(x[0])).length;
  requireGenesis(
    contacts > 0 &&
      contacts === g.contactCount &&
      g.layers.eyes.length > 0 &&
      owners.includes(1),
    'GEOMETRY_CONTACT',
    id,
  );
  const rows = Array.from({ length: 64 }, (_, y) =>
    grid.slice(y * 64, y * 64 + 64).map((p) => g.paintNames[p]!),
  );
  requireGenesis(
    genesisDigest(rows) === g.gridSha256,
    'GEOMETRY_GRID_HASH',
    id,
  );
  return g;
}
export function imageCid(hash: string) {
  parseSchema(sha, hash, 'IMAGE_HASH');
  const alphabet = 'abcdefghijklmnopqrstuvwxyz234567';
  let bits = 0,
    value = 0,
    out = 'b';
  for (const byte of Buffer.concat([
    Buffer.from([1, 85, 18, 32]),
    Buffer.from(hash, 'hex'),
  ])) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      bits -= 5;
      out += alphabet[(value >>> bits) & 31];
    }
    value &= (1 << bits) - 1;
  }
  if (bits) out += alphabet[(value << (5 - bits)) & 31];
  return out;
}
