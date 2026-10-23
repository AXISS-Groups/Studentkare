import React, { useMemo, useState } from 'react';
import { useT } from '@/i18n';
import { Icon } from '@/design-system/icons';
import { useOnline } from '@/design-system';
import { useApiResource } from '@/hooks/api/useApiResource';
import { apiFileUrl } from '@/data/services/http';
import { useLocation } from '@/core/navigation';
import { navigate } from '@/lib/utils/workflowRouting';
import { initialsOf } from '@/design-system/student-shell/StudentWebShell';
import { EmptyPanel, ErrorPanel, LinkRow, LoadingRows, OfflinePanel, PageHead, Pill } from '../parts';
import type { StudentLabTest } from './WebMyLabTestsView';
import { IconNote, dayDate } from './shared';
import '../../studentweb.css';
import './t1web.css';

type InsightTab = 'summary' | 'history';

/** The report to show: the one asked for (?id=), else the newest released one. */
export function pickReport(tests: StudentLabTest[], id: string | null): StudentLabTest | null {
  const released = tests
    .filter((test) => test.status === 'REPORT_RELEASED' && test.reportDocumentId)
    .sort((a, b) => (b.reviewedAt ?? b.createdAt) - (a.reviewedAt ?? a.createdAt));
  return (id ? released.find((test) => test.id === id) : undefined) ?? released[0] ?? null;
}

/**
 * Report insights (canvas 3b, WebReportInsights, Tier 1 — approved by Krishna
 * Chintakayala, 2026-10-21), phase 1 of the care-flows plan §5: the reviewing
 * doctor's own note, the report itself, and "talk to a doctor".
 *
 * Not drawn, on purpose: the body-system table, parameter counts and the
 * result-over-time chart (labs send a PDF, not structured results — D7-6);
 * "An AI draft may help the clinician" (clinicians get no AI draft today);
 * "Ask Ayush about this report" (no report-scoped Ayush, D9-4); a retest
 * reminder (no reminder is created from a report). Nothing here is reachable
 * from the shop and nothing here links to a product (Rule L).
 */
export function WebReportInsightsView() {
  const t = useT();
  const online = useOnline();
  const location = useLocation();
  const asked = new URLSearchParams(location.search).get('id');
  const tests = useApiResource<{ items: StudentLabTest[] }>('/lab-orders?limit=50');
  const [tab, setTab] = useState<InsightTab>('summary');
  const [chosen, setChosen] = useState<string | null>(asked);
  const report = useMemo(() => pickReport(tests.data?.items ?? [], chosen), [tests.data, chosen]);
  const history = useMemo(
    () => (tests.data?.items ?? []).filter((test) => test.status === 'REPORT_RELEASED' && test.reportDocumentId),
    [tests.data],
  );

  let body: React.ReactNode;
  if (!online && (tests.error || tests.loading)) body = <OfflinePanel onRetry={tests.reload} />;
  else if (tests.loading) body = <LoadingRows label={t('swt.insights.loading')} rows={3} />;
  else if (tests.error) body = <ErrorPanel title={t('swt.insights.errorTitle')} body={t('swt.insights.errorBody')} onRetry={tests.reload} />;
  else if (!report) {
    body = <EmptyPanel title={t('swt.insights.emptyTitle')} body={t('swt.insights.emptyBody')} action={{ label: t('swt.insights.openLabs'), onPress: () => navigate('my-lab-tests') }} />;
  } else {
    const doctor = report.reviewedByDoctor ?? '';
    const released = report.reviewedAt ?? report.createdAt;
    const testName = report.testPanel.join(', ') || t('swt.labs.fact.testUnknown');
    body = (
      <>
        <div className="sk-sw-tabs" role="group" aria-label={t('swt.insights.tabsLabel')}>
          <button type="button" className="sk-sw-tab" aria-pressed={tab === 'summary'} onClick={() => setTab('summary')}>{t('swt.insights.tab.summary')}</button>
          <button type="button" className="sk-sw-tab" aria-pressed={tab === 'history'} onClick={() => setTab('history')}>{t('swt.insights.tab.history', { count: history.length })}</button>
        </div>
        {tab === 'summary' ? (
          <div className="sk-swt-two">
            <div className="sk-swt-col">
              <section className="sk-sw-card" aria-labelledby="sk-swt-summary-title">
                <div className="sk-swt-summary">
                  <span className="sk-swt-avatar" aria-hidden="true">{doctor ? initialsOf(doctor.replace(/^dr\.?\s+/i, '')) : <Icon name="user" size={20} />}</span>
                  <div className="sk-swt-summary__text">
                    <h2 id="sk-swt-summary-title" className="sk-sw-card__title">{t('swt.insights.summaryTitle')}</h2>
                    <Pill tone="positive"><Icon name="check" size={13} />{doctor ? t('swt.insights.writtenBy', { name: doctor, date: dayDate(released) }) : t('swt.insights.writtenOn', { date: dayDate(released) })}</Pill>
                    {report.reviewNote ? <p>{report.reviewNote}</p> : <p className="sk-sw-muted">{t('swt.insights.noNote')}</p>}
                    <p className="sk-sw-fine">{t('swt.insights.signedRule')}</p>
                  </div>
                </div>
              </section>
              <IconNote icon="search">{t('swt.insights.noBreakdown')}</IconNote>
              <p className="sk-sw-fine">{t('swt.insights.firewall')}</p>
            </div>
            <aside className="sk-swt-col" aria-label={t('swt.insights.sideLabel')}>
              <section className="sk-sw-card sk-swt-side">
                <h2 className="sk-sw-card__title">{testName}</h2>
                <dl className="sk-swt-kv">
                  <div><dt>{t('swt.insights.released')}</dt><dd>{dayDate(released)}</dd></div>
                  {report.collectedAt ? <div><dt>{t('swt.labs.fact.collected')}</dt><dd>{dayDate(report.collectedAt)}</dd></div> : null}
                </dl>
                <a className="sk-sw-btn sk-sw-btn--primary sk-sw-btn--block" href={apiFileUrl(report.reportDocumentId)} download>{t('swt.insights.download')}</a>
              </section>
              <span className="sk-sw-eyebrow">{t('swt.insights.next')}</span>
              <div className="sk-swt-next">
                <LinkRow icon="message-circle-2" title={t('swt.insights.talk')} meta={t('swt.insights.talkMeta')} onPress={() => navigate('care')} />
                <LinkRow icon="upload" title={t('swt.insights.addOutside')} meta={t('swt.insights.addOutsideMeta')} onPress={() => navigate('records')} />
              </div>
            </aside>
          </div>
        ) : (
          <div className="sk-sw-card sk-sw-table-wrap">
            <table className="sk-sw-table">
              <caption className="sk-visually-hidden">{t('swt.insights.historyCaption')}</caption>
              <thead><tr><th scope="col">{t('swt.labs.fact.test')}</th><th scope="col">{t('swt.insights.released')}</th><th scope="col"><span className="sk-visually-hidden">{t('swt.vault.col.actions')}</span></th></tr></thead>
              <tbody>
                {history.map((test) => (
                  <tr key={test.id} className={test.id === report.id ? 'is-selected' : undefined}>
                    <td><strong>{test.testPanel.join(', ') || t('swt.labs.fact.testUnknown')}</strong>{test.reviewedByDoctor ? <small>{t('swt.labs.reviewedBy', { name: test.reviewedByDoctor })}</small> : null}</td>
                    <td>{dayDate(test.reviewedAt ?? test.createdAt)}</td>
                    <td className="sk-sw-table__action">
                      <button type="button" className="sk-sw-chip-btn" aria-label={t('swt.insights.openSpoken', { test: test.testPanel.join(', ') })} onClick={() => { setChosen(test.id); setTab('summary'); }}>{t('swt.insights.open')}</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </>
    );
  }

  return (
    <div className="sk-sw-page" data-testid="web-report-insights">
      <PageHead
        title={t('swt.insights.title')}
        sub={report ? t('swt.insights.sub', { test: report.testPanel.join(', '), date: dayDate(report.reviewedAt ?? report.createdAt) }) : undefined}
        actions={<button type="button" className="sk-sw-btn sk-sw-btn--ghost" onClick={() => navigate('my-lab-tests')}>{t('swt.insights.allTests')}<Icon name="chevron-right" size={16} /></button>}
      />
      {body}
    </div>
  );
}
