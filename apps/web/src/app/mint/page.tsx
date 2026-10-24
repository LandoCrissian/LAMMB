import Link from 'next/link';
import { GenesisRegistration } from '../../components/genesis-registration';
import { GENESIS, stages } from '../../lib/genesis/policy';
import { socialMetadata } from '../../config/social';
import './genesis.css';

export const metadata = socialMetadata('collection', {
  path: '/mint',
  title: 'Genesis 720 / Four Mint Stages',
  description:
    '720 LAMMBs. Founder 48, GTD 392, Whitelist 160, Public 120. Free mint on OpenSea, Robinhood Chain. Gas applies. Delayed reveal. Opening times unannounced.',
});
export default function Mint() {
  return (
    <div className="genesis-launch">
      <section className="genesis-hero" aria-labelledby="genesis-title">
        <div className="genesis-hero-copy">
          <p className="section-kicker">GENESIS / ROBINHOOD CHAIN</p>
          <span className="genesis-tag">SEALED · MINT NOT ACTIVE</span>
          <h1 id="genesis-title">
            720 LAMMBS.
            <br />
            <em>ONE GENESIS.</em>
          </h1>
          <p className="genesis-lede">
            Four stages. One hard limit. Your first encounter stays sealed.
          </p>
          <p>
            Free mint. Network gas applies. Delayed reveal.
            <br />
            All minting takes place on OpenSea.
          </p>
          <div className="genesis-hero-actions">
            <a className="genesis-button" href="#genesis-stages">
              Explore the stages <span aria-hidden="true">↘</span>
            </a>
            <a
              className="genesis-collection-link"
              href={GENESIS.collectionUrl}
              target="_blank"
              rel="noopener noreferrer"
            >
              View official OpenSea collection <span aria-hidden="true">↗</span>
            </a>
          </div>
          <p className="genesis-small">
            Collection information link only. Mint actions are inactive. Opening
            times have not been verified or announced.
          </p>
        </div>
        <div
          className="genesis-seal"
          aria-label="Genesis supply: 690 ordinary, 24 Ultimate Editions, six grails, 720 total"
        >
          <span className="genesis-seal-top">CONTAINMENT / GENESIS 001</span>
          <strong>720</strong>
          <span>SEALED IDENTITIES</span>
          <div className="genesis-classifications">
            <span>
              <b>690</b> Ordinary
            </span>
            <span>
              <b>24</b> Ultimate
            </span>
            <span>
              <b>6</b> Grails
            </span>
          </div>
          <span className="genesis-seal-bottom">
            OPEN ON OPENSEA · REVEAL LATER
          </span>
        </div>
      </section>
      <section
        id="genesis-stages"
        className="genesis-stages"
        aria-labelledby="stages-title"
      >
        <div className="genesis-section-heading">
          <div>
            <p className="section-kicker">THE ORDER OF RELEASE</p>
            <h2 id="stages-title">Find your way in.</h2>
          </div>
          <p>
            48 + 392 + 160 + 120 = <strong>720</strong>
            <br />
            Approved allocation targets. Stages are not live.
          </p>
        </div>
        <ol className="genesis-stage-grid">
          {stages.map((stage, i) => (
            <li
              key={stage.id}
              className={'genesis-stage stage-' + stage.id.toLowerCase()}
              data-stage={stage.id}
            >
              <div className="genesis-stage-top">
                <span>STAGE 0{i + 1}</span>
                <span>{stage.id === 'FOUNDER' ? 'PRIVATE' : 'NOT OPEN'}</span>
              </div>
              <h3>{stage.name}</h3>
              <p className="genesis-allocation">
                {stage.allocation}
                <span>NFT allocation target</span>
              </p>
              <p className="genesis-stage-access">{stage.access}</p>
              <dl>
                <div>
                  <dt>Price</dt>
                  <dd>Free + gas</dd>
                </div>
                <div>
                  <dt>Wallet limit</dt>
                  <dd>
                    {stage.id === 'GTD'
                      ? '1 per qualifying project · 5 max'
                      : stage.id === 'FOUNDER'
                        ? '48 · founder only'
                        : stage.limit + ' per wallet in this stage'}
                  </dd>
                </div>
                <div>
                  <dt>Opening</dt>
                  <dd>To be announced</dd>
                </div>
              </dl>
              {stage.id === 'FOUNDER' ? (
                <p className="genesis-stage-note">
                  Private allocation. No public signup.
                </p>
              ) : stage.id === 'GTD' ? (
                <a className="genesis-stage-action" href="#registration-title">
                  Eligibility & invitation status{' '}
                  <span aria-hidden="true">↓</span>
                </a>
              ) : stage.id === 'WL' ? (
                <a className="genesis-stage-action" href="#registration-title">
                  Application & status <span aria-hidden="true">↓</span>
                </a>
              ) : (
                <button className="genesis-stage-action" disabled>
                  OpenSea public mint · inactive
                </button>
              )}
            </li>
          ))}
        </ol>
        <div className="genesis-policy">
          <strong>Access is earned. A signup is not a guarantee.</strong>
          <p>
            GTD claims require verified eligibility, issued allowances and an
            exclusive OpenSea window with sufficient supply. No partner projects
            have been finalized. Stage allocations are planning targets until
            the OpenSea configuration is verified.
          </p>
          <p>
            OpenSea allowances are additive: approved GTD and WL participation
            may be followed by one additional public mint, subject to supply. Up
            to 5 GTD + 2 WL + 1 public = 8. The founder is excluded from our
            GTD/WL lists; founder access outside Stage 1 must be resolved in
            OpenSea before launch.
          </p>
        </div>
      </section>
      <GenesisRegistration />
      <section className="genesis-faq" aria-labelledby="genesis-faq-title">
        <p className="section-kicker">BEFORE THE SEAL BREAKS</p>
        <h2 id="genesis-faq-title">Good questions. Clear answers.</h2>
        <details>
          <summary>Where do I mint?</summary>
          <p>
            Only at the official OpenSea collection linked above, once the
            approved stage is live. lammb.fun provides information and private
            eligibility registration; it never mints or requests a transaction.
          </p>
        </details>
        <details>
          <summary>What does free mean?</summary>
          <p>
            The NFT mint price is zero. Robinhood Chain network gas still
            applies. Never send payment to someone promising an allocation.
          </p>
        </details>
        <details>
          <summary>Will I know which LAMMB I receive?</summary>
          <p>
            The collection uses delayed reveal. No founder-specific Ultimate or
            grail selection is offered. Final assignment and reveal controls
            require their own verification before launch.
          </p>
        </details>
        <details>
          <summary>What about the Mile High identity?</summary>
          <p>
            The Mile High ascent is our heritage. Genesis is exactly 720 NFTs.{' '}
            <Link href="/ascent">Follow the ascent.</Link>
          </p>
        </details>
        <details>
          <summary>Is signing safe?</summary>
          <p>
            Registration asks for an expiring sign-in message, never a seed
            phrase, private key, spending approval or transaction. Read the
            domain, purpose and expiration in your wallet before signing.
          </p>
        </details>
      </section>
    </div>
  );
}
