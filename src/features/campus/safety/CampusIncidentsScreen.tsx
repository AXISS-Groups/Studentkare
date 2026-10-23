import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ConsolePageHeader } from '@/design-system/console/ConsoleTablePage';
import { Drawer } from '@/design-system/overlays/Drawer';
import { Icon } from '@/design-system/icons';
import { SkButton, Skeleton } from '@/design-system/primitives';
import { apiRequest } from '@/data/services/http';
import { useAuth } from '@/data/contexts/AuthContext';
import { useLanguage, useT } from '@/i18n';
import type { MessageKey } from '@/i18n';
import { navigate } from '@/lib/utils/workflowRouting';
import { Unavailable, statusOf } from '@/features/campus/boards/boardKit';
import { BoardEmpty, BoardError, EmergencyLines, OfflineNotice } from './safetyKit';
import './campus-safety.css';

/**
 * Incidents (design page 4, CampusIncidents; Tier 1, approved 2026-10-21).
 *
 * The board is a four-column desk (New, Triaged, Dispatched, Resolved). The
 * only incident source the server has is the student SOS (`GET /ops/sos`,
 * campus-scoped by the server), so that is what fills it:
 * - New = an SOS no one has acknowledged; Acknowledged = acknowledged on the
 *   SOS desk (named for what happened, not "Triaged": nobody triaged it here);
 *   Resolved = closed or cancelled.
 * - Dispatched has no source (no dispatch is recorded) and says so.
 * - A card shows "SOS from a student", the place and the age: never a name,
 *   condition or contact. The name appears only in the incident's own panel,
 *   for the campus responders who already see it on the SOS desk.
 * - Acknowledge and close stay on the SOS desk, unchanged: this board links
 *   there rather than carrying a second copy of those safety actions.
 * - Warden or staff reports, notes, "Send medical officer" and "Hostel visit"
 *   have no model: shown disabled with the reason, never faked.
 *
 * 108 is first on the page and works in every state (loading, error, offline).
 * Refreshes every 15 seconds like the SOS desk; a refresh that fails keeps the
 * board on screen and says when it was last loaded.
 */
export type SosStatus = 'ACTIVE' | 'ACKNOWLEDGED' | 'RESOLVED' | 'CANCELLED';
export interface IncidentAlert {
  id: string;
  status: SosStatus;
  locationNote: string | null;
  /** Seconds since the epoch, as the server sends them. */
  createdAt: number;
  acknowledgedAt: number | null;
  resolvedAt: number | null;
  cancelledAt: number | null;
  student: { name: string; hostel: string | null };
}
interface SecurityContact { id: string; name: string }

export const INCIDENTS_PATH = '/ops/sos?open=false';
export const CONTACTS_PATH = '/ops/campus/security-contacts';
export const INCIDENTS_POLL_MS = 15000;
const BOARD = 'CampusIncidents';
const MINUTE_MS = 60000;
const MINUTES_PER_HOUR = 60;
const SECOND_MS = 1000;

type ColumnId = 'new' | 'acknowledged' | 'dispatched' | 'resolved';
const COLUMNS: ReadonlyArray<{ id: ColumnId; label: MessageKey; statuses: readonly SosStatus[] }> = [
  { id: 'new', label: 'campusSafety.incidents.col.new', statuses: ['ACTIVE'] },
  { id: 'acknowledged', label: 'campusSafety.incidents.col.acknowledged', statuses: ['ACKNOWLEDGED'] },
  { id: 'dispatched', label: 'campusSafety.incidents.col.dispatched', statuses: [] },
  { id: 'resolved', label: 'campusSafety.incidents.col.resolved', statuses: ['RESOLVED', 'CANCELLED'] },
];

type Load =
  | { kind: 'loading' }
  | { kind: 'ready'; items: IncidentAlert[]; loadedAt: number; refreshFailed: boolean }
  | { kind: 'failed'; status: number };

function useIncidents(): { state: Load; retry: () => void; now: number } {
  const [state, setState] = useState<Load>({ kind: 'loading' });
  const [now, setNow] = useState(() => Date.now());
  const controller = useRef<AbortController | null>(null);
  const load = useCallback(() => {
    controller.current?.abort();
    const current = new AbortController();
    controller.current = current;
    apiRequest<{ items: IncidentAlert[] }>(INCIDENTS_PATH, { signal: current.signal })
      .then((result) => {
        if (current.signal.aborted) return;
        setNow(Date.now());
        setState({ kind: 'ready', items: result.items, loadedAt: Date.now(), refreshFailed: false });
      })
      .catch((reason: unknown) => {
        if (current.signal.aborted) return;
        // A failed refresh keeps the board; only a first load that fails shows the error.
        setState((previous) => (previous.kind === 'ready' ? { ...previous, refreshFailed: true } : { kind: 'failed', status: statusOf(reason) }));
      });
  }, []);
  useEffect(() => {
    load();
    const timer = window.setInterval(() => { setNow(Date.now()); load(); }, INCIDENTS_POLL_MS);
    return () => { window.clearInterval(timer); controller.current?.abort(); };
  }, [load]);
  const retry = useCallback(() => { setState({ kind: 'loading' }); load(); }, [load]);
  return { state, retry, now };
}

function SecurityContactsChip(): React.ReactElement | null {
  const t = useT();
  const { user } = useAuth();
  // The super admin's list needs a named campus; the SOS desk handles that.
  const scoped = user?.role === 'CAMPUS_ADMIN';
  const [contacts, setContacts] = useState<SecurityContact[] | null | 'failed'>(null);
  useEffect(() => {
    if (!scoped) return undefined;
    let live = true;
    apiRequest<{ items: SecurityContact[] }>(CONTACTS_PATH)
      .then((result) => { if (live) setContacts(result.items); })
      .catch(() => { if (live) setContacts('failed'); });
    return () => { live = false; };
  }, [scoped]);
  if (!scoped || contacts === null) return null;
  if (contacts === 'failed') return <span className="cs-chip cs-chip--neutral">{t('campusSafety.incidents.contactsUnknown')}</span>;
  if (!contacts.length) return <span className="cs-chip cs-chip--neutral">{t('campusSafety.incidents.contactsNone')}</span>;
  return (
    <span className="cs-chip cs-chip--positive">
      <span className="cs-chip__dot" aria-hidden="true" />
      {t('campusSafety.incidents.contacts', { names: contacts.map((contact) => contact.name).join(', ') })}
    </span>
  );
}

export function CampusIncidentsScreen(): React.ReactElement {
  const t = useT();
  const { lang } = useLanguage();
  const locale = lang === 'en' ? 'en-IN' : `${lang}-IN`;
  const { state, retry, now } = useIncidents();
  const [openId, setOpenId] = useState<string | null>(null);

  const clock = (seconds: number | null) => (seconds ? new Date(seconds * SECOND_MS).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' }) : '');
  const age = (alert: IncidentAlert) => {
    const minutes = Math.max(0, Math.floor((now - alert.createdAt * SECOND_MS) / MINUTE_MS));
    return minutes < MINUTES_PER_HOUR
      ? t('campusSafety.incidents.ageMinutes', { count: minutes })
      : t('campusSafety.incidents.ageHours', { count: Math.floor(minutes / MINUTES_PER_HOUR) });
  };
  const where = (alert: IncidentAlert) => alert.locationNote || alert.student.hostel || t('campusSafety.incidents.whereNone');
  const owner = (alert: IncidentAlert) => {
    if (alert.status === 'ACKNOWLEDGED') return t('campusSafety.incidents.owner.ACKNOWLEDGED', { time: clock(alert.acknowledgedAt) });
    if (alert.status === 'RESOLVED') return t('campusSafety.incidents.owner.RESOLVED', { time: clock(alert.resolvedAt) });
    if (alert.status === 'CANCELLED') return t('campusSafety.incidents.owner.CANCELLED');
    return t('campusSafety.incidents.owner.ACTIVE');
  };

  const items = state.kind === 'ready' ? state.items : [];
  const current = items.find((alert) => alert.id === openId) ?? null;

  return (
    <div className="sk-ds cs-board">
      <ConsolePageHeader
        title={t('campusSafety.incidents.title')}
        subtitle={t('campusSafety.incidents.subtitle')}
        actions={(
          <SkButton disabled><Icon name="plus" size={17} />
            {t('campusSafety.incidents.log')}
            <Unavailable reason="campusSafety.incidents.logUnavailable" />
          </SkButton>
        )}
      />
      <div className="cs-strip">
        <SecurityContactsChip />
        <EmergencyLines numbers={['108', '112']} lead="campusSafety.incidents.lifeThreat" />
      </div>
      <OfflineNotice />

      {state.kind === 'loading' ? (
        <div className="cs-kanban" role="status" aria-busy="true" aria-label={t('campusSafety.incidents.loading')}>
          {COLUMNS.map((column) => <Skeleton key={column.id} height={240} />)}
        </div>
      ) : null}
      {state.kind === 'failed' ? (
        <BoardError
          title={t('campusSafety.incidents.error')}
          reference={t('campusBoards.ref', { code: state.status ? String(state.status) : 'NET', board: BOARD })}
          onRetry={retry}
          onHelp={() => navigate('support')}
        />
      ) : null}
      {state.kind === 'ready' && state.refreshFailed ? (
        <p className="cs-alert" role="alert"><Icon name="alert-triangle" size={16} />{t('campusSafety.incidents.refreshFailed', { time: clock(state.loadedAt / SECOND_MS) })}</p>
      ) : null}
      {state.kind === 'ready' && items.length === 0 ? (
        <BoardEmpty
          tile="chart-alt--p4"
          title={t('campusSafety.incidents.empty')}
          body={t('campusSafety.incidents.emptyBody')}
          action={{ label: t('campusSafety.incidents.emptyCta'), onSelect: () => navigate('campus/sos') }}
        />
      ) : null}
      {state.kind === 'ready' && items.length > 0 ? (
        <section className="cs-kanban" aria-label={t('campusSafety.incidents.board')}>
          {COLUMNS.map((column) => {
            const cards = items.filter((alert) => column.statuses.includes(alert.status));
            const headingId = `inc-col-${column.id}`;
            return (
              <section key={column.id} className={`cs-col cs-col--${column.id}`} aria-labelledby={headingId}>
                <h2 id={headingId} className="cs-col__head">
                  <span className="cs-chip__dot" aria-hidden="true" />
                  {t(column.label)}
                  {column.id === 'dispatched' ? null : <span className="cs-col__count" aria-label={t('campusSafety.incidents.colCount', { count: cards.length, column: t(column.label) })}>{cards.length}</span>}
                </h2>
                {column.id === 'dispatched' ? <p className="cs-col__empty">{t('campusSafety.incidents.dispatchedUnavailable')}</p> : null}
                {column.id !== 'dispatched' && cards.length === 0 ? <p className="cs-col__empty">{t('campusSafety.incidents.columnEmpty')}</p> : null}
                {cards.length ? (
                  <ul className="cs-col__list">
                    {cards.map((alert) => {
                      const live = alert.status === 'ACTIVE';
                      return (
                        <li key={alert.id}>
                          <button
                            type="button"
                            className={`cs-inc${live ? ' cs-inc--live' : ''}`}
                            onClick={() => setOpenId(alert.id)}
                            aria-label={t('campusSafety.incidents.open', { where: where(alert), age: age(alert) })}
                          >
                            <span className="cs-inc__top">
                              <span className="cs-chip cs-chip--danger">{t('campusSafety.incidents.sos')}</span>
                              <span className={`cs-inc__age${live ? ' is-late' : ''}`}>{age(alert)}</span>
                            </span>
                            <span className="cs-inc__title">{t('campusSafety.incidents.cardTitle')}</span>
                            <span className="cs-inc__where"><Icon name="pin" size={14} />{where(alert)}</span>
                            <span className="cs-inc__owner">{owner(alert)}</span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                ) : null}
              </section>
            );
          })}
        </section>
      ) : null}

      <Drawer
        open={current !== null}
        title={current ? t('campusSafety.incidents.drawer.title', { name: current.student.name }) : ''}
        subtitle={current ? t('campusSafety.incidents.drawer.sub', { time: clock(current.createdAt) }) : undefined}
        eyebrow={t('campusSafety.incidents.sos')}
        eyebrowTone="danger"
        onClose={() => setOpenId(null)}
      >
        {current ? (
          <div className="cs-drawer">
            <dl className="cs-dl">
              <dt>{t('campusSafety.incidents.drawer.where')}</dt>
              <dd>{where(current)}</dd>
              <dt>{t('campusSafety.incidents.drawer.by')}</dt>
              <dd>{t('campusSafety.incidents.drawer.byStudent', { name: current.student.name })}</dd>
            </dl>
            <div className="cs-drawer__section">
              <h3 className="cs-field__label">{t('campusSafety.incidents.drawer.dispatch')}</h3>
              <div className="cs-dispatch">
                <EmergencyLines numbers={['108']} />
                <SkButton variant="secondary" onClick={() => navigate('campus-break-glass')}><Icon name="heart-plus" size={17} />{t('campusSafety.incidents.drawer.emergencyCard')}</SkButton>
                <SkButton variant="secondary" disabled><Icon name="user" size={17} />{t('campusSafety.incidents.drawer.medicalOfficer')}<Unavailable reason="campusSafety.incidents.drawer.dispatchUnavailable" /></SkButton>
                <SkButton variant="secondary" disabled><Icon name="hostel" size={17} />{t('campusSafety.incidents.drawer.hostelVisit')}<Unavailable reason="campusSafety.incidents.drawer.dispatchUnavailable" /></SkButton>
              </div>
              <p className="cs-field__hint">{t('campusSafety.incidents.drawer.dispatchUnavailable')}</p>
            </div>
            <div className="cs-drawer__section">
              <h3 className="cs-field__label">{t('campusSafety.incidents.drawer.timeline')}</h3>
              <ol className="cs-timeline">
                <li><span>{t('campusSafety.incidents.event.raised')}</span><time>{clock(current.createdAt)}</time></li>
                {current.acknowledgedAt ? <li><span>{t('campusSafety.incidents.event.acknowledged')}</span><time>{clock(current.acknowledgedAt)}</time></li> : null}
                {current.resolvedAt ? <li><span>{t('campusSafety.incidents.event.resolved')}</span><time>{clock(current.resolvedAt)}</time></li> : null}
                {current.cancelledAt ? <li><span>{t('campusSafety.incidents.event.cancelled')}</span><time>{clock(current.cancelledAt)}</time></li> : null}
              </ol>
              <p className="cs-field__hint">{t('campusSafety.incidents.drawer.notesUnavailable')}</p>
            </div>
            <SkButton onClick={() => navigate('campus/sos')}>{t('campusSafety.incidents.drawer.respond')}</SkButton>
          </div>
        ) : null}
      </Drawer>
    </div>
  );
}
