import type { LaunchVisual as LaunchVisualModel } from '@lammb/collection/presentation';
import { displayCopy } from '../config/site';

function DataMeter({
  percent,
  label,
}: {
  percent: number | null;
  label: string;
}) {
  return percent === null ? (
    <div className="data-meter unavailable-meter" aria-hidden="true" />
  ) : (
    <div
      className="data-meter"
      role="meter"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={percent}
      aria-valuetext={label}
    >
      <span style={{ width: `${percent}%` }} />
    </div>
  );
}

export function LaunchVisual({ visual }: { visual: LaunchVisualModel }) {
  switch (visual.kind) {
    case 'altitude':
      return (
        <div className="altitude-display">
          <p className="data-label">{visual.dataLabel}</p>
          <p className="large-value">{displayCopy(visual.valueLabel)}</p>
          <DataMeter
            percent={visual.percent}
            label={displayCopy(visual.valueLabel)}
          />
          <p className="next-milestone">
            Next milestone / {displayCopy(visual.nextMilestoneLabel)}
          </p>
          <ol
            className="milestone-list"
            aria-label="Canonical altitude milestones and history"
          >
            {visual.milestones.map((milestone) => (
              <li key={milestone.id} data-reached={milestone.reached}>
                <strong>{displayCopy(milestone.altitudeLabel)}</strong>
                <span>{milestone.label}</span>
                <small>{milestone.historyLabel}</small>
              </li>
            ))}
          </ol>
          <p className="visual-caption">
            Milestones / static canonical. History / source labeled above.
          </p>
        </div>
      );
    case 'recovery':
      return (
        <div className="recovery-display">
          <p className="data-label">{visual.dataLabel}</p>
          <p className="large-value">{displayCopy(visual.valueLabel)}</p>
          <DataMeter
            percent={visual.percent}
            label={`Specimens recovered: ${displayCopy(visual.valueLabel)}`}
          />
          <p className="visual-caption">
            Sealed specimens / supply is static canonical
          </p>
          <ul
            className="recovery-markers"
            aria-label="Narrative recovery milestones, static canonical"
          >
            {visual.milestones.map((milestone) => (
              <li key={milestone}>{displayCopy(milestone)}</li>
            ))}
          </ul>
          <p className="visual-caption">
            Narrative markers only / no automatic transitions
          </p>
        </div>
      );
    case 'specimen':
      return (
        <div className="specimen-display">
          {visual.altitudeLabel ? (
            <p className="large-value">{displayCopy(visual.altitudeLabel)}</p>
          ) : null}
          <div className="specimen-study">
            <div className="seal-mark" aria-hidden="true">
              <span />
              <span />
              <span />
              <span />
            </div>
            <p>{visual.sealLabel}</p>
            <span className="specimen-rule" aria-hidden="true" />
          </div>
          <p className="visual-caption">{visual.caption}</p>
        </div>
      );
    case 'gallery':
      return (
        <div>
          <div
            className="gallery-foundation"
            aria-label="Replaceable collection layout studies"
          >
            {['A', 'B', 'C'].map((label) => (
              <div className="gallery-study" key={label}>
                <span aria-hidden="true" className="gallery-pixel" />
                <p>STUDY {label}</p>
                <small>ART PENDING</small>
              </div>
            ))}
          </div>
          <p className="visual-caption">{visual.caption}</p>
        </div>
      );
  }
}
