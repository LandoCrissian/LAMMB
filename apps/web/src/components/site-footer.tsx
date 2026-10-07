import Link from 'next/link';
import { collection } from '@lammb/collection/config';
import { navigation } from '../config/navigation';
export function SiteFooter() {
  return (
    <footer className="global-footer">
      <div className="footer-top">
        <Link className="brand-mark" href="/" aria-label="LAMMB home">
          LAMMB<span aria-hidden="true">/</span>
        </Link>
        <p>
          SAME SHEEP.
          <br />
          <strong>DIFFERENT MINDSET.</strong>
        </p>
      </div>
      <nav aria-label="Footer navigation">
        {navigation.map((item) => (
          <Link key={item.href} href={item.href}>
            {item.label}
          </Link>
        ))}
        <Link href="/world">LAMMB World</Link>
        <Link href="/profile">Collector profile</Link>
        <Link href="/development/launch">Launch studies</Link>
      </nav>
      <div className="footer-baseline">
        <span>{collection.domain} / HIGHER TOGETHER</span>
        <span>Website foundation. Mint is not live.</span>
      </div>
    </footer>
  );
}
