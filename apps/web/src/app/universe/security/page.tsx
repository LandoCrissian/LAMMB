import Link from 'next/link';
import { LabsShell } from '../../../components/labs-shell';
import { LabsTerminal } from '../../../components/labs-terminal';
export const metadata = { title: 'Security Terminal / LAMMB Labs' };
export default function Security() {
  return (
    <LabsShell
      title="SECURITY TERMINAL."
      eyebrow="01 / FICTIONAL SYSTEM STATUS"
      destination="security"
    >
      <div className="labs-two-column">
        <LabsTerminal />
        <aside className="labs-paper">
          <p className="labs-kicker">SECURITY ADVISORY</p>
          <h2>The threat is coming from inside the budget.</h2>
          <p>
            There is no clearance check. The secrets are embarrassing, not
            restricted.
          </p>
          <Link className="labs-action" href="/universe/archive">
            Open the experiment archive →
          </Link>
          <details>
            <summary>Inspect the coffee-ring memo</summary>
            <p>
              “Please stop labeling the coffee machine mission-critical. It
              outranks three department heads.” — an unsigned fictional
              facilities memo.
            </p>
          </details>
        </aside>
      </div>
    </LabsShell>
  );
}
