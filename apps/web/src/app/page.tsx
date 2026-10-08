import Link from 'next/link';
import { collection } from '@lammb/collection/config';
import { NightAtmosphere } from '../components/night-atmosphere';
import { SealedSpecimen } from '../components/sealed-specimen';
import { TextLink } from '../components/site-primitives';
import { supplyLabel } from '../config/site';

export default function Home() {
  return (
    <section className="cinematic-home" aria-labelledby="hero-heading">
      <NightAtmosphere />
      <div className="cinematic-copy">
        <div className="cinematic-brand">
          <p className="section-kicker">ONE SPECIES. INFINITE PERSONALITIES.</p>
          <h1 id="hero-heading" className="hero-wordmark">
            LAMMB
          </h1>
          <p className="cinematic-meaning">
            LET&apos;S ALL MAKE
            <br />
            MONEY BITCHES.
          </p>
        </div>
        <div className="hero-story">
          <p>THE FIRST ENCOUNTER</p>
          <h2>
            SEALED FIRST.
            <br />
            <span>REVEALED LATER.</span>
          </h2>
          <p>A whole universe on the other side of the seal.</p>
        </div>
        <div className="hero-actions">
          <Link className="primary-link" href="/universe">
            Enter the universe <span aria-hidden="true">↗</span>
          </Link>
          <TextLink href="/ascent">The {supplyLabel} Ascent</TextLink>
        </div>
      </div>
      <div className="cinematic-focal">
        <p className="focal-index">LAMMB / SPECIMEN CONCEPT</p>
        <SealedSpecimen priority />
        <p className="higher-together">
          HIGHER
          <br />
          TOGETHER.
        </p>
      </div>
      <dl className="cinematic-facts">
        <div>
          <dt>Collection supply</dt>
          <dd>
            {supplyLabel}
            <small>LAMMBs</small>
          </dd>
        </div>
        <div>
          <dt>Primary mint</dt>
          <dd>
            FREE<small>0 ETH / network gas applies</small>
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
            SEALED<small>Delayed reveal</small>
          </dd>
        </div>
      </dl>
    </section>
  );
}
