import Link from 'next/link';
import { notFound } from 'next/navigation';
import { LabsShell } from '../../../../components/labs-shell';
import { LabsAnnex } from '../../../../components/labs-annex';
import { labFiles } from '../../../../config/labs';
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
  return {
    title: record
      ? `FILE ${record.id} — ${record.title} / LAMMB Labs`
      : 'Record unavailable',
  };
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
