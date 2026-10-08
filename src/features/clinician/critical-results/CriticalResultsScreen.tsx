import React, { useEffect, useState } from 'react';
import { observer } from 'mobx-react-lite';
import {
  DataTable,
  Drawer,
  EmptyStateView,
  ErrorStateView,
  SkButton,
  Skeleton,
  StatRow,
  Tabs,
  Toast,
} from '@/design-system';
import type { DataTableRow } from '@/design-system';
import { navigate } from '@/lib/workflowRouting';
import type { RoutePath } from '@/lib/workflowRouting';
import { ClinicianConsoleFrame } from '../shared/ClinicianConsoleFrame';
import { REVIEW_ROUTES } from '../shared/reviewRoutes';
import { CriticalResultsViewModel } from './CriticalResultsViewModel';
import type { CriticalTab } from './CriticalResultsViewModel';
import { ESCALATIONS, defaultCriticalSource, isCritical } from './criticalModel';
import type { CriticalResult, CriticalSource } from './criticalModel';
import './critical-results.css';

const TABS: { id: CriticalTab; label: string }[] = [
  { id: 'unacknowledged', label: 'Unacknowledged' },
  { id: 'all', label: 'All results' },
  { id: 'never-collected', label: 'Never collected' },
];

export const CriticalResultsView = observer(function CriticalResultsView({ viewModel, onNavigate }: { viewModel: CriticalResultsViewModel; onNavigate: (route: RoutePath) => void }): React.ReactElement {
  const { status, data } = viewModel;
  let body: React.ReactNode;
  if (status === 'loading') {
    body = (
      <div className="cr-skeleton" aria-busy="true" aria-label="Loading critical results">
        <Skeleton width={300} height={34} />
        <Skeleton height={70} />
        {Array.from({ length: 4 }, (_, i) => <Skeleton key={i} height={56} />)}
      </div>
    );
  } else if (status === 'error') {
    body = <ErrorStateView title="Couldn’t load critical results" onRetry={() => { void viewModel.load(); }} onHelp={() => onNavigate('support')} reference="Ref CRITICAL · ClinicalReview" />;
  } else if (status === 'unconnected') {
    body = <EmptyStateView title="Critical results aren’t connected here yet." body="This new screen is awaiting clinical sign-off. Until then this page shows nothing rather than a guess." action={{ label: 'Back to Today', onClick: () => onNavigate('clinician') }} />;
  } else if (status === 'empty' || !data) {
    body = <EmptyStateView title="No critical results." body="When a lab flags a value outside its critical limits for a student in your care, it appears here first." action={{ label: 'Back to Today', onClick: () => onNavigate('clinician') }} />;
  } else {
    const rows: DataTableRow[] = viewModel.visible.map((r) => ({
      id: r.id,
      cells: [
        { node: <PatientCell result={r} /> },
        { text: r.analyte, sub: r.panel, weight: 'regular' },
        { text: r.value, sub: `ref ${r.reference}`, weight: 'regular', tone: isCritical(r.flag) ? 'danger' : r.flag === 'H' || r.flag === 'L' ? 'attention' : undefined, mono: true },
        { text: r.released, sub: r.ackText, weight: 'regular' },
        { node: <RowAction result={r} viewModel={viewModel} /> },
      ],
    }));
    body = (
      <>
        <div className="cr-head sk-fade">
          <div className="cr-head__titles">
            <span className="cr-eyebrow">RANKED BY SEVERITY, NOT ARRIVAL</span>
            <h1 className="cr-title">Critical results</h1>
          </div>
          <Tabs label="Show results" options={TABS} value={viewModel.tab} onChange={viewModel.setTab} controls="cr-table" />
        </div>
        <StatRow stats={data.stats} variant="plain" />
        <div id="cr-table" className="cr-table">
          {rows.length > 0 ? (
            <DataTable
              caption="Critical and out-of-range results, most severe first"
              columns={[{ label: 'Patient', width: '25%' }, { label: 'Analyte', width: '24%' }, { label: 'Value / ref', width: '17%' }, { label: 'Released', width: '17%' }, { label: 'Action', align: 'end' }]}
              rows={rows}
              footnote="Acknowledgement turnaround is recorded per clinician. A critical value behind forty routine results is a safety problem, not a sorting preference."
            />
          ) : (
            <p className="cr-none" role="status">Nothing here. {viewModel.tab === 'unacknowledged' ? 'Every critical result has been acknowledged.' : 'No sample is waiting to be collected.'}</p>
          )}
        </div>
        <EscalationDrawer viewModel={viewModel} onNavigate={onNavigate} />
      </>
    );
  }
  return <>{body}<Toast message={viewModel.toast} onDone={viewModel.clearToast} /></>;
});

function PatientCell({ result }: { result: CriticalResult }): React.ReactElement {
  return (
    <span className="cr-patient">
      <span className={`cr-flag cr-flag--${isCritical(result.flag) ? 'critical' : result.flag === 'none' ? 'none' : 'range'}`} aria-label={result.flag === 'none' ? 'No result' : `Flag ${result.flag}`}>
        {result.flag === 'none' ? '·' : result.flag}
      </span>
      <span className="cr-patient__text">
        <span className="cr-patient__name">{result.patientName}</span>
        <span className="cr-patient__meta sk-mono">{result.meta}</span>
      </span>
    </span>
  );
}

const RowAction = observer(function RowAction({ result, viewModel }: { result: CriticalResult; viewModel: CriticalResultsViewModel }): React.ReactElement {
  if (result.ack === 'never-collected') {
    return <SkButton variant="secondary" className="cr-cta" onClick={() => { void viewModel.chase(result.id); }}>Chase<span className="sk-visually-hidden"> {result.patientName}</span></SkButton>;
  }
  const urgent = result.ack === 'unacknowledged';
  return (
    <SkButton variant={urgent ? 'danger' : 'secondary'} className="cr-cta" onClick={() => viewModel.openResult(result.id)}>
      {urgent ? 'Acknowledge' : 'Open'}<span className="sk-visually-hidden"> {result.analyte} for {result.patientName}</span>
    </SkButton>
  );
});

const EscalationDrawer = observer(function EscalationDrawer({ viewModel, onNavigate }: { viewModel: CriticalResultsViewModel; onNavigate: (route: RoutePath) => void }): React.ReactElement | null {
  const result = viewModel.open;
  if (!result) return null;
  const pending = result.ack === 'unacknowledged';
  const noteRoute = REVIEW_ROUTES.encounterNote();
  return (
    <Drawer
      open
      busy={viewModel.busy}
      onClose={viewModel.close}
      eyebrow={`${isCritical(result.flag) ? 'CRITICAL' : 'OUT OF RANGE'} · ${result.analyte.toUpperCase()} ${result.value}`}
      eyebrowTone={isCritical(result.flag) ? 'danger' : 'muted'}
      title={result.patientName}
      subtitle={`${result.campus} · released ${result.released} · ${pending ? 'not yet acknowledged' : result.ackText.toLowerCase()}`}
    >
      {pending ? (
        <fieldset className="cr-escalate">
          <legend className="sk-visually-hidden">How will you act on it?</legend>
          {ESCALATIONS.map((option) => (
            <label key={option.id} className={`cr-option${viewModel.escalation === option.id ? ' is-on' : ''}`}>
              <input type="radio" name="escalation" className="cr-option__input" checked={viewModel.escalation === option.id} onChange={() => viewModel.choose(option.id)} data-autofocus={option.id === 'call' ? true : undefined} />
              <span className="cr-option__label">{option.label}</span>
              <span className="cr-option__meta">{option.meta(result)}</span>
            </label>
          ))}
        </fieldset>
      ) : (
        <p className="cr-done">{result.ackText}. It stays in “All results” for the record.</p>
      )}
      <div className="cr-drawer-actions">
        {pending ? (
          <SkButton variant="danger" className="cr-ack" busy={viewModel.busy} disabled={!viewModel.canAcknowledge} onClick={() => { void viewModel.acknowledge(); }} aria-describedby={viewModel.escalation ? undefined : 'cr-choose-hint'}>
            Acknowledge &amp; escalate
          </SkButton>
        ) : null}
        {noteRoute ? <SkButton variant="secondary" className="cr-note" onClick={() => onNavigate(noteRoute)} disabled={viewModel.busy}>Open note</SkButton> : null}
      </div>
      {pending && !viewModel.escalation ? <p id="cr-choose-hint" className="cr-hint">Choose how you will act on it first.</p> : null}
    </Drawer>
  );
});

export function CriticalResultsScreen({ source }: { source?: CriticalSource }): React.ReactElement {
  const [viewModel] = useState(() => new CriticalResultsViewModel(source ?? defaultCriticalSource()));
  useEffect(() => { void viewModel.load(); }, [viewModel]);
  return (
    <ClinicianConsoleFrame current="critical-results" context="Critical results" reviewPending>
      <CriticalResultsView viewModel={viewModel} onNavigate={navigate} />
    </ClinicianConsoleFrame>
  );
}
