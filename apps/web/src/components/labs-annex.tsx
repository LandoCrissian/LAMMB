'use client';
import { useId } from 'react';
import { useDialog } from './use-dialog';
export function LabsAnnex({ fileId, text }: { fileId: string; text: string }) {
  const { dialogRef, triggerRef, show, close, containFocus } = useDialog();
  const id = useId();
  return (
    <div className="labs-annex">
      <button
        type="button"
        ref={triggerRef}
        className="labs-action labs-js-control"
        aria-haspopup="dialog"
        aria-controls={`${id}-annex`}
        onClick={show}
      >
        Inspect annex / FILE {fileId}
      </button>
      <noscript>
        <details>
          <summary>Read annex / FILE {fileId}</summary>
          <p>{text}</p>
        </details>
      </noscript>
      <dialog
        ref={dialogRef}
        id={`${id}-annex`}
        className="labs-dialog"
        aria-labelledby={`${id}-title`}
        aria-describedby={`${id}-text`}
        onKeyDown={containFocus}
        onCancel={(event) => {
          event.preventDefault();
          close();
        }}
      >
        <div className="labs-dialog-top">
          <p className="labs-kicker">FICTIONAL EVIDENCE</p>
          <button
            type="button"
            className="labs-action"
            onClick={close}
            aria-label="Close dossier annex"
          >
            Close ×
          </button>
        </div>
        <h2 id={`${id}-title`}>FILE {fileId} / ANNEX</h2>
        <p id={`${id}-text`}>{text}</p>
        <p className="labs-kicker">
          READABLE WITHOUT CLEARANCE. NO AUTHENTICATION.
        </p>
      </dialog>
    </div>
  );
}
