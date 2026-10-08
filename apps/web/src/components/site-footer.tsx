import Link from 'next/link';
import { collection } from '@lammb/collection/config';
export function SiteFooter() {
  return (
    <footer className="global-footer compact-footer">
      <p>
        {collection.domain} <span>/ HIGHER TOGETHER</span>
      </p>
      <nav aria-label="Footer navigation">
        <Link href="/world">LAMMB World</Link>
        <Link href="/profile">Collector Profile</Link>
        <Link href="/faq">FAQ</Link>
        <Link href="/development/launch">Launch studies</Link>
      </nav>
      <span className="footer-status">Website foundation / mint not live</span>
    </footer>
  );
}
