import Link from 'next/link';
import { collection } from '@lammb/collection/config';
import { robinhoodChain } from '@lammb/collection/network';
import { createLaunchPresentation } from '@lammb/collection/presentation';
import { AscentArt } from '../components/ascent-art';
import { LaunchStatus } from '../components/launch-status';
import { currentLaunchSnapshot } from '../config/launch';

const supplyLabel = collection.supply.toLocaleString('en-US');
const launchPresentation = createLaunchPresentation(currentLaunchSnapshot);

export default function Home() {
  return (
    <>
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <header className="site-header">
        <Link
          className="wordmark"
          href="/"
          aria-label={`${collection.name} home`}
        >
          {collection.name}
          <span aria-hidden="true">_</span>
        </Link>
        <nav aria-label="Main navigation">
          <a href="#collection">Collection</a>
          <a href="#launch">
            Launch status <span aria-hidden="true">↗</span>
          </a>
        </nav>
      </header>
      <p className="mode-banner">
        DEVELOPMENT / NOT LIVE{' '}
        <span>Launch experience study. No wallet required.</span>
      </p>
      <main id="main" tabIndex={-1}>
        <section className="hero" aria-labelledby="hero-heading">
          <div className="hero-copy">
            <p className="section-kicker">
              {robinhoodChain.name} / {robinhoodChain.environment}
            </p>
            <h1 id="hero-heading">
              SAME SHEEP.
              <br />
              <span>DIFFERENT</span>
              <br />
              <span>MINDSET.</span>
            </h1>
            <p className="brand-meaning">LET&apos;S ALL MAKE MONEY BITCHES.</p>
            <a className="primary-link" href="#collection">
              Meet {collection.name} <span aria-hidden="true">↓</span>
            </a>
          </div>
          <AscentArt />
          <div className="hero-baseline">
            <span>Higher together.</span>
            <span>Colorado altitude. Collective mindset.</span>
          </div>
        </section>
        <section
          className="collection-section"
          id="collection"
          aria-labelledby="collection-heading"
        >
          <div className="collection-heading">
            <p className="section-kicker">The collection</p>
            <h2 id="collection-heading">
              {supplyLabel}
              <span> {collection.name}S.</span>
            </h2>
          </div>
          <div className="collection-details">
            <p className="collection-intro">
              A collection built exclusively for {collection.chainName}.<br />
              Sealed first. Revealed later.
            </p>
            <dl className="collection-facts">
              <div>
                <dt>Primary mint</dt>
                <dd>
                  {collection.mintPriceWei === 0n
                    ? 'Free mint'
                    : `${collection.mintPriceWei.toString()} wei`}
                  <small>Network gas still applies.</small>
                </dd>
              </div>
              <div>
                <dt>Drop target</dt>
                <dd>{collection.marketplaceTarget}</dd>
              </div>
              <div>
                <dt>Reveal model</dt>
                <dd>Delayed reveal</dd>
              </div>
            </dl>
          </div>
        </section>
        <section className="ascent-section" aria-labelledby="ascent-heading">
          <p className="section-kicker">The launch experience</p>
          <h2 id="ascent-heading">
            THE {supplyLabel}
            <br />
            <span>ASCENT.</span>
          </h2>
          <p>
            0 FT. Halfway. One foot left. The last foot opens the intended mint.
            Sealed specimens follow, then blackout and Break the Seal.
            Progression is deliberate; authority and timing remain unresolved.
            <Link className="study-link" href="/development/launch">
              Explore all seven launch studies <span aria-hidden="true">↗</span>
            </Link>
          </p>
        </section>
        <LaunchStatus presentation={launchPresentation} />
      </main>
      <footer className="site-footer">
        <span className="wordmark">
          {collection.name}
          <span aria-hidden="true">_</span>
        </span>
        <span>HIGHER TOGETHER.</span>
        <span>{collection.domain}</span>
      </footer>
    </>
  );
}
