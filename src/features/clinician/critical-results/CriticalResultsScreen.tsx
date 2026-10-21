import React, { useEffect, useState } from 'react';
import { observer } from 'mobx-react-lite';
import { DataTable, Drawer, SkButton, SkSkeleton as Skeleton, StatRow, Tabs, SkToast as Toast, useOnline } from '@/design-system';
import type { DataTableRow } from '@/design-system';
import { useT } from '@/i18n';
import { navigate } from '@/lib/utils/workflowRouting';
import type { RoutePath } from '@/lib/utils/workflowRouting';
import { ClinicianConsoleFrame } from '../shared/ClinicianConsoleFrame';
import { ClinicianEmptyState, ClinicianErrorState } from '../shared/ClinicianStates';
import { OfflineNote } from '../shared/OfflineNote';
import { REVIEW_ROUTES } from '../shared/reviewRoutes';
import { CriticalResultsViewModel } from './CriticalResultsViewModel';
import type { CriticalTab } from './CriticalResultsViewModel';
import { ESCALATIONS, criticalApiSource, isCritical } from './criticalModel';
import type { CriticalResult, CriticalSource, Escalation } from './criticalModel';
import './critical-results.css';

const ESCALATION_KEYS: Record<Escalation, { label: 'clinCritical.esc.call' | 'clinCritical.esc.clinic' | 'clinCritical.esc.followUp'; meta: 'clinCritical.esc.callMeta' | 'clinCritical.esc.clinicMeta' | 'clinCritical.esc.followUpMeta' }> = {
  call: { label: 'clinCritical.esc.call', meta: 'clinCritical.esc.callMeta' },
  clinic: { label: 'clinCritical.esc.clinic', meta: 'clinCritical.esc.clinicMeta' },
  'follow-up': { label: 'clinCritical.esc.followUp', meta: 'clinCritical.esc.followUpMeta' },
};

/**
 * ClinicalReview (design page 5). Tier 1, approved by Krishna Chintakayala
 * on 2026-10-21. The critical banner is the drawer: it opens on the row, it
 * never waits for anything else, and closing it never hides the result —
 * only a recorded acknowledgement moves a row out of "Unacknowledged".
 */
export const CriticalResultsView = observer(function CriticalResultsView({ viewModel, onNavigate }: { viewModel: CriticalResultsViewModel; onNavigate: (route: RoutePath) => void }): React.ReactElement {
  const t = useT();
  const { status, data } = viewModel;
  const tabs: { id: CriticalTab; label: string }[] = [
    { id: 'unacknowledged', label: t('clinCritical.tab.unacknowledged') },
    { id: 'all', label: t('clinCritical.tab.all') },
    { id: 'never-collected', label: t('clinCritical.tab.never') },
  ];
  let body: React.ReactNode;
  if (status === 'loading') {
    body = (
      <div className="cr-skeleton" aria-busy="true" aria-label={t('clinCritical.loading')}>
        <Skeleton width={300} height={34} />
        <Skeleton height={70} />
        {Array.from({ length: 4 }, (_, i) => <Skeleton key={i} height={56} />)}
      </div>
    );
  } else if (status === 'error') {
    body = <ClinicianErrorState title={t('clinCritical.errorTitle')} reference={t('clinCritical.reference')} onRetry={() => { void viewModel.load(); }} onHelp={() => onNavigate('support')} />;
  } else if (status === 'unconnected' || status === 'empty' || !data) {
    body = <ClinicianEmptyState title={t('clinCritical.emptyTitle')} body={t('clinCritical.emptyBody')} action={{ label: t('clinCritical.legacyLink'), onSelect: () => onNavigate('clinical-review') }} />;
  } else {
    const rows: DataTableRow[] = viewModel.visible.map((r) => ({
      id: r.id,
      cells: [
        { node: <PatientCell result={r} /> },
        { text: r.analyte, sub: r.panel, weight: 'regular' },
        { text: r.value, sub: r.reference ? t('clinCritical.ref', { range: r.reference }) : undefined, weight: 'regular', tone: isCritical(r.flag) ? 'danger' : r.flag === 'H' || r.flag === 'L' ? 'attention' : undefined, mono: r.flag !== 'none' },
        { text: r.released, sub: r.ackText, weight: 'regular' },
        { node: <RowAction result={r} viewModel={viewModel} /> },
      ],
    }));
    body = (
      <div className="cr-page">
        <div className="cr-head sk-fade">
          <div className="cr-head__titles">
            <span className="cr-eyebrow">{t('clinCritical.eyebrow')}</span>
            <h1 className="cr-title">{t('clinCritical.title')}</h1>
          </div>
          <Tabs label={t('clinCritical.tabsLabel')} options={tabs} value={viewModel.tab} onChange={viewModel.setTab} controls="cr-table" />
        </div>
        <OfflineNote online={viewModel.online} loadedAt={viewModel.loadedAt} />
        <StatRow stats={data.stats} variant="plain" />
        <div id="cr-table" className="cr-table">
          {rows.length > 0 ? (
            <DataTable
              caption={t('clinCritical.caption')}
              columns={[{ label: t('clinCritical.col.patient'), width: '25%' }, { label: t('clinCritical.col.analyte'), width: '22%' }, { label: t('clinCritical.col.value'), width: '21%' }, { label: t('clinCritical.col.released'), width: '15%' }, { label: t('clinCritical.col.action'), align: 'end' }]}
              rows={rows}
              footnote={t('clinCritical.footnote')}
            />
          ) : (
            <p className="cr-none" role="status">{t(viewModel.tab === 'never-collected' ? 'clinCritical.noneNever' : 'clinCritical.noneUnack')}</p>
          )}
        </div>
        <p className="cr-legacy">
          <SkButton variant="secondary" onClick={() => onNavigate('clinical-review')}>{t('clinCritical.legacyLink')}</SkButton>
          <span>{t('clinCritical.legacyNote')}</span>
        </p>
        <EscalationDrawer viewModel={viewModel} onNavigate={onNavigate} />
      </div>
    );
  }
  return <>{body}<Toast message={viewModel.toast} onDone={viewModel.clearToast} /></>;
});

function PatientCell({ result }: { result: CriticalResult }): React.ReactElement {
  const t = useT();
  const kind = isCritical(result.flag) ? 'critical' : result.flag === 'none' ? 'none' : 'range';
  const flagText = result.flag === 'CRIT' ? t('clinCritical.flagCrit') : result.flag;
  return (
    <span className="cr-patient">
      {/* Severity in words as well as colour: "CRIT", "HH", "LL"; the never-collected row says so. */}
      <span className={`cr-flag cr-flag--${kind}`} aria-label={result.flag === 'none' ? t('clinCritical.flagNone') : t('clinCritical.flagAria', { flag: flagText })}>
        {result.flag === 'none' ? '·' : flagText}
      </span>
      <span className="cr-patient__text">
        <span className="cr-patient__name">{result.patientName || t('clinCritical.nameUnknown')}</span>
        {result.meta ? <span className="cr-patient__meta sk-mono">{result.meta}</span> : null}
      </span>
    </span>
  );
}

const RowAction = observer(function RowAction({ result, viewModel }: { result: CriticalResult; viewModel: CriticalResultsViewModel }): React.ReactElement {
  const t = useT();
  const who = result.patientName || result.meta || t('clinCritical.nameUnknown');
  if (result.ack === 'never-collected') {
    const reasonId = `cr-chase-${result.id}`;
    return (
      <span className="cr-chase">
        <SkButton variant="secondary" className="cr-cta" disabled={!viewModel.canChase} aria-describedby={viewModel.canChase ? undefined : reasonId} onClick={() => { void viewModel.chase(result.id); }}>
          {t('clinCritical.action.chase')}<span className="sk-visually-hidden">{t('clinCritical.rowFor', { analyte: result.analyte, name: who })}</span>
        </SkButton>
        {viewModel.canChase ? null : <span id={reasonId} className="cr-chase__why">{t('clinCritical.chaseUnavailable')}</span>}
      </span>
    );
  }
  const urgent = result.ack === 'unacknowledged';
  return (
    <SkButton variant={urgent ? 'danger' : 'secondary'} className="cr-cta" onClick={() => viewModel.openResult(result.id)}>
      {t(urgent ? 'clinCritical.action.ack' : 'clinCritical.action.open')}<span className="sk-visually-hidden">{t('clinCritical.rowFor', { analyte: result.analyte, name: who })}</span>
    </SkButton>
  );
});

const EscalationDrawer = observer(function EscalationDrawer({ viewModel, onNavigate }: { viewModel: CriticalResultsViewModel; onNavigate: (route: RoutePath) => void }): React.ReactElement | null {
  const t = useT();
  const result = viewModel.open;
  if (!result) return null;
  const pending = result.ack === 'unacknowledged';
  const noteRoute = REVIEW_ROUTES.encounterNote();
  const critical = isCritical(result.flag);
  return (
    <Drawer
      open
      busy={viewModel.busy}
      onClose={viewModel.close}
      eyebrow={t(critical ? 'clinCritical.drawer.critical' : 'clinCritical.drawer.outOfRange', { analyte: result.analyte.toUpperCase() })}
      eyebrowTone={critical ? 'danger' : 'muted'}
      title={result.patientName || t('clinCritical.nameUnknown')}
      subtitle={t(pending ? 'clinCritical.drawer.pending' : 'clinCritical.drawer.done', { meta: result.meta || result.analyte, time: result.released })}
    >
      <p className="cr-value sk-mono">{result.value}</p>
      {pending ? (
        <fieldset className="cr-escalate" disabled={!viewModel.online}>
          <legend className="sk-visually-hidden">{t('clinCritical.esc.legend')}</legend>
          {ESCALATIONS.map((option) => (
            <label key={option} className={`cr-option${viewModel.escalation === option ? ' is-on' : ''}`}>
              <input type="radio" name="escalation" className="cr-option__input" checked={viewModel.escalation === option} onChange={() => viewModel.choose(option)} data-autofocus={option === 'call' ? true : undefined} />
              <span className="cr-option__label">{t(ESCALATION_KEYS[option].label)}</span>
              <span className="cr-option__meta">{t(ESCALATION_KEYS[option].meta)}</span>
            </label>
          ))}
        </fieldset>
      ) : (
        <p className="cr-done">{t('clinCritical.drawer.kept', { state: result.ackText })}</p>
      )}
      <div className="cr-drawer-actions">
        {pending ? (
          <SkButton variant="danger" className="cr-ack" busy={viewModel.busy} disabled={!viewModel.canAcknowledge} onClick={() => { void viewModel.acknowledge(); }} aria-describedby={viewModel.escalation && viewModel.online ? undefined : 'cr-choose-hint'}>
            {t('clinCritical.ackEscalate')}
          </SkButton>
        ) : null}
        {noteRoute ? <SkButton variant="secondary" className="cr-note" onClick={() => onNavigate(noteRoute)} disabled={viewModel.busy}>{t('clinCritical.openNote')}</SkButton> : null}
      </div>
      {pending && !viewModel.online ? <p id="cr-choose-hint" className="cr-hint">{t('clinShared.offlineWrite')}</p> : null}
      {pending && viewModel.online && !viewModel.escalation ? <p id="cr-choose-hint" className="cr-hint">{t('clinCritical.chooseFirst')}</p> : null}
    </Drawer>
  );
});

export function CriticalResultsScreen({ source }: { source?: CriticalSource }): React.ReactElement {
  const t = useT();
  const online = useOnline();
  const [viewModel] = useState(() => new CriticalResultsViewModel(source ?? criticalApiSource(t), t));
  useEffect(() => { void viewModel.load(); }, [viewModel]);
  useEffect(() => { viewModel.setOnline(online); }, [viewModel, online]);
  return (
    <ClinicianConsoleFrame current="critical-results" context={t('clinCritical.title')}>
      <CriticalResultsView viewModel={viewModel} onNavigate={navigate} />
    </ClinicianConsoleFrame>
  );
}
