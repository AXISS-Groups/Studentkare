import React, { useId } from 'react';
import { createPortal } from 'react-dom';
import { useT } from '@/i18n';
import { Icon } from '../icons';
import { useOverlay } from './useOverlay';
import './overlays.css';

/**
 * - `dialog`: centred over a dimmed page on web, the same content as a bottom
 *   sheet on a phone (board ConfirmDialogs).
 * - `sheet`: a bottom sheet on a phone; on a wide screen it becomes the side
 *   panel, because "every sheet on a 1440 web screen becomes a side panel"
 *   (board Sheets).
 * - `drawer`: always the side panel, full height, 480 px, anchored right.
 */
export type OverlayVariant = 'dialog' | 'sheet' | 'drawer';
export type OverlayEyebrowTone = 'danger' | 'action' | 'muted';

export interface OverlayProps {
  open: boolean;
  variant: OverlayVariant;
  /** Esc, the scrim and the close button call this. */
  onClose: () => void;
  /** Visible heading. Omit only when `labelledBy` points at a heading inside `children`. */
  title?: string;
  labelledBy?: string;
  describedBy?: string;
  /** Small line above the title, e.g. "CRITICAL VALUE". */
  eyebrow?: string;
  eyebrowTone?: OverlayEyebrowTone;
  subtitle?: string;
  /** `alertdialog` for a confirm that interrupts; `dialog` otherwise. */
  role?: 'dialog' | 'alertdialog';
  /** An action is running: Esc, the scrim and the close button do nothing. */
  busy?: boolean;
  /**
   * False when the decision may only end by acting (a critical value): no
   * close button, and Esc and the scrim do nothing.
   */
  dismissible?: boolean;
  /** The 38 px close button. Default: on for sheets and drawers, off for dialogs. */
  showClose?: boolean;
  /** Accessible name of the close button. Defaults to the catalogue's "Close". */
  closeLabel?: string;
  children: React.ReactNode;
  testID?: string;
}

/**
 * One overlay for the whole design system: bottom sheet, side panel and
 * dialog share this frame, so they share one behaviour (useOverlay): aria-modal,
 * focus trapped, Esc and scrim close except while busy, focus returned, page
 * scroll locked, and no motion under prefers-reduced-motion.
 *
 * The sheet is frosted (board Sheets, "the glass recipe") with a solid
 * fallback where backdrop-filter is unsupported; dialogs are solid.
 */
export function Overlay({
  open,
  variant,
  onClose,
  title,
  labelledBy,
  describedBy,
  eyebrow,
  eyebrowTone = 'muted',
  subtitle,
  role = 'dialog',
  busy = false,
  dismissible = true,
  showClose,
  closeLabel,
  children,
  testID,
}: OverlayProps): React.ReactElement | null {
  const t = useT();
  const titleId = useId();
  const subtitleId = useId();
  const { panel, requestClose } = useOverlay({ open, onClose, busy, dismissible });
  if (!open) return null;

  const withClose = dismissible && (showClose ?? variant !== 'dialog');
  const hasHead = Boolean(title || eyebrow || subtitle);

  return createPortal(
    <div className={`sk-ds sk-ov sk-ov--${variant}`}>
      <div className="sk-ov__scrim" aria-hidden="true" onClick={requestClose} />
      <div
        ref={panel}
        className="sk-ov__panel"
        role={role}
        aria-modal="true"
        aria-labelledby={labelledBy ?? (title ? titleId : undefined)}
        aria-describedby={describedBy ?? (subtitle ? subtitleId : undefined)}
        aria-busy={busy || undefined}
        tabIndex={-1}
        data-testid={testID}
      >
        {variant === 'dialog' ? null : <span className="sk-ov__grabber" aria-hidden="true" />}
        {withClose ? (
          <button
            type="button"
            className="sk-ov__close"
            aria-label={closeLabel ?? t('ds.overlay.close')}
            onClick={requestClose}
            disabled={busy}
          >
            <Icon name="x" size={16} strokeWidth={2.2} />
          </button>
        ) : null}
        {hasHead ? (
          <div className="sk-ov__head" data-close={withClose || undefined}>
            {eyebrow ? <span className={`sk-ov__eyebrow sk-ov__eyebrow--${eyebrowTone}`}>{eyebrow}</span> : null}
            {title ? <h2 id={titleId} className="sk-ov__title">{title}</h2> : null}
            {subtitle ? <p id={subtitleId} className="sk-ov__subtitle">{subtitle}</p> : null}
          </div>
        ) : null}
        <div className="sk-ov__body">{children}</div>
      </div>
    </div>,
    document.body,
  );
}
