import Image from 'next/image';
import { collection } from '@lammb/collection/config';
import { SealedSpecimen } from '../../components/sealed-specimen';
import { TextLink } from '../../components/site-primitives';
import { cinematicAsset } from '../../config/cinematic-art';
import { specimenViews, specimenDescriptions } from '../../config/specimen';
import { supplyLabel } from '../../config/site';

export const metadata = {
  title: 'The Vault',
  description:
    'Enter the LAMMB Vault. Inspect the sealed specimen through three illustrated views. Mint unavailable; delayed reveal.',
};
export default function Vault() {
  const chamber = cinematicAsset('universe');
  return (
    <section className="vault-experience" aria-labelledby="vault-heading">
      <div className="vault-copy">
        <p className="section-kicker">THE VAULT / BEFORE THE REVEAL</p>
        <h1 id="vault-heading">
          SOMETHING
          <br />
          <span>IS IN THERE.</span>
        </h1>
        <p className="vault-lede">The seal holds. The story waits.</p>
      </div>
      <div className="vault-chamber">
        <div className="vault-stage">
          <Image
            src={chamber.path}
            alt=""
            fill
            sizes="(min-width: 768px) 55vw, 100vw"
            className="vault-scenery"
          />
          <p className="chamber-label">SEALED / UNREVEALED</p>
          <SealedSpecimen priority chamber />
          <span className="chamber-floor" aria-hidden="true" />
        </div>
        <details id="specimen-views" className="vault-views">
          <summary>View all three illustrations</summary>
          <div className="vault-view-grid">
            {specimenViews.map((view) => (
              <figure key={view.view}>
                <Image
                  src={view.path}
                  alt={specimenDescriptions[view.view]}
                  width={view.width}
                  height={view.height}
                  sizes="(min-width: 768px) 170px, 28vw"
                />
                <figcaption>{view.view.toUpperCase()}</figcaption>
              </figure>
            ))}
          </div>
          <p>
            Three independently illustrated 2D views. Concept artwork, not a 3D
            model or a minted specimen.
          </p>
        </details>
      </div>
      <div className="vault-information">
        <dl className="vault-facts">
          <div>
            <dt>Supply</dt>
            <dd>{supplyLabel}</dd>
          </div>
          <div>
            <dt>Encounter</dt>
            <dd>SEALED</dd>
          </div>
          <div>
            <dt>Reveal</dt>
            <dd>DELAYED</dd>
          </div>
        </dl>
        <p className="vault-availability">
          Mint unavailable. Free mint on {collection.chainName}; network gas
          applies.
        </p>
        <nav className="vault-connections" aria-label="Continue from the Vault">
          <TextLink href="/collection">Discover the collection</TextLink>
          <TextLink href="/mint">Mint information</TextLink>
          <TextLink href="/ascent">Follow the Ascent</TextLink>
        </nav>
      </div>
    </section>
  );
}
