import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { securityHeaders } from '../apps/web/src/config/security';
import { ChamberGuide } from '../apps/web/src/components/chamber-guide';
import { labsDestinationArt } from '../apps/web/src/config/labs-art';
import cinematic from '../apps/web/public/art/cinematic-preview/provenance.json';
import labs from '../apps/web/public/art/labs-preview/provenance.json';
import entryArt from '../apps/web/public/art/chamber-entry/provenance.json';

describe('public preview security and presentation boundaries', () => {
  it('retains existing response protections and restricts new resource capabilities', () => {
    const headers = Object.fromEntries(
      securityHeaders.map((header) => [header.key.toLowerCase(), header.value]),
    );
    expect(headers['x-frame-options']).toBe('DENY');
    expect(headers['x-content-type-options']).toBe('nosniff');
    expect(headers['referrer-policy']).toBe('strict-origin-when-cross-origin');
    const policy = headers['content-security-policy'];
    for (const boundary of [
      "frame-ancestors 'none'",
      "object-src 'none'",
      "script-src-attr 'none'",
      "connect-src 'self'",
      "form-action 'none'",
      "base-uri 'none'",
    ])
      expect(policy).toContain(boundary);
    expect(policy).not.toMatch(/unsafe-eval|https?:|\*/);
    for (const capability of [
      'camera',
      'microphone',
      'geolocation',
      'payment',
      'usb',
    ])
      expect(headers['permissions-policy']).toContain(`${capability}=()`);
  });
  it('keeps all four destination plates bound to preserved original artwork', () => {
    const sources = [...cinematic.assets, ...labs.assets];
    expect(
      new Set(Object.values(labsDestinationArt).map((art) => art.path)).size,
    ).toBe(4);
    for (const art of Object.values(labsDestinationArt)) {
      const source = sources.find((asset) => asset.path === art.path);
      expect(source).toBeDefined();
      expect(
        createHash('sha256')
          .update(readFileSync(`apps/web/public${art.path}`))
          .digest('hex'),
      ).toBe(source?.sha256);
    }
  });
  it('server-renders orientation, simultaneous touch, both perspectives, interactions and escape instructions without a permission flow', () => {
    const html = renderToStaticMarkup(createElement(ChamberGuide));
    for (const instruction of [
      'left thumb moves',
      'right thumb',
      'WASD',
      'First / Third person',
      'press E',
      'Pause / Resume',
      'Exit',
      'Escape',
      'Reopen',
      'Portrait works too',
      'optional',
    ])
      expect(html).toContain(instruction);
    expect(html).not.toMatch(/<button|<form|<iframe|<script/);
  });
  it('preserves two distinct native PNG masters and binds the entry assets to their digests', async () => {
    const { default: sharp } = await import('sharp');
    expect(entryArt.creationTool).toBe('image_gen.imagegen');
    expect(entryArt.assets).toHaveLength(2);
    expect(new Set(entryArt.assets.map((art) => art.native.sha256)).size).toBe(
      2,
    );
    for (const art of entryArt.assets) {
      expect(art.referenceInputs).toEqual([]);
      for (const [file, expected, format] of [
        [art.native.path, art.native, 'png'],
        [`apps/web/public${art.path}`, art, 'webp'],
      ] as const) {
        const bytes = readFileSync(file);
        expect(createHash('sha256').update(bytes).digest('hex')).toBe(
          expected.sha256,
        );
        const image = sharp(bytes);
        const metadata = await image.metadata();
        expect(metadata.format).toBe(format);
        expect(metadata.width).toBe(expected.width);
        expect(metadata.height).toBe(expected.height);
        await image.raw().toBuffer();
      }
      expect(art.width).toBeLessThanOrEqual(art.native.width);
      expect(art.height).toBeLessThanOrEqual(art.native.height);
      expect(art.bytes).toBeLessThan(150000);
    }
    const entry = renderToStaticMarkup(
      createElement(ChamberGuide, { cinematic: true }),
    );
    expect(entry).toContain(
      encodeURIComponent('/art/chamber-entry/quick-orientation.webp'),
    );
    expect(entry).toContain('alt=""');
    expect(renderToStaticMarkup(createElement(ChamberGuide))).not.toContain(
      'chamber-entry-art',
    );
  });
});
