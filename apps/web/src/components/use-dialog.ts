'use client';
import { useEffect, useRef, useState, type KeyboardEvent } from 'react';

// Native dialogs provide background inertness and focus containment.
// This is presentation state, not a launch/domain state mutation.
export function useDialog() {
  const dialog = useRef<HTMLDialogElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);
  function show() {
    if (!dialog.current || dialog.current.open) return;
    dialog.current.showModal();
    setOpen(true);
  }
  function close() {
    dialog.current?.close();
    setOpen(false);
    trigger.current?.focus({ preventScroll: true });
  }
  function containFocus(event: KeyboardEvent<HTMLDialogElement>) {
    if (event.key !== 'Tab') return;
    const targets = [
      ...event.currentTarget.querySelectorAll<
        HTMLButtonElement | HTMLAnchorElement
      >('button:not(:disabled), a[href]'),
    ].filter((element) => element.getClientRects().length > 0);
    const first = targets[0];
    const last = targets.at(-1);
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last?.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first?.focus();
    }
  }
  return {
    dialogRef: dialog,
    triggerRef: trigger,
    open,
    show,
    close,
    containFocus,
  };
}
