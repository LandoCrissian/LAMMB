import { ascentMilestones } from '@lammb/collection/launch';
import { createLaunchPresentation } from '@lammb/collection/presentation';
import { PageIntro, TextLink } from '../../components/site-primitives';
import { LaunchStatus } from '../../components/launch-status';
import { currentLaunchSnapshot } from '../../config/launch';
import { supplyLabel } from '../../config/site';
export const metadata = {
  title: 'The 5,280 Ascent',
  description:
    'At the base. Halfway. One foot left. The deliberate LAMMB launch experience.',
};
const milestoneCopy = {
  GROUND: {
    title: 'AT THE BASE',
    detail: 'The initial experience. Meet the character and the collection.',
  },
  HALFWAY: {
    title: 'HALFWAY',
    detail: 'The halfway milestone in the ascent narrative.',
  },
  ONE_FOOT_LEFT: {
    title: 'ONE FOOT LEFT',
    detail:
      'An intentional final pause. The last foot requires a deliberate launch decision.',
  },
  LAUNCH: {
    title: 'MINT-LAUNCH ALTITUDE',
    detail:
      'The intended mint altitude. This milestone is not a claim that minting is available.',
  },
} as const;
export default function Ascent() {
  return (
    <>
      <PageIntro
        eyebrow="THE LAUNCH EXPERIENCE"
        title={`THE ${supplyLabel}`}
        accent="ASCENT."
      >
        <p>
          The launch is part of LAMMB. A deliberate climb, a sealed specimen, a
          blackout, and a reveal.
        </p>
      </PageIntro>
      <section
        className="editorial-section"
        aria-labelledby="milestones-heading"
      >
        <p className="section-kicker">
          STATIC CANONICAL / NARRATIVE MILESTONES
        </p>
        <h2 id="milestones-heading">
          EVERY FOOT
          <br />
          <span>MEANS SOMETHING.</span>
        </h2>
        <ol className="ascent-timeline">
          {ascentMilestones.value.map((milestone) => (
            <li key={milestone.id}>
              <span className="timeline-altitude">
                {milestone.altitudeFt.toLocaleString('en-US')}
                <small>FT</small>
              </span>
              <div>
                <h3>{milestoneCopy[milestone.id].title}</h3>
                <p>{milestoneCopy[milestone.id].detail}</p>
              </div>
            </li>
          ))}
        </ol>
        <p className="body-copy">
          Altitude is deliberate authorized launch data. Likes, followers,
          retweets, referrals and quests do not move it. No countdown or
          automatic transition is running.
        </p>
        <TextLink href="/development/launch">
          Review all seven development presentations
        </TextLink>
      </section>
      <LaunchStatus
        presentation={createLaunchPresentation(currentLaunchSnapshot)}
      />
      <section
        className="editorial-section final-callout"
        aria-labelledby="seal-heading"
      >
        <p className="section-kicker">
          SPECIMEN / RECOVERY / BLACKOUT / REVEAL
        </p>
        <h2 id="seal-heading">
          BREAK
          <br />
          <span>THE SEAL.</span>
        </h2>
        <p className="body-copy">
          Specimen recovery is followed by a deliberately authorized blackout
          and reveal. Completion conditions, timing and transition authority
          remain unresolved. No sellout is assumed.
        </p>
        <TextLink href="/faq">Understand the reveal experience</TextLink>
      </section>
    </>
  );
}
