import Link from 'next/link';
import type { ReactNode } from 'react';
import { collection } from '@lammb/collection/config';
import { supplyLabel } from '../config/site';
export function PageIntro({
  eyebrow,
  title,
  accent,
  children,
}: {
  eyebrow: string;
  title: string;
  accent: string;
  children: ReactNode;
}) {
  return (
    <section className="page-intro" aria-labelledby="page-heading">
      <p className="section-kicker">{eyebrow}</p>
      <h1 id="page-heading">
        {title}
        <br />
        <span>{accent}</span>
      </h1>
      <div className="page-lede">{children}</div>
    </section>
  );
}
export function TextLink({
  href,
  children,
}: {
  href: string;
  children: ReactNode;
}) {
  return (
    <Link className="text-link" href={href}>
      {children}
      <span aria-hidden="true">↗</span>
    </Link>
  );
}
export function ArtSlot({
  label = 'Sealed specimen study',
  variant = 'sealed',
  code = 'ART / 001',
}: {
  label?: string;
  variant?: 'sealed' | 'signal' | 'wool';
  code?: string;
}) {
  return (
    <figure className={`art-slot art-slot-${variant}`}>
      <div className="slot-topline">
        <span>{code}</span>
        <span>REPLACEABLE VISUAL</span>
      </div>
      <div className="slot-composition" aria-hidden="true">
        <div className="slot-orbit" />
        <div className="slot-core">
          <span>
            {variant === 'sealed' ? '?' : variant === 'signal' ? '+' : '○'}
          </span>
          <i />
          <i />
          <i />
        </div>
        <div className="slot-ruler">0 ─── {supplyLabel} FT</div>
      </div>
      <figcaption>
        <strong>{label}</strong>
        <span>Abstract study / approved artwork pending</span>
      </figcaption>
    </figure>
  );
}
export function FactStrip() {
  return (
    <dl className="fact-strip">
      <div>
        <dt>Collection supply</dt>
        <dd>
          {supplyLabel}
          <small>Individual LAMMBs</small>
        </dd>
      </div>
      <div>
        <dt>Primary mint</dt>
        <dd>
          0 ETH<small>Network gas applies</small>
        </dd>
      </div>
      <div>
        <dt>Network</dt>
        <dd>
          {collection.chainName}
          <small>Chain ID {collection.chainId}</small>
        </dd>
      </div>
      <div>
        <dt>First encounter</dt>
        <dd>
          Sealed<small>Delayed reveal</small>
        </dd>
      </div>
    </dl>
  );
}
export function EditorialCard({
  number,
  title,
  children,
  href,
  link,
}: {
  number: string;
  title: string;
  children: ReactNode;
  href: string;
  link: string;
}) {
  return (
    <article className="editorial-card">
      <span className="card-index" aria-hidden="true">
        {number}
      </span>
      <h3>{title}</h3>
      <p>{children}</p>
      <TextLink href={href}>{link}</TextLink>
    </article>
  );
}
