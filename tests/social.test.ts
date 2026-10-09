import { describe, expect, it } from 'vitest';
import {
  socialDestinations,
  socialMetadata,
} from '../apps/web/src/config/social';

describe('social route metadata', () => {
  it('gives each primary destination its own canonical and large image', () => {
    const images = new Set<string>();
    for (const key of Object.keys(
      socialDestinations,
    ) as (keyof typeof socialDestinations)[]) {
      const destination = socialDestinations[key];
      const metadata = socialMetadata(key);
      expect(metadata.alternates?.canonical).toBe(
        'https://lammb.fun' + destination.path,
      );
      expect(metadata.openGraph?.url).toBe(metadata.alternates?.canonical);
      expect(metadata.twitter).toMatchObject({
        card: 'summary_large_image',
        title: destination.title,
        description: destination.description,
      });
      expect(metadata.openGraph).toMatchObject({
        title: destination.title,
        description: destination.description,
        images: [
          {
            url: 'https://lammb.fun' + destination.image,
            width: 1200,
            height: 630,
            type: 'image/jpeg',
            alt: destination.alt,
          },
        ],
      });
      images.add(destination.image);
    }
    expect(images.size).toBe(4);
  });

  it('replaces nested copy and canonical while retaining the whole image set', () => {
    const metadata = socialMetadata('universe', {
      path: '/universe/archive/000',
      title: 'FILE 000 — The Initiative / LAMMB Labs',
      description: 'A fictional research dossier.',
    });
    expect(metadata.title).toEqual({
      absolute: 'FILE 000 — The Initiative / LAMMB Labs',
    });
    expect(metadata.alternates?.canonical).toBe(
      'https://lammb.fun/universe/archive/000',
    );
    expect(metadata.openGraph).toMatchObject({
      url: 'https://lammb.fun/universe/archive/000',
      title: 'FILE 000 — The Initiative / LAMMB Labs',
      description: 'A fictional research dossier.',
      images: [
        {
          url: 'https://lammb.fun/social/universe-v1.jpg',
          width: 1200,
          height: 630,
        },
      ],
    });
    expect(metadata.twitter).toMatchObject({
      card: 'summary_large_image',
      title: 'FILE 000 — The Initiative / LAMMB Labs',
      description: 'A fictional research dossier.',
    });
  });
});
