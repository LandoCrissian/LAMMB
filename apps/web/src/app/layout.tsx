import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { collection } from '@lammb/collection/config';
import './globals.css';

export const metadata: Metadata = {
  metadataBase: new URL(`https://${collection.domain}`),
  title: `${collection.name} — Higher Together`,
  description: `${collection.supply.toLocaleString('en-US')} ${collection.name}s. Free mint on ${collection.chainName}. Network gas applies.`,
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
