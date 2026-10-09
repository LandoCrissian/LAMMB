import { Icon } from '../../../components/icon';
import Link from 'next/link';
import { LabsShell } from '../../../components/labs-shell';
import { labFiles } from '../../../config/labs';
import { socialMetadata } from '../../../config/social';
export const metadata = socialMetadata('universe', {
  path: '/universe/archive',
  title: 'Experiment Archive / LAMMB Labs',
  description:
    'Four fictional research files. Eleven seconds of success and a paper trail of consequences. Explore the LAMMB Labs experiment archive.',
});
export default function Archive() {
  return (
    <LabsShell
      title="THE PAPER TRAIL."
      eyebrow="02 / EXPERIMENT ARCHIVE"
      destination="archive"
    >
      <p className="labs-deck">
        Four short records. One extremely expensive lesson.
      </p>
      <section className="labs-files" aria-label="Classified fictional files">
        {labFiles.map((file) => (
          <Link
            className="labs-file"
            key={file.id}
            href={`/universe/archive/${file.id}`}
          >
            <span className="labs-file-number">FILE {file.id}</span>
            <div>
              <p className="labs-kicker">{file.category}</p>
              <h2>{file.title}</h2>
              <p>{file.summary}</p>
            </div>
            <span className="labs-stamp">{file.stamp}</span>
            <span aria-hidden="true">
              <Icon />
            </span>
          </Link>
        ))}
      </section>
    </LabsShell>
  );
}
