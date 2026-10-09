import Link from 'next/link';
import { LabsShell } from '../../../components/labs-shell';
import { socialMetadata } from '../../../config/social';
export const metadata = socialMetadata('universe', {
  path: '/universe/experimental',
  title: 'Experimental Wing / LAMMB Labs',
  description:
    'A future game. Present liability. Explore the fictional LAMMB Labs experimental wing and its isolated containment chamber prototype.',
});
export default function Experimental() {
  return (
    <LabsShell
      title="PLEASE DO NOT FEED THE PROTOTYPE."
      eyebrow="04 / EXPERIMENTAL WING"
      destination="experimental"
    >
      <div className="labs-two-column">
        <figure className="labs-blueprint">
          <svg
            viewBox="0 0 600 360"
            role="img"
            aria-labelledby="blueprint-title blueprint-description"
          >
            <title id="blueprint-title">
              Fictional containment planning diagram
            </title>
            <desc id="blueprint-description">
              Three empty chambers linked to an observation station. A
              decorative design schematic, not a playable game or specimen
              geometry.
            </desc>
            <g fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M70 60h120v100H70zM240 60h120v100H240zM410 60h120v100H410zM120 260h360v50H120zM130 160v50h340v-50M300 160v100" />
              <circle cx="130" cy="110" r="25" />
              <circle cx="300" cy="110" r="25" />
              <circle cx="470" cy="110" r="25" />
              <path
                d="M10 30h580M10 340h580M30 10v340M570 10v340"
                strokeDasharray="3 7"
              />
            </g>
          </svg>
          <figcaption>
            FICTIONAL DESIGN SCHEMATIC / NO SPECIMEN GEOMETRY
          </figcaption>
        </figure>
        <section className="labs-paper">
          <p className="labs-development">FUTURE GAME / NOT PLAYABLE</p>
          <h2>The prototype has escaped the planning meeting.</h2>
          <p>
            A future interactive game belongs in this wing. Today, the door
            opens onto a design schematic and a deeply inadequate safety budget.
          </p>
          <details>
            <summary>Read the game boundary memo</summary>
            <p>
              No game is implemented here. Future development must define
              controls, accessibility and an honest playable scope before
              release. No multiplayer, wallet rewards, token mechanics or
              external game engine is connected.
            </p>
          </details>
          <Link className="labs-action" href="/universe/archive/002">
            Investigate the corruption →
          </Link>
        </section>
      </div>
    </LabsShell>
  );
}
