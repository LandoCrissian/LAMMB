import { collection } from '@lammb/collection/config';
import { SealedSpecimen } from '../../components/sealed-specimen';
import {
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
        accent="EVERY STORY SEALED."
      >
        <p>
          One species. Infinite personalities. Your intended first encounter is
          a sealed specimen, with the individual LAMMB revealed later.
        </p>
      </PageIntro>
      <section
        className="editorial-section specimen-story"
        aria-labelledby="sealed-heading"
      >
        <div>
          <p className="section-kicker">BEFORE THE REVEAL</p>
          <h2 id="sealed-heading">
            NOT A LAMMB.
            <br />
            <span>YET.</span>
          </h2>
          <p className="body-copy">
            The seal holds the mystery. Blackout and Break the Seal belong to
            the launch experience. Final characters and traits remain behind it.
          </p>
          <p className="body-copy">
            This owner-authorized concept preview is not final NFT artwork, a
            minted specimen or a claim of ownership.
          </p>
          <TextLink href="/mint">Mint information</TextLink>
          <details className="collection-integrity">
            <summary>Collection integrity &amp; provenance</summary>
            <p>
              Independent verification is the intended direction. The final
              commitment and assignment protocol remain unresolved. A hash alone
              does not prove fairness.
            </p>
            <p>
              Marketplace target: {collection.marketplaceTarget}. No official
              collection link, final rarity percentages or reveal date are
              announced.
            </p>
          </details>
        </div>
        <SealedSpecimen />
      </section>
      <FactStrip />
    </>
  );
}
