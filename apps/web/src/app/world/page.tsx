import { FutureExperience } from '../../components/future-experience';
export const metadata = {
  title: 'LAMMB World',
  description:
    'A planned, optional country-level collector registration and global flock experience.',
};
export default function World() {
  return (
    <FutureExperience kind="world">
      <p className="body-copy">
        The idea: select a country, choose eligible LAMMBs you own, and help
        illuminate the global flock. Nothing is registered on this page.
      </p>
      <ul className="editorial-list">
        <li>
          Country-level participation is optional. No precise location or
          automatic geolocation.
        </li>
        <li>
          Ownership verification and transfer-aware registrations are required
          before this can launch.
        </li>
        <li>
          Public visibility, withdrawal and low-count privacy protections remain
          to be reviewed.
        </li>
      </ul>
      <p className="body-copy">
        Country selection does not verify residence. Registration totals will
        require authoritative data, and must never represent fixtures as live
        activity.
      </p>
    </FutureExperience>
  );
}
