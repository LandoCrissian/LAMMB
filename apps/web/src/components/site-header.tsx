'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { navigation } from '../config/navigation';
import { useDialog } from './use-dialog';

export function SiteHeader() {
  const pathname = usePathname();
  const { dialogRef, triggerRef, open, show, close, containFocus } =
    useDialog();
  return (
    <header className="global-header">
      <Link className="brand-mark" href="/" aria-label="LAMMB home">
        LAMMB<span aria-hidden="true">/</span>
      </Link>
      <span className="header-coordinate" aria-hidden="true">
        COLORADO / 5,280 FT
      </span>
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
                  0{index + 1}
                </span>
                {item.label}
                <span className="navigation-arrow" aria-hidden="true">
                  ↗
                </span>
              </Link>
            ))}
          </nav>
        </div>
        <p className="dialog-footnote">
          lammb.fun / SEALED FIRST. REVEALED LATER. / MINT NOT LIVE
        </p>
      </dialog>
    </header>
  );
}
