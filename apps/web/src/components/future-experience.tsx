import type { ReactNode } from 'react';
import { futureExperiences } from '../config/site';
import { ArtSlot, PageIntro, TextLink } from './site-primitives';
import { SealedSpecimen } from './sealed-specimen';
export function FutureExperience({
  kind,
  children,
}: {
  kind: 'profile' | 'mint';
  children: ReactNode;
}) {
  const experience = futureExperiences[kind];
  return (
    <>
      <PageIntro
        eyebrow={experience.eyebrow}
        title={kind === 'profile' ? 'YOUR LAMMB.' : 'FIRST, SEALED.'}
        accent={kind === 'profile' ? 'YOUR MINDSET.' : 'THEN, REVEALED.'}
      >
        <p>{experience.detail}</p>
        <p className="availability-label">{experience.status}</p>
      </PageIntro>
      <section
        className="editorial-section future-layout"
        aria-labelledby="future-heading"
      >
        <div>
          <p className="section-kicker">{experience.eyebrow}</p>
          <h2 id="future-heading">{experience.title}</h2>
          {children}
          <TextLink href="/faq">Read the FAQ</TextLink>
        </div>
        {kind === 'mint' ? (
          <SealedSpecimen />
        ) : (
          <ArtSlot
            label="Your collection, after reveal"
            code="FUTURE / COLLECTOR PROFILE"
          />
        )}
      </section>
    </>
  );
}
