import type { Metadata } from 'next';
import { collection } from '@lammb/collection/config';

export const socialOrigin = `https://${collection.domain}`;

export const socialDestinations = {
  home: {
    path: '/',
    title: 'LAMMB — Higher Together',
    description:
      '5280 LAMMBs. One species. Infinite personalities. Explore the sealed collection and the world beyond it. Mint unavailable.',
    image: '/social/home-v1.jpg',
    alt: 'LAMMB graffiti identity beside a sealed black industrial specimen. Sealed. For now. Higher together.',
  },
  universe: {
    path: '/universe',
    title: 'LAMMB Labs — The Classified Universe',
    description:
      'Eleven seconds of success. An entire facility of consequences. Explore leaked research and fictional incident files inside LAMMB Labs.',
    image: '/social/universe-v1.jpg',
    alt: 'An empty classified laboratory lit in chartreuse. Classified. Badly. Leaked research / fiction.',
  },
  world: {
    path: '/world',
    title: 'LAMMB World — Global NFT Atlas',
    description:
      'Explore real country geography in the global NFT atlas. Find your place in the future flock. The voluntary registry is not yet live.',
    image: '/social/world-v1.jpg',
    alt: 'Real Equal Earth country outlines in chartreuse beside One world. Many mindsets. Global NFT atlas.',
  },
  collection: {
    path: '/collection',
    title: 'The Collection / LAMMB',
    description:
      '5280 LAMMBs. Every story sealed. Your first encounter is an unrevealed specimen; individual characters come later. Mint unavailable.',
    image: '/social/collection-v1.jpg',
    alt: 'An unrevealed industrial specimen in an evidence frame beside 5280. Every story sealed.',
  },
} as const;

type SocialDestination = keyof typeof socialDestinations;
type PageCopy = { path: string; title: string; description: string };

// Next replaces nested metadata objects rather than deeply merging them.
// Always emit the complete OG/Twitter set, including the image, for each route.
export function socialMetadata(
  destination: SocialDestination,
  page?: PageCopy,
): Metadata {
  const details = { ...socialDestinations[destination], ...page };
  const url = new URL(details.path, socialOrigin).href;
  const image = {
    url: new URL(details.image, socialOrigin).href,
    width: 1200,
    height: 630,
    alt: details.alt,
  };
  return {
    title: { absolute: details.title },
    description: details.description,
    alternates: { canonical: url },
    openGraph: {
      type: 'website',
      siteName: collection.name,
      locale: 'en_US',
      url,
      title: details.title,
      description: details.description,
      images: [{ ...image, type: 'image/jpeg' }],
    },
    twitter: {
      card: 'summary_large_image',
      title: details.title,
      description: details.description,
      images: [image],
    },
  };
}
