import { createHash } from 'node:crypto';
import { readdir, readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';
import provenance from '../apps/web/public/art/sealed-specimen/provenance.json';

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
