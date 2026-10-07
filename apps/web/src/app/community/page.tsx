import {
  PageIntro,
  EditorialCard,
  TextLink,
} from '../../components/site-primitives';
export const metadata = {
  title: 'Community',
  description:
    'Same sheep. Different mindset. Find your place in the LAMMB flock.',
};
export default function Community() {
  return (
    <>
      <PageIntro
        eyebrow="THE FLOCK"
        title="DIFFERENT MINDS."
        accent="HIGHER TOGETHER."
      >
        <p>
          Different personalities, one shared character. The community is part
          of what makes LAMMB feel like LAMMB.
        </p>
      </PageIntro>
      <section
        className="editorial-section"
        aria-labelledby="community-heading"
      >
        <div className="section-heading-row">
          <h2 id="community-heading">
            FIND YOUR
            <br />
            <span>PLACE.</span>
          </h2>
          <p className="body-copy">
            Official community destinations will be added after verification. No
            unofficial social or partner links are listed here.
          </p>
        </div>
        <div className="editorial-grid">
          <EditorialCard
            number="01"
            title="The global flock"
            href="/world"
            link="LAMMB World information"
          >
            A planned country-level collector view, with optional participation
            and privacy controls.
          </EditorialCard>
          <EditorialCard
            number="02"
            title="Your collection"
            href="/profile"
            link="Collector profile information"
          >
            A planned home for your specimens. Wallet-linked galleries and
            optional X identity remain unavailable.
          </EditorialCard>
          <EditorialCard
            number="03"
            title="The launch"
            href="/ascent"
            link="Explore the Ascent"
          >
            Follow the intended experience, from the first foot to the first
            sealed specimen.
          </EditorialCard>
        </div>
      </section>
      <section
        className="editorial-section final-callout"
        aria-labelledby="access-heading"
      >
        <p className="section-kicker">ACCESS / PARTNER GTD</p>
        <h2 id="access-heading">
          ONE FLOCK.
          <br />
          <span>FAIR BOUNDARIES.</span>
        </h2>
        <p className="body-copy">
          The access vocabulary is PARTNER_GTD, ALLOWLIST and PUBLIC. Partner
          GTD is one consolidated group. No production partners, eligibility
          checks or allocations are announced here.
        </p>
        <TextLink href="/faq">Read the collection FAQ</TextLink>
      </section>
    </>
  );
}
