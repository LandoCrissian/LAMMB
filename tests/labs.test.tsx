import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { describe, it, expect } from 'vitest';
import { episodeSchema, episodeCatalogSchema } from '@lammb/schema/labs';
import {
  episodeCatalog,
  facilityDestinations,
  labFiles,
} from '../apps/web/src/config/labs';
import Universe from '../apps/web/src/app/universe/page';
import Security from '../apps/web/src/app/universe/security/page';
import Archive from '../apps/web/src/app/universe/archive/page';
import Dossier, {
  generateStaticParams,
} from '../apps/web/src/app/universe/archive/[file]/page';
import Surveillance from '../apps/web/src/app/universe/surveillance/page';
import Experimental from '../apps/web/src/app/universe/experimental/page';
import provenance from '../apps/web/public/art/labs-preview/provenance.json';

const published = {
  id: 'EPISODE 002',
  title: 'Test editorial fixture',
  synopsis: 'Test only. Never displayed.',
  status: 'PUBLISHED',
  releaseDate: '2026-10-08',
  media: {
    video: '/media/test/episode.webm',
    poster: '/media/test/poster.webp',
    captions: [
      { src: '/media/test/captions.vtt', language: 'en', label: 'English' },
    ],
    transcript: 'A transcript.',
  },
};
describe('classified fictional universe', () => {
  it('makes every destination and canonical file accessible through real links and static paths', () => {
    const overview = renderToStaticMarkup(createElement(Universe));
    for (const destination of facilityDestinations)
      expect(overview).toContain(`href="${destination.href}"`);
    const archive = renderToStaticMarkup(createElement(Archive));
    for (const file of labFiles)
      expect(archive).toContain(`href="/universe/archive/${file.id}"`);
    expect(generateStaticParams()).toEqual([
      { file: '000' },
      { file: '001' },
      { file: '002' },
      { file: '003' },
    ]);
  });
  it.each(labFiles)(
    'FILE $id is fully readable on the server, with native optional evidence and a no-JS annex',
    async (file) => {
      const html = renderToStaticMarkup(
        await Dossier({ params: Promise.resolve({ file: file.id }) }),
      );
      expect(html).toContain(file.narrative);
      expect(html.match(/<h1\b/g)).toHaveLength(1);
      expect(html.match(/<summary\b/g)).toHaveLength(3);
      expect(html).toContain('<noscript>');
      expect(html).toContain('aria-haspopup="dialog"');
      expect(html).toContain(
        'Story specimen numbers are not token assignments',
      );
      expect(html).not.toMatch(/<video|<iframe|<form|data-token/);
    },
  );
  it('preserves the four fictional observations, eleven-second failure, sealing and Robinhood connection', () => {
    expect(labFiles[0].narrative).toContain('Let’s All Make Money Bitches');
    expect(labFiles[0].narrative).toContain('eleven seconds');
    expect(labFiles[1].narrative).toContain('400% markup');
    expect(labFiles[1].narrative).toContain('motivational podcast');
    expect(labFiles[1].narrative).toContain('exit liquidity');
    expect(labFiles[2].narrative).toContain('skeletal anomalies');
    expect(labFiles[3].narrative).toContain('5280');
    expect(labFiles[3].narrative).toContain('Robinhood Chain');
  });
  it('keeps every facility page honest about fiction, unavailable entertainment and mint independence', () => {
    for (const Page of [
      Universe,
      Security,
      Archive,
      Surveillance,
      Experimental,
    ]) {
      const html = renderToStaticMarkup(createElement(Page));
      expect(html).toContain('FICTIONAL ARCHIVE');
      expect(html).toContain('Original fictional satire');
      expect(html).not.toMatch(
        /5,280|Colorado|Connect wallet|<video|<iframe|<form/,
      );
    }
    const surveillance = renderToStaticMarkup(createElement(Surveillance));
    expect(surveillance).toContain('IN DEVELOPMENT');
    expect(surveillance).toContain('No episode is available to watch');
    expect(surveillance).not.toContain('Play episode');
    expect(renderToStaticMarkup(createElement(Experimental))).toContain(
      'FUTURE GAME / NOT PLAYABLE',
    );
  });
  it('checks published environment bytes against original-art provenance', () => {
    expect(provenance.productionNFTArtworkApproved).toBe(false);
    expect(provenance.localGPUInference).toBe(false);
    for (const asset of provenance.assets) {
      const bytes = readFileSync(`apps/web/public${asset.path}`);
      expect(bytes.length).toBe(asset.bytes);
      expect(createHash('sha256').update(bytes).digest('hex')).toBe(
        asset.sha256,
      );
      expect(asset.source.sha256).toMatch(/^[a-f0-9]{64}$/);
    }
  });
});
describe('episode editorial publication boundary', () => {
  it('requires future episodes to supply captions, transcript, poster and video before publication', () => {
    expect(episodeSchema.safeParse(published).success).toBe(true);
    expect(
      episodeSchema.safeParse({
        ...published,
        media: { ...published.media, captions: [] },
      }).success,
    ).toBe(false);
    expect(episodeSchema.safeParse({ ...published, media: null }).success).toBe(
      false,
    );
    expect(
      episodeSchema.safeParse({
        ...published,
        media: {
          ...published.media,
          video: 'https://unverified.example/video.mp4',
        },
      }).success,
    ).toBe(false);
    expect(
      episodeSchema.safeParse({
        ...published,
        media: { ...published.media, video: '/media/test/poster.webp' },
      }).success,
    ).toBe(false);
  });
  it('cannot attach a release date or fake playable media to an in-development episode', () => {
    expect(episodeCatalog[0]?.status).toBe('IN_DEVELOPMENT');
    expect(episodeCatalog[0]?.media).toBeNull();
    expect(
      episodeSchema.safeParse({
        ...episodeCatalog[0],
        releaseDate: '2026-11-01',
      }).success,
    ).toBe(false);
    expect(
      episodeSchema.safeParse({ ...episodeCatalog[0], media: published.media })
        .success,
    ).toBe(false);
    expect(
      episodeCatalogSchema.safeParse([episodeCatalog[0], episodeCatalog[0]])
        .success,
    ).toBe(false);
  });
});
