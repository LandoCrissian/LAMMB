import Link from 'next/link';
import { LabsShell } from '../../components/labs-shell';
import { facilityDestinations } from '../../config/labs';
export const metadata = {
  title: 'LAMMB Labs — The Classified Universe',
  description:
    'Eleven seconds of success. An entire facility of consequences. Enter the fictional LAMMB Labs archive.',
};
export default function Universe() {
  return (
    <LabsShell
      title="CLASSIFIED. BADLY."
      eyebrow="THE UNIVERSE / FICTION"
      overview
    >
      <div className="labs-introduction">
        <p>We engineered perfect financial judgment.</p>
        <p className="labs-punchline">It lasted eleven seconds.</p>
      </div>
      <section
        className="labs-directory"
        aria-label="Choose a facility destination"
      >
        {facilityDestinations.map((item) => (
          <Link
            key={item.id}
            href={item.href}
            className={`labs-destination labs-destination-${item.id}`}
          >
            <span className="labs-room-code" aria-hidden="true">
              {item.code}
            </span>
            <div>
              <p className="labs-kicker">{item.status}</p>
              <h2>{item.label}</h2>
              <p>{item.description}</p>
            </div>
            <span className="labs-room-arrow" aria-hidden="true">
              ↗
            </span>
          </Link>
        ))}
      </section>
      <div className="labs-overview-foot">
        <span>5280 SEALED / ZERO USEFUL QUALIFICATIONS</span>
        <Link href="/universe/archive/000">Start with FILE 000 →</Link>
      </div>
    </LabsShell>
  );
}
