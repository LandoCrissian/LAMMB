import { WorldAtlas } from '../../components/world-atlas';
import { TextLink } from '../../components/site-primitives';
import { futureExperiences } from '../../config/site';

export const metadata = {
  title: 'LAMMB World',
  description:
    'A future global flock. Optional country-level participation, with privacy and ownership protections still to be built.',
};

export default function World() {
  return (
    <section className="world-experience" aria-labelledby="world-heading">
      <div className="world-introduction">
        <div className="world-copy">
          <p className="section-kicker">LAMMB WORLD / THE GLOBAL FLOCK</p>
          <h1 id="world-heading">
            SAME WORLD.
            <br />
            <span>
              DIFFERENT
              <br />
              MINDSETS.
            </span>
          </h1>
          <p className="body-copy">
            A flock without borders. One day, a place to show where your LAMMB
            belongs. Always your choice.
          </p>
          <p className="availability-label">{futureExperiences.world.status}</p>
        </div>
        <WorldAtlas />
      </div>
      <ol
        className="world-steps"
        aria-label="How the future experience could work"
      >
        <li>
          <h2>Choose a country</h2>
          <p>
            Opt in at country level. No precise location or automatic
            geolocation.
          </p>
        </li>
        <li>
          <h2>Choose your LAMMBs</h2>
          <p>
            A future ownership check would let you select eligible specimens you
            hold.
          </p>
        </li>
        <li>
          <h2>Join the global flock</h2>
          <p>
            Help illuminate a shared world, with visibility and withdrawal under
            your control.
          </p>
        </li>
      </ol>
      <details className="world-privacy">
        <summary>Your location. Your choice. Your privacy.</summary>
        <p>
          Nothing is registered here. Country selection does not verify
          residence. Public participation must be optional, and no precise
          location will be requested.
        </p>
        <p>
          Before launch, ownership verification must account for transfers. A
          former owner’s registration must stop contributing when a specimen
          changes hands. A new owner must opt in independently; location choices
          must never carry over automatically.
        </p>
        <p>
          Withdrawal, public visibility and low-count privacy protections need
          review before any live country totals appear. Only authoritative,
          eligible registrations could contribute to those totals.
        </p>
      </details>
      <nav
        className="world-connections"
        aria-label="Continue through the universe"
      >
        <TextLink href="/community">Meet the idea behind the flock</TextLink>
        <TextLink href="/profile">Your future collector profile</TextLink>
      </nav>
    </section>
  );
}
