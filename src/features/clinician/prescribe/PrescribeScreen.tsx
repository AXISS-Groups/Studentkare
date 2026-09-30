import React, { useEffect, useId, useState } from 'react';
import { observer } from 'mobx-react-lite';
import { Drawer, EmptyStateView, ErrorStateView, SkButton, SkIcon, Skeleton, StatusPill, Toast } from '@/design-system';
import type { SkTone } from '@/design-system';
import { navigate } from '@/lib/workflowRouting';
import type { RoutePath } from '@/lib/workflowRouting';
import { ClinicianConsoleFrame } from '../shared/ClinicianConsoleFrame';
import { PrescribeViewModel } from './PrescribeViewModel';
import type { EditableField } from './PrescribeViewModel';
import { SCHEDULE_NOTE, defaultPrescribeSource } from './prescribeModel';
import type { DrugSchedule, PrescribeSource, RxLine } from './prescribeModel';
import './prescribe.css';

const SCHEDULE_TONE: Record<DrugSchedule, SkTone> = { OTC: 'positive', H: 'action', H1: 'attention', X: 'danger' };

export const PrescribeView = observer(function PrescribeView({ viewModel, onNavigate }: { viewModel: PrescribeViewModel; onNavigate: (route: RoutePath) => void }): React.ReactElement {
  const { status, data } = viewModel;
  let body: React.ReactNode;
  if (status === 'loading') {
    body = <div className="rx-skeleton" aria-busy="true" aria-label="Loading the prescription"><Skeleton width={280} height={34} /><Skeleton height={90} />{Array.from({ length: 3 }, (_, i) => <Skeleton key={i} height={60} />)}</div>;
  } else if (status === 'error') {
    body = <ErrorStateView title="Couldn’t open the prescription" onRetry={() => { void viewModel.load(); }} onHelp={() => onNavigate('support')} reference="Ref PRESCRIBE · Prescribe" />;
  } else if (status === 'unconnected' || !data) {
    body = <EmptyStateView title="Prescribing isn’t connected here yet." body="This new screen is awaiting clinical sign-off. Until then this page shows nothing rather than a guess." action={{ label: 'Back to Today', onClick: () => onNavigate('clinician') }} />;
  } else {
    const block = viewModel.allergyBlock;
    body = (
      <>
        <div className="rx-head sk-fade">
          <div className="rx-head__titles">
            <span className="rx-eyebrow">NEW PRESCRIPTION · {data.patientName.toUpperCase()}</span>
            <h1 className="rx-title">Prescribe</h1>
          </div>
          {!viewModel.signed ? (
            <div className="rx-head__actions">
              <SkButton variant="secondary" icon="rx" onClick={viewModel.openSearch} disabled={viewModel.allergyUnknown}>Add a drug</SkButton>
              <SkButton busy={viewModel.signing} disabled={!viewModel.canSign} onClick={() => { void viewModel.sign(); }}>Sign &amp; send</SkButton>
            </div>
          ) : <StatusPill tone="positive" dot>Signed · sent</StatusPill>}
        </div>

        {viewModel.allergyUnknown ? (
          <div className="rx-banner" role="alert">
            <SkIcon name="alert" size={20} strokeWidth={2.2} />
            <span><strong>Allergy record couldn’t be checked.</strong> Nothing can be added or signed until it can — prescribing without it is how an allergy gets missed.</span>
          </div>
        ) : block ? (
          <div className="rx-banner" role="alert">
            <SkIcon name="alert" size={20} strokeWidth={2.2} />
            <span className="rx-banner__text">
              <strong>{block.generic} blocked — {block.allergy.substance.toLowerCase()} allergy on file</strong>
              <span>Recorded by the student on {block.allergy.recordedOn}. This is a <strong>name match only</strong> — cross-reactivity has not been checked, so a related drug outside the {block.allergy.drugClass.toLowerCase()} class would not be caught.</span>
            </span>
            <span className="rx-banner__tag">NAME MATCH ONLY</span>
          </div>
        ) : null}

        <div className="rx-table-card sk-rise">
          <table className="rx-table">
            <caption className="sk-visually-hidden">Drugs on this prescription</caption>
            <thead>
              <tr>
                <th scope="col">DRUG</th><th scope="col">DOSE</th><th scope="col">FREQUENCY</th><th scope="col">DURATION</th><th scope="col">SCHEDULE</th>
                <th scope="col"><span className="sk-visually-hidden">Substitution and remove</span></th>
              </tr>
            </thead>
            <tbody>
              {viewModel.lines.map((line) => <LineRow key={line.id} line={line} viewModel={viewModel} />)}
            </tbody>
          </table>
          {viewModel.lines.length === 0 ? <p className="rx-none">Nothing on this prescription yet. Use “Add a drug”.</p> : null}
          <p className="rx-foot">Substitution permitted marks what you allow, not what happens. A pharmacist still signs off every swap.</p>
        </div>
        <SearchDrawer viewModel={viewModel} />
      </>
    );
  }
  return <>{body}<Toast message={viewModel.toast} onDone={viewModel.clearToast} /></>;
});

const LineRow = observer(function LineRow({ line, viewModel }: { line: RxLine; viewModel: PrescribeViewModel }): React.ReactElement {
  const blocked = !!line.blockedReason;
  const field = (name: EditableField, label: string) => (
    <td data-label={label}>
      {blocked || viewModel.signed ? (
        <span className="rx-value">{line[name]}</span>
      ) : (
        <input className="rx-input" aria-label={`${label} for ${line.generic}`} value={line[name]} onChange={(e) => viewModel.edit(line.id, name, e.target.value)} />
      )}
    </td>
  );
  return (
    <tr className={blocked ? 'is-blocked' : undefined}>
      <th scope="row">
        <span className="rx-drug">{blocked ? <span className="sk-visually-hidden">Blocked: </span> : null}{line.generic}</span>
        <span className="rx-brand">{blocked ? line.blockedReason : line.brand}</span>
      </th>
      {field('dose', 'Dose')}
      {field('frequency', 'Frequency')}
      {field('duration', 'Duration')}
      <td data-label="Schedule">
        <StatusPill small tone={blocked ? 'danger' : SCHEDULE_TONE[line.schedule]}>{blocked ? 'Blocked' : line.schedule}</StatusPill>
        {!blocked ? <span className="sk-visually-hidden"> — {SCHEDULE_NOTE[line.schedule]}</span> : null}
      </td>
      <td className="rx-row-actions">
        {!blocked && !viewModel.signed ? (
          <label className="rx-sub">
            <input type="checkbox" checked={line.substitutionAllowed} onChange={() => viewModel.toggleSubstitution(line.id)} />
            Substitution permitted
          </label>
        ) : null}
        {!viewModel.signed ? (
          <button type="button" className="rx-remove" onClick={() => viewModel.remove(line.id)} aria-label={`Remove ${line.generic}`}>
            <SkIcon name="close" size={16} strokeWidth={2.2} />
          </button>
        ) : null}
      </td>
    </tr>
  );
});

const SearchDrawer = observer(function SearchDrawer({ viewModel }: { viewModel: PrescribeViewModel }): React.ReactElement | null {
  const searchId = useId();
  if (!viewModel.searchOpen) return null;
  const results = viewModel.results;
  return (
    <Drawer open title="Add a drug" onClose={viewModel.closeSearch}>
      <label className="rx-search" htmlFor={searchId}>
        <SkIcon name="search" size={18} />
        <span className="sk-visually-hidden">Search by generic name, brand or class</span>
        <input id={searchId} type="search" value={viewModel.query} onChange={(e) => viewModel.setQuery(e.target.value)} placeholder="Generic name, brand or class" data-autofocus autoComplete="off" />
      </label>
      <ul className="rx-results" aria-label="Matching drugs" aria-live="polite">
        {results.map(({ drug, blocked }) => (
          <li key={drug.id}>
            <button type="button" className={`rx-result${blocked ? ' is-blocked' : ''}`} onClick={() => viewModel.add(drug)}>
              <span className="rx-result__text">
                <span className="rx-result__name">{drug.name}</span>
                <span className="rx-result__meta">{blocked ?? `${drug.drugClass} · ${SCHEDULE_NOTE[drug.schedule]}`}</span>
              </span>
              <StatusPill small tone={blocked ? 'danger' : SCHEDULE_TONE[drug.schedule]}>{blocked ? 'Blocked' : drug.schedule}</StatusPill>
              {blocked ? <span className="sk-visually-hidden"> — choosing it records the refusal; it will not be prescribed</span> : null}
            </button>
          </li>
        ))}
      </ul>
      {viewModel.query.trim().length >= 2 && results.length === 0 ? <p className="rx-hint" role="status">No drug matches “{viewModel.query.trim()}”.</p> : null}
      <p className="rx-hint">Blocked drugs stay visible with the reason. Hiding them teaches nothing and invites a workaround.</p>
    </Drawer>
  );
});

export function PrescribeScreen({ source }: { source?: PrescribeSource }): React.ReactElement {
  const [viewModel] = useState(() => new PrescribeViewModel(source ?? defaultPrescribeSource()));
  useEffect(() => { void viewModel.load(); }, [viewModel]);
  return (
    <ClinicianConsoleFrame current="prescribe" context="Prescribe" reviewPending>
      <PrescribeView viewModel={viewModel} onNavigate={navigate} />
    </ClinicianConsoleFrame>
  );
}
