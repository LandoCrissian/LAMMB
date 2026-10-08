import { PageIntro, ArtSlot, TextLink } from '../../components/site-primitives';
export const metadata = {
  title: 'The Universe',
  description:
    'One species. Different personalities. Explore the visual direction of LAMMB.',
};
export default function Universe() {
  return (
    <>
      <PageIntro
        eyebrow="THE WORLD OF LAMMB"
        title="ONE SPECIES."
        accent="INFINITE PERSONALITIES."
      >
        <p>
          Born from a shared silhouette. Defined by different mindsets. LAMMB
          carries the same character DNA from one encounter to the next.
        </p>
      </PageIntro>
      <section className="editorial-section" aria-labelledby="universe-dna">
        <div className="split-copy">
          <h2 id="universe-dna">
            ATTITUDE
            <br />
            <span>BY NATURE.</span>
          </h2>
          <div>
            <p className="large-copy">
              Lateral ears. Low-set lids.
              <br />
              Heavy wool. A compact muzzle.
            </p>
            <p className="body-copy">
              The underlying lamb character comes first. Presentation,
              structural mutations, pixel corruption and environments have
              different roles in the art direction. They are not interchangeable
              accessories.
            </p>
            <p className="body-copy">
              The finished art is still being developed. These abstract slots
              preserve room for approved artwork without inventing collection
              characters.
            </p>
            <TextLink href="/collection">
              Discover the collection foundation
            </TextLink>
          </div>
        </div>
        <div className="art-grid">
          <ArtSlot
            label="Character identity slot"
            variant="wool"
            code="IDENTITY / 01"
          />
          <ArtSlot
            label="Pixel language slot"
            variant="signal"
            code="SYSTEM / 02"
          />
          <ArtSlot
            label="Environment composition slot"
            variant="environment"
            code="SCENE / 03"
          />
        </div>
      </section>
      <section
        className="editorial-section final-callout"
        aria-labelledby="universe-altitude"
      >
        <p className="section-kicker">COLORADO / HIGHER TOGETHER</p>
        <h2 id="universe-altitude">
          A HIGHER
          <br />
          <span>PERSPECTIVE.</span>
        </h2>
        <p className="body-copy">
          Night. Mountain silhouettes. Radioactive chartreuse. A restrained
          visual language shaped by the 5,280 altitude narrative.
        </p>
        <TextLink href="/ascent">Enter The 5,280 Ascent</TextLink>
      </section>
    </>
  );
}
