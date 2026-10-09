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
});
