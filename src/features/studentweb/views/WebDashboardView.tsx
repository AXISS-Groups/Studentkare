import React, { useMemo, useState } from 'react';
import { useT } from '@/i18n';
import type { MessageKey } from '@/i18n';
import { Icon, Icon3d } from '@/design-system/icons';
import type { SkIconName } from '@/design-system/icons';
import { Overlay, useOnline } from '@/design-system';
import { useAuth } from '@/data/contexts/AuthContext';
import { useApiResource } from '@/hooks/api/useApiResource';
import { getSetting } from '@/data/services/config';
import type { LiveOrder, RecordShare } from '@/data/types/workflowTypes';
import { navigate } from '@/lib/utils/workflowRouting';
import type { RoutePath } from '@/lib/utils/workflowRouting';
import { careSummary, isFirstTime, orderRef } from '../data/studentWebData';
import type { NeedItem, StudentAppointment, StudentLabOrder, UpcomingItem } from '../data/studentWebData';
import { EmptyPanel, ErrorPanel, Eyebrow, LoadingRows, OfflinePanel, PageHead, Pill } from './parts';
import type { PillTone } from './parts';

const NEED: Record<NeedItem['kind'], { icon: SkIconName; title: MessageKey; meta: MessageKey; cta: MessageKey; to: RoutePath; tone: 'lab' | 'pill' | 'order' }> = {
  payOrder: { icon: 'shopping-bag-2', title: 'sw.dash.need.pay.title', meta: 'sw.dash.need.pay.meta', cta: 'sw.dash.need.pay.cta', to: 'orders', tone: 'order' },
  reportReady: { icon: 'flask-2', title: 'sw.dash.need.report.title', meta: 'sw.dash.need.report.meta', cta: 'sw.dash.need.report.cta', to: 'records', tone: 'lab' },
  recollect: { icon: 'pill-2', title: 'sw.dash.need.recollect.title', meta: 'sw.dash.need.recollect.meta', cta: 'sw.dash.need.recollect.cta', to: 'records', tone: 'pill' },
};

const UPCOMING_STATUS: Record<string, { label: MessageKey; tone: PillTone }> = {
  CONFIRMED: { label: 'sw.dash.status.confirmed', tone: 'positive' },
  REQUESTED: { label: 'sw.dash.status.requested', tone: 'action' },
  BOOKED: { label: 'sw.dash.status.scheduled', tone: 'action' },
  ASSIGNED: { label: 'sw.dash.status.scheduled', tone: 'action' },
  RECOLLECTION_REQUIRED: { label: 'sw.dash.status.recollect', tone: 'attention' },
};
/** Upcoming items shown on the card. */
const UPCOMING_SHOWN = 3;

/** "Book something": where each kind of booking starts (all real routes). */
const BOOK: { icon: SkIconName; label: MessageKey; meta: MessageKey; to: RoutePath }[] = [
  { icon: 'search-3', label: 'sw.dash.bookMenu.search', meta: 'sw.dash.bookMenu.searchMeta', to: 'shop' },
  { icon: 'flask-2', label: 'sw.dash.bookMenu.lab', meta: 'sw.dash.bookMenu.labMeta', to: 'lab-tests' },
  { icon: 'user-3', label: 'sw.dash.bookMenu.doctor', meta: 'sw.dash.bookMenu.doctorMeta', to: 'care' },
  { icon: 'pill-2', label: 'sw.dash.bookMenu.medicines', meta: 'sw.dash.bookMenu.medicinesMeta', to: 'shop' },
];
const KEEP: { icon: SkIconName; label: MessageKey; to: RoutePath }[] = [
  { icon: 'heart-plus-2', label: 'sw.dash.bookMenu.card', to: 'emergency-card' },
  { icon: 'lock-3', label: 'sw.dash.bookMenu.vault', to: 'records' },
];

const dayOf = (date: Date) => date.toLocaleDateString('en-IN', { day: '2-digit' });
const monthOf = (date: Date) => date.toLocaleDateString('en-IN', { month: 'short' }).toUpperCase();
const timeOf = (date: Date) => date.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' });
const weekdayTime = (date: Date) => `${date.toLocaleDateString('en-IN', { weekday: 'short' })} ${date.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', hour12: false })}`;

/**
 * Your Care (canvas 3b, WebDashboard, Tier 2). What needs doing, never a score
 * about the body: counts, dates and next steps from the student's own orders,
 * bookings and shares. A ready report shows as ready — what is in it stays in
 * the vault.
 */
export function WebDashboardView() {
  const t = useT();
  const { user } = useAuth();
  const online = useOnline();
  const [booking, setBooking] = useState(false);
  const orders = useApiResource<{ items: LiveOrder[] }>('/orders?limit=20');
  const appointments = useApiResource<{ items: StudentAppointment[] }>('/appointments');
  const labs = useApiResource<{ items: StudentLabOrder[] }>('/lab-orders?limit=20');
  const shares = useApiResource<{ items: RecordShare[] }>('/records/shares');
  const documents = useApiResource<{ items: unknown[]; total?: number }>('/health/documents?limit=1&offset=0');
  const all = [orders, appointments, labs, shares];
  const loading = all.some((resource) => resource.loading);
  const failed = all.some((resource) => resource.error);
  const retry = () => { for (const resource of [...all, documents]) resource.reload(); };

  const summary = useMemo(() => careSummary({
    now: new Date(),
    orders: orders.data?.items ?? [],
    appointments: appointments.data?.items ?? [],
    labOrders: labs.data?.items ?? [],
    shares: shares.data?.items ?? [],
    reportReadyDays: getSetting('studentweb.report_ready_days'),
  }), [orders.data, appointments.data, labs.data, shares.data]);

  const campus = user?.university?.trim();
  const needLine = summary.needs.length === 0 ? t('sw.dash.subNone') : summary.needs.length === 1 ? t('sw.dash.subOne') : t('sw.dash.subMany', { count: summary.needs.length });
  const sub = loading || failed ? (campus || undefined) : (campus ? `${campus} • ${needLine}` : needLine);
  const records = documents.data ? (documents.data.total ?? documents.data.items.length) : null;

  const head = (
    <PageHead
      title={t('sw.dash.title')}
      sub={sub}
      actions={(
        <button type="button" className="sk-sw-btn sk-sw-btn--primary sk-sw-btn--lg" aria-haspopup="dialog" onClick={() => setBooking(true)}>
          <Icon name="plus" size={18} />{t('sw.dash.book')}
        </button>
      )}
    />
  );
  const go = (to: RoutePath) => { setBooking(false); navigate(to); };
  const bookDialog = (
    <Overlay open={booking} variant="dialog" showClose title={t('sw.dash.bookMenu.title')} subtitle={t('sw.dash.bookMenu.sub')} onClose={() => setBooking(false)}>
      <div className="sk-sw-bookmenu">
        {BOOK.map((option) => (
          <button key={option.label} type="button" className="sk-sw-bookmenu__item" onClick={() => go(option.to)}>
            <span className="sk-sw-bookmenu__icon" aria-hidden="true"><Icon name={option.icon} size={20} /></span>
            <span><strong>{t(option.label)}</strong><small>{t(option.meta)}</small></span>
          </button>
        ))}
        <div className="sk-sw-bookmenu__keep">
          {KEEP.map((option) => (
            <button key={option.label} type="button" className="sk-sw-bookmenu__keepbtn" onClick={() => go(option.to)}>
              <Icon name={option.icon} size={18} />{t(option.label)}
            </button>
          ))}
        </div>
      </div>
    </Overlay>
  );

  if (!online && (failed || loading)) return <div className="sk-sw-page">{head}{bookDialog}<OfflinePanel onRetry={retry} /></div>;
  if (loading) return <div className="sk-sw-page">{head}{bookDialog}<LoadingRows label={t('sw.dash.loading')} rows={4} /></div>;
  if (failed) return <div className="sk-sw-page">{head}{bookDialog}<ErrorPanel title={t('sw.dash.errorTitle')} body={t('sw.dash.errorBody')} onRetry={retry} /></div>;

  if (isFirstTime(summary)) {
    return (
      <div className="sk-sw-page">
        {head}
        {bookDialog}
        <EmptyPanel
          icon3d={<Icon3d name="chart-alt--p4" size={88} />}
          title={t('sw.dash.firstTitle')}
          body={t('sw.dash.firstBody')}
          action={{ label: t('sw.dash.firstLab'), onPress: () => navigate('lab-tests') }}
          secondary={{ label: t('sw.dash.firstCard'), onPress: () => navigate('emergency-card') }}
        />
      </div>
    );
  }

  const semester: { label: MessageKey; value: string }[] = [
    { label: 'sw.dash.sem.consults', value: String(summary.consultsBooked) },
    { label: 'sw.dash.sem.labs', value: String(summary.labTestsBooked) },
    { label: 'sw.dash.sem.records', value: records === null ? '—' : t('sw.dash.sem.recordsValue', { count: records }) },
  ];

  return (
    <div className="sk-sw-page">
      {head}
      {bookDialog}
      <div className="sk-sw-dash">
        <section className="sk-sw-week" aria-labelledby="sk-sw-week-title">
          <span id="sk-sw-week-title" className="sk-sw-week__eyebrow">{t('sw.dash.week')}</span>
          <dl className="sk-sw-week__grid">
            <div><dt>{t('sw.dash.week.need')}</dt><dd className="is-attention">{summary.needs.length}</dd></div>
            <div><dt>{t('sw.dash.week.pending')}</dt><dd>{summary.reportsPending}</dd></div>
            <div><dt>{t('sw.dash.week.consult')}</dt><dd className="is-mono">{summary.nextConsult ? weekdayTime(summary.nextConsult) : t('sw.dash.week.none')}</dd></div>
            <div><dt>{t('sw.dash.week.shared')}</dt><dd className="is-positive is-mono">{summary.recordsShared}</dd></div>
          </dl>
          <p className="sk-sw-week__note">{t('sw.dash.week.note')}</p>
        </section>

        <section className="sk-sw-needs" aria-labelledby="sk-sw-needs-title">
          <Eyebrow id="sk-sw-needs-title">{t('sw.dash.needs')}</Eyebrow>
          {summary.needs.length ? summary.needs.map((need) => {
            const spec = NEED[need.kind];
            return (
              <div key={`${need.kind}-${need.id}`} className="sk-sw-card sk-sw-need">
                <span className={`sk-sw-need__icon is-${spec.tone}`} aria-hidden="true"><Icon name={spec.icon} size={20} /></span>
                <span className="sk-sw-need__text">
                  <strong>{t(spec.title)}</strong>
                  <small>{need.kind === 'payOrder' ? t(spec.meta, { ref: orderRef(need.id) }) : t(spec.meta)}</small>
                </span>
                <button type="button" className={`sk-sw-chip-btn${spec.tone === 'lab' ? ' is-positive' : ''}`} onClick={() => navigate(spec.to)}>{t(spec.cta)}</button>
              </div>
            );
          }) : (
            <div className="sk-sw-card sk-sw-need">
              <span className="sk-sw-need__icon is-lab" aria-hidden="true"><Icon name="check" size={20} /></span>
              <span className="sk-sw-need__text"><strong>{t('sw.dash.needsNone')}</strong><small>{t('sw.dash.needsNoneMeta')}</small></span>
            </div>
          )}
        </section>

        <section className="sk-sw-card sk-sw-semester" aria-labelledby="sk-sw-sem-title">
          <Eyebrow id="sk-sw-sem-title">{t('sw.dash.semester')}</Eyebrow>
          <dl>
            {semester.map((row) => (
              <div key={row.label} className="sk-sw-semester__row"><dt>{t(row.label)}</dt><dd>{row.value}</dd></div>
            ))}
          </dl>
          <p className="sk-sw-fine">{t('sw.dash.semesterNote')}</p>
        </section>

        <section className="sk-sw-card sk-sw-upcoming" aria-labelledby="sk-sw-up-title">
          <div className="sk-sw-upcoming__head">
            <Eyebrow id="sk-sw-up-title">{t('sw.dash.upcoming')}</Eyebrow>
            <button type="button" className="sk-sw-link" onClick={() => navigate('records')}>{t('sw.dash.openVault')}</button>
          </div>
          {summary.upcoming.length ? (
            <ul className="sk-sw-upcoming__list">
              {summary.upcoming.slice(0, UPCOMING_SHOWN).map((item) => <UpcomingRow key={`${item.kind}-${item.id}`} item={item} />)}
            </ul>
          ) : (
            <p className="sk-sw-muted">{t('sw.dash.upcomingNone')}</p>
          )}
        </section>
      </div>
    </div>
  );
}

function UpcomingRow({ item }: { item: UpcomingItem }) {
  const t = useT();
  const status = UPCOMING_STATUS[item.status] ?? { label: 'sw.dash.status.scheduled' as MessageKey, tone: 'muted' as PillTone };
  return (
    <li className="sk-sw-upcoming__item">
      <span className="sk-sw-date" aria-hidden="true"><strong>{dayOf(item.at)}</strong><small>{monthOf(item.at)}</small></span>
      <span className="sk-sw-upcoming__text">
        <strong>{item.kind === 'consult' ? t('sw.dash.up.consult') : t('sw.dash.up.collection')}</strong>
        <small>{t('sw.dash.up.when', { date: item.at.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }), time: timeOf(item.at) })}</small>
      </span>
      <Pill tone={status.tone}>{t(status.label)}</Pill>
    </li>
  );
}
