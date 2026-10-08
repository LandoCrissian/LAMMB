import type { ReactNode } from 'react';
import { futureExperiences } from '../config/site';
import { ArtSlot, PageIntro, TextLink } from './site-primitives';
import { SealedSpecimen } from './sealed-specimen';
export function FutureExperience({
  kind,
  children,
}: {
  kind: keyof typeof futureExperiences;
  children: ReactNode;
}) {
  const experience = futureExperiences[kind];
  return (
    <>
      <PageIntro
        eyebrow={experience.eyebrow}
        title={
          kind === 'world'
            ? 'SAME WORLD.'
            : kind === 'profile'
              ? 'YOUR LAMMB.'
              : 'FIRST, SEALED.'
        }
        accent={
          kind === 'world'
            ? 'GLOBAL FLOCK.'
            : kind === 'profile'
              ? 'YOUR MINDSET.'
              : 'THEN, REVEALED.'
        }
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
        {kind === 'world' ? (
          <figure className="world-study">
            <div className="world-orb" aria-hidden="true">
              <i />
              <i />
              <i />
              <span>W</span>
            </div>
            <figcaption>
              <strong>WORLD VIEW / VISUAL PLACEHOLDER</strong>
              <span>
                No country registry or collector counts are available.
              </span>
            </figcaption>
          </figure>
        ) : kind === 'mint' ? (
          <SealedSpecimen />
        ) : (
          <ArtSlot
            label={
              kind === 'profile'
                ? 'Collector gallery artwork slot'
                : 'Sealed specimen artwork slot'
            }
            code="FUTURE / FOUNDATION"
          />
        )}
      </section>
    </>
  );
}
