'use client';
import { Icon } from './icon';
import { useState } from 'react';
const diagnostic = [
  'RESULT: Rational behavior lasted eleven seconds. The warranty required twelve.',
  'RESULT: The compliance department has approved its own disappearance.',
  'RESULT: Threat identified: management. Recommended action: fewer meetings.',
];
export function LabsTerminal() {
  const [scan, setScan] = useState(-1);
  return (
    <section className="labs-terminal" aria-labelledby="diagnostic-title">
      <p className="labs-kicker">FICTIONAL DIAGNOSTIC / LOCAL PLAY</p>
      <h2 id="diagnostic-title">
        Everything is <del>fine.</del> filed.
      </h2>
      <p
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="labs-readout"
      >
        {scan < 0
          ? 'TERMINAL READY. Confidence exceeds competence.'
          : diagnostic[scan]}
      </p>
      <button
        className="labs-action labs-js-control"
        type="button"
        onClick={() => setScan((scan + 1) % diagnostic.length)}
      >
        Run competence diagnostic{' '}
        <span aria-hidden="true">
          <Icon />
        </span>
      </button>
      <noscript>
        <p>
          The fictional diagnostic requires JavaScript. All four archive records
          remain readable.
        </p>
      </noscript>
    </section>
  );
}
