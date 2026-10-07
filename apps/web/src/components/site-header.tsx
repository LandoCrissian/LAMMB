'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { navigation } from '../config/navigation';

export function SiteHeader() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const toggle = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!open) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false);
        toggle.current?.focus();
      }
    };
    document.addEventListener('keydown', closeOnEscape);
    return () => document.removeEventListener('keydown', closeOnEscape);
  }, [open]);
  return (
    <header className="global-header">
      <Link
        className="brand-mark"
        href="/"
        aria-label="LAMMB home"
        onClick={() => setOpen(false)}
      >
        LAMMB<span aria-hidden="true">/</span>
      </Link>
      <button
        ref={toggle}
        className="menu-toggle"
        type="button"
        aria-expanded={open}
        aria-controls="global-navigation"
        aria-label={open ? 'Close navigation menu' : 'Open navigation menu'}
        onClick={() => setOpen((value) => !value)}
      >
        {open ? 'Close' : 'Menu'}
        <span aria-hidden="true">{open ? '−' : '+'}</span>
      </button>
      <nav
        id="global-navigation"
        className="global-navigation"
        aria-label="Main navigation"
        data-open={open}
      >
        {navigation.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            aria-current={pathname === item.href ? 'page' : undefined}
            onClick={() => setOpen(false)}
          >
            {item.label}
          </Link>
        ))}
        <Link
          href="/mint"
          className="nav-mint"
          aria-current={pathname === '/mint' ? 'page' : undefined}
          onClick={() => setOpen(false)}
        >
          Mint info <span aria-hidden="true">↗</span>
        </Link>
      </nav>
    </header>
  );
}
