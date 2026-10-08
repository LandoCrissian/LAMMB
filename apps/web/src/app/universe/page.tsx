import { NightAtmosphere } from '../../components/night-atmosphere';
import { PageIntro, TextLink } from '../../components/site-primitives';
export const metadata = {
  title: 'The Universe',
  description:
    'One species. Different personalities. Explore the world of LAMMB.',
};
export default function Universe() {
  return (
    <div className="universe-experience">
      <NightAtmosphere />
      <PageIntro
        eyebrow="COLORADO SPIRIT / NIGHT-CITY ENERGY"
        title="SAME SHEEP."
        accent="DIFFERENT WORLD."
      >
        <p>
          Altitude in the bones. Attitude in the eyes. A whole universe of
          personalities waiting behind the seal.
        </p>
      </PageIntro>
      <section
        className="editorial-section universe-manifesto"
        aria-labelledby="universe-dna"
      >
        <div>
          <p className="section-kicker">ONE UNDERLYING CHARACTER</p>
          <h2 id="universe-dna">
            BUILT
            <br />
            <span>DIFFERENT.</span>
          </h2>
          <p className="large-copy">
            Lateral ears. Heavy lids.
            <br />
            Sculpted wool. Unmistakable attitude.
          </p>
        </div>
        <div className="universe-notes">
          <article>
            <h3>The identity</h3>
            <p>
              A stylized lamb with a compact muzzle and strong silhouette. Room
              for masculine, feminine and neutral presentation.
            </p>
          </article>
          <article>
            <h3>The possibilities</h3>
            <p>
              Structural mutations, selective pixel corruption and environments
              are distinct parts of the creative direction. Final characters and
              traits are not exposed here.
            </p>
          </article>
          <article>
            <h3>The first encounter</h3>
            <p>
              Sealed first. A deliberate Ascent. A reveal still to come. The
              launch itself is part of the story.
            </p>
          </article>
          <TextLink href="/collection">Discover the sealed specimen</TextLink>
          <TextLink href="/ascent">Follow The 5,280 Ascent</TextLink>
        </div>
      </section>
    </div>
  );
}
