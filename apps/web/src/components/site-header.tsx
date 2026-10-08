'use client';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { navigation } from '../config/navigation';
import { useDialog } from './use-dialog';
import { cinematicAsset } from '../config/cinematic-art';

const wordmark = cinematicAsset('wordmark');

export function SiteHeader() {
  const pathname = usePathname();
  const destination = navigation.find((item) => item.href === pathname);
  return (
    <header className="global-header">
      <Link className="brand-mark" href="/" aria-label="LAMMB home">
        <Image
          src={wordmark.path}
          alt=""
          width={wordmark.width}
          height={wordmark.height}
          sizes="120px"
          className="brand-image"
        />
      </Link>
      <span className="current-location">
        <span>YOU ARE HERE</span>
        <strong>{destination?.label ?? 'Beyond the map'}</strong>
      </span>
      <NavigationMenu key={pathname} pathname={pathname} />
    </header>
  );
}

// Route changes reset only the ephemeral overlay, including browser back/forward.
// The native links and Next router retain history, deep links and refresh behavior.
function NavigationMenu({ pathname }: { pathname: string }) {
  const { dialogRef, triggerRef, open, show, close, containFocus } =
    useDialog();
  return (
    <>
      <button
        ref={triggerRef}
        className="menu-toggle"
        type="button"
        aria-expanded={open}
        aria-controls="global-navigation"
        aria-haspopup="dialog"
        aria-label="Open navigation menu"
        onClick={show}
      >
        Explore{' '}
        <span className="hamburger" aria-hidden="true">
          <i />
          <i />
        </span>
      </button>
      <dialog
        ref={dialogRef}
        className="navigation-dialog cinematic-dialog"
        aria-labelledby="navigation-title"
        onKeyDown={containFocus}
        onCancel={(event) => {
          event.preventDefault();
          close();
        }}
      >
        <div className="dialog-topline">
          <span id="navigation-title">EXPLORE LAMMB</span>
          <button
            type="button"
            className="dialog-close"
            aria-label="Close navigation menu"
            onClick={close}
          >
            Close <span aria-hidden="true">×</span>
          </button>
        </div>
        <div className="navigation-layout">
          <div className="navigation-statement" aria-hidden="true">
            SAME SHEEP.
            <br />
            <span>
              DIFFERENT
              <br />
              MINDSET.
            </span>
            <small>HIGHER TOGETHER.</small>
          </div>
          <nav
            id="global-navigation"
            className="global-navigation"
            aria-label="Main navigation"
          >
            {navigation.map((item, index) => (
              <Link
                key={item.href}
                href={item.href}
                aria-current={pathname === item.href ? 'page' : undefined}
                onClick={close}
              >
                <span className="navigation-index" aria-hidden="true">
                  {String(index + 1).padStart(2, '0')}
                </span>
                <span className="navigation-link-copy">
                  <span>{item.label}</span>
                  <small>{item.detail}</small>
                </span>
                <span className="navigation-arrow" aria-hidden="true">
                  ↗
                </span>
              </Link>
            ))}
          </nav>
        </div>
        <p className="dialog-footnote">
          THE VAULT IS SEALED. THE FLOCK IS COMING. / MINT UNAVAILABLE
        </p>
      </dialog>
    </>
  );
}
