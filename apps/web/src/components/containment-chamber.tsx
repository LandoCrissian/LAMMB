'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  experiment,
  type ExperimentPhase,
  type Destination,
} from '../lib/chamber-model';
import type { ChamberScene, ChamberSnapshot } from '../lib/chamber-scene';
import { PointerOwner } from '../lib/chamber-input';
import { ChamberOverlay } from './chamber-overlay';
export function ContainmentChamber() {
  const [entered, setEntered] = useState(false);
  const [perspective, setPerspective] = useState<'first' | 'third'>('first');
  const [overlay, setOverlay] = useState<'specimen' | 'world' | null>(null);
  const [portrait, setPortrait] = useState(false);
  const [portraitBypass, setPortraitBypass] = useState(false);
  const movement = useRef(new PointerOwner());
  const overlayTrigger = useRef<HTMLElement | null>(null);
  const restorePending = useRef(false);
  const pad = useRef<HTMLButtonElement>(null);
  const portraitContinue = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    const media = matchMedia('(pointer: coarse) and (orientation: portrait)');
    const update = () => {
      setPortrait(media.matches);
      movement.current.clear();
      scene.current?.clearInput();
    };
    update();
    media.addEventListener('change', update);
    const clear = () => {
      movement.current.clear();
      scene.current?.clearInput();
    };
    window.addEventListener('resize', clear);
    return () => {
      media.removeEventListener('change', update);
      window.removeEventListener('resize', clear);
    };
  }, []);
  const [ready, setReady] = useState(false);
  const [paused, setPaused] = useState(false);
  const [lost, setLost] = useState(false);
  const [failure, setFailure] = useState('');
  const [phase, setPhase] = useState<ExperimentPhase>('READY');
  const [snapshot, setSnapshot] = useState<ChamberSnapshot | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const entry = useRef<HTMLButtonElement>(null);
  const scene = useRef<ChamberScene | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const interact = useRef<(destination: Destination) => void>(() => {});
  const resetExperiment = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    setPhase('READY');
  }, []);
  const activate = useCallback(() => {
    if (phase === 'RUNNING') return;
    setPhase('RUNNING');
    timer.current = setTimeout(() => {
      setPhase('COMPLETE');
      timer.current = null;
    }, 1400);
  }, [phase]);
  useEffect(() => {
    interact.current = (destination) => {
      if (destination === 'research') activate();
      else if (destination) openOverlay(destination);
    };
  });
  useEffect(() => {
    if (ready)
      scene.current?.setPaused(
        paused || Boolean(overlay === 'world') || (portrait && !portraitBypass),
      );
  }, [ready, paused, overlay, portrait, portraitBypass]);
  useEffect(() => {
    if (overlay || !restorePending.current) return;
    restorePending.current = false;
    if (portrait && !portraitBypass && portraitContinue.current) {
      portraitContinue.current.focus();
      return;
    }
    const target = overlayTrigger.current;
    if (target?.isConnected && !target.matches(':disabled')) target.focus();
    else canvas.current?.focus();
  }, [overlay, portrait, portraitBypass]);
  useEffect(() => {
    if (ready && portrait && !portraitBypass) portraitContinue.current?.focus();
  }, [ready, portrait, portraitBypass]);
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );
  useEffect(() => {
    scene.current?.setAlarm(phase === 'COMPLETE');
  }, [phase]);
  useEffect(() => {
    if (!entered || !canvas.current) return;
    const surface = canvas.current;
    const startedAt = performance.now();
    let cancelled = false;
    let owned: ChamberScene | null = null;
    void import('../lib/chamber-scene')
      .then(async ({ ChamberScene }) => {
        if (cancelled) return;
        owned = new ChamberScene(surface, {
          ready: () => {
            if (!cancelled) {
              setReady(true);
              surface.focus();
            }
          },
          snapshot: (value) => {
            if (!cancelled) setSnapshot(value);
          },
          pause: () => {
            if (!cancelled) pause();
          },
          interact: (destination) => interact.current(destination),
          context: (value) => {
            if (!cancelled) {
              setLost(value);
              setOverlay(null);
              setPaused(true);
            }
          },
          error: () => {
            if (!cancelled) {
              setFailure(
                'Rendering stopped safely. Use the text terminal or exit and re-enter.',
              );
              setPaused(true);
            }
          },
        });
        scene.current = owned;
        owned.setAlarm(phase === 'COMPLETE');
        await owned.start(startedAt);
      })
      .catch((error) => {
        if (!cancelled)
          setFailure(
            error instanceof Error
              ? error.message
              : '3D unavailable. Use the complete text terminal.',
          );
      });
    return () => {
      cancelled = true;
      owned?.dispose();
      scene.current = null;
    };
    // The renderer has one lifetime per explicit entry; experiment changes use setAlarm.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entered]);
  function enter() {
    setReady(false);
    setPaused(false);
    setLost(false);
    setFailure('');
    setSnapshot(null);
    setOverlay(null);
    restorePending.current = false;
    setPerspective('first');
    setPortraitBypass(false);
    movement.current.clear();
    dialog.current?.showModal();
    setEntered(true);
  }
  function exit() {
    setOverlay(null);
    movement.current.clear();
    scene.current?.setPaused(true);
    if (phase === 'RUNNING') resetExperiment();
    dialog.current?.close();
    setEntered(false);
    entry.current?.focus();
  }
  function pause() {
    movement.current.clear();
    scene.current?.setPaused(true);
    setPaused(true);
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    setPhase((current) => (current === 'RUNNING' ? 'READY' : current));
  }
  function resume() {
    if (lost || failure) return;
    scene.current?.setPaused(portrait && !portraitBypass);
    setPaused(false);
    canvas.current?.focus();
  }
  function openOverlay(kind: 'specimen' | 'world') {
    if (!ready || paused || lost || failure) return;
    overlayTrigger.current = document.activeElement as HTMLElement;
    movement.current.clear();
    scene.current?.clearInput();
    if (kind === 'specimen') scene.current?.setInspection(true);
    else scene.current?.setPaused(true);
    setOverlay(kind);
  }
  function closeOverlay() {
    if (overlay === 'specimen') scene.current?.setInspection(false);
    scene.current?.setPaused(paused || (portrait && !portraitBypass));
    restorePending.current = true;
    setOverlay(null);
  }
  function endMovement(id: number) {
    if (movement.current.release(id)) scene.current?.setAxis(0, 0);
  }
  const result = phase === 'COMPLETE';
  const status =
    phase === 'RUNNING'
      ? 'Assessing financial competence. The liability department has left the room.'
      : result
        ? experiment.conclusion
        : 'TERMINAL READY. Initial balance: $100 fictional laboratory credits.';
  return (
    <>
      <section className="chamber-entry" aria-labelledby="chamber-entry-title">
        <div>
          <h2 id="chamber-entry-title">Observer access.</h2>
          <p>
            A small original 3D room. Approach the console to your left, run the
            test, and observe the consequences.
          </p>
          <p className="chamber-note">
            Experimental, not a released game. No audio, wallet, tracking or
            real financial activity.
          </p>
        </div>
        <button
          ref={entry}
          type="button"
          className="chamber-primary labs-js-control"
          aria-haspopup="dialog"
          disabled={phase === 'RUNNING'}
          onClick={enter}
        >
          Enter 3D chamber
        </button>
      </section>
      <details className="chamber-instructions">
        <summary>Controls and comfort</summary>
        <p>
          Desktop: WASD to move. Mouse lock is optional; use Lock mouse, drag
          the view, or arrow keys to look. E interacts near the console. Tab
          reaches controls. Escape releases mouse lock and pauses. Reset
          position returns to the entrance.
        </p>
        <p>
          Touch: left thumb moves, right thumb looks; both work together.
          Landscape is recommended, with a portrait fallback. Tap Run experiment
          near the console. Approach the central specimen to inspect, or the
          right console for LAMMB World. First / third person share one observer
          position. Pause and Exit are always available. There is no camera bob,
          flashing alarm or autoplay sound. Reduced motion disables decorative
          transitions.
        </p>
      </details>
      <details className="chamber-instructions">
        <summary>Specimen description and World alternative</summary>
        <p>
          The sealed display is an original black industrial container floating
          above a chartreuse platform. Its beveled front carries a dripping
          smile; protective rails run along both sides, and the rear has a
          maintenance panel. Overhead illumination stays steady. Nothing inside
          is revealed. The observer suit is a temporary prototype, not a LAMMB
          character.
        </p>
        <p>
          The right-hand terminal opens the shared country atlas. You can also{' '}
          <a className="chamber-return" href="/world">
            explore LAMMB World directly
          </a>{' '}
          without entering 3D. Its country list is the accessible alternative to
          spatial selection. The registry is not live.
        </p>
      </details>
      <section
        className="chamber-text-terminal"
        aria-labelledby="text-terminal-title"
        data-phase={phase}
      >
        <p className="chamber-kicker">COMPLETE NON-3D ALTERNATIVE</p>
        <h2 id="text-terminal-title">{experiment.title}</h2>
        <p role="status" aria-live="polite" aria-atomic="true">
          {status}
        </p>
        <dl className="chamber-balances">
          <div>
            <dt>{result ? 'Current balance' : 'Initial balance'}</dt>
            <dd>{result ? experiment.balance : experiment.initialBalance}</dd>
          </div>
          <div>
            <dt>Outstanding loans</dt>
            <dd>{result ? experiment.loans : '$0'}</dd>
          </div>
          <div>
            <dt>Specimen confidence</dt>
            <dd>{experiment.confidence}</dd>
          </div>
        </dl>
        <div className="chamber-text-actions labs-js-control">
          <button
            type="button"
            onClick={activate}
            disabled={phase === 'RUNNING'}
          >
            {result ? 'Replay text experiment' : 'Activate text experiment'}
          </button>
          <button type="button" onClick={resetExperiment}>
            Reset experiment
          </button>
        </div>
        <p className="chamber-note">{experiment.disclaimer}</p>
        <details className="chamber-native-evidence">
          <summary>Read the complete fictional result</summary>
          <p>
            Initial balance: $100. CURRENT BALANCE: $0.37. OUTSTANDING LOANS:
            $48,000. SPECIMEN CONFIDENCE: 100%.
          </p>
          <p>{experiment.conclusion}</p>
          <p>
            The containment lights turn red. Close and reopen this evidence to
            replay the story without graphics or JavaScript.
          </p>
        </details>
      </section>
      <dialog
        ref={dialog}
        className="chamber-dialog"
        aria-labelledby="chamber-title"
        onCancel={(event) => {
          event.preventDefault();
          pause();
        }}
        onClose={() => {
          setEntered(false);
          entry.current?.focus();
        }}
        data-ready={ready}
        data-paused={paused}
        data-context-lost={lost}
        data-alarm={result}
        data-perspective={perspective}
        data-overlay={overlay ?? 'none'}
        data-portrait={portrait && !portraitBypass}
      >
        <div className="chamber-stage">
          {entered && (
            <canvas
              ref={canvas}
              tabIndex={0}
              role="application"
              aria-label={`${perspective === 'first' ? 'First' : 'Third'}-person containment chamber`}
              aria-describedby="chamber-help"
            />
          )}
          <header className="chamber-hud-top">
            <div>
              <p className="chamber-kicker">LAMMB LABS / EXPERIMENTAL</p>
              <h2 id="chamber-title">Containment chamber</h2>
              <span>
                {result
                  ? 'CONTAINMENT ALARM / STEADY LIGHT'
                  : 'OBSERVER ACCESS / SEALED'}
              </span>
            </div>
            <div className="chamber-controls">
              <button
                type="button"
                onClick={paused ? resume : pause}
                disabled={!ready || lost || Boolean(failure)}
              >
                {paused ? 'Resume' : 'Pause'}
              </button>
              <button type="button" onClick={exit}>
                Exit chamber
              </button>
            </div>
          </header>
          {(!ready || paused || failure || lost) && (
            <div className="chamber-state" role="status">
              <strong>
                {failure ||
                  (lost
                    ? 'Graphics context lost. Simulation paused safely.'
                    : !ready
                      ? 'Preparing original room geometry…'
                      : 'Observer paused.')}
              </strong>
              <p>
                {failure
                  ? 'Exit the chamber and use the text experiment below. No graphics hardware is required for the complete story.'
                  : lost
                    ? 'Exit and re-enter to create a fresh graphics scene, or use the complete text terminal.'
                    : 'WASD + mouse / arrows, or touch movement + drag. No time pressure.'}
              </p>
              {ready && !lost && !failure && paused && (
                <button type="button" onClick={resume}>
                  Resume observation
                </button>
              )}
            </div>
          )}
          {portrait && !portraitBypass && ready && !lost && (
            <section className="chamber-rotate" aria-labelledby="rotate-title">
              <p className="chamber-kicker">OBSERVER ORIENTATION</p>
              <h3 id="rotate-title">Rotate to explore.</h3>
              <p>
                Landscape leaves room for both thumbs. Rotation is optional;
                your browser stays in control.
              </p>
              <button
                ref={portraitContinue}
                type="button"
                onClick={() => {
                  setPortraitBypass(true);
                  requestAnimationFrame(() => canvas.current?.focus());
                }}
              >
                Continue in portrait
              </button>
            </section>
          )}
          <div className="chamber-crosshair" aria-hidden="true">
            +
          </div>
          <aside
            hidden={!snapshot?.near && !result}
            className="chamber-console"
            aria-label="Research terminal"
            data-near={snapshot?.near ?? false}
          >
            <p className="chamber-kicker">SPECIMEN 0004 / FICTIONAL TEST</p>
            <p
              className="chamber-console-message"
              role="status"
              aria-live="polite"
              aria-atomic="true"
            >
              {phase === 'RUNNING'
                ? 'Assessing competence…'
                : result
                  ? 'EXPERIMENT SUCCESSFUL. SUBJECT REMAINS TECHNICALLY ALIVE.'
                  : snapshot?.near
                    ? 'Console in range. Run the test.'
                    : 'Approach the research console on the left.'}
            </p>
            {result && (
              <dl className="chamber-result">
                <div>
                  <dt>CURRENT BALANCE</dt>
                  <dd>$0.37</dd>
                </div>
                <div>
                  <dt>OUTSTANDING LOANS</dt>
                  <dd>$48,000</dd>
                </div>
                <div>
                  <dt>SPECIMEN CONFIDENCE</dt>
                  <dd>100%</dd>
                </div>
              </dl>
            )}
            <button
              type="button"
              onClick={activate}
              disabled={
                !ready ||
                paused ||
                lost ||
                !snapshot?.near ||
                phase === 'RUNNING'
              }
            >
              {result ? 'Replay experiment' : 'Run experiment (E)'}
            </button>
            {result && (
              <button type="button" onClick={resetExperiment} disabled={!ready}>
                Reset experiment
              </button>
            )}
          </aside>
          <div
            className="chamber-context-actions"
            aria-label="Nearby destination"
          >
            <button
              type="button"
              hidden={snapshot?.destination !== 'specimen'}
              disabled={!ready || paused || lost}
              onClick={() => openOverlay('specimen')}
            >
              Inspect specimen (E)
            </button>
            <button
              type="button"
              hidden={snapshot?.destination !== 'world'}
              disabled={!ready || paused || lost}
              onClick={() => openOverlay('world')}
            >
              Open World terminal (E)
            </button>
          </div>
          <div className="chamber-hud-bottom">
            <div
              className="chamber-movement"
              aria-label="Touch movement pad; drag to move"
              role="group"
            >
              <button
                ref={pad}
                type="button"
                className="chamber-pad"
                aria-label="Movement pad: drag forward, backward, left or right; keyboard users use WASD in the scene"
                disabled={!ready || paused || lost}
                onPointerDown={(event) => {
                  if (!movement.current.claim(event.pointerId)) return;
                  event.preventDefault();
                  event.currentTarget.setPointerCapture(event.pointerId);
                }}
                onPointerMove={(event) => {
                  if (
                    movement.current.id !== event.pointerId ||
                    !event.currentTarget.hasPointerCapture(event.pointerId)
                  )
                    return;
                  const box = event.currentTarget.getBoundingClientRect();
                  const x =
                    (event.clientX - box.left - box.width / 2) /
                    (box.width / 2);
                  const y =
                    -(event.clientY - box.top - box.height / 2) /
                    (box.height / 2);
                  const length = Math.max(1, Math.hypot(x, y));
                  scene.current?.setAxis(x / length, y / length);
                }}
                onPointerUp={(event) => endMovement(event.pointerId)}
                onPointerCancel={(event) => endMovement(event.pointerId)}
                onLostPointerCapture={(event) => endMovement(event.pointerId)}
              >
                <span aria-hidden="true">
                  ↑<br />← · →<br />↓
                </span>
              </button>
              <span>MOVE / DRAG VIEW</span>
            </div>
            <div className="chamber-bottom-actions">
              <button
                type="button"
                disabled={!ready || lost}
                onClick={() => {
                  const next = perspective === 'first' ? 'third' : 'first';
                  scene.current?.setPerspective(next);
                  setPerspective(next);
                  canvas.current?.focus();
                }}
              >
                {' '}
                {perspective === 'first' ? 'Third person' : 'First person'}{' '}
              </button>
              <span className="chamber-sr" role="status">
                Current perspective: {perspective} person.
              </span>
              <details className="chamber-comfort">
                <summary>Controls</summary>
                <label>
                  Look sensitivity{' '}
                  <input
                    type="range"
                    min="1"
                    max="6"
                    defaultValue="3"
                    onChange={(event) =>
                      scene.current?.setSensitivity(
                        Number(event.target.value) / 1000,
                      )
                    }
                  />
                </label>
                <button
                  type="button"
                  onClick={() => void scene.current?.lockPointer()}
                  disabled={!ready || paused || lost}
                >
                  Lock mouse
                </button>
                <button
                  type="button"
                  onClick={() => {
                    scene.current?.resetPosition();
                    canvas.current?.focus();
                  }}
                  disabled={!ready || lost}
                >
                  Reset position
                </button>
              </details>
            </div>
          </div>
          <p id="chamber-help" className="chamber-sr">
            WASD move. Arrow keys or mouse drag look. E activates the console in
            range. Escape pauses and releases pointer lock. Tab reaches pause,
            exit, experiment and reset controls. All laboratory figures are
            fictional.
          </p>
          <details className="chamber-diagnostics">
            <summary>Prototype diagnostics</summary>
            <pre data-testid="chamber-diagnostics">
              {snapshot
                ? JSON.stringify(snapshot, null, 2)
                : 'Awaiting first frame.'}
            </pre>
          </details>
          {overlay && (
            <ChamberOverlay
              kind={overlay}
              scene={scene.current}
              close={closeOverlay}
            />
          )}
        </div>
      </dialog>
    </>
  );
}
