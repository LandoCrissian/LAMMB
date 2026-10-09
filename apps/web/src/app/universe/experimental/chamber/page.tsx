import { Icon } from '../../../../components/icon';
import type { Metadata } from 'next';
import Link from 'next/link';
import { ContainmentChamber } from '../../../../components/containment-chamber';
import './chamber.css';
export const metadata: Metadata = {
  title: 'Containment Chamber — Experimental Prototype',
  description:
    'An isolated fictional LAMMB Labs prototype. Not a released game.',
  robots: { index: false, follow: false },
  icons: { icon: '/art/cinematic-preview/wordmark.webp' },
};
export default function ChamberPage() {
  return (
    <div className="chamber-page">
      <Link className="chamber-return" href="/universe/experimental">
        <Icon name="left" /> Return to the Experimental Wing
      </Link>
      <p className="chamber-kicker">LAMMB LABS / OWNER REVIEW PROTOTYPE</p>
      <h1>The containment chamber.</h1>
      <p className="chamber-intro">
        One room. Two terminals. A spectacularly inadequate risk department.
      </p>
      <ContainmentChamber />
    </div>
  );
}
