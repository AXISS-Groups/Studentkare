import React, { useCallback, useEffect, useId, useRef } from 'react';
import './confirm-dialog.css';

/**
 * Where keyboard focus should land when Tab is pressed inside a trapped dialog.
 *
 * Extracted so the wrap-around can be asserted directly — this repo has no DOM
 * testing library, so a trap implemented only inside an event handler is
 * untestable, and a trap that silently stops working is indistinguishable from
 * one that was never there.
 */
export function nextFocusIndex(current: number, total: number, backwards: boolean): number {
  if (total <= 0) return -1;
  if (current < 0) return backwards ? total - 1 : 0;
  return backwards ? (current - 1 + total) % total : (current + 1) % total;
}

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])';

export interface ConfirmDialogProps {
  open: boolean;
  title: string;
  /** What actually happens. Say it plainly; this is the last thing read before committing. */
  body: React.ReactNode;
  confirmLabel: string;
  cancelLabel?: string;
  /** `destructive` colours the confirm button as danger. Use it when the action removes or ends something. */
  tone?: 'default' | 'destructive';
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * A confirm dialog — DESIGN.md section 4 lists this in the core set, with
 * "logout, destructive, cancel booking" as its variants.
 *
 * Carries the accessibility the definition of done asks for: alertdialog role,
 * aria-modal, a focus trap, Escape to cancel, and focus restored to whatever
 * opened it. Cancel is as easy as confirm, and cancel is what Escape, the
 * backdrop and the default focus all do — DESIGN.md section 7 forbids making
 * the safe choice harder than the committing one.
 */
export function ConfirmDialog({
  open,
  title,
  body,
  confirmLabel,
  cancelLabel = 'Cancel',
  tone = 'default',
  busy = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const titleId = useId();
  const bodyId = useId();
  const panel = useRef<HTMLDivElement>(null);
  const opener = useRef<Element | null>(null);

  const focusables = useCallback(
    () => Array.from(panel.current?.querySelectorAll<HTMLElement>(FOCUSABLE) ?? []),
    [],
  );

  useEffect(() => {
    if (!open) return;
    opener.current = document.activeElement;
    // Cancel gets focus, not confirm: the safe choice should be the one a
    // stray Enter press lands on.
    const items = focusables();
    items[0]?.focus();
    return () => {
      (opener.current as HTMLElement | null)?.focus?.();
    };
  }, [open, focusables]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onCancel();
        return;
      }
      if (event.key !== 'Tab') return;
      const items = focusables();
      if (items.length === 0) return;
      event.preventDefault();
      const current = items.indexOf(document.activeElement as HTMLElement);
      items[nextFocusIndex(current, items.length, event.shiftKey)]?.focus();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open, onCancel, focusables]);

  if (!open) return null;

  return (
    <div className="sk-confirm">
      <div className="sk-confirm__scrim" onClick={onCancel} aria-hidden="true" />
      <div
        ref={panel}
        className="sk-confirm__panel"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={bodyId}
        data-tone={tone}
      >
        <span className="sk-confirm__grabber" aria-hidden="true" />
        <h2 className="sk-confirm__title" id={titleId}>
          {title}
        </h2>
        <div className="sk-confirm__body" id={bodyId}>
          {body}
        </div>
        <div className="sk-confirm__actions">
          <button type="button" className="sk-confirm__cancel" onClick={onCancel} disabled={busy}>
            {cancelLabel}
          </button>
          <button
            type="button"
            className="sk-confirm__confirm"
            onClick={onConfirm}
            disabled={busy}
            aria-busy={busy}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
