import provenance from '../../public/art/cinematic-preview/provenance.json';

export type CinematicAssetId =
  | 'front'
  | 'side'
  | 'rear'
  | 'skyline'
  | 'wordmark'
  | 'collection'
  | 'universe'
  | 'ascent'
  | 'community';

export function cinematicAsset(id: CinematicAssetId) {
  const asset = provenance.assets.find((item) => item.id === id);
  if (!asset) throw new Error(`Missing cinematic preview asset: ${id}`);
  return asset;
}
