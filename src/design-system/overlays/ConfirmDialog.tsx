import React, { useId } from 'react';
import { useT } from '@/i18n';
import { Icon } from '../icons';
import type { SkIconName } from '../icons';
import { Overlay } from './Overlay';

/**
 * The badge above the title (board ConfirmDialogs, "Anatomy"): amber is
 * caution, red is destructive, navy is privacy.
 */
export type ConfirmIcon = 'log-out' | 'end-sessions' | 'cancel-booking' | 'stop-sharing' | 'discard';
type BadgeTone = 'attention' | 'danger' | 'privacy';

const BADGE: Record<ConfirmIcon, { name: SkIconName; tone: BadgeTone }> = {
  'log-out': { name: 'shield-half', tone: 'attention' },
  'end-sessions': { name: 'devices', tone: 'danger' },
  'cancel-booking': { name: 'calendar-x', tone: 'danger' },
  'stop-sharing': { name: 'lock-keyhole', tone: 'privacy' },
  discard: { name: 'pencil', tone: 'attention' },
};

export interface ConfirmDone {
  title: string;
  body?: React.ReactNode;
  actionLabel: string;
  onAction: () => void;
}

export interface ConfirmDialogProps {
  open: boolean;
  /** A direct question that names the thing: "Cancel this lab booking?" */
  title: string;
  /** One or two lines: what happens, what doesn't, and money if any. */
  body: React.ReactNode;
  /** Optional controls under the body, left-aligned (e.g. a "remember me" checkbox). */
  children?: React.ReactNode;
  /** Says what it does ("Cancel booking"), never "Yes". */
  confirmLabel: string;
  /** Shown on the confirm button while `busy`, e.g. "Logging out…". */
  busyLabel?: string;
  /** The safe choice, e.g. "Keep booking". Defaults to the catalogue's "Cancel". */
  cancelLabel?: string;
  /** `danger` when the action removes or ends something; `action` (navy) otherwise. */
  tone?: 'action' | 'danger';
  icon?: ConfirmIcon;
  /** While true the button spins and nothing closes the dialog. */
  busy?: boolean;
  /** After the action: the dialog becomes a small success card. */
  done?: ConfirmDone | null;
  onConfirm: () => void;
  onCancel: () => void;
  testID?: string;
}

/**
 * Confirm dialog (DESIGN.md §4: logout, destructive, cancel booking; board
 * ConfirmDialogs). Centred on web, a bottom sheet on a phone.
 *
 * Cancel is as easy as confirm (§7): same size, on the left, and it is what
 * the default focus, Esc and the scrim all do, so a stray Enter lands on the
 * safe choice. While the action runs nothing closes it.
 */
export function ConfirmDialog({
  open,
  title,
  body,
  children,
  confirmLabel,
  busyLabel,
  cancelLabel,
  tone = 'action',
  icon,
  busy = false,
  done = null,
  onConfirm,
  onCancel,
  testID,
}: ConfirmDialogProps): React.ReactElement | null {
  const t = useT();
  const titleId = useId();
  const bodyId = useId();
  const badge = icon ? BADGE[icon] : null;

  return (
    <Overlay
      open={open}
      variant="dialog"
      role={done ? 'dialog' : 'alertdialog'}
      labelledBy={titleId}
      describedBy={bodyId}
      busy={busy}
      onClose={done ? done.onAction : onCancel}
      testID={testID}
    >
      <div className="sk-confirm" data-tone={tone} data-state={done ? 'done' : busy ? 'busy' : 'idle'}>
        {done ? (
          <>
            <span className="sk-confirm__badge" data-tone="positive" aria-hidden="true">
              <Icon name="check" size={34} strokeWidth={2.4} />
            </span>
            <h2 id={titleId} className="sk-confirm__title">{done.title}</h2>
            <div id={bodyId} className="sk-confirm__body">{done.body}</div>
            <div className="sk-confirm__actions">
              <button type="button" className="sk-confirm__btn sk-confirm__btn--primary" data-autofocus onClick={done.onAction}>
                {done.actionLabel}
              </button>
            </div>
          </>
        ) : (
          <>
            {badge ? (
              <span className="sk-confirm__badge" data-tone={badge.tone} aria-hidden="true">
                <Icon name={badge.name} size={34} strokeWidth={2} />
              </span>
            ) : null}
            <h2 id={titleId} className="sk-confirm__title">{title}</h2>
            <div id={bodyId} className="sk-confirm__body">{body}</div>
            {children ? <div className="sk-confirm__extra">{children}</div> : null}
            <span className="sk-confirm__rule" aria-hidden="true" />
            <div className="sk-confirm__actions">
              <button type="button" className="sk-confirm__btn sk-confirm__btn--safe" data-autofocus onClick={onCancel} disabled={busy}>
                {cancelLabel ?? t('common.cancel')}
              </button>
              <button
                type="button"
                className="sk-confirm__btn sk-confirm__btn--primary"
                onClick={() => { if (!busy) onConfirm(); }}
                aria-disabled={busy || undefined}
                aria-busy={busy || undefined}
              >
                {busy ? <span className="sk-confirm__spin" aria-hidden="true"><Icon name="circle" size={18} strokeWidth={3} /></span> : null}
                {busy && busyLabel ? busyLabel : confirmLabel}
              </button>
            </div>
          </>
        )}
      </div>
    </Overlay>
  );
}
