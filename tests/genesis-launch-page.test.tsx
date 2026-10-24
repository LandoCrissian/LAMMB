import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import Mint, { metadata } from '../apps/web/src/app/mint/page';
import Admin from '../apps/web/src/app/admin/genesis/page';
describe('four-stage Genesis launch page', () => {
  it('renders all four approved targets and truthful closed states without endorsements or dates', () => {
    const html = renderToStaticMarkup(createElement(Mint));
    expect(
      [...html.matchAll(/data-stage="([A-Z]+)"/g)].map((m) => m[1]),
    ).toEqual(['FOUNDER', 'GTD', 'WL', 'PUBLIC']);
    for (const n of ['48', '392', '160', '120', '690', '24', '720'])
      expect(html).toContain(n);
    expect(html).toContain('Partner selection is pending owner approval');
    expect(html).toContain('No partner projects have been finalized');
    expect(html).toContain('Registration is not open');
    expect(html).toContain('disabled=""');
    expect(html).toContain('To be announced');
    expect(html).not.toMatch(
      /CCFF00|Cats on Drugs|Jiggalets|Pixel Hood|2026-10/,
    );
    expect(html).not.toContain('<form');
    expect(html).not.toContain('<input');
  });
  it('links only to official OpenSea information with inactive minting and clear additive allowance limitations', () => {
    const html = renderToStaticMarkup(createElement(Mint));
    expect(html).toContain('href="https://opensea.io/collection/lammbs"');
    expect(html).toContain('rel="noopener noreferrer"');
    expect(html).toContain('OpenSea public mint · inactive');
    expect(html).toContain('5 GTD + 2 WL + 1 public = 8');
    expect(html).toContain(
      'founder access outside Stage 1 must be resolved in OpenSea before launch',
    );
    expect(html).toContain(
      'never a seed phrase, private key, spending approval or transaction',
    );
    expect(html).toContain('90 days');
    expect(metadata.description).toContain('720');
    expect(metadata.description).toContain('Opening times unannounced');
  });
  it('does not server-render private wallet lists or active administrator controls', () => {
    const html = renderToStaticMarkup(createElement(Admin));
    expect(html).toContain('Administrator access is disabled');
    expect(html).toContain('disabled=""');
    expect(html).not.toMatch(/0x[a-f0-9]{40}|<input|<select|Export FOUNDER/);
  });
});
