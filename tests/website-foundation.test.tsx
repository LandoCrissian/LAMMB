import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import RootLayout from '../apps/web/src/app/layout';
import Home from '../apps/web/src/app/page';
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

// Server markup tests do not claim browser layout/menu interaction coverage.
vi.mock('next/navigation', () => ({ usePathname: () => '/' }));

const routes = {
  '/': Home,
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

describe('website foundation boundaries', () => {
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
      expect(html).toContain('MINT NOT LIVE');
      expect(html).toContain('aria-controls="global-navigation"');
      expect(html).toContain('aria-expanded="false"');
      expect(html).not.toMatch(/<form\b|<input\b|<iframe\b|<img\b/);
      const hrefs = [...html.matchAll(/href="([^"]+)"/g)].map(
        (match) => match[1],
      );
      for (const href of hrefs) {
        expect(href?.startsWith('/') || href?.startsWith('#')).toBe(true);
        if (href?.startsWith('/')) expect(Object.keys(routes)).toContain(href);
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
    expect(world).toContain('REGISTRATION UNAVAILABLE');
    expect(world).toContain(
      'No country registry or collector counts are available.',
    );
    expect(world).toContain('Country selection does not verify residence.');
    const profile = markup(Profile);
    expect(profile).toContain('PROFILES UNAVAILABLE');
    expect(profile).toContain('no ownership is claimed');
    for (const html of [world, profile, markup(Mint)]) {
      // Only a navigation disclosure is actionable; no synthetic feature control.
      expect(html.match(/<button\b/g)).toHaveLength(1);
      expect(html).not.toMatch(/data-(wallet|owner|registration-count)=/);
    }
  });

  it('exposes FAQ answers with native keyboard-capable disclosure semantics', () => {
    const html = markup(FAQ);
    expect(html.match(/<details\b/g)).toHaveLength(questions.length);
    expect(html.match(/<summary\b/g)).toHaveLength(questions.length);
    expect(html).toContain('Network gas still applies');
    expect(html).toContain('Chain ID 4663');
  });

  it('visibly labels every character/gallery slot and preserves the canonical milestone narrative', () => {
    for (const Page of [Home, Universe, Collection, Profile, Mint])
      expect(markup(Page)).toContain('approved artwork pending');
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
