import Link from 'next/link';
import Image from 'next/image';
import { Icon } from '../../components/icon';
import { LabsShell } from '../../components/labs-shell';
import { facilityDestinations } from '../../config/labs';
import { labsDestinationArt } from '../../config/labs-art';
import { socialMetadata } from '../../config/social';
export const metadata = socialMetadata('universe');
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
            aria-labelledby={`destination-${item.id}-title destination-${item.id}-status`}
          >
            <span className="labs-destination-scene" aria-hidden="true">
              <Image
                src={labsDestinationArt[item.id].path}
                alt=""
                fill
                sizes="(min-width: 1600px) 720px, (min-width: 768px) 46vw, 92vw"
                style={{ objectPosition: labsDestinationArt[item.id].position }}
              />
            </span>
            <span className="labs-room-code" aria-hidden="true">
              {item.code}
            </span>
            <div>
              <p className="labs-kicker" id={`destination-${item.id}-status`}>
                {item.status}
              </p>
              <h2 id={`destination-${item.id}-title`}>{item.label}</h2>
              <p>{item.description}</p>
            </div>
            <span className="labs-room-arrow" aria-hidden="true">
              <Icon />
            </span>
          </Link>
        ))}
      </section>
      <div className="labs-overview-foot">
        <span>5280 SEALED / ZERO USEFUL QUALIFICATIONS</span>
        <Link href="/universe/archive/000">
          Start with FILE 000 <Icon name="right" />
        </Link>
      </div>
    </LabsShell>
  );
}
