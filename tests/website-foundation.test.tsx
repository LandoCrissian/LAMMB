import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import RootLayout from '../apps/web/src/app/layout';
import Home from '../apps/web/src/app/page';
import Vault from '../apps/web/src/app/vault/page';
import Universe from '../apps/web/src/app/universe/page';
import Collection from '../apps/web/src/app/collection/page';
import Ascent from '../apps/web/src/app/ascent/page';
import Community from '../apps/web/src/app/community/page';
import FAQ from '../apps/web/src/app/faq/page';
import World from '../apps/web/src/app/world/page';
import Profile from '../apps/web/src/app/profile/page';
import Mint from '../apps/web/src/app/mint/page';
import LaunchStudies from '../apps/web/src/app/development/launch/page';
import { navigation } from '../apps/web/src/config/navigation';
import { futureExperiences, questions } from '../apps/web/src/config/site';
import { launchStateSchema } from '@lammb/schema/launch';
import { specimenViews } from '../apps/web/src/config/specimen';
import art from '../apps/web/public/art/cinematic-preview/provenance.json';
import labsArt from '../apps/web/public/art/labs-preview/provenance.json';
import { facilityDestinations, labFiles } from '../apps/web/src/config/labs';

// Server markup tests do not claim browser layout/menu interaction coverage.
vi.mock('next/navigation', () => ({ usePathname: () => '/' }));

const routes = {
  '/': Home,
  '/vault': Vault,
  '/universe': Universe,
  '/collection': Collection,
  '/ascent': Ascent,
  '/community': Community,
  '/faq': FAQ,
  '/world': World,
  '/profile': Profile,
  '/mint': Mint,
  '/development/launch': LaunchStudies,
};
const markup = (Page: typeof Home) =>
  renderToStaticMarkup(
    createElement(RootLayout, { children: createElement(Page) }),
  );
const approvedImagePaths = [...art.assets, ...labsArt.assets].map(
  (asset) => asset.path,
);
const labsRoutes = [
  ...facilityDestinations.map((item) => item.href),
  ...labFiles.map((file) => `/universe/archive/${file.id}`),
];
function imagePath(source: string) {
  const url = new URL(source.replaceAll('&amp;', '&'), 'http://localhost');
  return url.pathname === '/_next/image'
    ? url.searchParams.get('url')
    : url.pathname;
}

describe('website foundation boundaries', () => {
  it('composes the homepage from separate preview assets and genuine destination links, with no low-resolution hero or pretend mint/trailer control', () => {
    const html = markup(Home);
    expect(specimenViews.map((view) => view.view)).toEqual([
      'front',
      'side',
      'rear',
    ]);
    expect(html).toContain('Explore the LAMMB universe');
    for (const destination of [
      'collection',
      'universe',
      'ascent',
      'community',
    ]) {
      expect(html).toContain(`href="/${destination}"`);
      expect(html).toContain(
        encodeURIComponent(`/art/cinematic-preview/${destination}.webp`),
      );
    }
    expect(html).not.toContain('/art/sealed-specimen/');
    expect(html).not.toMatch(/Watch trailer|Mint now|Connect wallet/i);
    expect(html).toContain('5280');
    expect(html).toContain('Robinhood Chain');
    expect(html).toContain('network gas applies');
  });
  it.each(Object.entries(routes))(
    '%s has a single shared landmark shell and an honest unavailable mint',
    (_route, Page) => {
      const html = markup(Page);
      expect(html.match(/<main\b/g)).toHaveLength(1);
      expect(html.match(/id="main"/g)).toHaveLength(1);
      expect(html.match(/<h1\b/g)).toHaveLength(1);
      expect(html.match(/<header\b/g)).toHaveLength(1);
      expect(html.match(/<footer\b/g)).toHaveLength(1);
      expect(html).toContain('Skip to content');
      expect(html).toContain('THE VAULT IS SEALED.');
      expect(html).toContain('MINT UNAVAILABLE');
      expect(html).not.toContain('WEBSITE FOUNDATION');
      expect(html).toContain('aria-controls="global-navigation"');
      expect(html).toContain('aria-expanded="false"');
      expect(html).not.toMatch(/<form\b|<iframe\b/);
      if (_route === '/world') {
        expect(html.match(/<input\b/g)).toHaveLength(1);
        expect(html).toContain('id="atlas-search"');
        expect(html).toContain('type="search"');
      } else expect(html).not.toMatch(/<input\b/);
      for (const image of html.matchAll(/<img[^>]+src="([^"]+)"/g))
        expect(approvedImagePaths).toContain(imagePath(image[1]!));
      expect(html).not.toContain('5,280');
      expect(html).not.toMatch(/\bColorado\b/i);
      const hrefs = [...html.matchAll(/href="([^"]+)"/g)].map(
        (match) => match[1],
      );
      for (const href of hrefs) {
        expect(href?.startsWith('/') || href?.startsWith('#')).toBe(true);
        if (href?.startsWith('/'))
          expect([
            ...Object.keys(routes),
            ...labsRoutes,
            ...approvedImagePaths,
          ]).toContain(imagePath(href!));
      }
    },
  );

  it('every public navigation and future information link resolves to an implemented page', () => {
    for (const item of [...navigation, ...Object.values(futureExperiences)]) {
      expect(Object.keys(routes)).toContain(item.href);
    }
  });

  it('preserves all seven development studies without nested navigation landmarks', () => {
    const html = markup(LaunchStudies);
    expect(
      [...html.matchAll(/data-state="([A-Z_]+)"/g)].map((entry) => entry[1]),
    ).toEqual([
      'PRE_ASCENT',
      'ASCENT',
      'MINT',
      'RECOVERY',
      'BLACKOUT',
      'REVEAL',
      'REVEALED',
    ]);
    expect(html).toContain(
      'Development fixture / altitude and history are examples',
    );
    expect(html).toContain(
      'Future onchain supply / unavailable / no chain reads',
    );
    expect(html).toContain('no ownership verified');
  });

  it('does not present country registration or profile ownership as implemented', () => {
    const world = markup(World);
    expect(world).toContain('REGISTRY NOT YET LIVE');
    expect(world).toContain(
      'No live registry or collector counts are available.',
    );
    expect(world).toContain('Country selection does not verify residence.');
    const profile = markup(Profile);
    expect(profile).toContain('PROFILES UNAVAILABLE');
    expect(profile).toContain('no ownership is claimed');
    for (const html of [world, profile, markup(Mint)]) {
      expect(html).not.toMatch(
        /<button[^>]*>(Connect wallet|Register|Mint now)/i,
      );
      expect(html).not.toMatch(/data-(wallet|owner|registration-count)=/);
    }
  });

  it('exposes FAQ answers with native keyboard-capable disclosure semantics', () => {
    const html = renderToStaticMarkup(createElement(FAQ));
    expect(html.match(/<details\b/g)).toHaveLength(questions.length);
    expect(html.match(/<summary\b/g)).toHaveLength(questions.length);
    expect(html).toContain('Network gas still applies');
    expect(html).toContain('Chain ID 4663');
  });

  it('distinguishes authorized sealed previews from final artwork and keeps character art unavailable', () => {
    for (const Page of [Home, Vault, Collection, Mint]) {
      const html = markup(Page);
      expect(html).toContain('Concept preview / not final NFT artwork');
      expect(html).toContain(
        'Three independently illustrated 2D views, not a 3D model or a minted NFT',
      );
      expect(html).toContain('aria-haspopup="dialog"');
      expect(html).toContain('Close specimen inspection');
      for (const view of ['FRONT', 'SIDE', 'REAR'])
        expect(html).toContain(view);
    }
    expect(markup(Profile)).toContain('approved artwork pending');
    expect(markup(Universe)).toContain(
      'Final characters and traits are not exposed here',
    );
  });

  it('provides real destination links and all specimen views without requiring JavaScript', () => {
    const html = markup(Vault);
    expect(html).toContain('Destinations without JavaScript');
    expect(html).toContain('id="specimen-views"');
    expect(html).toContain('View all three illustrations');
    for (const view of specimenViews) {
      expect(html).toContain(encodeURIComponent(view.path));
    }
    for (const destination of navigation) {
      expect(html).toContain(`href="${destination.href}"`);
    }
  });

  it('separates geographic exploration from voluntary, transfer-aware registration', () => {
    const html = markup(World);
    expect(html).toContain('GEOGRAPHY, NOT PARTICIPATION');
    expect(html).toContain('Search &amp; country list');
    expect(html).toContain('Nothing is registered here.');
    expect(html).toContain('A new owner must opt in independently');
    expect(html).toContain('low-count privacy protections');
    expect(html).not.toMatch(/<form\b|data-(wallet|coordinates|count)=/);
  });

  it('preserves the canonical milestone narrative', () => {
    const ascent = markup(Ascent);
    expect(ascent).toContain('2,640');
    expect(ascent).toContain('5,279');
    expect(ascent).toContain('ONE FOOT LEFT');
    expect(ascent).toContain('STATIC CANONICAL / NARRATIVE MILESTONES');
    expect(ascent).toContain('do not move it');
    expect(ascent).toContain('Canonical global launch lifecycle');
    expect(ascent).toContain('not live progress');
    for (const state of launchStateSchema.options)
      expect(ascent).toContain(state.replaceAll('_', ' '));
  });
});
