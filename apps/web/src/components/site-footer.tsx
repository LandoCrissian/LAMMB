import Link from 'next/link';
import { collection } from '@lammb/collection/config';
export function SiteFooter() {
  return (
    <footer className="global-footer compact-footer">
      <p>
        {collection.domain} <span>/ HIGHER TOGETHER</span>
      </p>
      <nav aria-label="Footer navigation">
        <Link href="/vault">The Vault</Link>
        <Link href="/world">LAMMB World</Link>
        <Link href="/profile">Collector Profile</Link>
        <Link href="/faq">FAQ</Link>
      </nav>
      <span className="footer-status">
        THE FLOCK IS COMING. / MINT UNAVAILABLE
      </span>
    </footer>
  );
}
