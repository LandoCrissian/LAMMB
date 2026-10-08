import { FutureExperience } from '../../components/future-experience';
export const metadata = {
  title: 'Collector Profile',
  description:
    'Future specimen galleries, optional X identity and collector privacy controls.',
};
export default function Profile() {
  return (
    <FutureExperience kind="profile">
      <p className="body-copy">
        A future wallet-linked specimen gallery, with optional X identity. No
        wallet is connected, and no ownership is claimed here.
      </p>
      <ul className="editorial-list">
        <li>
          Identity linking is optional, with separate consent and disconnect
          controls.
        </li>
        <li>Sealed specimens must keep unrevealed traits private.</li>
        <li>
          Public profile visibility and share cards require explicit collector
          choices.
        </li>
      </ul>
      <p className="body-copy">
        Authentication, ownership verification and privacy controls must be
        approved before profiles become available.
      </p>
    </FutureExperience>
  );
}
