import React, { useMemo, useState } from 'react';
import { useT } from '@/i18n';
import type { MessageKey } from '@/i18n';
import { Glyph, Icon, Icon3d, Illustration } from '@/design-system/icons';
import { useOnline } from '@/design-system';
import { publishedStores, usePublicSettingsLoaded } from '@/design-system/public-site/PublicSiteFooter';
import { useApiResource } from '@/hooks/api/useApiResource';
import { apiFileUrl } from '@/data/services/http';
import { useAuth } from '@/data/contexts/AuthContext';
import type { LiveDocument } from '@/data/types/workflowTypes';
import { navigate } from '@/lib/utils/workflowRouting';
import { useNavigate } from '@/core/navigation';
import { shortNameOf } from '@/design-system/student-shell/StudentWebShell';
import { EmptyPanel, ErrorPanel, LoadingRows, OfflinePanel, PageHead, Pill, StudentWebFooter, TrustBand } from '../parts';
import { dayDate, shortDate } from './shared';
import { awaitsLabPayment } from '@/features/labBooking/views/labPaymentState';
import '../../studentweb.css';
import './t1web.css';

/** GET /lab-orders, the student's own (lab_payload(for_patient=True)): nothing about a result before release. */
export interface StudentLabTest {
  id: string;
  status: string;
  testPanel: string[];
  collectionMode: string;
  slotStart: string | null;
  collectedAt: number | null;
  reportDocumentId: string;
  reviewedAt: number | null;
  reviewNote: string;
  /** Only once released (WP-09). */
  reviewedByDoctor?: string;
  orderedByDoctor?: string;
  createdAt: number;
  /** A self-booked test's payment (null for a doctor-ordered one). */
  paymentStatus?: string | null;
}

export type LabTab = 'released' | 'awaiting' | 'outside';
const STOPPED = new Set(['CANCELLED', 'REJECTED']);
const STATUS: Record<string, MessageKey> = {
  BOOKED: 'care.rx.status.BOOKED',
  ASSIGNED: 'care.rx.status.ASSIGNED',
  SAMPLE_COLLECTED: 'care.rx.status.SAMPLE_COLLECTED',
  RECEIVED_AT_LAB: 'care.rx.status.RECEIVED_AT_LAB',
  IN_ANALYSIS: 'care.rx.status.IN_ANALYSIS',
  REPORT_READY: 'care.rx.status.REPORT_READY',
};

/** Released reports, tests still on their way, and lab reports the student added themselves. */
export function splitLabTests(tests: StudentLabTest[], documents: LiveDocument[]) {
  const released = tests.filter((test) => test.status === 'REPORT_RELEASED' && test.reportDocumentId);
  const fromOrders = new Set(released.map((test) => test.reportDocumentId));
  return {
    released,
    awaiting: tests.filter((test) => test.status !== 'REPORT_RELEASED' && !STOPPED.has(test.status)),
    outside: documents.filter((doc) => doc.category === 'LAB' && !fromOrders.has(doc.id)),
  };
}

/**
 * My lab tests (canvas 3b, WebMyLabTests, Tier 1 — approved by Krishna
 * Chintakayala, 2026-10-21). The student's own orders (GET /lab-orders) and
 * the lab reports in their vault (GET /health/documents).
 *
 * A report appears only after a doctor released it; until then the card says
 * where the test is and nothing about a result. Not drawn: parameter counts and
 * "outside range" counts (no structured results, D7-6), "Explain it" (no
 * report-scoped Ayush, D9-4). The app promo shows only when a store listing is
 * published (D9-2). "Book again" opens lab booking, where the price is shown
 * before anything is booked — never from a value (Rule L).
 */
export function WebMyLabTestsView() {
  const t = useT();
  const online = useOnline();
  const { user } = useAuth();
  const tests = useApiResource<{ items: StudentLabTest[]; total?: number }>('/lab-orders?limit=50');
  const docs = useApiResource<{ items: LiveDocument[] }>('/health/documents?limit=100&offset=0');
  const [tab, setTab] = useState<LabTab>('released');
  const split = useMemo(() => splitLabTests(tests.data?.items ?? [], docs.data?.items ?? []), [tests.data, docs.data]);
  const who = user ? t('swt.labs.forYou', { name: shortNameOf(user.fullName) }) : t('swt.labs.forYouOnly');
  const retry = () => { tests.reload(); docs.reload(); };
  const reportCount = split.released.length + split.outside.length;

  const tabs: Array<{ id: LabTab; label: MessageKey; count: number }> = [
    { id: 'released', label: 'swt.labs.tab.released', count: split.released.length },
    { id: 'awaiting', label: 'swt.labs.tab.awaiting', count: split.awaiting.length },
    { id: 'outside', label: 'swt.labs.tab.outside', count: split.outside.length },
  ];

  let body: React.ReactNode;
  if (!online && (tests.error || docs.error || tests.loading)) body = <OfflinePanel onRetry={retry} />;
  else if (tests.loading || docs.loading) body = <LoadingRows label={t('swt.labs.loading')} rows={3} />;
  else if (tests.error || docs.error) body = <ErrorPanel title={t('swt.labs.errorTitle')} body={t('swt.labs.errorBody')} onRetry={retry} />;
  else if (!(tests.data?.items.length) && !split.outside.length) {
    body = (
      <EmptyPanel
        icon3d={<Icon3d name="lab-alt--p5" size={88} />}
        title={t('swt.labs.emptyTitle')}
        body={t('swt.labs.emptyBody')}
        action={{ label: t('swt.labs.book'), onPress: () => navigate('lab-tests') }}
      />
    );
  } else {
    body = (
      <>
        <div className="sk-sw-tabs" role="group" aria-label={t('swt.labs.tabsLabel')}>
          {tabs.map((entry) => (
            <button key={entry.id} type="button" className="sk-sw-tab" aria-pressed={tab === entry.id} onClick={() => setTab(entry.id)}>
              {t(entry.label)}{entry.count ? ` · ${entry.count}` : ''}
            </button>
          ))}
        </div>
        {tab === 'released' ? (
          split.released.length
            ? split.released.map((test) => <ReleasedCard key={test.id} test={test} who={who} />)
            : <EmptyPanel title={t('swt.labs.noneReleasedTitle')} body={t('swt.labs.noneReleasedBody')} />
        ) : null}
        {tab === 'awaiting' ? (
          split.awaiting.length
            ? split.awaiting.map((test) => <AwaitingCard key={test.id} test={test} who={who} />)
            : <EmptyPanel title={t('swt.labs.noneWaitingTitle')} body={t('swt.labs.noneWaitingBody')} action={{ label: t('swt.labs.book'), onPress: () => navigate('lab-tests') }} />
        ) : null}
        {tab === 'outside' ? (
          split.outside.length ? split.outside.map((doc) => (
            <article key={doc.id} className="sk-sw-card sk-swt-report">
              <header className="sk-swt-report__head is-waiting">
                <div><h2 className="sk-swt-report__title">{doc.title}</h2><small>{t('swt.labs.outsideMeta', { date: dayDate(doc.createdAt) })}</small></div>
              </header>
              <div className="sk-swt-report__body">
                <p className="sk-sw-muted">{t('swt.labs.outsideBody')}</p>
                <div className="sk-swt-report__actions">
                  <a className="sk-sw-btn sk-sw-btn--primary" href={apiFileUrl(doc.id)} download>{t('swt.labs.openFile')}</a>
                </div>
              </div>
            </article>
          )) : (
            <EmptyPanel title={t('swt.labs.noneOutsideTitle')} body={t('swt.labs.noneOutsideBody')} action={{ label: t('swt.labs.addOutside'), onPress: () => navigate('records') }} />
          )
        ) : null}
      </>
    );
  }

  return (
    <div className="sk-sw-page" data-testid="web-my-lab-tests">
      <PageHead
        title={t('swt.labs.title')}
        sub={tests.data ? t('swt.labs.sub', { count: reportCount }) : undefined}
        actions={<button type="button" className="sk-sw-btn sk-sw-btn--soft" onClick={() => navigate('support')}><Icon name="message-circle" size={17} />{t('swt.labs.help')}</button>}
      />
      <AppPromo />
      {body}
      <TrustBand />
      <StudentWebFooter />
    </div>
  );
}

function ReleasedCard({ test, who }: { test: StudentLabTest; who: string }) {
  const t = useT();
  const routerNavigate = useNavigate();
  const released = test.reviewedAt ?? test.createdAt;
  return (
    <article className="sk-sw-card sk-swt-report" aria-labelledby={`lab-${test.id}`}>
      <header className="sk-swt-report__head">
        <div>
          <h2 className="sk-swt-report__title" id={`lab-${test.id}`}>{t('swt.labs.releasedOn')} <em>{shortDate(released)}</em></h2>
          <small>{test.reviewedByDoctor ? t('swt.labs.reviewedBy', { name: test.reviewedByDoctor }) : t('swt.labs.reviewed')}</small>
        </div>
        <Pill tone="positive"><Icon name="check" size={13} />{t('care.rx.status.REPORT_RELEASED')}</Pill>
      </header>
      <div className="sk-swt-report__body">
        <Facts test={test} who={who} />
        <div className="sk-swt-report__actions">
          <a className="sk-sw-btn sk-sw-btn--primary" href={apiFileUrl(test.reportDocumentId)} download>{t('swt.labs.view')}</a>
          <button type="button" className="sk-sw-btn sk-sw-btn--outline" onClick={() => routerNavigate(`/report-insights?id=${encodeURIComponent(test.id)}`)}>{t('swt.labs.insights')}</button>
          <button type="button" className="sk-sw-btn sk-sw-btn--ghost" onClick={() => navigate('lab-tests')}>{t('swt.labs.bookAgain')}</button>
        </div>
      </div>
      {test.reviewNote ? <p className="sk-swt-report__note"><strong>{t('swt.labs.doctorNote')}</strong> {test.reviewNote}</p> : null}
    </article>
  );
}

function AwaitingCard({ test, who }: { test: StudentLabTest; who: string }) {
  const t = useT();
  const unpaid = awaitsLabPayment(test);
  const status = unpaid ? 'care.rx.status.AWAITING_PAYMENT' : STATUS[test.status];
  return (
    <article className="sk-sw-card sk-swt-report" aria-labelledby={`lab-${test.id}`}>
      <header className="sk-swt-report__head is-waiting">
        <div>
          <h2 className="sk-swt-report__title" id={`lab-${test.id}`}>{status ? t(status) : t('swt.labs.inProgress')}</h2>
          <small>{test.slotStart ? t('swt.labs.slot', { when: new Date(test.slotStart).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' }) }) : t('swt.labs.booked', { date: dayDate(test.createdAt) })}</small>
        </div>
        <Pill tone="action" dot>{t('swt.labs.noResultYet')}</Pill>
      </header>
      <div className="sk-swt-report__body">
        <Facts test={test} who={who} />
        <p className="sk-sw-fine">{t(unpaid ? 'care.rx.awaitingPayment' : 'swt.labs.releaseRule')}</p>
      </div>
    </article>
  );
}

function Facts({ test, who }: { test: StudentLabTest; who: string }) {
  const t = useT();
  return (
    <ul className="sk-swt-facts">
      <li className="sk-swt-fact">
        <span className="sk-swt-fact__icon" aria-hidden="true"><Icon name="flask" size={17} /></span>
        <span><span className="sk-swt-fact__label">{t('swt.labs.fact.test')}</span><strong>{test.testPanel.join(', ') || t('swt.labs.fact.testUnknown')}</strong></span>
      </li>
      <li className="sk-swt-fact">
        <span className="sk-swt-fact__icon" aria-hidden="true"><Icon name="user" size={17} /></span>
        <span><span className="sk-swt-fact__label">{t('swt.labs.fact.for')}</span><strong>{who}</strong></span>
      </li>
      <li className="sk-swt-fact">
        <span className="sk-swt-fact__icon" aria-hidden="true"><Icon name="droplet" size={17} /></span>
        <span><span className="sk-swt-fact__label">{t('swt.labs.fact.collected')}</span><strong>{test.collectedAt ? dayDate(test.collectedAt) : t('swt.labs.fact.notYet')}</strong></span>
      </li>
      {test.orderedByDoctor ? (
        <li className="sk-swt-fact">
          <span className="sk-swt-fact__icon" aria-hidden="true"><Icon name="pin" size={17} /></span>
          <span><span className="sk-swt-fact__label">{t('swt.labs.fact.orderedBy')}</span><strong>{test.orderedByDoctor}</strong></span>
        </li>
      ) : null}
    </ul>
  );
}

/**
 * "Track collection on the app" — only when a store listing is published in the
 * settings registry (D9-2). Today none is, so nothing is drawn: no badge, no scan
 * code pointing at an app nobody can install.
 */
function AppPromo() {
  const t = useT();
  usePublicSettingsLoaded();
  const stores = publishedStores();
  if (!stores.length) return null;
  return (
    <section className="sk-sw-card sk-swt-two sk-swt-two--wide-side" aria-label={t('swt.labs.appTitle')}>
      <div className="sk-swt-col">
        <h2 className="sk-sw-h2">{t('swt.labs.appTitle')}</h2>
        <p className="sk-sw-muted">{t('swt.labs.appBody')}</p>
        <div className="sk-sw-head__actions">
          {stores.map((store) => (
            <a key={store.setting} className="sk-sw-btn sk-sw-btn--primary" href={store.href} target="_blank" rel="noopener noreferrer">
              <Icon name={store.icon} size={18} />{t(store.name)}
            </a>
          ))}
          <span className="sk-sw-muted">{t('swt.labs.appOr')}</span>
          <Glyph name="qr-sample-3" size={88} label={t('swt.labs.appScan')} />
        </div>
      </div>
      <Illustration name="illustration-phones-dashboard" size={220} />
    </section>
  );
}
