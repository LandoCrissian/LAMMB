import { Icon } from './icon';
import { ChamberEntryArt } from './chamber-entry-art';
export function ChamberGuide({ cinematic = false }: { cinematic?: boolean }) {
  return (
    <div
      className={`chamber-quick-guide${cinematic ? ' chamber-cinematic-panel' : ''}`}
    >
      {cinematic && <ChamberEntryArt scene="quick-orientation" />}
      <div className="chamber-panel-content">
        <p className="chamber-kicker">QUICK ORIENTATION</p>
        <h3>Three ways to get your bearings.</h3>
        <ol>
          <li>
            <Icon name="move" />
            <span>
              <strong>Move + look</strong>Touch: left thumb moves; drag the room
              with your right thumb. Desktop: WASD + mouse drag or arrow keys.
            </span>
          </li>
          <li>
            <Icon />
            <span>
              <strong>Choose your view</strong>Switch First / Third person any
              time. Approach a terminal or specimen, then tap its action or
              press E.
            </span>
          </li>
          <li>
            <Icon name="close" />
            <span>
              <strong>Take your time</strong>Pause / Resume and Exit stay on
              screen. Escape pauses. Reopen this guide under Controls.
            </span>
          </li>
        </ol>
        <p className="chamber-guide-orientation">
          On mobile, landscape gives both thumbs room. Portrait works too;
          rotation is always optional.
        </p>
      </div>
    </div>
  );
}
