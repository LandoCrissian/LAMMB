import { artManifestSchema, approvalManifestSchema } from './art-schema.ts';
import { canonicalJson, compareText, sha256Bytes } from './canonical.ts';

export function distinct(values: string[], label: string) {
  if (new Set(values).size !== values.length)
    throw new Error(`Duplicate ${label}`);
}

export function validateArt(
  manifestInput: unknown,
  approvalInput: unknown,
  bytes: ReadonlyMap<string, Uint8Array>,
) {
  const manifest = artManifestSchema.parse(
    JSON.parse(canonicalJson(manifestInput)),
  );
  const approvals = approvalManifestSchema.parse(
    JSON.parse(canonicalJson(approvalInput)),
  );
  if (manifest.purpose !== approvals.purpose)
    throw new Error('Approval environment mismatch');
  distinct(
    manifest.assets.map((a) => a.id),
    'asset ID',
  );
  distinct(
    manifest.assets.map((a) => a.path.toLowerCase()),
    'asset path',
  );
  distinct(
    manifest.referenceFrames.map((f) => f.id),
    'reference frame',
  );
  distinct(
    approvals.records.map((a) => a.assetId),
    'approval asset ID',
  );
  const records = new Map(approvals.records.map((a) => [a.assetId, a]));
  const frames = new Map(manifest.referenceFrames.map((f) => [f.id, f]));
  const assetIds = new Set(manifest.assets.map((a) => a.id));
  if (approvals.records.some((r) => !assetIds.has(r.assetId)))
    throw new Error('Unresolved approval record');
  if (bytes.size !== manifest.assets.length)
    throw new Error('Missing or extra asset bytes');
  let totalBytes = 0;
  for (const asset of manifest.assets) {
    if (asset.purpose !== manifest.purpose)
      throw new Error('Asset environment mismatch');
    if (
      (asset.id.startsWith('dev-') || asset.mediaType === 'text/plain') &&
      manifest.purpose === 'PRODUCTION'
    )
      throw new Error('Development fixture cannot be production');
    if (manifest.purpose === 'DEVELOPMENT_ONLY' && !asset.id.startsWith('dev-'))
      throw new Error('Development asset requires dev- prefix');
    const actual = bytes.get(asset.id);
    if (!actual || sha256Bytes(actual) !== asset.sha256)
      throw new Error(`Asset SHA mismatch: ${asset.id}`);
    totalBytes += actual.length;
    if (actual.length > 1024 * 1024 || totalBytes > 64 * 1024 * 1024)
      throw new Error('Source byte budget exceeded');
    const approval = records.get(asset.id);
    if (
      approval &&
      (approval.sha256 !== asset.sha256 || approval.state !== asset.state)
    )
      throw new Error(
        `Changed bytes or lifecycle invalidate approval: ${asset.id}`,
      );
    if (
      manifest.purpose === 'PRODUCTION' &&
      (asset.state !== 'APPROVED' || approval?.state !== 'APPROVED')
    )
      throw new Error(`Production asset must be APPROVED: ${asset.id}`);
    if (asset.state === 'RETIRED')
      throw new Error('Retired asset cannot be ingested');
    if (asset.state === 'APPROVED' && approval?.state !== 'APPROVED')
      throw new Error('APPROVED asset requires digest-bound record');
    const frame = frames.get(asset.composition.referenceFrame);
    if (!frame) throw new Error('Unresolved reference frame');
    const p = asset.composition.placement;
    const target =
      p.scaling.mode === 'NONE' ? asset.dimensions : p.scaling.target;
    if (
      p.mode === 'FULL_FRAME' &&
      (p.x !== 0 ||
        p.y !== 0 ||
        canonicalJson(target) !== canonicalJson(frame.dimensions))
    )
      throw new Error(
        'Incompatible dimensions without explicit placement/scaling',
      );
    if (
      p.x + target.width > frame.dimensions.width ||
      p.y + target.height > frame.dimensions.height
    )
      throw new Error('Placement would crop artwork');
    if (
      asset.alpha.policy === 'REQUIRED' &&
      asset.alpha.capability !== 'SUPPORTED'
    )
      throw new Error('Transparency required for opaque asset');
    if (asset.mediaType === 'image/png' && asset.colorProfile !== 'SRGB')
      throw new Error('Image color profile must explicitly be SRGB');
    const extension = asset.path.split('.').at(-1)?.toLowerCase();
    if (
      extension !==
      (
        {
          'image/png': 'png',
          'image/svg+xml': 'svg',
          'text/plain': 'txt',
        } as const
      )[asset.mediaType]
    )
      throw new Error('Declared media type/path mismatch');
    distinct(asset.compatibilityTags, 'compatibility tag');
    distinct(asset.requiresTags, 'required tag');
    distinct(
      asset.rendererRequirements.map((r) => `${r.id}/${r.version}`),
      'renderer requirement',
    );
    asset.compatibilityTags.sort(compareText);
    asset.requiresTags.sort(compareText);
    asset.rendererRequirements.sort((a, b) =>
      compareText(`${a.id}/${a.version}`, `${b.id}/${b.version}`),
    );
  }
  manifest.assets.sort((a, b) => compareText(a.id, b.id));
  manifest.referenceFrames.sort((a, b) => compareText(a.id, b.id));
  approvals.records.sort((a, b) => compareText(a.assetId, b.assetId));
  return {
    manifest,
    approvals,
    declarationOnly: [
      'dimensions',
      'mediaType',
      'alpha',
      'colorProfile',
    ] as const,
  };
}
