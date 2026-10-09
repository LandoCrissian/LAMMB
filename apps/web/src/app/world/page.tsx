import { WorldAtlas } from '../../components/world-atlas';
import { TextLink } from '../../components/site-primitives';
import { socialMetadata } from '../../config/social';

export const metadata = socialMetadata('world');

export default function World() {
  return (
    <section className="global-atlas" aria-labelledby="world-heading">
      <div className="atlas-introduction">
        <div>
          <p className="section-kicker">LAMMB WORLD / GLOBAL NFT ATLAS</p>
          <h1 id="world-heading">
            ONE WORLD.<span> MANY MINDSETS.</span>
          </h1>
        </div>
        <p>
          Find your place in the future flock.
          <br />
          Explore now. Register later.
        </p>
      </div>
      <WorldAtlas />
      <details className="atlas-notes" id="map-notes">
        <summary>Geography, privacy &amp; the future registry</summary>
        <p>
          Natural Earth v5.1.2 country map units, projected with Equal Earth.
          249 ISO countries and territories are searchable; 248 have boundaries.
          U.S. Minor Outlying Islands has no polygon in this dataset. Small
          islands and microstates are easier to find through search; these
          generalized boundaries are not suitable for navigation or legal use.
        </p>
        <p>
          Boundaries follow the source’s de facto treatment and do not settle
          territorial claims. Kosovo, Somaliland, Northern Cyprus and Siachen
          Glacier are shown as separate geographic areas without assigned ISO
          country codes. Overseas map units sharing one ISO code are grouped.
          Fiji and other antimeridian countries retain their separated islands.
          Country outlines do not represent community activity.
        </p>
        <p>
          Nothing is registered here. Country selection does not verify
          residence. Public participation must be optional. Ownership
          verification must account for transfers; a former owner’s active
          display must expire when a specimen changes hands. A new owner must
          opt in independently. Withdrawal, public visibility and low-count
          privacy protections require review before any totals appear.
        </p>
        <p>
          LAMMB is the founding collection concept, with no live contract
          declared. Other projects are candidates only. Collection admission,
          verified ownership, country registration and public display are
          separate requirements. The interactive map does not connect wallets or
          send location choices to a registry.
        </p>
      </details>
      <nav
        className="atlas-connections"
        aria-label="Continue through the universe"
      >
        <TextLink href="/community">Meet the flock</TextLink>
        <TextLink href="/profile">Future collector profile</TextLink>
      </nav>
    </section>
  );
}
