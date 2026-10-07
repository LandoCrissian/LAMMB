import type { LaunchPresentation } from '@lammb/collection/presentation';
import { LaunchVisual } from './launch-visual';

export function LaunchStatus({
  presentation,
  id = 'launch',
}: {
  presentation: LaunchPresentation;
  id?: string;
}) {
  return (
    <section
      className="launch-panel"
      id={id}
      data-state={presentation.state}
      aria-labelledby={`${id}-heading`}
    >
      <div className="launch-panel-heading">
        <p className="section-kicker">Launch study / {presentation.label}</p>
        <p className="authority-badge">{presentation.authorityLabel}</p>
      </div>
      <div className="launch-layout">
        <div className="launch-copy">
          <h2 id={`${id}-heading`}>{presentation.title}</h2>
          <p>{presentation.detail}</p>
          <p className="collector-label">{presentation.collectorLabel}</p>
          <p className="ownership-note">
            Unowned presentation / no ownership verified
          </p>
        </div>
        <LaunchVisual visual={presentation.visual} />
      </div>
      {presentation.collectorStudies.length > 0 ? (
        <ul
          className="collector-studies"
          aria-label="Static collector reveal presentations / development only"
        >
          {presentation.collectorStudies.map((study) => (
            <li key={study.state}>
              <strong>{study.label}</strong>
              <p>{study.detail}</p>
            </li>
          ))}
        </ul>
      ) : null}
      <dl className="boundary-list">
        {presentation.boundaries.map((boundary) => (
          <div key={boundary.label}>
            <dt>{boundary.label}</dt>
            <dd>{boundary.detail}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
