import type { ReactNode } from 'react';
import { socialMetadata } from '../../../../config/social';

export const metadata = socialMetadata('universe', {
  path: '/universe/experimental/chamber',
  title: 'Containment Chamber — Experimental Prototype / LAMMB',
  description:
    'An isolated fictional LAMMB Labs prototype. Not a released game.',
});

export default function ChamberMetadataLayout({
  children,
}: {
  children: ReactNode;
}) {
  return children;
}
