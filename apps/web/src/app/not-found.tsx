import { PageIntro, TextLink } from '../components/site-primitives';
export default function NotFound() {
  return (
    <PageIntro
      eyebrow="404 / NO SIGNAL HERE"
      title="OFF THE MAP."
      accent="BACK TO THE FLOCK."
    >
      <p>This page could not be found.</p>
      <TextLink href="/">Return to LAMMB</TextLink>
    </PageIntro>
  );
}
