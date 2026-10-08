'use client';
import { lazy, Suspense, useEffect, useRef } from 'react';
import type { ChamberScene } from '../lib/chamber-scene';
const Atlas = lazy(() =>
  import('./world-atlas').then((module) => ({ default: module.WorldAtlas })),
);
export function ChamberOverlay({
  kind,
  scene,
  close,
}: {
  kind: 'specimen' | 'world';
  scene: ChamberScene | null;
  close: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    dialog.current?.showModal();
  }, []);
  return (
    <dialog
      ref={dialog}
      className={`chamber-overlay chamber-overlay-${kind}`}
      aria-labelledby="chamber-overlay-title"
      onCancel={(event) => {
        event.preventDefault();
        close();
      }}
    >
      <header>
        <div>
          <p className="chamber-kicker">
            LAMMB LABS /{' '}
            {kind === 'world' ? 'WORLD TERMINAL' : 'SEALED GEOMETRY'}
          </p>
          <h2 id="chamber-overlay-title">
            {kind === 'world' ? 'LAMMB World' : 'Specimen inspection'}
          </h2>
        </div>
        <button type="button" autoFocus onClick={close}>
          Close {kind === 'world' ? 'World terminal' : 'inspection'}
        </button>
      </header>
      {kind === 'world' ? (
        <div className="chamber-atlas">
          <p>
            Voluntary country exploration. No registration or location tracking.{' '}
            <a href="/world">Open standalone atlas</a>
          </p>
          <Suspense
            fallback={<p role="status">Loading shared country atlas…</p>}
          >
            <Atlas embedded />
          </Suspense>
        </div>
      ) : (
        <>
          <div
            className="chamber-inspection-surface"
            role="img"
            aria-label="Original sealed industrial specimen. Black beveled shell, chartreuse dripping smile, side rails and rear maintenance panel. No character is revealed."
            onPointerDown={(event) => {
              event.currentTarget.setPointerCapture(event.pointerId);
              scene?.inspectPointer(
                'down',
                event.pointerId,
                event.clientX,
                event.clientY,
              );
            }}
            onPointerMove={(event) =>
              scene?.inspectPointer(
                'move',
                event.pointerId,
                event.clientX,
                event.clientY,
              )
            }
            onPointerUp={(event) =>
              scene?.inspectPointer('up', event.pointerId, 0, 0)
            }
            onPointerCancel={(event) =>
              scene?.inspectPointer('up', event.pointerId, 0, 0)
            }
            onLostPointerCapture={(event) =>
              scene?.inspectPointer('up', event.pointerId, 0, 0)
            }
            onWheel={(event) => {
              event.preventDefault();
              scene?.zoomInspection(event.deltaY * 0.003);
            }}
          />
          <footer>
            <p>
              Drag to orbit · Pinch / wheel to zoom. Original 3D prototype, not
              a production NFT.
            </p>
            <div>
              <button
                type="button"
                onClick={() => {
                  scene?.inspectPointer('down', -1, 0, 0);
                  scene?.inspectPointer('move', -1, 80, 0);
                  scene?.inspectPointer('up', -1, 0, 0);
                }}
              >
                Rotate left
              </button>
              <button
                type="button"
                onClick={() => {
                  scene?.inspectPointer('down', -1, 0, 0);
                  scene?.inspectPointer('move', -1, -80, 0);
                  scene?.inspectPointer('up', -1, 0, 0);
                }}
              >
                Rotate right
              </button>
              <button type="button" onClick={() => scene?.zoomInspection(-0.5)}>
                Zoom in
              </button>
              <button type="button" onClick={() => scene?.zoomInspection(0.5)}>
                Zoom out
              </button>
              <button type="button" onClick={() => scene?.resetInspection()}>
                Reset inspection
              </button>
            </div>
          </footer>
        </>
      )}
    </dialog>
  );
}
