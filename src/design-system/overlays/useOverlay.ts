import { useEffect, useRef } from 'react';
import type { RefObject } from 'react';

/** Everything a keyboard user can land on inside an overlay. */
export const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Where keyboard focus should land when Tab is pressed inside a trapped overlay.
 *
 * Pure so the wrap-around can be asserted directly: a trap that silently stops
 * working is indistinguishable from one that was never there.
 */
export function nextFocusIndex(current: number, total: number, backwards: boolean): number {
  if (total <= 0) return -1;
  if (current < 0) return backwards ? total - 1 : 0;
  return backwards ? (current - 1 + total) % total : (current + 1) % total;
}

export interface OverlayBehaviour {
  open: boolean;
  /** Esc and the scrim call this, unless `busy` or not `dismissible`. */
  onClose: () => void;
  /** An action is running: nothing closes it until the action settles. */
  busy: boolean;
  /** False for a decision that may only end by acting (a critical value). */
  dismissible: boolean;
}

/**
 * The behaviour every sheet, drawer and dialog shares (canvas boards Sheets,
 * ConfirmDialogs): focus moves in on open (to `[data-autofocus]`, else the first
 * control), Tab is trapped, Esc closes, the page behind does not scroll, and
 * focus returns to whatever opened it.
 *
 * Returns the panel ref and a `requestClose` for the scrim, both guarded the
 * same way so a stray tap cannot abandon a half-finished action.
 */
export function useOverlay({ open, onClose, busy, dismissible }: OverlayBehaviour): {
  panel: RefObject<HTMLDivElement>;
  requestClose: () => void;
} {
  const panel = useRef<HTMLDivElement>(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  const canClose = useRef(!busy && dismissible);
  canClose.current = !busy && dismissible;

  useEffect(() => {
    if (!open) return undefined;
    const returnTo = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const node = panel.current;
    const items = () => Array.from(node?.querySelectorAll<HTMLElement>(FOCUSABLE) ?? []);
    (node?.querySelector<HTMLElement>('[data-autofocus]') ?? items()[0] ?? node)?.focus();

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        if (canClose.current) closeRef.current();
        return;
      }
      if (event.key !== 'Tab') return;
      const list = items();
      if (list.length === 0) { event.preventDefault(); return; }
      event.preventDefault();
      const current = list.indexOf(document.activeElement as HTMLElement);
      list[nextFocusIndex(current, list.length, event.shiftKey)]?.focus();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = previousOverflow;
      returnTo?.focus();
    };
  }, [open]);

  return { panel, requestClose: () => { if (canClose.current) closeRef.current(); } };
}
