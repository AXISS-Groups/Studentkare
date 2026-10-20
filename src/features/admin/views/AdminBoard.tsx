import React, { useEffect, useState } from 'react';
import type { ConsoleEmpty, ConsoleError } from '@/design-system';
import { Icon } from '@/design-system/icons';
import type { SkIconName } from '@/design-system/icons';
import { navigate } from '@/lib/utils/workflowRouting';
import { useT } from '@/i18n';
import './admin-board.css';

/**
 * Pieces shared by the super admin boards on the console table page (canvas page 7,
 * WP-16): the board's empty state (shield tile, "Back to overview"), its calm error
 * with the board's reference, filter chips that tick the chosen one, a note banner
 * and a short confirmation. Every text arrives translated.
 */

type Translate = ReturnType<typeof useT>;

/** The board's empty state: the super admin shield tile and one step back to the overview. */
export function boardEmpty(t: Translate, title: string, body?: string): ConsoleEmpty {
  return { title, body: body ?? t('adminBoard.empty.body'), icon3d: 'shield--p5', action: { label: t('adminBoard.empty.back'), onSelect: () => navigate('admin') } };
}

/** The board's error: "Couldn't load …", retry, status & help, and the board's reference. */
export function boardError(t: Translate, what: string, screen: string, onRetry: () => void, detail?: string | null): ConsoleError {
  return {
    title: t('adminBoard.error.title', { what }),
    reference: t('adminBoard.error.reference', { screen }),
    detail: detail || undefined,
    onRetry,
    onHelp: () => navigate('support'),
  };
}

export interface BoardChipOption<K extends string> { id: K; label: string; count?: string }

/** Filter chips; the chosen chip carries a tick (check-2) as well as its colour. */
export function BoardChips<K extends string>({ label, options, value, onChange }: { label: string; options: readonly BoardChipOption<K>[]; value: K; onChange: (id: K) => void }) {
  return <div className="sk-ctp-chips" role="group" aria-label={label}>
    {options.map(option => {
      const on = option.id === value;
      return <button key={option.id} type="button" className={`sk-ctp-chip${on ? ' is-on' : ''}`} aria-pressed={on} onClick={() => onChange(option.id)}>
        {on ? <Icon name="check-2" size={15} strokeWidth={2.4} /> : null}
        {option.label}
        {option.count !== undefined ? <span className="sk-ctp-chip__count sk-mono">{option.count}</span> : null}
      </button>;
    })}
  </div>;
}

/** A one-line banner under the header: what this board can and cannot do right now. */
export function BoardNote({ icon, tone = 'info', children, action }: { icon: SkIconName; tone?: 'info' | 'attention'; children: React.ReactNode; action?: { label: string; onSelect: () => void } }) {
  return <div className={`sk-board-note sk-board-note--${tone}`}>
    <Icon name={icon} size={18} strokeWidth={2.2} />
    <p>{children}</p>
    {action ? <button type="button" className="sk-board-note__action" onClick={action.onSelect}>{action.label}</button> : null}
  </div>;
}

/** A short confirmation after an action the server accepted, announced politely; clears itself. */
export function BoardToast({ message, onDone, durationMs = 2600 }: { message: string | null; onDone: () => void; durationMs?: number }) {
  const [shown, setShown] = useState(message);
  useEffect(() => {
    setShown(message);
    if (!message) return undefined;
    const timer = window.setTimeout(onDone, durationMs);
    return () => window.clearTimeout(timer);
  }, [message, onDone, durationMs]);
  return <div role="status" aria-live="polite" className="sk-board-toast-region">
    {shown ? <div className="sk-board-toast"><Icon name="check-2" size={17} strokeWidth={2.4} /><span>{shown}</span></div> : null}
  </div>;
}
