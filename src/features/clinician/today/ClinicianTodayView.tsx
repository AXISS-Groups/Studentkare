import React, { useEffect } from 'react';
import { observer } from 'mobx-react-lite';
import {
  Avatar,
  DestinationButton,
  EmptyStateView,
  ErrorStateView,
  Note,
  SkButton,
  SkCard,
  SkIcon,
  Skeleton,
  StatusPill,
  Toast,
} from '@/design-system';
import type { SkIconName, SkTone } from '@/design-system';
import type { RoutePath } from '@/lib/workflowRouting';
import type { ClinicianTodayViewModel } from './ClinicianTodayViewModel';
import type { NextConsult, SlotKind, TodayData, TodaySlot, WaitingItem } from './todayModel';
import { cardDate, formalName, greeting, initialsOf } from './todayModel';
import './clinician-today.css';

/**
 * Destinations that exist today. `null` = that screen is not built yet; the
 * control is shown (it is part of the design) but disabled and says so.
 */
const ROUTES = {
  criticalResults: 'clinical-review',
  reportReviews: 'report-reviews',
  inbox: null,
  renewals: 'clinician/renewals',
  consultRoom: null,
  help: 'support',
} as const satisfies Record<string, RoutePath | null>;

export interface ClinicianTodayViewProps {
  viewModel: ClinicianTodayViewModel;
  clinicianName: string;
  onNavigate: (route: RoutePath) => void;
}

/** The page content inside the clinician shell. */
export const ClinicianTodayView = observer(function ClinicianTodayView({ viewModel, clinicianName, onNavigate }: ClinicianTodayViewProps): React.ReactElement {
  const { status, data } = viewModel;

  useEffect(() => viewModel.startClock(), [viewModel]);

  let body: React.ReactNode;
  if (status === 'loading') body = <TodaySkeleton />;
  else if (status === 'error') {
    body = (
      <ErrorStateView
        title="Couldn’t load your day"
        onRetry={() => { void viewModel.load(); }}
        onHelp={() => onNavigate(ROUTES.help)}
        reference="Ref TODAY-LOAD · ClinicianToday"
      />
    );
  } else if (status === 'unconnected') {
    body = (
      <EmptyStateView
        title="Your day isn’t connected yet."
        body="Consults and shared records appear here once your clinic schedule is connected. Until then this page shows nothing rather than a guess."
        action={{ label: 'Open report reviews', onClick: () => onNavigate(ROUTES.reportReviews) }}
      />
    );
  } else if (status === 'empty' || !data) {
    body = (
      <EmptyStateView
        title="No one on your list today."
        body="When a student books you or shares a record, it shows up here."
      />
    );
  } else {
    body = <TodayReady viewModel={viewModel} data={data} clinicianName={clinicianName} onNavigate={onNavigate} />;
  }

  return (
    <>
      {body}
      <Toast message={viewModel.toast} onDone={viewModel.clearToast} />
    </>
  );
});

/* ------------------------------------------------------------------ ready */

const TodayReady = observer(function TodayReady({
  viewModel,
  data,
  clinicianName,
  onNavigate,
}: {
  viewModel: ClinicianTodayViewModel;
  data: TodayData;
  clinicianName: string;
  onNavigate: (route: RoutePath) => void;
}): React.ReactElement {
  const taking = data.availability === 'taking';
  const opens = data.queueOpensAt ? `Your queue opens at ${data.queueOpensAt}. ` : '';

  return (
    <>
      <div className="ct-head sk-fade">
        <div className="ct-head__titles">
          <h1 className="ct-title">{greeting(viewModel.now)}, {formalName(clinicianName)}</h1>
          <p className="ct-subtitle">{opens}Records open only for patients who share them.</p>
        </div>
        <button
          type="button"
          className={`ct-availability${taking ? ' is-on' : ''}`}
          aria-pressed={taking}
          aria-describedby="ct-availability-hint"
          disabled={!viewModel.canChangeAvailability || viewModel.availabilityBusy}
          onClick={() => { void viewModel.toggleAvailability(); }}
        >
          <span className={`ct-availability__dot${taking ? ' is-live' : ''}`} aria-hidden="true" />
          {taking ? 'Taking consults' : 'Paused'}
        </button>
        <span id="ct-availability-hint" className="sk-visually-hidden">
          {taking ? 'Press to pause new bookings.' : 'Press to start taking consults again.'}
        </span>
      </div>

      <div className="ct-grid">
        <SkCard className="ct-day sk-rise" title={cardDate(data.date)} subtitle={viewModel.summary} labelledBy="ct-day-title" action={<span className="sk-mono ct-tz" aria-label="Times in Indian Standard Time">IST</span>}>
          <ol className="ct-slots">
            {data.slots.map((slot, index) => <SlotRow key={slot.id} slot={slot} index={index} />)}
          </ol>
        </SkCard>

        <div className="ct-side">
          {data.next ? <NextConsultCard next={data.next} viewModel={viewModel} /> : null}

          <SkCard
            className="sk-rise ct-waiting"
            title="Waiting on you"
            subtitle="Everything that needs a decision today"
            labelledBy="ct-waiting-title"
            action={<DestinationButton route={ROUTES.inbox} onNavigate={onNavigate} className="sk-link">Open inbox</DestinationButton>}
          >
            <div className="ct-tiles">
              <WaitingTile tone="danger" label="Critical result" plural="Critical results" item={data.waiting.criticalResults} route={ROUTES.criticalResults} onNavigate={onNavigate} />
              <WaitingTile tone="attention" label="Report to sign" plural="Reports to sign" item={data.waiting.reportsToSign} route={ROUTES.reportReviews} onNavigate={onNavigate} />
              <WaitingTile tone="action" label="Follow-up message" plural="Follow-up messages" item={data.waiting.followUps} route={ROUTES.inbox} onNavigate={onNavigate} />
              <WaitingTile tone="neutral" label="Renewal" plural="Renewals" item={data.waiting.renewals} route={ROUTES.renewals} onNavigate={onNavigate} />
            </div>
          </SkCard>

          {data.camp ? (
            <SkCard className="sk-rise" title={data.camp.title} subtitle={data.camp.when} labelledBy="ct-camp-title">
              <Note tone="info">{data.camp.note}</Note>
            </SkCard>
          ) : null}
        </div>
      </div>
    </>
  );
});

/* ------------------------------------------------------------ slot row */

const KIND: Record<SlotKind, { tag: string | SkIconName; tone: SkTone; spoken: string }> = {
  done: { tag: 'check', tone: 'positive', spoken: 'Done' },
  next: { tag: 'play', tone: 'action', spoken: 'Next' },
  video: { tag: 'VID', tone: 'action', spoken: 'Video' },
  chat: { tag: 'CHAT', tone: 'action', spoken: 'Chat' },
  person: { tag: 'OPD', tone: 'attention', spoken: 'In person' },
  break: { tag: '—', tone: 'neutral', spoken: '' },
  open: { tag: '+', tone: 'neutral', spoken: '' },
  camp: { tag: 'CAMP', tone: 'positive', spoken: 'Camp' },
};

const ICON_TAGS: ReadonlySet<string> = new Set(['check', 'play']);

function SlotRow({ slot, index }: { slot: TodaySlot; index: number }): React.ReactElement {
  const kind = KIND[slot.kind];
  const tag = ICON_TAGS.has(kind.tag) ? <SkIcon name={kind.tag as SkIconName} size={14} strokeWidth={2.4} /> : kind.tag;
  return (
    <li className="ct-slot sk-rise" style={{ '--sk-stagger': Math.min(index, 8) } as React.CSSProperties}>
      <span className="ct-slot__time sk-mono">{slot.time}</span>
      <div className={`ct-slot__row ct-slot__row--${slot.kind}`} aria-current={slot.kind === 'next' ? 'step' : undefined}>
        <span className={`ct-slot__tag sk-tone--${kind.tone}`} aria-hidden="true">{tag}</span>
        <span className="ct-slot__text">
          <span className="ct-slot__title">
            {kind.spoken ? <span className="sk-visually-hidden">{kind.spoken}: </span> : null}
            {slot.title}
          </span>
          {slot.meta ? <span className="ct-slot__meta">{slot.meta}</span> : null}
        </span>
        {slot.sharing === 'shared' ? <StatusPill tone="positive">Shared</StatusPill> : null}
        {slot.sharing === 'not-shared' ? <StatusPill tone="neutral">Not shared</StatusPill> : null}
      </div>
    </li>
  );
}

/* -------------------------------------------------------- next consult */

const NextConsultCard = observer(function NextConsultCard({ next, viewModel }: { next: NextConsult; viewModel: ClinicianTodayViewModel }): React.ReactElement {
  return (
    <section className="ct-hero sk-rise" aria-labelledby="ct-next-label">
      <span id="ct-next-label" className="ct-hero__eyebrow">NEXT CONSULT</span>
      <div className="ct-hero__who">
        <Avatar initials={initialsOf(next.patientName)} className="ct-hero__avatar" />
        <span className="ct-hero__lines">
          <span className="ct-hero__name">{next.patientName}, {next.age}</span>
          <CheckInPill next={next} />
          <span className="ct-hero__summary">{next.summary}</span>
        </span>
      </div>
      <div className="ct-hero__chips">
        <span className="ct-hero__chip ct-hero__chip--positive">
          {next.recordsShared > 0
            ? `${next.recordsShared} record${next.recordsShared === 1 ? '' : 's'} shared for this consult`
            : 'No records shared yet'}
        </span>
        {next.allergies.map((allergy) => (
          <span key={allergy} className="ct-hero__chip">{allergy} allergy</span>
        ))}
      </div>
      <div className="ct-hero__foot">
        <span className="ct-hero__timer" role="timer" aria-label={viewModel.countdownSpoken}>
          <span className="sk-mono ct-hero__count" aria-hidden="true">{viewModel.countdownText}</span>
          <span className="ct-hero__until" aria-hidden="true">until start</span>
        </span>
        <SkButton variant="on-hero" icon="video" disabled title="The consult room is not available yet">
          Open consult room
        </SkButton>
      </div>
    </section>
  );
});

function CheckInPill({ next }: { next: NextConsult }): React.ReactElement {
  if (!next.checkIn) {
    return <span className="ct-hero__check ct-hero__check--waiting">Not checked in yet</span>;
  }
  if (!next.checkIn.photoMatched) {
    return (
      <span className="ct-hero__check ct-hero__check--mismatch">
        <SkIcon name="alert" size={13} strokeWidth={2.4} />Photo did not match at check-in · {next.checkIn.time}
      </span>
    );
  }
  return (
    <span className="ct-hero__check">
      <SkIcon name="check" size={13} strokeWidth={2.6} />Verified at check-in · {next.checkIn.time} · photo matched
    </span>
  );
}

/* ------------------------------------------------------ waiting tiles */

function WaitingTile({
  tone,
  label,
  plural,
  item,
  route,
  onNavigate,
}: {
  tone: SkTone;
  label: string;
  plural: string;
  item: WaitingItem;
  route: RoutePath | null;
  onNavigate: (route: RoutePath) => void;
}): React.ReactElement {
  const name = item.count === 1 ? label : plural;
  const content = (
    <>
      <span className="ct-tile__count sk-mono">{item.count}</span>
      <span className="ct-tile__label">{name}</span>
      {item.detail ? <span className="ct-tile__detail">{item.detail}</span> : null}
    </>
  );
  return (
    <DestinationButton route={route} onNavigate={onNavigate} className={`ct-tile sk-tone--${tone}`}>
      {content}
    </DestinationButton>
  );
}

/* ------------------------------------------------------------ loading */

function TodaySkeleton(): React.ReactElement {
  return (
    <div className="ct-skeleton" aria-busy="true" aria-label="Loading your day">
      <div className="ct-head">
        <div className="ct-head__titles">
          <Skeleton width={320} height={28} />
          <Skeleton width={440} height={14} />
        </div>
        <Skeleton width={170} height={44} />
      </div>
      <div className="ct-grid">
        <div className="ct-skeleton__list">
          <Skeleton height={40} />
          {Array.from({ length: 7 }, (_, i) => <Skeleton key={i} height={52} />)}
        </div>
        <div className="ct-side">
          <Skeleton height={238} />
          <Skeleton height={270} />
        </div>
      </div>
    </div>
  );
}
