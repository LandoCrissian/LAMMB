import { createHash } from 'node:crypto';
import { readdir, readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';
import provenance from '../apps/web/public/art/sealed-specimen/provenance.json';
import cinematic from '../apps/web/public/art/cinematic-preview/provenance.json';

describe('owner-authorized sealed preview provenance', () => {
  it('serves only the three named sealed derivatives and their provenance, never the sheet or revealed example', async () => {
    const files = await readdir('apps/web/public/art/sealed-specimen');
    expect(files.sort()).toEqual([
      'front.png',
      'provenance.json',
      'rear.png',
      'side.png',
    ]);
    expect(provenance.authorization).toBe(
      'OWNER_TASK_005C_WEBSITE_PREVIEW_ONLY',
    );
    expect(provenance.productionNFTArtworkApproved).toBe(false);
    expect(provenance.source.sha256).toBe(
      '5f7becf4b2effc8c59be38da8d0ab52cfd957d6765a3eb85abdb1933b7a80bd2',
    );
    expect(provenance.derivatives.map((item) => item.view)).toEqual([
      'front',
      'side',
      'rear',
    ]);
  });

  it('binds exact PNG bytes, dimensions and native crop bounds to the approved unrevealed source region', async () => {
    for (const view of provenance.derivatives) {
      const bytes = await readFile(`apps/web/public${view.path}`);
      expect(createHash('sha256').update(bytes).digest('hex')).toBe(
        view.sha256,
      );
      expect(bytes.length).toBe(view.bytes);
      expect(bytes.subarray(0, 8).toString('hex')).toBe('89504e470d0a1a0a');
      expect(bytes.readUInt32BE(16)).toBe(view.width);
      expect(bytes.readUInt32BE(20)).toBe(view.height);
      const [left, top, right, bottom] = view.cropBounds;
      expect(right! - left!).toBe(view.width);
      expect(bottom! - top!).toBe(view.height);
      expect(left).toBeGreaterThanOrEqual(899);
      expect(right).toBeLessThanOrEqual(1224);
      expect(top).toBeGreaterThanOrEqual(43);
      expect(bottom).toBeLessThanOrEqual(190); // Above captions and reveal transformation.
      expect(view.operation).toBe('NATIVE_PIXEL_CROP_TO_LOSSLESS_PNG');
    }
  });
});

describe('Task 005D native preview artwork boundary', () => {
  it('publishes exactly the nine requested separate previews with explicit authorization and no production artwork approval', async () => {
    expect(cinematic.version).toBe('lammb-cinematic-preview/1');
    expect(cinematic.authorization).toBe(
      'OWNER_TASK_005D_ASSET_PRODUCTION_AND_WEBSITE_PREVIEW',
    );
    expect(cinematic.productionNFTArtworkApproved).toBe(false);
    expect(cinematic.localGPUInference).toBe(false);
    expect(cinematic.assets.map((asset) => asset.id)).toEqual([
      'front',
      'side',
      'rear',
      'skyline',
      'wordmark',
      'collection',
      'universe',
      'ascent',
      'community',
    ]);
    expect(
      (await readdir('apps/web/public/art/cinematic-preview')).sort(),
    ).toEqual(
      [
        ...cinematic.assets.map((asset) => `${asset.id}.webp`),
        'provenance.json',
      ].sort(),
    );
    expect(cinematic.viewLimitations).toContain('independently illustrated 2D');
    for (const asset of cinematic.assets) {
      expect(asset.approval).toBe(
        'OWNER_AUTHORIZED_WEBSITE_PREVIEW_PENDING_VISUAL_REVIEW',
      );
      expect(asset.path).toBe(`/art/cinematic-preview/${asset.id}.webp`);
      expect(asset.native.width).toBeGreaterThanOrEqual(1024);
      expect(asset.native.sha256).toMatch(/^[0-9a-f]{64}$/);
    }
  });

  it('binds published WebP bytes and dimensions, keeps alpha for isolated objects and limits transfer sizes', async () => {
    for (const asset of cinematic.assets) {
      const bytes = await readFile(`apps/web/public${asset.path}`);
      expect(createHash('sha256').update(bytes).digest('hex')).toBe(
        asset.sha256,
      );
      expect(bytes.length).toBe(asset.bytes);
      expect(bytes.length).toBeLessThan(500_000);
      expect(bytes.toString('ascii', 0, 4)).toBe('RIFF');
      expect(bytes.toString('ascii', 8, 12)).toBe('WEBP');
      const kind = bytes.toString('ascii', 12, 16);
      const width =
        kind === 'VP8X'
          ? bytes.readUIntLE(24, 3) + 1
          : bytes.readUInt16LE(26) & 0x3fff;
      const height =
        kind === 'VP8X'
          ? bytes.readUIntLE(27, 3) + 1
          : bytes.readUInt16LE(28) & 0x3fff;
      expect(['VP8X', 'VP8 ']).toContain(kind);
      expect([width, height]).toEqual([asset.width, asset.height]);
      if (['front', 'side', 'rear', 'wordmark'].includes(asset.id)) {
        expect(kind).toBe('VP8X');
        expect(bytes[20]! & 0x10).toBe(0x10);
        expect(asset.alpha).toBe(true);
      }
    }
  });
});
