import React, { useEffect } from 'react';
import { observer } from 'mobx-react-lite';
import { Avatar, DestinationButton, SkCard, SkSkeleton as Skeleton, StatusPill, SkToast as Toast } from '@/design-system';
import type { SkTone } from '@/design-system';
import { Icon } from '@/design-system/icons';
import type { SkIconName } from '@/design-system/icons';
import { useT } from '@/i18n';
import type { MessageKey } from '@/i18n';
import type { RoutePath } from '@/lib/utils/workflowRouting';
import type { ClinicianTodayViewModel } from './ClinicianTodayViewModel';
import type { CampDuty, NextConsult, SlotKind, TodayData, TodaySlot, WaitingItem } from './todayModel';
import { cardDate, dayCounts, greetingKey, initialsOf, surname } from './todayModel';
import { ClinicianEmptyState, ClinicianErrorState } from '../shared/ClinicianStates';
import { REVIEW_ROUTES } from '../shared/reviewRoutes';
import './clinician-today.css';

/**
 * Destinations that exist today. `null` = that screen is not built yet; the
 * control is shown (it is part of the design) but disabled and says so.
 */
const ROUTES = {
  criticalResults: REVIEW_ROUTES.criticalResults(),
  reportReviews: REVIEW_ROUTES.reportReviews(),
  inbox: REVIEW_ROUTES.inbox(),
  renewals: 'clinician/renewals',
  consultRoom: REVIEW_ROUTES.consultRoom(),
  schedule: 'clinician/schedule',
  help: 'support',
} satisfies Record<string, RoutePath | null>;

export interface ClinicianTodayViewProps {
  viewModel: ClinicianTodayViewModel;
  clinicianName: string;
  onNavigate: (route: RoutePath) => void;
}

/** The page content inside the clinician shell. */
export const ClinicianTodayView = observer(function ClinicianTodayView({ viewModel, clinicianName, onNavigate }: ClinicianTodayViewProps): React.ReactElement {
  const t = useT();
  const { status, data } = viewModel;

  useEffect(() => viewModel.startClock(), [viewModel]);

  let body: React.ReactNode;
  if (status === 'loading') body = <TodaySkeleton />;
  else if (status === 'error') {
    body = (
      <ClinicianErrorState
        title={t('clinToday.errorTitle')}
        reference={t('clinToday.reference')}
        onRetry={() => { void viewModel.load(); }}
        onHelp={() => onNavigate(ROUTES.help)}
      />
    );
  } else if (status === 'unconnected') {
    body = <TodayBlank viewModel={viewModel} clinicianName={clinicianName} onNavigate={onNavigate} />;
  } else if (status === 'empty' || !data) {
    body = (
      <ClinicianEmptyState
        title={t('clinToday.emptyTitle')}
        body={t('clinToday.emptyBody')}
        action={{ label: t('clinToday.emptyAction'), onSelect: () => onNavigate(ROUTES.schedule) }}
      />
    );
  } else {
    body = <TodayReady viewModel={viewModel} data={data} clinicianName={clinicianName} onNavigate={onNavigate} />;
  }

  const toast = viewModel.toast;
  return (
    <>
      {body}
      <Toast
        message={toast ? t(toast.key, toast.vars) : null}
        icon={toast?.ok ? <Icon name="check-2" size={18} strokeWidth={2.4} /> : undefined}
        onDone={viewModel.clearToast}
      />
    </>
  );
});

/* ------------------------------------------------------------- shared head */

function Greeting({ viewModel, clinicianName, subtitle }: { viewModel: ClinicianTodayViewModel; clinicianName: string; subtitle: string }): React.ReactElement {
  const t = useT();
  const name = surname(clinicianName);
  return (
    <div className="ct-head__titles">
      <h1 className="ct-title">{name ? t('clinToday.greetingNamed', { greeting: t(greetingKey(viewModel.now)), name }) : t(greetingKey(viewModel.now))}</h1>
      <p className="ct-subtitle">{subtitle}</p>
    </div>
  );
}

const AvailabilityPill = observer(function AvailabilityPill({ viewModel, data }: { viewModel: ClinicianTodayViewModel; data: TodayData | null }): React.ReactElement {
  const t = useT();
  const availability = data?.availability ?? null;
  if (availability === null) {
    return (
      <button type="button" className="ct-availability" aria-pressed={false} disabled>
        <span className="ct-availability__dot" aria-hidden="true" />
        {t('clinToday.availabilityUnreported')}
      </button>
    );
  }
  const taking = availability === 'taking';
  return (
    <>
      <button
        type="button"
        className={`ct-availability${taking ? ' is-on' : ''}`}
        aria-pressed={taking}
        aria-describedby="ct-availability-hint"
        disabled={!viewModel.canChangeAvailability || viewModel.availabilityBusy}
        onClick={() => { void viewModel.toggleAvailability(); }}
      >
        <span className={`ct-availability__dot${taking ? ' is-live' : ''}`} aria-hidden="true" />
        {t(taking ? 'clinToday.taking' : 'clinToday.paused')}
      </button>
      <span id="ct-availability-hint" className="sk-visually-hidden">{t(taking ? 'clinToday.pauseHint' : 'clinToday.resumeHint')}</span>
    </>
  );
});

/** The zone code the canvas prints; a code, not copy. */
const TIME_ZONE_CODE = 'IST';

function TimeZone(): React.ReactElement {
  const t = useT();
  return <span className="sk-mono ct-tz" aria-label={t('clinToday.timeZone')}>{TIME_ZONE_CODE}</span>;
}

/* ------------------------------------------------------------------ ready */

const TodayReady = observer(function TodayReady({ viewModel, data, clinicianName, onNavigate }: {
  viewModel: ClinicianTodayViewModel;
  data: TodayData;
  clinicianName: string;
  onNavigate: (route: RoutePath) => void;
}): React.ReactElement {
  const t = useT();
  const counts = dayCounts(data);
  const summary = [
    t(counts.consults === 1 ? 'clinToday.consultsOne' : 'clinToday.consults', { count: counts.consults }),
    counts.campHours > 0 ? t(counts.campHours === 1 ? 'clinToday.campHoursOne' : 'clinToday.campHours', { count: counts.campHours }) : '',
    counts.breaks > 0 ? t(counts.breaks === 1 ? 'clinToday.breaksOne' : 'clinToday.breaks', { count: counts.breaks }) : '',
  ].filter(Boolean).join(' · ');
  const subtitle = [data.queueOpensAt ? t('clinToday.opensAt', { time: data.queueOpensAt }) : '', t('clinToday.recordsRule')].filter(Boolean).join(' ');

  return (
    <>
      <div className="ct-head sk-fade">
        <Greeting viewModel={viewModel} clinicianName={clinicianName} subtitle={subtitle} />
        <AvailabilityPill viewModel={viewModel} data={data} />
      </div>

      <div className="ct-grid">
        <SkCard className="ct-day sk-rise" title={t('clinToday.cardDate', { date: cardDate(data.date) })} subtitle={summary} labelledBy="ct-day-title" action={<TimeZone />}>
          {data.slots.length > 0 ? (
            <ol className="ct-slots">
              {data.slots.map((slot, index) => <SlotRow key={slot.id} slot={slot} index={index} />)}
            </ol>
          ) : (
            <div className="ct-blank" role="status">
              <strong>{t('clinToday.noBookingsTitle')}</strong>
              <span>{t('clinToday.noBookingsBody')}</span>
            </div>
          )}
        </SkCard>

        <div className="ct-side">
          {data.next ? <NextConsultCard next={data.next} viewModel={viewModel} onNavigate={onNavigate} /> : null}
          <WaitingCard data={data} onNavigate={onNavigate} />
          {data.camp ? <CampCard camp={data.camp} /> : null}
        </div>
      </div>
    </>
  );
});

/* ------------------------------------------------------------ blank */

/** Not connected: the Today layout with nothing in it. Every figure is "—" and nothing is invented. */
function TodayBlank({ viewModel, clinicianName, onNavigate }: { viewModel: ClinicianTodayViewModel; clinicianName: string; onNavigate: (route: RoutePath) => void }): React.ReactElement {
  const t = useT();
  return (
    <>
      <div className="ct-head sk-fade">
        <Greeting viewModel={viewModel} clinicianName={clinicianName} subtitle={t('clinToday.recordsRule')} />
        <AvailabilityPill viewModel={viewModel} data={null} />
      </div>
      <div className="ct-grid">
        <SkCard className="ct-day sk-rise" title={t('clinToday.cardDate', { date: cardDate(viewModel.now) })} subtitle={t('clinToday.nothingReported')} labelledBy="ct-day-title" action={<TimeZone />}>
          <div className="ct-blank" role="status">
            <strong>{t('clinToday.unconnectedTitle')}</strong>
            <span>{t('clinToday.unconnectedBody')}</span>
          </div>
        </SkCard>
        <div className="ct-side">
          <WaitingCard data={null} onNavigate={onNavigate} />
        </div>
      </div>
    </>
  );
}

/* ------------------------------------------------------------ slot row */

/** The canvas's tag per row: an icon, or its short text label. */
const KIND: Record<SlotKind, { icon?: SkIconName; tag?: MessageKey; tone: SkTone; spoken?: MessageKey; line?: MessageKey }> = {
  done: { icon: 'check', tone: 'positive', spoken: 'clinToday.kind.done', line: 'clinToday.line.done' },
  next: { icon: 'clock', tone: 'action', spoken: 'clinToday.kind.next', line: 'clinToday.line.confirmed' },
  booked: { icon: 'calendar-2', tone: 'action', spoken: 'clinToday.kind.booked', line: 'clinToday.line.confirmed' },
  requested: { tag: 'clinToday.tag.request', tone: 'attention', spoken: 'clinToday.kind.requested', line: 'clinToday.line.requested' },
  missed: { icon: 'x', tone: 'neutral', spoken: 'clinToday.kind.missed', line: 'clinToday.line.missed' },
  video: { tag: 'clinToday.tag.video', tone: 'action', spoken: 'clinToday.kind.video' },
  chat: { tag: 'clinToday.tag.chat', tone: 'action', spoken: 'clinToday.kind.chat' },
  person: { tag: 'clinToday.tag.person', tone: 'attention', spoken: 'clinToday.kind.person' },
  break: { tag: 'clinToday.tag.break', tone: 'neutral' },
  open: { icon: 'plus', tone: 'neutral' },
  camp: { tag: 'clinToday.tag.camp', tone: 'positive', spoken: 'clinToday.kind.camp' },
};

function SlotRow({ slot, index }: { slot: TodaySlot; index: number }): React.ReactElement {
  const t = useT();
  const kind = KIND[slot.kind];
  const meta = slot.meta ?? (kind.line ? t(kind.line) : '');
  return (
    <li className="ct-slot sk-rise" style={{ '--sk-stagger': Math.min(index, 8) } as React.CSSProperties}>
      <span className="ct-slot__time sk-mono">{slot.time}</span>
      <div className={`ct-slot__row ct-slot__row--${slot.kind}`} aria-current={slot.kind === 'next' ? 'step' : undefined}>
        <span className={`ct-slot__tag sk-tone--${kind.tone}`} aria-hidden="true">
          {kind.icon ? <Icon name={kind.icon} size={14} strokeWidth={2.4} /> : null}
          {kind.tag ? t(kind.tag) : null}
        </span>
        <span className="ct-slot__text">
          <span className="ct-slot__title">
            {kind.spoken ? <span className="sk-visually-hidden">{t(kind.spoken)}: </span> : null}
            {slot.title}
          </span>
          {meta ? <span className="ct-slot__meta">{meta}</span> : null}
        </span>
        {slot.sharing === 'shared' ? <StatusPill tone="positive">{t('clinToday.shared')}</StatusPill> : null}
        {slot.sharing === 'not-shared' ? <StatusPill tone="neutral">{t('clinToday.notShared')}</StatusPill> : null}
      </div>
    </li>
  );
}

/* -------------------------------------------------------- next consult */

const NextConsultCard = observer(function NextConsultCard({ next, viewModel, onNavigate }: { next: NextConsult; viewModel: ClinicianTodayViewModel; onNavigate: (route: RoutePath) => void }): React.ReactElement {
  const t = useT();
  const spoken = viewModel.countdownSpoken;
  let shared = t('clinToday.sharingUnreported');
  if (next.recordsShared !== null) {
    shared = next.recordsShared > 0
      ? t(next.recordsShared === 1 ? 'clinToday.recordsSharedOne' : 'clinToday.recordsShared', { count: next.recordsShared })
      : t('clinToday.noRecordsShared');
  }
  return (
    <section className="ct-hero sk-rise" aria-labelledby="ct-next-label">
      <span id="ct-next-label" className="ct-hero__eyebrow">{t('clinToday.nextConsult')}</span>
      <div className="ct-hero__who">
        <Avatar initials={initialsOf(next.patientName)} className="ct-hero__avatar" />
        <span className="ct-hero__lines">
          <span className="ct-hero__name">{next.patientName}</span>
          {next.summary ? <span className="ct-hero__summary">{next.summary}</span> : null}
        </span>
      </div>
      <div className="ct-hero__chips">
        <span className={`ct-hero__chip${next.recordsShared ? ' ct-hero__chip--positive' : ''}`}>{shared}</span>
      </div>
      <div className="ct-hero__foot">
        <span className="ct-hero__timer" role="timer" aria-label={spoken ? t(spoken.key, spoken.vars) : undefined}>
          <span className="sk-mono ct-hero__count" aria-hidden="true">{viewModel.countdownText}</span>
          <span className="ct-hero__until" aria-hidden="true">{t('clinToday.untilStart')}</span>
        </span>
        <DestinationButton route={ROUTES.consultRoom} onNavigate={onNavigate} className="sk-btn sk-btn--on-hero">
          <Icon name="video-2" size={17} />{t('clinToday.openConsultRoom')}
        </DestinationButton>
      </div>
    </section>
  );
});

/* ------------------------------------------------------ waiting tiles */

function WaitingCard({ data, onNavigate }: { data: TodayData | null; onNavigate: (route: RoutePath) => void }): React.ReactElement {
  const t = useT();
  const unknown: WaitingItem = { count: null };
  const waiting = data?.waiting;
  return (
    <SkCard
      className="sk-rise ct-waiting"
      title={t('clinToday.waitingTitle')}
      subtitle={t('clinToday.waitingSubtitle')}
      labelledBy="ct-waiting-title"
      action={<DestinationButton route={ROUTES.inbox} onNavigate={onNavigate} className="sk-link">{t('clinToday.openInbox')}</DestinationButton>}
    >
      <div className="ct-tiles">
        <WaitingTile tone="danger" one="clinToday.tile.critical" many="clinToday.tile.criticals" item={waiting?.criticalResults ?? unknown} route={ROUTES.criticalResults} onNavigate={onNavigate} />
        <WaitingTile tone="attention" one="clinToday.tile.report" many="clinToday.tile.reports" item={waiting?.reportsToSign ?? unknown} route={ROUTES.reportReviews} onNavigate={onNavigate} />
        <WaitingTile tone="action" one="clinToday.tile.followUp" many="clinToday.tile.followUps" item={waiting?.followUps ?? unknown} route={ROUTES.inbox} onNavigate={onNavigate} />
        <WaitingTile tone="neutral" one="clinToday.tile.renewal" many="clinToday.tile.renewals" item={waiting?.renewals ?? unknown} route={ROUTES.renewals} onNavigate={onNavigate} />
      </div>
    </SkCard>
  );
}

function WaitingTile({ tone, one, many, item, route, onNavigate }: {
  tone: SkTone;
  one: MessageKey;
  many: MessageKey;
  item: WaitingItem;
  route: RoutePath | null;
  onNavigate: (route: RoutePath) => void;
}): React.ReactElement {
  const t = useT();
  return (
    <DestinationButton route={route} onNavigate={onNavigate} className={`ct-tile sk-tone--${tone}`}>
      <span className="ct-tile__count sk-mono">{item.count === null ? '—' : item.count}</span>
      <span className="ct-tile__label">{t(item.count === 1 ? one : many)}</span>
      {item.count === null ? <span className="ct-tile__detail">{t('clinToday.notReported')}</span> : null}
    </DestinationButton>
  );
}

/* ------------------------------------------------------------ camp duty */

/** Shown only when a source reports camp duty; none does yet. */
function CampCard({ camp }: { camp: CampDuty }): React.ReactElement {
  return (
    <SkCard className="sk-rise" title={camp.title} subtitle={camp.when} labelledBy="ct-camp-title">
      <p className="ct-camp-note">
        <Icon name="info" size={17} strokeWidth={1.9} />
        <span>{camp.note}</span>
      </p>
    </SkCard>
  );
}

/* ------------------------------------------------------------ loading */

function TodaySkeleton(): React.ReactElement {
  const t = useT();
  return (
    <div className="ct-skeleton" aria-busy="true" aria-label={t('clinToday.loading')} role="status">
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
