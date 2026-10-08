import Image from 'next/image';
import Link from 'next/link';
import { collection } from '@lammb/collection/config';
import { SealedSpecimen } from '../components/sealed-specimen';
import { cinematicAsset } from '../config/cinematic-art';
import { supplyLabel } from '../config/site';

const destinations = [
  {
    id: 'collection',
    href: '/collection',
    title: 'THE COLLECTION',
    detail: 'Sealed first. Revealed later.',
  },
  {
    id: 'universe',
    href: '/universe',
    title: 'THE UNIVERSE',
    detail: 'A world beyond the seal.',
  },
  {
    id: 'ascent',
    href: '/ascent',
    title: 'THE ASCENT',
    detail: 'One foot at a time.',
  },
  {
    id: 'community',
    href: '/community',
    title: 'THE COMMUNITY',
    detail: 'Higher together.',
  },
] as const;

export default function Home() {
  const skyline = cinematicAsset('skyline');
  const wordmark = cinematicAsset('wordmark');
  return (
    <section className="cinema-home" aria-labelledby="hero-heading">
      <div className="cinema-hero">
        <Image
          src={skyline.path}
          alt=""
          fill
          preload
          sizes="(max-width: 767px) 1200px, 100vw"
          className="cinema-scenery"
        />
        <div className="cinema-copy">
          <p className="section-kicker">ONE SPECIES. INFINITE PERSONALITIES.</p>
          <h1 id="hero-heading" className="cinema-brand">
            <span className="visually-hidden">LAMMB</span>
            <Image
              src={wordmark.path}
              alt=""
              width={wordmark.width}
              height={wordmark.height}
              preload
              sizes="(min-width: 1100px) 42vw, (min-width: 768px) 46vw, 90vw"
            />
          </h1>
          <p className="cinema-meaning">
            LET&apos;S ALL MAKE
            <br />
            MONEY BITCHES.
          </p>
          <div className="cinema-story">
            <h2>
              SEALED.
              <br />
              <span>FOR NOW.</span>
            </h2>
            <p>
              {supplyLabel} LAMMBs. A whole universe on the other side of the
              seal.
            </p>
          </div>
          <div className="cinema-actions">
            <Link className="primary-link" href="/universe">
              Enter universe <span aria-hidden="true">↗</span>
            </Link>
            <Link className="cinema-secondary" href="/mint">
              Mint details <span aria-hidden="true">↗</span>
            </Link>
          </div>
        </div>
        <div className="cinema-specimen">
          <p className="cinema-specimen-index">SEALED / UNREVEALED</p>
          <SealedSpecimen priority />
          <p className="cinema-higher">HIGHER TOGETHER.</p>
        </div>
      </div>
      <dl className="cinema-facts">
        <div>
          <dt>COLLECTION SUPPLY</dt>
          <dd>
            {supplyLabel}
            <small>LAMMBs</small>
          </dd>
        </div>
        <div>
          <dt>PRIMARY MINT</dt>
          <dd>
            FREE<small>0 ETH / network gas applies</small>
          </dd>
        </div>
        <div>
          <dt>NETWORK</dt>
          <dd>
            {collection.chainName}
            <small>Chain ID {collection.chainId}</small>
          </dd>
        </div>
        <div>
          <dt>FIRST ENCOUNTER</dt>
          <dd>
            SEALED<small>Delayed reveal</small>
          </dd>
        </div>
      </dl>
      <nav
        className="cinema-destinations"
        aria-label="Explore the LAMMB universe"
      >
        {destinations.map((destination) => {
          const art = cinematicAsset(destination.id);
          return (
            <Link
              key={destination.id}
              href={destination.href}
              className={`cinema-destination destination-${destination.id}`}
            >
              <Image
                src={art.path}
                alt=""
                fill
                sizes="(min-width: 768px) 25vw, 50vw"
              />
              <span className="destination-copy">
                <strong>{destination.title}</strong>
                <span>{destination.detail}</span>
              </span>
              <span className="destination-arrow" aria-hidden="true">
                ↗
              </span>
            </Link>
          );
        })}
      </nav>
    </section>
  );
}
