import Link from 'next/link';
import { collection } from '@lammb/collection/config';
import { createLaunchPresentation } from '@lammb/collection/presentation';
import { AscentArt } from '../components/ascent-art';
import { LaunchStatus } from '../components/launch-status';
import {
  ArtSlot,
  EditorialCard,
  FactStrip,
  TextLink,
} from '../components/site-primitives';
import { currentLaunchSnapshot } from '../config/launch';
import { supplyLabel } from '../config/site';

export default function Home() {
  return (
    <>
      <section className="home-hero" aria-labelledby="hero-heading">
        <div className="hero-editorial">
          <p className="section-kicker">COLORADO SPIRIT / ROBINHOOD CHAIN</p>
          <h1 id="hero-heading">
            SAME
            <br />
            SHEEP.
            <br />
            <span>
              DIFFERENT
              <br />
              MINDSET.
            </span>
          </h1>
          <p className="brand-meaning">LET&apos;S ALL MAKE MONEY BITCHES.</p>
          <p className="hero-description">
            One species. A whole universe of personalities.
            <br />
            {supplyLabel} LAMMBs. Higher together.
          </p>
          <div className="hero-actions">
            <Link className="primary-link" href="/universe">
              Enter the universe <span aria-hidden="true">↗</span>
            </Link>
            <TextLink href="/ascent">Follow the Ascent</TextLink>
          </div>
        </div>
        <div className="hero-object">
          <div className="altitude-tab">
            {supplyLabel}
            <span>FT / THE ASCENT</span>
          </div>
          <ArtSlot />
          <p className="hero-object-note">
            NOT A LAMMB. YET.<span>Sealed first. Revealed later.</span>
          </p>
        </div>
        <div className="hero-baseline">
          <span>ONE SPECIES. INFINITE PERSONALITIES.</span>
          <span>01 / AT THE BASE</span>
        </div>
      </section>
      <FactStrip />
      <section
        className="editorial-section intro-section"
        aria-labelledby="identity-heading"
      >
        <p className="section-kicker">THE CHARACTER / THE MINDSET</p>
        <div className="split-copy">
          <h2 id="identity-heading">
            BUILT
            <br />
            <span>DIFFERENT.</span>
          </h2>
          <div>
            <p className="large-copy">
              The ears. The eyes.
              <br />
              The wool. The attitude.
            </p>
            <p className="body-copy">
              LAMMB begins with a recognizable lamb silhouette and an
              unmistakable face. A compact muzzle, lateral ears and heavy-lidded
              eyes. One underlying character, with room for different
              personalities.
            </p>
            <TextLink href="/collection">Meet the collection</TextLink>
          </div>
        </div>
      </section>
      <section className="editorial-section" aria-labelledby="universe-heading">
        <div className="section-heading-row">
          <div>
            <p className="section-kicker">MORE TO EXPLORE</p>
            <h2 id="universe-heading">
              YOUR NEXT
              <br />
              <span>ENCOUNTER.</span>
            </h2>
          </div>
          <p className="body-copy">
            Meet the world. Understand the launch.
            <br />
            Find your place in the flock.
          </p>
        </div>
        <div className="editorial-grid destination-list">
          <EditorialCard
            number="01"
            title="The Universe"
            href="/universe"
            link="Explore the universe"
          >
            Colorado altitude. Night-city energy. A character that carries its
            identity wherever it goes.
          </EditorialCard>
          <EditorialCard
            number="02"
            title="The Collection"
            href="/collection"
            link="Explore the collection"
          >
            {supplyLabel} specimens. Sealed at the first encounter. Individual
            LAMMBs after the reveal.
          </EditorialCard>
          <EditorialCard
            number="03"
            title="The Community"
            href="/community"
            link="Meet the flock"
          >
            Same sheep. Different mindset. A shared space for different
            personalities.
          </EditorialCard>
        </div>
      </section>
      <section className="home-ascent" aria-labelledby="ascent-heading">
        <div>
          <p className="section-kicker">THE LAUNCH IS PART OF THE EXPERIENCE</p>
          <h2 id="ascent-heading">
            THE {supplyLabel}
            <br />
            <span>ASCENT.</span>
          </h2>
          <p className="body-copy">
            At the base. Halfway. One foot left.
            <br />A deliberate climb toward the first sealed specimen.
          </p>
          <TextLink href="/ascent">Discover the four milestones</TextLink>
        </div>
        <AscentArt />
      </section>
      <LaunchStatus
        presentation={createLaunchPresentation(currentLaunchSnapshot)}
      />
      <section
        className="editorial-section final-callout"
        aria-labelledby="world-heading"
      >
        <p className="section-kicker">A FUTURE HOME FOR THE GLOBAL FLOCK</p>
        <h2 id="world-heading">
          SAME WORLD.
          <br />
          <span>DIFFERENT BREED.</span>
        </h2>
        <p className="body-copy">
          LAMMB World is a planned country-level collector experience.
          Registration is unavailable in this foundation.
        </p>
        <TextLink href="/world">Explore the idea</TextLink>
        <p className="callout-footnote">
          {collection.marketplaceTarget} is the marketplace target. Official
          collection links and mint availability remain pending.
        </p>
      </section>
    </>
  );
}
