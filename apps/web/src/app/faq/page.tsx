import { PageIntro, TextLink } from '../../components/site-primitives';
import { questions } from '../../config/site';
import { socialMetadata } from '../../config/social';
export const metadata = socialMetadata('home', {
  path: '/faq',
  title: 'FAQ / LAMMB',
  description:
    'LAMMB collection, mint, chain, Ascent and delayed-reveal questions.',
});
export default function FAQ() {
  return (
    <>
      <PageIntro
        eyebrow="THE DETAILS"
        title="GOOD QUESTIONS."
        accent="CLEAR ANSWERS."
      >
        <p>
          The collection facts, the launch experience, and what is still being
          developed.
        </p>
      </PageIntro>
      <section
        className="editorial-section faq-section"
        aria-label="Frequently asked questions"
      >
        {questions.map((item, index) => (
          <details key={item.question} className="faq-item">
            <summary>
              <span className="faq-index" aria-hidden="true">
                {String(index + 1).padStart(2, '0')}
              </span>
              <span>{item.question}</span>
              <span className="faq-plus" aria-hidden="true">
                +
              </span>
            </summary>
            <p>{item.answer}</p>
          </details>
        ))}
        <TextLink href="/ascent">Explore The 5280 Ascent</TextLink>
      </section>
    </>
  );
}
