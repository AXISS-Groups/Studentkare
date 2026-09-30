import React, { useEffect } from 'react';
import { observer } from 'mobx-react-lite';
import {
  Avatar,
  DestinationButton,
  EmptyStateView,
  ErrorStateView,
  SkButton,
  SkIcon,
  Skeleton,
  StatusPill,
  Toast,
} from '@/design-system';
import type { RoutePath } from '@/lib/workflowRouting';
import type { ClinicianQueueViewModel } from './ClinicianQueueViewModel';
import type { QueueData, QueueEntry, RecordAccessItem } from './queueModel';
import { ACTION_LABEL, CONSENT_LABEL, actionFor, initialsOf, timeLabel } from './queueModel';
import './clinician-queue.css';

/** `null` = that screen is not built yet (shown, disabled, and says so). */
const ROUTES = {
  consultRoom: null,
  accessLog: null,
  crisis: null,
  today: 'clinician',
  help: 'support',
} as const satisfies Record<string, RoutePath | null>;

/**
 * Rule L, stated where the doctor looks: purchase history is never part of a
 * clinical record. Not data — it is always true, so it is always shown.
 */
const COMMERCE_ROW: RecordAccessItem = {
  id: 'commerce',
  label: 'Orders and purchases',
  reason: 'Commerce data is never exposed to clinicians',
  open: false,
};

export interface ClinicianQueueViewProps {
  viewModel: ClinicianQueueViewModel;
  onNavigate: (route: RoutePath) => void;
}

export const ClinicianQueueView = observer(function ClinicianQueueView({ viewModel, onNavigate }: ClinicianQueueViewProps): React.ReactElement {
  const { status, data } = viewModel;
  useEffect(() => viewModel.startClock(), [viewModel]);

  let body: React.ReactNode;
  if (status === 'loading') body = <QueueSkeleton />;
  else if (status === 'error') {
    body = (
      <ErrorStateView
        title="Couldn’t load today’s queue"
        onRetry={() => { void viewModel.load(); }}
        onHelp={() => onNavigate(ROUTES.help)}
        reference="Ref QUEUE-LOAD · ClinicianConsole"
      />
    );
  } else if (status === 'unconnected') {
    body = (
      <EmptyStateView
        title="Your queue isn’t connected yet."
        body="Students appear here once they book you or share a record. Until then this page shows nobody rather than a guess."
        action={{ label: 'Back to Today', onClick: () => onNavigate(ROUTES.today) }}
      />
    );
  } else if (status === 'empty' || !data) {
    body = (
      <EmptyStateView
        title="No one in your queue right now."
        body="When a student books you or shares a record, it shows up here."
        action={{ label: 'Back to Today', onClick: () => onNavigate(ROUTES.today) }}
      />
    );
  } else {
    body = <QueueReady viewModel={viewModel} data={data} onNavigate={onNavigate} />;
  }

  return (
    <>
      {body}
      <Toast message={viewModel.toast} onDone={viewModel.clearToast} />
    </>
  );
});

/* ------------------------------------------------------------------ ready */

const QueueReady = observer(function QueueReady({ viewModel, data, onNavigate }: { viewModel: ClinicianQueueViewModel; data: QueueData; onNavigate: (route: RoutePath) => void }): React.ReactElement {
  const selected = viewModel.selected;
  return (
    <>
      <div className="cq-head sk-fade">
        <div className="cq-head__titles">
          <h1 className="cq-title">Today’s queue</h1>
          <p className="cq-subtitle">{viewModel.summary}</p>
        </div>
        <StatusPill tone={data.accepting ? 'positive' : 'neutral'} dot={data.accepting ? 'live' : true} className="cq-accepting">
          {data.accepting ? 'Accepting consults' : 'Not accepting consults'}
        </StatusPill>
      </div>

      <div className="cq-grid">
        <ul className="cq-list" aria-label="Students in your queue">
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

          <section className="cq-cannot sk-rise" aria-labelledby="cq-cannot-title" style={{ '--sk-stagger': 2 } as React.CSSProperties}>
            <h2 id="cq-cannot-title" className="cq-eyebrow cq-eyebrow--action">WHAT YOU CANNOT SEE</h2>
            <p className="cq-body">
              Students with no active care relationship. Anything outside the consent window. Purchase and order history — never visible to a clinician, in any circumstance.
            </p>
          </section>

          <section className="cq-panel sk-rise" aria-labelledby="cq-logged-title" style={{ '--sk-stagger': 3 } as React.CSSProperties}>
            <h2 id="cq-logged-title" className="cq-eyebrow">YOUR ACCESS IS LOGGED</h2>
            <p className="cq-body cq-body--muted">
              Every record you open writes to the append-only audit ledger, and the student sees it in their own timeline.
            </p>
            <DestinationButton route={ROUTES.accessLog} onNavigate={onNavigate} className="sk-link cq-link">View my access log</DestinationButton>
          </section>

          <DestinationButton route={ROUTES.crisis} onNavigate={onNavigate} className="cq-crisis sk-fade">
            <SkIcon name="shield" size={20} strokeWidth={2} className="cq-crisis__icon" />
            <span className="cq-crisis__text">
              <span className="cq-crisis__title">Crisis escalations</span>
              <span className="cq-crisis__meta">
                {data.crisisFlagged24h > 0 ? `${data.crisisFlagged24h} flagged in the last 24 hours` : 'None flagged in the last 24 hours'}
              </span>
            </span>
          </DestinationButton>
        </div>
      </div>
    </>
  );
});

/* ------------------------------------------------------------- queue card */

function QueueCard({
  entry,
  index,
  now,
  selected,
  busy,
  canRequest,
  onSelect,
  onRequest,
  onNavigate,
}: {
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
  const active = entry.consent === 'active';
  const action = actionFor(entry);
  const label = entry.requested ? ACTION_LABEL[action].done : ACTION_LABEL[action].idle;

  return (
    <li
      className={`cq-card sk-rise${active ? ' is-active' : ''}${selected ? ' is-selected' : ''}`}
      style={{ '--sk-stagger': Math.min(index, 8) } as React.CSSProperties}
    >
      <button type="button" className="cq-card__select" aria-pressed={selected} aria-controls="cq-access" onClick={onSelect}>
        <Avatar initials={initialsOf(entry.patientName)} className={`cq-card__avatar${active ? '' : ' is-muted'}`} />
        <span className="cq-card__text">
          <span className="cq-card__top">
            <span className="cq-card__name">{entry.patientName}</span>
            <StatusPill small tone={active ? 'positive' : 'attention'}>{CONSENT_LABEL[entry.consent]}</StatusPill>
          </span>
          <span className="cq-card__reason">{entry.reason}</span>
          <span className="cq-card__scope">{entry.scope}</span>
        </span>
        <span className="sk-visually-hidden">. Show record access</span>
      </button>
      <span className="cq-card__side">
        <span className="cq-card__time">{timeLabel(entry, now)}</span>
        {action === 'open-consult' ? (
          <DestinationButton route={ROUTES.consultRoom} onNavigate={onNavigate} className="sk-btn sk-btn--primary cq-card__cta">
            {label}<span className="sk-visually-hidden"> with {entry.patientName}</span>
          </DestinationButton>
        ) : (
          <SkButton
            variant="secondary"
            className="cq-card__cta"
            busy={busy}
            disabled={entry.requested || !canRequest}
            onClick={onRequest}
          >
            {label}<span className="sk-visually-hidden"> from {entry.patientName}</span>
          </SkButton>
        )}
      </span>
    </li>
  );
}

/* ----------------------------------------------------------- access panel */

function AccessPanel({ entry }: { entry: QueueEntry }): React.ReactElement {
  const rows = [...entry.access, COMMERCE_ROW];
  return (
    <section id="cq-access" className="cq-panel sk-rise" aria-labelledby="cq-access-title" aria-live="polite" style={{ '--sk-stagger': 1 } as React.CSSProperties}>
      <h2 id="cq-access-title" className="cq-eyebrow">RECORD ACCESS — {entry.patientName.toUpperCase()}</h2>
      <ul className="cq-access">
        {rows.map((row) => (
          <li key={row.id} className="cq-access__row">
            <span className={`cq-access__icon${row.open ? ' is-open' : ''}`} aria-hidden="true">
              <SkIcon name={row.open ? 'check' : 'lock'} size={15} strokeWidth={2.4} />
            </span>
            <span className="cq-access__text">
              <span className={`cq-access__label${row.open ? '' : ' is-closed'}`}>
                <span className="sk-visually-hidden">{row.open ? 'Open: ' : 'Closed: '}</span>
                {row.label}
              </span>
              <span className="cq-access__reason">{row.reason}</span>
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

/* ---------------------------------------------------------------- loading */

function QueueSkeleton(): React.ReactElement {
  return (
    <div className="cq-skeleton" aria-busy="true" aria-label="Loading today’s queue">
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
