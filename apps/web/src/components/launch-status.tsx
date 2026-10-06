import type { LaunchState } from '@lammb/schema/launch';

export const launchPresentation = {
  PRE_ASCENT: {
    label: 'Pre-ascent',
    title: 'At the base.',
    detail: 'The ascent begins here. Mint is not open.',
  },
  ASCENT: {
    label: 'Ascent',
    title: 'The ascent.',
    detail: 'Launch progression is being prepared. Mint is not open.',
  },
  MINT: {
    label: 'Mint',
    title: 'Mint phase.',
    detail: 'Mint integration is not connected in this foundation.',
  },
  RECOVERY: {
    label: 'Recovery',
    title: 'Sealed specimens.',
    detail: 'Specimen recovery mechanics are not finalized.',
  },
  BLACKOUT: {
    label: 'Blackout',
    title: 'Blackout.',
    detail: 'Reveal integration is not connected in this foundation.',
  },
  REVEAL: {
    label: 'Reveal',
    title: 'Break the Seal.',
    detail: 'Reveal mechanics are not finalized.',
  },
  REVEALED: {
    label: 'Revealed',
    title: 'The collection.',
    detail:
      'Collector artwork and sharing are not connected in this foundation.',
  },
} satisfies Record<
  LaunchState,
  { label: string; title: string; detail: string }
>;

export function LaunchStatus({ state }: { state: LaunchState }) {
  const presentation = launchPresentation[state];

  return (
    <section
      className="launch-panel"
      id="launch"
      aria-labelledby="launch-heading"
    >
      <div className="section-kicker">
        <span className="status-dot" aria-hidden="true" />
        Launch status / {presentation.label}
      </div>
      <h2 id="launch-heading">{presentation.title}</h2>
      <p>{presentation.detail}</p>
    </section>
  );
}
