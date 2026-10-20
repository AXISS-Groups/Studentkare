import React, { useEffect } from 'react';
import { observer } from 'mobx-react-lite';
import { Avatar, DestinationButton, SkButton, SkSkeleton as Skeleton, StatusPill, SkToast as Toast } from '@/design-system';
import { Icon } from '@/design-system/icons';
import { useT } from '@/i18n';
import type { MessageKey } from '@/i18n';
import type { RoutePath } from '@/lib/utils/workflowRouting';
import type { ClinicianQueueViewModel } from './ClinicianQueueViewModel';
import type { ConsentState, QueueAction, QueueData, QueueEntry, RecordAccessItem } from './queueModel';
import { actionFor, confirmedCount, initialsOf, waitingCount, waitingMinutes } from './queueModel';
import { clock24, shortName } from '../shared/appointmentsSource';
import { ClinicianEmptyState, ClinicianErrorState } from '../shared/ClinicianStates';
import { REVIEW_ROUTES } from '../shared/reviewRoutes';
import './clinician-queue.css';

/** `null` = that screen is not built yet (shown, disabled, and says so). */
const ROUTES = {
  consultRoom: REVIEW_ROUTES.consultRoom(),
  accessLog: null,
  crisis: null,
  schedule: 'clinician/schedule',
  help: 'support',
} satisfies Record<string, RoutePath | null>;

const CONSENT: Record<ConsentState, { key: MessageKey; tone: 'positive' | 'attention' | 'neutral' }> = {
  active: { key: 'clinQueue.consent.active', tone: 'positive' },
  awaiting: { key: 'clinQueue.consent.awaiting', tone: 'attention' },
  expired: { key: 'clinQueue.consent.expired', tone: 'attention' },
  unreported: { key: 'clinQueue.consent.unreported', tone: 'neutral' },
};

const ACTION: Record<Exclude<QueueAction, 'none'>, { idle: MessageKey; done: MessageKey }> = {
  'open-consult': { idle: 'clinQueue.action.open', done: 'clinQueue.action.open' },
  'request-access': { idle: 'clinQueue.action.request', done: 'clinQueue.action.requested' },
  'ask-renew': { idle: 'clinQueue.action.renew', done: 'clinQueue.action.renewRequested' },
};

export interface ClinicianQueueViewProps {
  viewModel: ClinicianQueueViewModel;
  onNavigate: (route: RoutePath) => void;
}

export const ClinicianQueueView = observer(function ClinicianQueueView({ viewModel, onNavigate }: ClinicianQueueViewProps): React.ReactElement {
  const t = useT();
  const { status, data } = viewModel;
  useEffect(() => viewModel.startClock(), [viewModel]);

  let body: React.ReactNode;
  if (status === 'loading') body = <QueueSkeleton />;
  else if (status === 'error') {
    body = (
      <ClinicianErrorState
        title={t('clinQueue.errorTitle')}
        reference={t('clinQueue.reference')}
        onRetry={() => { void viewModel.load(); }}
        onHelp={() => onNavigate(ROUTES.help)}
      />
    );
  } else if (status === 'unconnected') {
    body = <QueueBlank onNavigate={onNavigate} />;
  } else if (status === 'empty' || !data) {
    body = (
      <ClinicianEmptyState
        title={t('clinQueue.emptyTitle')}
        body={t('clinQueue.emptyBody')}
        action={{ label: t('clinQueue.emptyAction'), onSelect: () => onNavigate(ROUTES.schedule) }}
      />
    );
  } else {
    body = <QueueReady viewModel={viewModel} data={data} onNavigate={onNavigate} />;
  }

  const toast = viewModel.toast ? t(viewModel.toast.key, viewModel.toast.vars) : null;
  return (
    <>
      {body}
      <Toast message={toast} onDone={viewModel.clearToast} />
    </>
  );
});

/* ------------------------------------------------------------- side cards */

/** Always true, so always shown: what a clinician can never see, and that every look is logged. */
function SideCards({ onNavigate, crisis }: { onNavigate: (route: RoutePath) => void; crisis: number | null }): React.ReactElement {
  const t = useT();
  let crisisMeta = t('clinQueue.crisisUnreported');
  if (crisis !== null) crisisMeta = crisis > 0 ? t('clinQueue.crisisFlagged', { count: crisis }) : t('clinQueue.crisisNone');
  return (
    <>
      <section className="cq-cannot sk-rise" aria-labelledby="cq-cannot-title" style={{ '--sk-stagger': 2 } as React.CSSProperties}>
        <h2 id="cq-cannot-title" className="cq-eyebrow cq-eyebrow--action">{t('clinQueue.cannotTitle')}</h2>
        <p className="cq-body">{t('clinQueue.cannotBody')}</p>
      </section>

      <section className="cq-panel sk-rise" aria-labelledby="cq-logged-title" style={{ '--sk-stagger': 3 } as React.CSSProperties}>
        <h2 id="cq-logged-title" className="cq-eyebrow">{t('clinQueue.loggedTitle')}</h2>
        <p className="cq-body cq-body--muted">{t('clinQueue.loggedBody')}</p>
        <DestinationButton route={ROUTES.accessLog} onNavigate={onNavigate} className="sk-link cq-link">{t('clinQueue.accessLog')}</DestinationButton>
      </section>

      <DestinationButton route={ROUTES.crisis} onNavigate={onNavigate} className="cq-crisis sk-fade">
        <Icon name="shield-2" size={20} className="cq-crisis__icon" />
        <span className="cq-crisis__text">
          <span className="cq-crisis__title">{t('clinQueue.crisisTitle')}</span>
          <span className="cq-crisis__meta">{crisisMeta}</span>
        </span>
      </DestinationButton>
    </>
  );
}

/* ------------------------------------------------------------------ blank */

/** Not connected: the layout with nobody in it. Nothing is invented. */
function QueueBlank({ onNavigate }: { onNavigate: (route: RoutePath) => void }): React.ReactElement {
  const t = useT();
  return (
    <>
      <div className="cq-head sk-fade">
        <div className="cq-head__titles">
          <h1 className="cq-title">{t('clinQueue.title')}</h1>
          <p className="cq-subtitle">{t('clinQueue.blankSubtitle')}</p>
        </div>
        <StatusPill tone="neutral" dot className="cq-accepting">{t('clinQueue.notConnected')}</StatusPill>
      </div>
      <div className="cq-grid">
        <div className="cq-blank sk-rise" role="status">
          <strong>{t('clinQueue.unconnectedTitle')}</strong>
          <span>{t('clinQueue.unconnectedBody')}</span>
        </div>
        <div className="cq-side"><SideCards onNavigate={onNavigate} crisis={null} /></div>
      </div>
    </>
  );
}

/* ------------------------------------------------------------------ ready */

const QueueReady = observer(function QueueReady({ viewModel, data, onNavigate }: { viewModel: ClinicianQueueViewModel; data: QueueData; onNavigate: (route: RoutePath) => void }): React.ReactElement {
  const t = useT();
  const selected = viewModel.selected;
  const summary = data.activeRelationships !== null
    ? t('clinQueue.summaryCare', { students: data.activeRelationships, waiting: waitingCount(data) })
    : t('clinQueue.summaryBooked', { booked: data.entries.length, confirmed: confirmedCount(data) });
  let accepting: { tone: 'positive' | 'neutral'; label: string; live: boolean } = { tone: 'neutral', label: t('clinQueue.availabilityUnreported'), live: false };
  if (data.accepting !== null) {
    accepting = data.accepting
      ? { tone: 'positive', label: t('clinQueue.accepting'), live: true }
      : { tone: 'neutral', label: t('clinQueue.notAccepting'), live: false };
  }
  return (
    <>
      <div className="cq-head sk-fade">
        <div className="cq-head__titles">
          <h1 className="cq-title">{t('clinQueue.title')}</h1>
          <p className="cq-subtitle">{summary}</p>
        </div>
        <StatusPill tone={accepting.tone} dot={accepting.live ? 'live' : true} className="cq-accepting">{accepting.label}</StatusPill>
      </div>

      <div className="cq-grid">
        <ul className="cq-list" aria-label={t('clinQueue.listLabel')}>
          {data.entries.map((entry, index) => (
            <QueueCard
              key={entry.id}
              entry={entry}
              index={index}
              now={viewModel.now}
              selected={entry.id === viewModel.selectedId}
              busy={viewModel.requestingId === entry.id}
              canRequest={viewModel.canRequest}
              onSelect={() => viewModel.select(entry.id)}
              onRequest={() => { void viewModel.requestAccess(entry.id); }}
              onNavigate={onNavigate}
            />
          ))}
        </ul>

        <div className="cq-side">
          {selected ? <AccessPanel entry={selected} /> : null}
          <SideCards onNavigate={onNavigate} crisis={data.crisisFlagged24h} />
        </div>
      </div>
    </>
  );
});

/* ------------------------------------------------------------- queue card */

function QueueCard({ entry, index, now, selected, busy, canRequest, onSelect, onRequest, onNavigate }: {
  entry: QueueEntry;
  index: number;
  now: Date;
  selected: boolean;
  busy: boolean;
  canRequest: boolean;
  onSelect: () => void;
  onRequest: () => void;
  onNavigate: (route: RoutePath) => void;
}): React.ReactElement {
  const t = useT();
  const active = entry.consent === 'active' || (entry.consent === 'unreported' && entry.booking === 'CONFIRMED');
  const action = actionFor(entry);
  const consent = CONSENT[entry.consent];
  const name = shortName(entry.patientName);
  const minutes = waitingMinutes(entry, now);
  let time = '';
  if (minutes !== null) time = t('clinQueue.waiting', { minutes });
  else if (entry.scheduledAt) time = clock24(entry.scheduledAt);
  const reason = entry.reason ?? t(entry.booking === 'CONFIRMED' ? 'clinQueue.bookingConfirmed' : 'clinQueue.bookingRequested');
  const scope = entry.scope ?? (entry.consent === 'unreported' ? t('clinQueue.scopeUnreported') : '');

  let cta: React.ReactNode = null;
  if (action === 'open-consult') {
    cta = (
      <DestinationButton route={ROUTES.consultRoom} onNavigate={onNavigate} className="sk-btn sk-btn--primary cq-card__cta">
        {t(ACTION[action].idle)}<span className="sk-visually-hidden">{t('clinQueue.withName', { name })}</span>
      </DestinationButton>
    );
  } else if (action !== 'none') {
    cta = (
      <SkButton variant="secondary" className="cq-card__cta" busy={busy} disabled={entry.requested || !canRequest} onClick={onRequest}>
        {t(entry.requested ? ACTION[action].done : ACTION[action].idle)}<span className="sk-visually-hidden">{t('clinQueue.fromName', { name })}</span>
      </SkButton>
    );
  }

  return (
    <li className={`cq-card sk-rise${active ? ' is-active' : ''}${selected ? ' is-selected' : ''}`} style={{ '--sk-stagger': Math.min(index, 8) } as React.CSSProperties}>
      <button type="button" className="cq-card__select" aria-pressed={selected} aria-controls="cq-access" onClick={onSelect}>
        <Avatar initials={initialsOf(entry.patientName)} className={`cq-card__avatar${active ? '' : ' is-muted'}`} />
        <span className="cq-card__text">
          <span className="cq-card__top">
            <span className="cq-card__name">{name}</span>
            <StatusPill small tone={consent.tone}>{t(consent.key)}</StatusPill>
          </span>
          <span className="cq-card__reason">{reason}</span>
          {scope ? <span className="cq-card__scope">{scope}</span> : null}
        </span>
        <span className="sk-visually-hidden">{t('clinQueue.showAccess')}</span>
      </button>
      <span className="cq-card__side">
        <span className="cq-card__time">{time}</span>
        {cta}
      </span>
    </li>
  );
}

/* ----------------------------------------------------------- access panel */

function AccessRow({ row }: { row: RecordAccessItem }): React.ReactElement {
  const t = useT();
  return (
    <li className="cq-access__row">
      <span className={`cq-access__icon${row.open ? ' is-open' : ''}`} aria-hidden="true">
        <Icon name={row.open ? 'check' : 'lock-4'} size={15} strokeWidth={2.4} />
      </span>
      <span className="cq-access__text">
        <span className={`cq-access__label${row.open ? '' : ' is-closed'}`}>
          <span className="sk-visually-hidden">{t(row.open ? 'clinQueue.open' : 'clinQueue.closed')}</span>
          {row.label}
        </span>
        <span className="cq-access__reason">{row.reason}</span>
      </span>
    </li>
  );
}

function AccessPanel({ entry }: { entry: QueueEntry }): React.ReactElement {
  const t = useT();
  // Rule L, stated where the doctor looks: purchase history is never part of a clinical record.
  const commerce: RecordAccessItem = { id: 'commerce', label: t('clinQueue.commerceLabel'), reason: t('clinQueue.commerceReason'), open: false };
  const unreported: RecordAccessItem = { id: 'unreported', label: t('clinQueue.accessUnreportedLabel'), reason: t('clinQueue.accessUnreportedReason'), open: false };
  const rows = [...(entry.access ?? [unreported]), commerce];
  return (
    <section id="cq-access" className="cq-panel sk-rise" aria-labelledby="cq-access-title" aria-live="polite" style={{ '--sk-stagger': 1 } as React.CSSProperties}>
      <h2 id="cq-access-title" className="cq-eyebrow">{t('clinQueue.accessTitle', { name: shortName(entry.patientName).toUpperCase() })}</h2>
      <ul className="cq-access">
        {rows.map((row) => <AccessRow key={row.id} row={row} />)}
      </ul>
    </section>
  );
}

/* ---------------------------------------------------------------- loading */

function QueueSkeleton(): React.ReactElement {
  const t = useT();
  return (
    <div className="cq-skeleton" aria-busy="true" aria-label={t('clinQueue.loading')} role="status">
      <div className="cq-head">
        <div className="cq-head__titles">
          <Skeleton width={260} height={28} />
          <Skeleton width={420} height={14} />
        </div>
        <Skeleton width={180} height={40} />
      </div>
      <div className="cq-grid">
        <div className="cq-list">
          {Array.from({ length: 4 }, (_, i) => <Skeleton key={i} height={128} />)}
        </div>
        <div className="cq-side">
          <Skeleton height={236} />
          <Skeleton height={118} />
          <Skeleton height={128} />
        </div>
      </div>
    </div>
  );
}
