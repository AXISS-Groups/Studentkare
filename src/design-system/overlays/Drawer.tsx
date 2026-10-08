import React, { useEffect, useId, useRef } from 'react';
import { createPortal } from 'react-dom';
import { SkIcon } from '../icons/SkIcon';
import './overlays.css';

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

export interface DrawerProps {
  open: boolean;
  title: string;
  /** Small line above the title, e.g. "CRITICAL · POTASSIUM 6.8 mmol/L". */
  eyebrow?: string;
  eyebrowTone?: 'danger' | 'action' | 'muted';
  subtitle?: string;
  /** While true, Esc and the backdrop do not close it (an action is running). */
  busy?: boolean;
  onClose: () => void;
  children: React.ReactNode;
}

/**
 * Right-hand drawer (web): a decision that keeps its context. 420 ms in, a
 * scrim behind, `aria-modal`, focus trapped, Esc closes, focus returns to
 * whatever opened it. On a phone it fills the screen.
 */
export function Drawer({ open, title, eyebrow, eyebrowTone = 'muted', subtitle, busy = false, onClose, children }: DrawerProps): React.ReactElement | null {
  const panel = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const returnTo = useRef<HTMLElement | null>(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  const busyRef = useRef(busy);
  busyRef.current = busy;

  useEffect(() => {
    if (!open) return undefined;
    returnTo.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const node = panel.current;
    (node?.querySelector<HTMLElement>('[data-autofocus]') ?? node?.querySelector<HTMLElement>(FOCUSABLE))?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !busyRef.current) { closeRef.current(); return; }
      if (event.key !== 'Tab' || !node) return;
      const nodes = Array.from(node.querySelectorAll<HTMLElement>(FOCUSABLE));
      if (nodes.length === 0) return;
      const first = nodes[0];
      const last = nodes[nodes.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      returnTo.current?.focus();
    };
  }, [open]);

  if (!open) return null;

  return createPortal(
    <div className="sk-ds sk-drawer-layer">
      <div className="sk-drawer__scrim" aria-hidden="true" onClick={() => { if (!busy) onClose(); }} />
      <div ref={panel} className="sk-drawer" role="dialog" aria-modal="true" aria-labelledby={titleId}>
        <button type="button" className="sk-drawer__close" aria-label="Close panel" onClick={onClose} disabled={busy}>
          <SkIcon name="close" size={18} strokeWidth={2.2} />
        </button>
        <div className="sk-drawer__head">
          {eyebrow ? <span className={`sk-drawer__eyebrow sk-drawer__eyebrow--${eyebrowTone}`}>{eyebrow}</span> : null}
          <h2 id={titleId} className="sk-drawer__title">{title}</h2>
          {subtitle ? <p className="sk-drawer__subtitle">{subtitle}</p> : null}
        </div>
        {children}
      </div>
    </div>,
    document.body,
  );
}
