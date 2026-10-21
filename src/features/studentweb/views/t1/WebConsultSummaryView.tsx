import React, { useEffect, useRef, useState } from 'react';
import { observer } from 'mobx-react-lite';
import { useT } from '@/i18n';
import type { MessageKey } from '@/i18n';
import { Icon } from '@/design-system/icons';
import { useOnline } from '@/design-system';
import { useLocation, useNavigate } from '@/core/navigation';
import { navigate } from '@/lib/utils/workflowRouting';
import { VisitSummaryViewModel } from '@/features/vault/viewmodel/VisitSummaryViewModel';
import type { VisitSummary, VisitSummaryHeader } from '@/features/vault/viewmodel/VisitSummaryViewModel';
import { EmptyPanel, ErrorPanel, LoadingRows, OfflinePanel, PageHead, Pill } from '../parts';
import { IconNote, dayDate } from './shared';
import '../../studentweb.css';
import './t1web.css';

const SECTIONS: Array<{ field: 'subjective' | 'objective' | 'assessment' | 'plan'; label: MessageKey }> = [
  { field: 'subjective', label: 'care.visit.subjective' },
  { field: 'objective', label: 'care.visit.objective' },
  { field: 'assessment', label: 'care.visit.assessment' },
  { field: 'plan', label: 'care.visit.plan' },
];

/** A booked slot as the server stores it ("2026-10-10T09:00") to "10 Oct 2026, 9:00 am". */
const visitTime = (value: string) => new Date(value).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' });

/**
 * Visit summary, web (canvas 3b, WebConsultSummary, Tier 1 — approved by
 * Krishna Chintakayala, 2026-10-21). Two columns: the signed note on the left,
 * the prescriptions issued with it on the right. Same view-model and data as
 * the phone summary (GET /records/visit-summaries*); only signed notes ever
 * arrive, and the note text lives in memory only.
 *
 * Not drawn, on purpose (D7-9): the consult type and price line, "his access
 * to your records has ended", the follow-up booking and the star rating — the
 * server holds none of them. "Order these" is not drawn either: prescriptions
 * open in Prescriptions (the dispense flow), never the cart.
 */
export const WebConsultSummaryView = observer(function WebConsultSummaryView({ viewModel: vm }: { viewModel: VisitSummaryViewModel }) {
  const t = useT();
  const online = useOnline();

  if (vm.selectedId) {
    return (
      <div className="sk-sw-page" data-testid="web-consult-summary">
        <PageHead
          title={t('care.visit.title')}
          actions={<button type="button" className="sk-sw-btn sk-sw-btn--ghost" onClick={vm.close}><Icon name="chevron-left" size={16} />{t('care.visit.back')}</button>}
        />
        {vm.detailPhase === 'loading' ? <LoadingRows label={t('care.visit.loadingOne')} rows={3} /> : null}
        {vm.detailPhase === 'failed' ? (
          online
            ? <ErrorPanel title={t('care.visit.failedOneTitle')} body={t('care.visit.failedBody')} onRetry={() => { if (vm.selectedId) void vm.open(vm.selectedId); }} />
            : <OfflinePanel onRetry={() => { if (vm.selectedId) void vm.open(vm.selectedId); }} />
        ) : null}
        {vm.detailPhase === 'missing' ? <EmptyPanel title={t('care.visit.missingTitle')} body={t('care.visit.missingBody')} action={{ label: t('care.visit.back'), onPress: vm.close }} /> : null}
        {vm.detailPhase === 'ready' && vm.detail ? <SummaryBody summary={vm.detail} /> : null}
      </div>
    );
  }

  return (
    <div className="sk-sw-page" data-testid="web-consult-summary">
      <PageHead title={t('care.visit.listTitle')} sub={t('care.visit.listLead')} />
      {vm.listPhase === 'loading' ? <LoadingRows label={t('care.visit.loading')} rows={3} /> : null}
      {vm.listPhase === 'failed' ? (
        online ? <ErrorPanel title={t('care.visit.failedTitle')} body={t('care.visit.failedBody')} onRetry={() => void vm.load()} /> : <OfflinePanel onRetry={() => void vm.load()} />
      ) : null}
      {vm.listPhase === 'ready' && vm.items.length === 0 ? (
        <EmptyPanel title={t('care.visit.emptyTitle')} body={t('care.visit.emptyBody')} action={{ label: t('care.visit.emptyAction'), onPress: () => navigate('appointments') }} />
      ) : null}
      {vm.listPhase === 'ready' && vm.items.length ? (
        <div className="sk-sw-card sk-sw-table-wrap">
          <table className="sk-sw-table">
            <caption className="sk-visually-hidden">{t('care.visit.listTitle')}</caption>
            <thead><tr><th scope="col">{t('swt.visit.col.visit')}</th><th scope="col">{t('swt.visit.col.signed')}</th><th scope="col"><span className="sk-visually-hidden">{t('swt.vault.col.actions')}</span></th></tr></thead>
            <tbody>{vm.items.map((item) => <SummaryRow key={item.id} item={item} onOpen={() => void vm.open(item.id)} />)}</tbody>
          </table>
        </div>
      ) : null}
    </div>
  );
});

function SummaryRow({ item, onOpen }: { item: VisitSummaryHeader; onOpen: () => void }) {
  const t = useT();
  const name = item.doctorName || t('care.visit.doctorUnknown');
  return (
    <tr>
      <td><strong>{t('care.visit.consultWith', { name })}</strong>{item.appointmentStart ? <small>{t('care.visit.visitOn', { date: visitTime(item.appointmentStart) })}</small> : null}</td>
      <td>{dayDate(item.signedAt)}</td>
      <td className="sk-sw-table__action">
        <button type="button" className="sk-sw-chip-btn" aria-label={t('care.visit.openSpoken', { name, date: dayDate(item.signedAt) })} onClick={onOpen}>{t('swt.insights.open')}</button>
      </td>
    </tr>
  );
}

function SummaryBody({ summary }: { summary: VisitSummary }) {
  const t = useT();
  const name = summary.doctorName || t('care.visit.doctorUnknown');
  const meta = [
    summary.appointmentStart ? t('care.visit.visitOn', { date: visitTime(summary.appointmentStart) }) : '',
    summary.doctorRegistrationNumber ? t('care.visit.reg', { reg: summary.doctorRegistrationNumber }) : '',
  ].filter(Boolean).join(' · ');
  const written = SECTIONS.filter(({ field }) => summary[field].trim() !== '');
  return (
    <div className="sk-swt-two sk-swt-two--wide-side">
      <div className="sk-swt-col">
        <section className="sk-sw-card" aria-labelledby="sk-swt-visit-title">
          <div className="sk-swt-summary">
            <span className="sk-swt-avatar is-positive" aria-hidden="true"><Icon name="check" size={22} strokeWidth={3} /></span>
            <div className="sk-swt-summary__text">
              <h2 id="sk-swt-visit-title" className="sk-sw-card__title">{t('care.visit.consultWith', { name })}</h2>
              {meta ? <span className="sk-sw-muted sk-sw-mono">{meta}</span> : null}
              <span className="sk-sw-success"><Icon name="check" size={14} />{t('care.visit.signed', { date: dayDate(summary.signedAt) })}</span>
            </div>
          </div>
        </section>
        <section className="sk-sw-card" aria-labelledby="sk-swt-visit-said">
          <span id="sk-swt-visit-said" className="sk-sw-eyebrow">{t('care.visit.doctorSaid')}</span>
          {written.map(({ field, label }) => (
            <div key={field} className="sk-swt-summary__text sk-swt-section">
              <h3 className="sk-sw-card__title">{t(label)}</h3>
              <p>{summary[field]}</p>
            </div>
          ))}
        </section>
      </div>
      <div className="sk-swt-col">
        <section className="sk-sw-card sk-swt-side" aria-labelledby="sk-swt-visit-rx">
          <span id="sk-swt-visit-rx" className="sk-sw-eyebrow">{t('care.visit.rxEyebrow')}</span>
          {summary.prescriptions.length ? summary.prescriptions.map((rx) => (
            <div key={rx.id} className="sk-swt-toolbar">
              <span><strong className="sk-sw-mono">{t('care.visit.rxRef', { ref: rx.id.slice(0, 8).toUpperCase() })}</strong><br /><small className="sk-sw-muted">{t('care.visit.rxIssued', { date: dayDate(rx.issuedAt) })}</small></span>
              {rx.status === 'ISSUED' ? <Pill tone="positive"><Icon name="check" size={13} />{t('care.rx.status.ISSUED')}</Pill> : <Pill tone="muted">{rx.status.replace(/_/g, ' ').toLowerCase()}</Pill>}
            </div>
          )) : <p className="sk-sw-muted">{t('care.visit.rxNone')}</p>}
          <button type="button" className={`sk-sw-btn ${summary.prescriptions.length ? 'sk-sw-btn--primary' : 'sk-sw-btn--outline'} sk-sw-btn--block`} onClick={() => navigate('prescriptions')}>{t('care.visit.rxOpen')}</button>
          <p className="sk-sw-fine">{t('swt.visit.anyPharmacy')}</p>
        </section>
        <IconNote icon="shield-half" tone="attention">{t('care.visit.safety')}</IconNote>
      </div>
    </div>
  );
}

/** Route /visit-summaries on the web: reads `?id=` (a notification links straight to one) and owns the view-model. */
export const WebConsultSummaryRoute = observer(function WebConsultSummaryRoute(): React.ReactElement {
  const location = useLocation();
  const routerNavigate = useNavigate();
  const linkedId = new URLSearchParams(location.search).get('id');
  const [initialId] = useState(linkedId);
  const [vm] = useState(() => new VisitSummaryViewModel());
  useEffect(() => {
    void vm.load();
    if (initialId) void vm.open(initialId);
    return () => vm.dispose();
  }, [vm, initialId]);
  const selectedId = vm.selectedId;
  const wasOpen = useRef(false);
  useEffect(() => {
    if (wasOpen.current && !selectedId && linkedId) routerNavigate('/visit-summaries', { replace: true });
    wasOpen.current = selectedId !== null;
  }, [selectedId, linkedId, routerNavigate]);
  return <WebConsultSummaryView viewModel={vm} />;
});
