'use client';
import Image from 'next/image';
import { useId, useRef, useState } from 'react';
import {
  specimenDescriptions,
  specimenViews,
  type SpecimenView,
} from '../config/specimen';
import { useDialog } from './use-dialog';

export function SealedSpecimen({
  priority = false,
  chamber = false,
  compact = false,
}: {
  priority?: boolean;
  chamber?: boolean;
  compact?: boolean;
}) {
  const { dialogRef, triggerRef, show, close, containFocus } = useDialog();
  const [index, setIndex] = useState(0);
  const controls = useRef<(HTMLButtonElement | null)[]>([]);
  const id = useId();
  const current = specimenViews[index]!;
  const front = specimenViews[0]!;
  function move(key: string) {
    let next: number;
    if (key === 'ArrowRight') next = (index + 1) % specimenViews.length;
    else if (key === 'ArrowLeft')
      next = (index + specimenViews.length - 1) % specimenViews.length;
    else if (key === 'Home') next = 0;
    else if (key === 'End') next = specimenViews.length - 1;
    else return false;
    setIndex(next);
    controls.current[next]?.focus();
    return true;
  }
  return (
    <div className="sealed-specimen">
      <button
        className="specimen-trigger"
        type="button"
        ref={triggerRef}
        aria-label="Inspect sealed specimen concept"
        aria-haspopup="dialog"
        aria-controls={`${id}-inspection`}
        onClick={() => {
          setIndex(0);
          show();
        }}
      >
        <span className="specimen-crosshair" aria-hidden="true">
          +
        </span>
        <Image
          src={front.path}
          alt={specimenDescriptions.front}
          width={front.width}
          height={front.height}
          preload={priority}
          sizes={
            chamber
              ? '(min-width: 768px) 340px, (min-width: 452px) 280px, 62vw'
              : priority
                ? '(min-width: 1100px) 300px, (min-width: 768px) 280px, 45vw'
                : '(min-width: 768px) 240px, 70vw'
          }
          className="specimen-preview-image"
        />
        <span className="inspect-label">
          Inspect specimen <span aria-hidden="true">↗</span>
        </span>
      </button>
      <p className="specimen-caption">
        {!compact && 'SEALED SPECIMEN'}
        <span>Concept preview / not final NFT artwork</span>
      </p>
      <noscript>
        <figure className="specimen-static-fallback">
          <Image
            src={front.path}
            alt={specimenDescriptions.front}
            width={front.width}
            height={front.height}
            sizes="(min-width: 768px) 340px, 70vw"
          />
          <figcaption>Concept preview / not final NFT artwork</figcaption>
          <a href="/vault#specimen-views">See all three specimen views</a>
        </figure>
      </noscript>
      <dialog
        ref={dialogRef}
        id={`${id}-inspection`}
        className="inspection-dialog cinematic-dialog"
        aria-labelledby={`${id}-title`}
        aria-describedby={`${id}-description`}
        onKeyDown={containFocus}
        onCancel={(event) => {
          event.preventDefault();
          close();
        }}
      >
        <div className="dialog-topline">
          <span id={`${id}-title`}>SEALED SPECIMEN / INSPECTION</span>
          <button
            type="button"
            className="dialog-close"
            aria-label="Close specimen inspection"
            onClick={close}
          >
            Close <span aria-hidden="true">×</span>
          </button>
        </div>
        <div className="inspection-stage">
          <div className="inspection-coordinate" aria-hidden="true">
            <span>LAMMB / UNREVEALED</span>
            <span>5280 / SEALED</span>
          </div>
          <figure className="inspection-figure">
            <Image
              src={current.path}
              alt={specimenDescriptions[current.view as SpecimenView]}
              width={current.width}
              height={current.height}
              sizes="(min-width: 768px) 360px, 80vw"
              className="inspection-image"
            />
            <figcaption aria-live="polite" aria-atomic="true">
              {current.view.toUpperCase()} / 2D CONCEPT VIEW
            </figcaption>
          </figure>
          <p className="inspection-side-note" aria-hidden="true">
            NOT A LAMMB. YET.
          </p>
        </div>
        <div
          className="inspection-controls"
          role="group"
          aria-label="Specimen views"
          onKeyDown={(event) => {
            if (move(event.key)) event.preventDefault();
          }}
        >
          {specimenViews.map((view, viewIndex) => (
            <button
              key={view.view}
              type="button"
              ref={(node) => {
                controls.current[viewIndex] = node;
              }}
              aria-pressed={index === viewIndex}
              onClick={() => setIndex(viewIndex)}
            >
              {view.view.toUpperCase()}
            </button>
          ))}
        </div>
        <p id={`${id}-description`} className="dialog-footnote">
          Website concept preview. Three independently illustrated 2D views, not
          a 3D model or a minted NFT.
          <span>Use the view buttons or arrow keys. Close with Escape.</span>
        </p>
      </dialog>
    </div>
  );
}
