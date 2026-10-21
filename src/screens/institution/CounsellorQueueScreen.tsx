import React, { useCallback, useEffect, useRef, useState } from 'react';
import { apiRequest } from '../../data/services/http';
import { useMutation } from '../../components/interface/WorkflowUI';
import { ConsolePageHeader } from '@/design-system/console/ConsoleTablePage';
import { Drawer } from '@/design-system/overlays/Drawer';
import { Icon } from '@/design-system/icons';
import { SkButton, Skeleton } from '@/design-system/primitives';
import { useT } from '@/i18n';
import type { MessageKey } from '@/i18n';
import { navigate } from '@/lib/utils/workflowRouting';
import { BoardEmpty, BoardError, EmergencyLines, OfflineNotice, SafetyCard, SafetyNotice } from '@/features/campus/safety/safetyKit';
import '@/features/campus/safety/campus-safety.css';

/**
 * Counsellor queue (design page 4, CampusCounsellor; Tier 1 — crisis
 * follow-up; built to the canvas 2026-10-21, approved by Krishna Chintakayala).
 *
 * Board layout: a queue of signals, each with the acknowledgement ring, the
 * kind, where follow-up stands and one action; beside it the escalation note
 * and "What you can and can't see". Left out because nothing backs them: the
 * on-call roster (no roster source), the weekly median (no server aggregate,
 * shown as "—") and the board's escalation promise (the server does not
 * escalate an unacknowledged signal today, so the page says that instead).
 * The 15-minute window is the existing behaviour, unchanged.
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

const BOARD = 'CampusCounsellor';
const DANGER_KINDS = new Set(['CRISIS_SELF_HARM', 'CRISIS_MEDICAL', 'CRISIS_OVERDOSE']);
const ACK_WINDOW_MS = ACK_WINDOW_MINUTES * 60000;

/** Share of the acknowledgement window used so far, 0–1, for the ring. */
export function windowUsed(createdAtSeconds: number, nowMs: number): number {
  return Math.min(1, Math.max(0, (nowMs - createdAtSeconds * 1000) / ACK_WINDOW_MS));
}

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
    mutation.setError('');
    setFollowing(item);
    setOutcome(isFollowUpOutcome(item.outcome) ? item.outcome : '');
    setNote('');
  };
  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!following || !outcome) return;
    const target = following;
    mutation.run(
      () => apiRequest(`/ops/crisis-events/${encodeURIComponent(target.id)}/acknowledge`, { method: 'POST', body: JSON.stringify({ outcome, note: note.trim() }) }),
      () => { setFollowing(null); queue.reload(); },
    );
  };

  const pending = queue.data?.pending ?? 0;

  return (
    <div className="sk-ds cs-board">
      <ConsolePageHeader
        title={t('campus.counsellor.title')}
        subtitle={t('campusSafety.counsellor.lead', { minutes: ACK_WINDOW_MINUTES })}
        actions={(
          <span className="cs-head-actions">
            {/* A "0 waiting" badge reads as all-quiet; a count only shows when someone is waiting. */}
            {pending > 0 ? <span className="cs-chip cs-chip--danger" role="status"><span className="cs-chip__dot" aria-hidden="true" />{t('campus.counsellor.waiting', { count: pending })}</span> : null}
            <span className="cs-chip cs-chip--positive sk-mono">{t('campusSafety.counsellor.median')}</span>
          </span>
        )}
      />
      <OfflineNotice />
      {queue.refreshFailed ? <p className="cs-alert" role="alert"><Icon name="alert-triangle" size={16} />{t('campus.counsellor.refreshFailed', { time: clockTime(queue.loadedAt) })}</p> : null}

      <div className="cs-two cs-two--wide-left">
        <div className="cs-drawer">
          {queue.loading && !queue.data ? (
            <div className="cs-queue" role="status" aria-busy="true" aria-label={t('campusSafety.counsellor.loading')}>
              <Skeleton height={88} /><Skeleton height={88} /><Skeleton height={88} />
            </div>
          ) : null}
          {queue.error && !queue.data ? (
            <BoardError
              title={t('campusSafety.counsellor.error')}
              detail={queue.error}
              reference={t('campusBoards.ref', { code: 'NET', board: BOARD })}
              onRetry={queue.retry}
              onHelp={() => navigate('support')}
            />
          ) : null}
          {queue.data && items.length === 0 ? (
            <BoardEmpty tile="chart-alt--p4" title={t('campusSafety.counsellor.empty')} body={t('campus.counsellor.emptyBody')} />
          ) : null}
          {items.length ? (
            <ul className="cs-queue" aria-label={t('campusSafety.counsellor.queue')}>
              {items.map((item) => {
                const isPending = item.outcome === 'PENDING';
                const clock = acknowledgementClock(item.createdAt, queue.now);
                const ring = { '--cs-ring-pct': String(windowUsed(item.createdAt, queue.now)) } as React.CSSProperties;
                return (
                  <li key={item.id}>
                    <article className={`cs-signal${isPending && clock.overdue ? ' cs-signal--late' : ''}`} aria-label={t('campus.counsellor.itemLabel', { name: item.studentName })}>
                      {isPending ? (
                        <span className={`cs-ring${clock.overdue ? ' cs-ring--late' : ''}`} style={ring} aria-hidden="true">
                          <span className="cs-ring__value">{clock.overdue ? 0 : clock.minutes}</span>
                          <span className="cs-ring__unit">{t('campusSafety.counsellor.minutesLeft')}</span>
                        </span>
                      ) : (
                        <span className="cs-ring cs-ring--done" aria-hidden="true"><Icon name="check" size={20} strokeWidth={2.6} /></span>
                      )}
                      <div className="cs-signal__main">
                        <div className="cs-signal__row">
                          <h2 className="cs-signal__name">{item.studentName}</h2>
                          <span className={`cs-chip cs-chip--${DANGER_KINDS.has(item.kind) ? 'danger' : 'neutral'}`}>
                            <span className="sk-visually-hidden">{t('campus.counsellor.kindLabel')} </span>{kindLabel(item.kind)}
                          </span>
                        </div>
                        <span className="cs-signal__meta">{t('campus.counsellor.signalled', { age: ageLabel(item.createdAt) })}</span>
                        <span className="cs-signal__contact">
                          {t('campus.counsellor.contact')}{' '}
                          {isPhone(item.contact)
                            ? <a href={`tel:${item.contact.replace(/[^\d+]/g, '')}`} aria-label={t('campus.counsellor.call', { name: item.studentName })}>{item.contact}</a>
                            : isEmail(item.contact)
                              ? <a href={`mailto:${item.contact}`} aria-label={t('campus.counsellor.email', { name: item.studentName })}>{item.contact}</a>
                              : <span>{item.contact || t('campus.counsellor.noContact')}</span>}
                        </span>
                        <span className="cs-signal__privacy"><Icon name="lock" size={14} />{t('campus.counsellor.privacyNote')}</span>
                      </div>
                      <div className="cs-signal__side">
                        {isPending ? (
                          <span className={`cs-chip cs-chip--${clock.overdue ? 'danger' : 'neutral'}`}>
                            <Icon name="timer" size={14} />
                            {clock.overdue ? t('campus.counsellor.clock.overdue', { minutes: clock.minutes }) : t('campus.counsellor.clock.left', { minutes: clock.minutes })}
                          </span>
                        ) : (
                          <span className="cs-chip cs-chip--positive"><Icon name="check-2" size={14} />{t('campus.counsellor.followedUp', { outcome: outcomeLabel(item.outcome), time: item.acknowledgedAt ? clockTime(item.acknowledgedAt * 1000) : '' })}</span>
                        )}
                        <SkButton variant={isPending ? 'primary' : 'secondary'} onClick={() => openFollowUp(item)}>
                          {isPending ? t('campus.counsellor.acknowledge') : t('campus.counsellor.update')}
                        </SkButton>
                      </div>
                    </article>
                  </li>
                );
              })}
            </ul>
          ) : null}
        </div>

        <div className="cs-drawer">
          <SafetyCard labelledBy="counsellor-lines" title={t('campusSafety.counsellor.linesTitle')}>
            <EmergencyLines numbers={['14416', '112']} />
            <SafetyNotice icon="info" tone="attention">{t('campusSafety.counsellor.escalation')}</SafetyNotice>
          </SafetyCard>
          <SafetyCard labelledBy="counsellor-visibility-title" title={t('campus.counsellor.canSee.title')}>
            <ul className="cs-list">
              <li><Icon name="check" size={18} className="cs-tick" label={t('campus.counsellor.canLabel')} />{t('campus.counsellor.canSee.when')}</li>
              <li><Icon name="check" size={18} className="cs-tick" label={t('campus.counsellor.canLabel')} />{t('campus.counsellor.canSee.who')}</li>
              <li><Icon name="x" size={18} className="cs-cross" label={t('campus.counsellor.cannotLabel')} />{t('campus.counsellor.cannot.text')}</li>
              <li><Icon name="x" size={18} className="cs-cross" label={t('campus.counsellor.cannotLabel')} />{t('campus.counsellor.cannot.records')}</li>
            </ul>
          </SafetyCard>
        </div>
      </div>

      <Drawer
        open={following !== null}
        title={following ? t('campus.counsellor.ackTitle', { name: following.studentName }) : ''}
        subtitle={following ? t('campusSafety.counsellor.drawerSub', { kind: kindLabel(following.kind) }) : undefined}
        busy={mutation.busy}
        onClose={() => setFollowing(null)}
      >
        <form className="cs-drawer" onSubmit={submit}>
          {mutation.error ? <p className="cs-form-error" role="alert">{mutation.error}</p> : null}
          <fieldset className="cs-radios">
            <legend className="cs-field__label">{t('campus.counsellor.outcomeLegend')}</legend>
            {FOLLOW_UP_OUTCOMES.map((value) => (
              <label key={value} className="cs-radio">
                <input type="radio" name="crisis-outcome" value={value} required checked={outcome === value} onChange={() => setOutcome(value)} />
                {t(`campus.counsellor.outcome.${value}` as MessageKey)}
              </label>
            ))}
          </fieldset>
          <div className="cs-field">
            <label className="cs-field__label" htmlFor="crisis-note">{t('campus.counsellor.note')}</label>
            <textarea id="crisis-note" className="cs-textarea" maxLength={500} rows={3} value={note} onChange={(event) => setNote(event.target.value)} aria-describedby="crisis-note-hint" />
            <span id="crisis-note-hint" className="cs-field__hint">{t('campus.counsellor.noteHint')}</span>
          </div>
          <SkButton type="submit" className="cs-submit" busy={mutation.busy}>{t('campus.counsellor.ackSubmit')}</SkButton>
        </form>
      </Drawer>
    </div>
  );
}
