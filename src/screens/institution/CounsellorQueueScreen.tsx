import React, { useCallback, useEffect, useRef, useState } from 'react';
import { apiRequest } from '../../data/services/http';
import { DataState, EmptyState, Field, FormError, SubmitButton, useMutation } from '../../components/interface/WorkflowUI';
import { ShopDialog } from '../../components/marketplace/ShopDialog';
import { Icon } from '@/design-system/icons';
import { useT } from '@/i18n';
import type { MessageKey } from '@/i18n';

/**
 * Counsellor queue (design: CampusCounsellor, Tier 1 — crisis follow-up).
 *
 * The live crisis follow-up queue for a counsellor's own campus (the server
 * scopes it; a super admin sees every campus). Each item is only what is needed
 * to reach out: the student's name, a way to reach them, the kind of signal,
 * when, and where follow-up stands. What the student wrote is never stored, so
 * it can never be shown. Refreshes every 15 seconds, like the SOS desk.
 */

export type CrisisOutcome = 'PENDING' | 'CONTACTED' | 'ESCALATED' | 'NO_CONTACT_NEEDED' | 'UNREACHABLE';
export interface CrisisQueueItem {
  id: string;
  studentName: string;
  contact: string;
  kind: string;
  /** Seconds since the epoch, as the server sends them. */
  createdAt: number;
  acknowledgedAt: number | null;
  outcome: CrisisOutcome;
}
interface CrisisQueue { items: CrisisQueueItem[]; total: number; pending: number }

export const ACK_WINDOW_MINUTES = 15;
export const QUEUE_POLL_MS = 15000;
const QUEUE_PATH = '/ops/crisis-events?limit=100';
const FOLLOW_UP_OUTCOMES = ['CONTACTED', 'ESCALATED', 'NO_CONTACT_NEEDED', 'UNREACHABLE'] as const;
type FollowUpOutcome = typeof FOLLOW_UP_OUTCOMES[number];
const KNOWN_KINDS = new Set(['CRISIS_SELF_HARM', 'CRISIS_MEDICAL', 'CRISIS_OVERDOSE', 'ERROR_FAIL_CLOSED']);
const isFollowUpOutcome = (value: string): value is FollowUpOutcome => (FOLLOW_UP_OUTCOMES as readonly string[]).includes(value);

const clockTime = (ms: number) => new Date(ms).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
const dayTime = (ms: number) => new Date(ms).toLocaleString(undefined, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
const isPhone = (contact: string) => /^\+?\d[\d\s-]{8,}$/.test(contact);
const isEmail = (contact: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact);

/** Where the 15-minute acknowledgement clock stands for one signal. */
export function acknowledgementClock(createdAtSeconds: number, nowMs: number): { overdue: boolean; minutes: number } {
  const remainingMs = ACK_WINDOW_MINUTES * 60000 - (nowMs - createdAtSeconds * 1000);
  return remainingMs > 0
    ? { overdue: false, minutes: Math.ceil(remainingMs / 60000) }
    : { overdue: true, minutes: Math.max(1, Math.floor(-remainingMs / 60000)) };
}

/**
 * Loads the queue and refreshes it on a timer. A refresh keeps the list on screen
 * (it never blanks under the counsellor); a refresh that fails says so with the
 * time of the last good load, rather than silently showing stale data as current.
 */
function useCrisisQueue() {
  const [data, setData] = useState<CrisisQueue | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refreshFailed, setRefreshFailed] = useState(false);
  const [loadedAt, setLoadedAt] = useState(0);
  const [now, setNow] = useState(() => Date.now());
  const controller = useRef<AbortController | null>(null);
  const hasData = useRef(false);

  const load = useCallback(() => {
    controller.current?.abort();
    const current = new AbortController();
    controller.current = current;
    apiRequest<CrisisQueue>(QUEUE_PATH, { signal: current.signal }).then(result => {
      if (current.signal.aborted) return;
      hasData.current = true;
      setData(result);
      setError('');
      setRefreshFailed(false);
      setLoadedAt(Date.now());
      setNow(Date.now());
    }).catch((reason: unknown) => {
      if (current.signal.aborted) return;
      if (hasData.current) setRefreshFailed(true);
      else setError(reason instanceof Error ? reason.message : 'The request could not be completed.');
    }).finally(() => { if (!current.signal.aborted) setLoading(false); });
  }, []);

  useEffect(() => {
    load();
    const timer = window.setInterval(() => { setNow(Date.now()); load(); }, QUEUE_POLL_MS);
    return () => { window.clearInterval(timer); controller.current?.abort(); };
  }, [load]);

  const retry = useCallback(() => { setLoading(true); setError(''); load(); }, [load]);
  return { data, loading, error, refreshFailed, loadedAt, now, reload: load, retry };
}

const ROW: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 'var(--sk-space-8)' };

export function CounsellorQueueScreen() {
  const t = useT();
  const queue = useCrisisQueue();
  const mutation = useMutation();
  const [following, setFollowing] = useState<CrisisQueueItem | null>(null);
  const [outcome, setOutcome] = useState<FollowUpOutcome | ''>('');
  const [note, setNote] = useState('');
  const items = queue.data?.items ?? [];

  const kindLabel = (kind: string) => t((KNOWN_KINDS.has(kind) ? `campus.counsellor.kind.${kind}` : 'campus.counsellor.kind.OTHER') as MessageKey);
  const outcomeLabel = (value: string) => (isFollowUpOutcome(value) ? t(`campus.counsellor.outcome.${value}` as MessageKey) : value);
  const ageLabel = (createdAt: number) => {
    const minutes = Math.floor((queue.now - createdAt * 1000) / 60000);
    if (minutes < 1) return t('campus.counsellor.age.justNow');
    if (minutes < 60) return t('campus.counsellor.age.minutes', { minutes });
    return t('campus.counsellor.age.at', { time: dayTime(createdAt * 1000) });
  };
  const openFollowUp = (item: CrisisQueueItem) => {
    setFollowing(item);
    setOutcome(isFollowUpOutcome(item.outcome) ? item.outcome : '');
    setNote('');
  };

  return <>
    <div className="wf-panel-heading"><div>
      <span className="care-eyebrow" style={ROW}><Icon name="heart-plus" size={14} />{t('nav.counsellorQueue')}</span>
      <h2>{t('campus.counsellor.title')}</h2>
      <p>{t('campus.counsellor.lead')}</p>
    </div>
    {/* A "0 waiting" badge reads as all-quiet; a count only shows when someone is waiting. */}
    {queue.data && queue.data.pending > 0 && <span className="wf-status status-declined" role="status">{t('campus.counsellor.waiting', { count: queue.data.pending })}</span>}
    </div>

    {queue.refreshFailed && <p className="care-form-error" role="alert"><Icon name="alert-triangle" size={16} />{t('campus.counsellor.refreshFailed', { time: clockTime(queue.loadedAt) })}</p>}

    <DataState loading={queue.loading} error={queue.error} retry={queue.retry}>
      {items.length ? <ul className="wf-order-list" style={{ listStyle: 'none', padding: 0, margin: 0 }}>{items.map(item => {
        const pending = item.outcome === 'PENDING';
        const clock = acknowledgementClock(item.createdAt, queue.now);
        const accent = pending ? (clock.overdue ? 'var(--sk-color-danger)' : 'var(--sk-color-attention)') : 'var(--sk-color-rule)';
        return <li key={item.id}><article className="wf-card wf-order" aria-label={t('campus.counsellor.itemLabel', { name: item.studentName })} style={{ borderLeft: `4px solid ${accent}` }}>
          <div className="wf-panel-heading"><div>
            <h3>{item.studentName}</h3>
            <p><strong>{t('campus.counsellor.kindLabel')}</strong> {kindLabel(item.kind)} · {t('campus.counsellor.signalled', { age: ageLabel(item.createdAt) })}</p>
          </div>
          {pending
            ? <span className="wf-status" style={{ ...ROW, color: accent }}><Icon name="timer" size={16} />{clock.overdue ? t('campus.counsellor.clock.overdue', { minutes: clock.minutes }) : t('campus.counsellor.clock.left', { minutes: clock.minutes })}</span>
            : <span className="wf-status status-completed" style={ROW}><Icon name="check-2" size={16} />{t('campus.counsellor.followedUp', { outcome: outcomeLabel(item.outcome), time: item.acknowledgedAt ? clockTime(item.acknowledgedAt * 1000) : '' })}</span>}
          </div>
          <p>
            <strong>{t('campus.counsellor.contact')}</strong>{' '}
            {isPhone(item.contact)
              ? <a className="health-text-button" href={`tel:${item.contact.replace(/[^\d+]/g, '')}`} aria-label={t('campus.counsellor.call', { name: item.studentName })}>{item.contact}</a>
              : isEmail(item.contact)
                ? <a className="health-text-button" href={`mailto:${item.contact}`} aria-label={t('campus.counsellor.email', { name: item.studentName })}>{item.contact}</a>
                : <span>{item.contact || t('campus.counsellor.noContact')}</span>}
          </p>
          <p className="wf-order-meta" style={ROW}><Icon name="lock" size={14} />{t('campus.counsellor.privacyNote')}</p>
          <div className="wf-row-actions">
            <button type="button" className={`health-button${pending ? ' health-button-primary' : ''}`} style={{ minHeight: 44 }} onClick={() => openFollowUp(item)}>
              {pending ? t('campus.counsellor.acknowledge') : t('campus.counsellor.update')}
            </button>
          </div>
        </article></li>;
      })}</ul> : <EmptyState title={t('campus.counsellor.emptyTitle')} description={t('campus.counsellor.emptyBody')} />}
    </DataState>

    <section className="wf-card wf-section-gap" aria-labelledby="counsellor-visibility-title">
      <h3 id="counsellor-visibility-title" style={ROW}><Icon name="shield-check" size={18} />{t('campus.counsellor.canSee.title')}</h3>
      <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: 'var(--sk-space-8)' }}>
        <li style={ROW}><Icon name="check" size={18} color="var(--sk-color-positive)" label={t('campus.counsellor.canLabel')} />{t('campus.counsellor.canSee.when')}</li>
        <li style={ROW}><Icon name="check" size={18} color="var(--sk-color-positive)" label={t('campus.counsellor.canLabel')} />{t('campus.counsellor.canSee.who')}</li>
        <li style={ROW}><Icon name="x" size={18} color="var(--sk-color-danger)" label={t('campus.counsellor.cannotLabel')} />{t('campus.counsellor.cannot.text')}</li>
        <li style={ROW}><Icon name="x" size={18} color="var(--sk-color-danger)" label={t('campus.counsellor.cannotLabel')} />{t('campus.counsellor.cannot.records')}</li>
      </ul>
    </section>

    {following && <ShopDialog title={t('campus.counsellor.ackTitle', { name: following.studentName })} onClose={() => setFollowing(null)}>
      <form className="wf-form" onSubmit={event => {
        event.preventDefault();
        if (!outcome) return;
        const target = following;
        mutation.run(
          () => apiRequest(`/ops/crisis-events/${encodeURIComponent(target.id)}/acknowledge`, { method: 'POST', body: JSON.stringify({ outcome, note: note.trim() }) }),
          () => { setFollowing(null); queue.reload(); },
        );
      }}>
        <FormError message={mutation.error} />
        <fieldset className="wf-field" style={{ border: 0, padding: 0, margin: 0 }}>
          <legend>{t('campus.counsellor.outcomeLegend')}</legend>
          {FOLLOW_UP_OUTCOMES.map(value => <label key={value} style={{ ...ROW, minHeight: 44 }}>
            <input type="radio" name="crisis-outcome" value={value} required checked={outcome === value} onChange={() => setOutcome(value)} />
            {t(`campus.counsellor.outcome.${value}` as MessageKey)}
          </label>)}
        </fieldset>
        <Field label={t('campus.counsellor.note')} hint={t('campus.counsellor.noteHint')}><textarea maxLength={500} rows={3} value={note} onChange={event => setNote(event.target.value)} /></Field>
        <SubmitButton busy={mutation.busy}>{t('campus.counsellor.ackSubmit')}</SubmitButton>
      </form>
    </ShopDialog>}
  </>;
}
