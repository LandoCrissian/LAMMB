import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { collection } from '@lammb/collection/config';
import { SiteHeader } from '../components/site-header';
import { SiteFooter } from '../components/site-footer';
import { navigation } from '../config/navigation';
import './globals.css';
import './site.css';
import './cinematic.css';
import './homepage.css';
import './experience.css';

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
        <noscript>
          <style>
            {
              '.menu-toggle, .specimen-trigger, .specimen-caption { display: none !important; }'
            }
          </style>
          <details className="fallback-navigation">
            <summary>Explore LAMMB destinations</summary>
            <nav aria-label="Destinations without JavaScript">
              {navigation.map((item) => (
                <a key={item.href} href={item.href}>
                  {item.label}
                </a>
              ))}
            </nav>
          </details>
        </noscript>
        <p className="foundation-banner">
          THE VAULT IS SEALED.<span>MINT UNAVAILABLE</span>
        </p>
        <main id="main" tabIndex={-1}>
          {children}
        </main>
        <SiteFooter />
      </body>
    </html>
  );
}
