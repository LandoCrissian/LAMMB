import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { collection } from '@lammb/collection/config';
import { SiteHeader } from '../components/site-header';
import { SiteFooter } from '../components/site-footer';
import './globals.css';
import './site.css';
import './cinematic.css';
import './homepage.css';

export const metadata: Metadata = {
  metadataBase: new URL(`https://${collection.domain}`),
  title: {
    default: `${collection.name} — Higher Together`,
    template: `%s / ${collection.name}`,
  },
  description: `${String(collection.supply)} ${collection.name}s. Free mint on ${collection.chainName}. Network gas applies.`,
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <a className="skip-link" href="#main">
          Skip to content
        </a>
        <SiteHeader />
        <p className="foundation-banner">
          WEBSITE FOUNDATION / MINT NOT LIVE{' '}
          <span>Sealed specimen concept preview. No wallet required.</span>
        </p>
        <main id="main" tabIndex={-1}>
          {children}
        </main>
        <SiteFooter />
      </body>
    </html>
  );
}
