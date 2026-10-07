import Link from 'next/link';
import { launchStateSchema } from '@lammb/schema/launch';
import {
  createLaunchPresentation,
  launchStateLabels,
} from '@lammb/collection/presentation';
import { LaunchStatus } from '../../../components/launch-status';
import { developmentLaunchSnapshots } from '../../../config/development-launch';

export const metadata = {
  title: 'Launch studies / LAMMB',
  robots: { index: false, follow: false },
};

export default function LaunchStudies() {
  return (
    <>
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <header className="site-header">
        <Link className="wordmark" href="/" aria-label="LAMMB home">
          LAMMB<span aria-hidden="true">_</span>
        </Link>
        <Link className="study-home" href="/">
          Back to the base <span aria-hidden="true">↗</span>
        </Link>
      </header>
      <p className="mode-banner">
        DEVELOPMENT / NOT LIVE{' '}
        <span>Static presentation studies / no state controls</span>
      </p>
      <main id="main" tabIndex={-1}>
        <section className="study-intro" aria-labelledby="study-heading">
          <p className="section-kicker">The 5,280 Ascent / review foundation</p>
          <h1 id="study-heading">
            FROM THE BASE.
            <br />
            <span>TO THE SEAL.</span>
          </h1>
          <p>
            Seven global launch presentations. Example altitude and history are
            development fixtures. Recovery supply is unavailable. No view
            verifies ownership, enables minting or changes launch state.
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
      </main>
      <footer className="site-footer">
        <Link href="/">Return to LAMMB</Link>
        <span>Higher together.</span>
        <span>lammb.fun</span>
      </footer>
    </>
  );
}
