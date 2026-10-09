import Link from 'next/link';
import { notFound } from 'next/navigation';
import { LabsShell } from '../../../../components/labs-shell';
import { LabsAnnex } from '../../../../components/labs-annex';
import { labFiles } from '../../../../config/labs';
import { socialMetadata } from '../../../../config/social';
export const dynamicParams = false;
export function generateStaticParams() {
  return labFiles.map(({ id }) => ({ file: id }));
}
export async function generateMetadata({
  params,
}: {
  params: Promise<{ file: string }>;
}) {
  const { file } = await params;
  const record = labFiles.find(({ id }) => id === file);
  if (!record) notFound();
  return socialMetadata('universe', {
    path: `/universe/archive/${record.id}`,
    title: `FILE ${record.id} — ${record.title} / LAMMB Labs`,
    description: record.summary,
  });
}
export default async function Dossier({
  params,
}: {
  params: Promise<{ file: string }>;
}) {
  const { file } = await params;
  const record = labFiles.find(({ id }) => id === file);
  if (!record) notFound();
  const index = labFiles.findIndex(({ id }) => id === file);
  const next = labFiles[index + 1];
  return (
    <LabsShell
      title={record.title.toUpperCase()}
      eyebrow={`FILE ${record.id} / ${record.category}`}
      destination="archive"
    >
      <article
        className="labs-dossier"
        aria-label={`FILE ${record.id} dossier`}
      >
        <div className="labs-dossier-top">
          <span className="labs-stamp">{record.stamp}</span>
          <Link href="/universe/archive">← All files</Link>
        </div>
        <p className="labs-narrative">{record.narrative}</p>
        {record.id === '002' && (
          <figure className="labs-signal">
            <svg
              viewBox="0 0 640 110"
              role="img"
              aria-labelledby="signal-title signal-description"
            >
              <title id="signal-title">Fictional signal corruption study</title>
              <desc id="signal-description">
                An illustrative line breaks into scattered square pixels. This
                is a technical drawing, not live telemetry or specimen artwork.
              </desc>
              <path
                d="M10 55h90l20-25 20 50 20-25h80l20-18 20 36 20-18h80"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              />
              <g fill="currentColor">
                <path d="M408 49h14v14h-14zM434 30h12v12h-12zM455 59h16v16h-16zM484 40h10v10h-10zM515 70h8v8h-8zM543 24h14v14h-14zM574 55h9v9h-9zM608 38h6v6h-6z" />
              </g>
            </svg>
            <figcaption>ILLUSTRATIVE SIGNAL / NOT LIVE TELEMETRY</figcaption>
          </figure>
        )}
        <section
          className="labs-evidence"
          aria-label="Expandable fictional incident reports"
        >
          {record.incidents.map((incident) => (
            <details key={incident.id}>
              <summary>
                <span>{incident.id}</span> {incident.title}
              </summary>
              <p>{incident.body}</p>
            </details>
          ))}
        </section>
        <div className="labs-dossier-bottom">
          <LabsAnnex fileId={record.id} text={record.annex} />
          <nav aria-label="File sequence">
            {index > 0 && (
              <Link href={`/universe/archive/${labFiles[index - 1]!.id}`}>
                ← Previous file
              </Link>
            )}
            {next ? (
              <Link href={`/universe/archive/${next.id}`}>
                Next / FILE {next.id} →
              </Link>
            ) : (
              <Link href="/vault">Return to the Vault →</Link>
            )}
          </nav>
        </div>
      </article>
    </LabsShell>
  );
}
