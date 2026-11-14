import { useEffect, useRef } from 'react';
import type { RefObject } from 'react';

/** Everything a keyboard user can land on inside an overlay. */
const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

const activePanels: HTMLDivElement[] = [];
const isolated = new Map<Element, { count: number; inert: boolean; hidden: string | null }>();
let previousBodyOverflow = '';

/** Keep the drawn overlay in place while hiding everything outside its frame. */
function isolateFrame(panel: HTMLDivElement): () => void {
  const elements: Element[] = [];
  let frame: Element | null = panel.parentElement;
  while (frame?.parentElement) {
    for (const sibling of Array.from(frame.parentElement.children)) {
      if (sibling === frame) continue;
      const state = isolated.get(sibling) ?? { count: 0, inert: sibling.hasAttribute('inert'), hidden: sibling.getAttribute('aria-hidden') };
      state.count += 1;
      isolated.set(sibling, state);
      sibling.setAttribute('inert', '');
      sibling.setAttribute('aria-hidden', 'true');
      elements.push(sibling);
    }
    frame = frame.parentElement;
    if (frame === document.body) break;
  }
  return () => {
    for (const element of elements) {
      const state = isolated.get(element);
      if (!state || --state.count > 0) continue;
      if (!state.inert) element.removeAttribute('inert');
      if (state.hidden === null) element.removeAttribute('aria-hidden');
      else element.setAttribute('aria-hidden', state.hidden);
      isolated.delete(element);
    }
  };
}

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
    if (!node) return undefined;
    if (activePanels.length === 0) previousBodyOverflow = document.body.style.overflow;
    activePanels.push(node);
    const restoreBackground = isolateFrame(node);
    const isTop = () => activePanels[activePanels.length - 1] === node;
    const items = () => Array.from(node.querySelectorAll<HTMLElement>(FOCUSABLE)).filter((item) => {
      const style = window.getComputedStyle(item);
      return !item.closest('[hidden], [inert], [aria-hidden="true"]') && style.display !== 'none' && style.visibility !== 'hidden';
    });
    (node?.querySelector<HTMLElement>('[data-autofocus]') ?? items()[0] ?? node)?.focus();

    document.body.style.overflow = 'hidden';

    const onKey = (event: KeyboardEvent) => {
      if (!isTop()) return;
      if (event.key === 'Escape') {
        event.preventDefault();
        if (canClose.current) closeRef.current();
        return;
      }
      if (event.key !== 'Tab') return;
      const list = items();
      if (list.length === 0) { event.preventDefault(); node.focus(); return; }
      event.preventDefault();
      const current = list.indexOf(document.activeElement as HTMLElement);
      list[nextFocusIndex(current, list.length, event.shiftKey)]?.focus();
    };
    const onFocus = (event: FocusEvent) => {
      if (isTop() && event.target instanceof Node && !node.contains(event.target)) (items()[0] ?? node).focus();
    };
    window.addEventListener('keydown', onKey);
    document.addEventListener('focusin', onFocus);
    return () => {
      const wasTop = isTop();
      activePanels.splice(activePanels.indexOf(node), 1);
      window.removeEventListener('keydown', onKey);
      document.removeEventListener('focusin', onFocus);
      restoreBackground();
      if (activePanels.length === 0) document.body.style.overflow = previousBodyOverflow;
      if (wasTop && returnTo?.isConnected) returnTo.focus();
    };
  }, [open]);

  return { panel, requestClose: () => { if (canClose.current) closeRef.current(); } };
}
