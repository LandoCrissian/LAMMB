import { collection } from '@lammb/collection/config';
import {
  ArtSlot,
  PageIntro,
  FactStrip,
  TextLink,
} from '../../components/site-primitives';
import { supplyLabel } from '../../config/site';
export const metadata = {
  title: 'The Collection',
  description:
    '5,280 LAMMBs. Free mint on Robinhood Chain, network gas applies. Sealed first, revealed later.',
};
export default function Collection() {
  return (
    <>
      <PageIntro
        eyebrow="THE COLLECTION"
        title={`${supplyLabel} LAMMBS.`}
        accent="ONE SHARED DNA."
      >
        <p>
          Let&apos;s All Make Money Bitches. A recognizable lamb character, with
          room for masculine, feminine and neutral presentation.
        </p>
      </PageIntro>
      <FactStrip />
      <section className="editorial-section" aria-labelledby="sealed-heading">
        <div className="split-copy">
          <h2 id="sealed-heading">
            SEALED FIRST.
            <br />
            <span>REVEALED LATER.</span>
          </h2>
          <div>
            <p className="body-copy">
              Your intended first encounter is with a sealed specimen. No final
              traits are exposed before reveal. Blackout and Break the Seal
              belong to the launch experience.
            </p>
            <p className="body-copy">
              The gallery below is an artwork foundation. It contains no minted
              specimens, verified owners or final character art.
            </p>
            <TextLink href="/mint">Read the mint information</TextLink>
          </div>
        </div>
        <div className="art-grid">
          <ArtSlot code="SPECIMEN / A" />
          <ArtSlot code="SPECIMEN / B" />
          <ArtSlot code="SPECIMEN / C" />
        </div>
      </section>
      <section
        className="editorial-section"
        aria-labelledby="provenance-heading"
      >
        <p className="section-kicker">INTEGRITY / PUBLIC VERIFICATION</p>
        <h2 id="provenance-heading">
          EVERY LAMMB.
          <br />
          <span>ITS OWN STORY.</span>
        </h2>
        <div className="editorial-grid">
          <article className="editorial-card">
            <h3>Character systems</h3>
            <p>
              Wool, eyes and expression preserve identity. Mutations can change
              anatomy; pixel corruption is a separate system. No final traits or
              rarity percentages are announced.
            </p>
          </article>
          <article className="editorial-card">
            <h3>Provenance direction</h3>
            <p>
              The intent is auditable collection commitments and assignment
              verification. The final protocol is unresolved. A hash alone does
              not prove fairness.
            </p>
          </article>
          <article className="editorial-card">
            <h3>Your specimen, later</h3>
            <p>
              Collector galleries and public share cards are planned. Ownership,
              approved art and revealed public metadata are prerequisites.
            </p>
            <TextLink href="/profile">Collector profile information</TextLink>
          </article>
        </div>
        <p className="callout-footnote">
          Marketplace target: {collection.marketplaceTarget}. No official
          marketplace collection link is published here.
        </p>
      </section>
    </>
  );
}
