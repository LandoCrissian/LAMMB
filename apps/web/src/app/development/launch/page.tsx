import Link from 'next/link';
import { launchStateSchema } from '@lammb/schema/launch';
import {
  createLaunchPresentation,
  launchStateLabels,
} from '@lammb/collection/presentation';
import { LaunchStatus } from '../../../components/launch-status';
import { developmentLaunchSnapshots } from '../../../config/development-launch';

export const metadata = {
  title: 'Launch studies',
  robots: { index: false, follow: false },
};

export default function LaunchStudies() {
  return (
    <>
      <p className="mode-banner">
        DEVELOPMENT / NOT LIVE{' '}
        <span>Static presentation studies / no state controls</span>
      </p>
      <section className="study-intro" aria-labelledby="study-heading">
        <p className="section-kicker">The 5,280 Ascent / review foundation</p>
        <h1 id="study-heading">
          FROM THE BASE.
          <br />
          <span>TO THE SEAL.</span>
        </h1>
        <p>
          Seven global launch presentations. Example altitude and history are
          development fixtures. Recovery supply is unavailable. No view verifies
          ownership, enables minting or changes launch state.
        </p>
        <nav className="lifecycle-nav" aria-label="Static launch studies">
          {launchStateSchema.options.map((state, index) => (
            <a key={state} href={`#${state}`}>
              <span aria-hidden="true">0{index + 1}</span>
              {launchStateLabels[state]}
            </a>
          ))}
        </nav>
      </section>
      {launchStateSchema.options.map((state) => (
        <LaunchStatus
          key={state}
          id={state}
          presentation={createLaunchPresentation(
            developmentLaunchSnapshots[state],
          )}
        />
      ))}
      <div className="study-intro">
        <Link className="text-link" href="/">
          Return to the base ↗
        </Link>
      </div>
    </>
  );
}
