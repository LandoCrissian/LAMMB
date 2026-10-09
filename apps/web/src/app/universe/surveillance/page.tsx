import Image from 'next/image';
import { LabsShell } from '../../../components/labs-shell';
import { episodeCatalog } from '../../../config/labs';
import { socialMetadata } from '../../../config/social';
export const metadata = socialMetadata('universe', {
  path: '/universe/surveillance',
  title: 'Surveillance Room / LAMMB Labs',
  description:
    'The footage has questions. Explore the fictional LAMMB Labs surveillance room. Episodes are in development; no footage is released.',
});
export default function Surveillance() {
  return (
    <LabsShell
      title="THE FOOTAGE HAS QUESTIONS."
      eyebrow="03 / SURVEILLANCE ROOM"
      destination="surveillance"
    >
      <div className="labs-surveillance">
        <figure className="labs-monitor">
          <Image
            src="/art/labs-preview/surveillance.webp"
            alt="An empty fictional surveillance control room with dark monitors and amber light. Environmental illustration, not episode footage."
            width={1536}
            height={1024}
            sizes="(min-width: 1024px) 55vw, 92vw"
          />
          <figcaption>
            ENVIRONMENTAL ILLUSTRATION / NOT VIDEO FOOTAGE
          </figcaption>
        </figure>
        <section className="labs-paper" aria-label="Episode catalog">
          {episodeCatalog.map((episode) => (
            <article key={episode.id}>
              <p className="labs-kicker">{episode.id}</p>
              <h2>{episode.title}</h2>
              <p className="labs-development">IN DEVELOPMENT</p>
              <p>{episode.synopsis}</p>
              <p>
                No episode is available to watch. No release date has been
                announced.
              </p>
              <details>
                <summary>Read the production note</summary>
                <p>
                  A future externally produced episode will include captions, a
                  transcript and a poster. This catalog entry contains no video
                  or playable preview.
                </p>
              </details>
            </article>
          ))}
        </section>
      </div>
    </LabsShell>
  );
}
