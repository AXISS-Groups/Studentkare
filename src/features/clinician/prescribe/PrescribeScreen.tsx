import React, { useEffect, useState } from 'react';
import { observer } from 'mobx-react-lite';
import { Drawer, FormField, SkButton, SkSkeleton as Skeleton, StatusPill, SkToast as Toast, useOnline } from '@/design-system';
import type { SkTone } from '@/design-system';
import { Icon } from '@/design-system/icons';
import { useT } from '@/i18n';
import { navigate } from '@/lib/utils/workflowRouting';
import type { RoutePath } from '@/lib/utils/workflowRouting';
import { ClinicianConsoleFrame } from '../shared/ClinicianConsoleFrame';
import { ClinicianEmptyState, ClinicianErrorState } from '../shared/ClinicianStates';
import { OfflineNote } from '../shared/OfflineNote';
import { dateOnly } from '../shared/clinicalData';
import { takeHandoff } from '../shared/handoff';
import { PrescribeViewModel } from './PrescribeViewModel';
import type { EditableField } from './PrescribeViewModel';
import { RX_LIMITS, SCHEDULES, prescribeApiSource } from './prescribeModel';
import type { DrugSchedule, PrescribeSource, RxLine } from './prescribeModel';
import './prescribe.css';

const SCHEDULE_TONE: Record<DrugSchedule, SkTone> = { OTC: 'positive', H: 'action', H1: 'attention', X: 'danger' };
const SCHEDULE_NOTE: Record<DrugSchedule, 'clinRx.schedule.OTC' | 'clinRx.schedule.H' | 'clinRx.schedule.H1' | 'clinRx.schedule.X'> = {
  OTC: 'clinRx.schedule.OTC', H: 'clinRx.schedule.H', H1: 'clinRx.schedule.H1', X: 'clinRx.schedule.X',
};

/**
 * Prescribe (design page 5). Tier 1, approved by Krishna Chintakayala on
 * 2026-10-21. The "name match only" disclosure is part of every allergy block
 * and is never hidden.
 */
export const PrescribeView = observer(function PrescribeView({ viewModel, onNavigate }: { viewModel: PrescribeViewModel; onNavigate: (route: RoutePath) => void }): React.ReactElement {
  const t = useT();
  const { status } = viewModel;
  let body: React.ReactNode;
  if (status === 'loading') {
    body = <div className="rx-skeleton" aria-busy="true" aria-label={t('clinRx.loading')}><Skeleton width={280} height={34} /><Skeleton height={90} />{Array.from({ length: 3 }, (_, i) => <Skeleton key={i} height={60} />)}</div>;
  } else if (status === 'error') {
    body = <ClinicianErrorState title={t('clinRx.errorTitle')} reference={t('clinRx.reference')} onRetry={() => { void viewModel.load(); }} onHelp={() => onNavigate('support')} />;
  } else if (status === 'unconnected' || status === 'empty') {
    body = <ClinicianEmptyState title={t('clinRx.emptyTitle')} body={t('clinRx.emptyBody')} action={{ label: t('clinRx.emptyAction'), onSelect: () => onNavigate('clinician/schedule') }} />;
  } else {
    const block = viewModel.allergyBlock;
    body = (
      <div className="rx-page">
        <div className="rx-head sk-fade">
          <div className="rx-head__titles">
            <span className="rx-eyebrow">{viewModel.patientName ? t('clinRx.eyebrowFor', { name: viewModel.patientName.toUpperCase() }) : t('clinRx.eyebrow')}</span>
            <h1 className="rx-title">{t('clinRx.title')}</h1>
          </div>
          {!viewModel.signed ? (
            <div className="rx-head__actions">
              <SkButton variant="secondary" onClick={viewModel.openDrawer} disabled={!viewModel.patientId}>{t('clinRx.addDrug')}</SkButton>
              <SkButton busy={viewModel.signing} disabled={!viewModel.canSign} onClick={() => { void viewModel.sign(); }}>{t('clinRx.signSend')}</SkButton>
            </div>
          ) : (
            <div className="rx-head__actions">
              <StatusPill tone="positive" dot>{t('clinRx.signedSent')}</StatusPill>
              <SkButton variant="secondary" onClick={viewModel.startAnother}>{t('clinRx.another')}</SkButton>
            </div>
          )}
        </div>

        <OfflineNote online={viewModel.online} loadedAt={viewModel.loadedAt} />
        <PatientPicker viewModel={viewModel} />

        {block ? (
          <div className="rx-banner" role="alert">
            <Icon name="alert-triangle-4" size={20} strokeWidth={2.2} />
            <span className="rx-banner__text">
              <strong>{t('clinRx.blockTitle', { name: block.generic, substance: block.substances.join(', ').toLowerCase() })}</strong>
              <span>{t('clinRx.blockBodyBefore', { substances: block.substances.join(', ') })}<strong>{t('clinRx.nameMatchInline')}</strong>{t('clinRx.blockBodyAfter')}</span>
            </span>
            <span className="rx-banner__tag">{t('clinRx.nameMatchTag')}</span>
          </div>
        ) : null}

        <div className="rx-table-card sk-rise">
          <table className="rx-table">
            <caption className="sk-visually-hidden">{t('clinRx.caption')}</caption>
            <thead>
              <tr>
                <th scope="col">{t('clinRx.col.drug')}</th><th scope="col">{t('clinRx.col.dose')}</th><th scope="col">{t('clinRx.col.frequency')}</th><th scope="col">{t('clinRx.col.duration')}</th><th scope="col">{t('clinRx.col.schedule')}</th>
                <th scope="col"><span className="sk-visually-hidden">{t('clinRx.col.actions')}</span></th>
              </tr>
            </thead>
            <tbody>
              {viewModel.lines.map((line) => <LineRow key={line.id} line={line} viewModel={viewModel} />)}
            </tbody>
          </table>
          {viewModel.lines.length === 0 ? <p className="rx-none">{t(viewModel.patientId ? 'clinRx.noneYet' : 'clinRx.choosePatientFirst')}</p> : null}
          <p className="rx-foot">{t('clinRx.footnote')}</p>
        </div>
        <AddDrugDrawer viewModel={viewModel} />
      </div>
    );
  }
  return <>{body}<Toast message={viewModel.toast} onDone={viewModel.clearToast} /></>;
});

const PatientPicker = observer(function PatientPicker({ viewModel }: { viewModel: PrescribeViewModel }): React.ReactElement {
  const t = useT();
  const notes = viewModel.patientNotes;
  return (
    <div className="rx-who">
      <FormField label={t('clinRx.student')} hint={t('clinRx.studentHint')}>
        <select value={viewModel.patientId} disabled={viewModel.signed} onChange={(e) => viewModel.selectPatient(e.target.value)}>
          <option value="">{t('clinRx.chooseStudent')}</option>
          {viewModel.patients.map((p) => <option key={p.patientId} value={p.patientId}>{p.customer}</option>)}
        </select>
      </FormField>
      <FormField label={t('clinRx.linkedNote')} hint={viewModel.data?.notes === null ? t('clinRx.notesUnavailable') : undefined}>
        <select value={viewModel.encounterId} disabled={viewModel.signed || !viewModel.patientId} onChange={(e) => viewModel.selectNote(e.target.value)}>
          <option value="">{t('clinRx.noNote')}</option>
          {notes.map((n) => <option key={n.id} value={n.id}>{t(n.status === 'FINAL' ? 'clinRx.noteSigned' : 'clinRx.noteDraft', { date: dateOnly(n.createdAt) })}</option>)}
        </select>
      </FormField>
    </div>
  );
});

const LineRow = observer(function LineRow({ line, viewModel }: { line: RxLine; viewModel: PrescribeViewModel }): React.ReactElement {
  const t = useT();
  const blocked = line.blocked;
  const field = (name: EditableField, label: string) => (
    <td data-label={label}>
      {blocked || viewModel.signed ? (
        <span className="rx-value">{blocked ? '—' : line[name]}</span>
      ) : (
        <input className="rx-input" aria-label={t('clinRx.fieldFor', { field: label, name: line.genericName })} maxLength={RX_LIMITS[name]} value={line[name]} onChange={(e) => viewModel.edit(line.id, name, e.target.value)} />
      )}
    </td>
  );
  const detail = [line.brandName, line.strength, line.form].filter(Boolean).join(' · ');
  const reason = blocked?.kind === 'allergy'
    ? t('clinRx.blockedAllergy', { substances: blocked.substances.join(', ') })
    : blocked?.kind === 'schedule-x' ? t('clinRx.blockedX') : '';
  return (
    <tr className={blocked ? 'is-blocked' : undefined}>
      <th scope="row">
        <span className="rx-drug">{blocked ? <span className="sk-visually-hidden">{t('clinRx.blockedPrefix')}</span> : null}{line.genericName}</span>
        <span className="rx-brand">{blocked ? reason : detail}</span>
      </th>
      {field('dose', t('clinRx.col.doseLabel'))}
      {field('frequency', t('clinRx.col.frequencyLabel'))}
      <td data-label={t('clinRx.col.durationLabel')}><span className="rx-value">{blocked ? '—' : t('clinRx.days', { n: line.durationDays })}</span></td>
      <td data-label={t('clinRx.col.scheduleLabel')}>
        <StatusPill small tone={blocked ? 'danger' : SCHEDULE_TONE[line.scheduleClass]}>{blocked ? t('clinRx.blocked') : line.scheduleClass}</StatusPill>
        {!blocked ? <span className="sk-visually-hidden"> — {t(SCHEDULE_NOTE[line.scheduleClass])}</span> : null}
      </td>
      <td className="rx-row-actions">
        {!blocked && !viewModel.signed ? (
          <label className="rx-sub">
            <input type="checkbox" checked={line.substitutionAllowed} onChange={() => viewModel.toggleSubstitution(line.id)} />
            {t('clinRx.substitution')}
          </label>
        ) : null}
        {!viewModel.signed ? (
          <button type="button" className="rx-remove" onClick={() => viewModel.remove(line.id)} aria-label={t('clinRx.remove', { name: line.genericName })}>
            <Icon name="x" size={16} strokeWidth={2.2} />
          </button>
        ) : null}
      </td>
    </tr>
  );
});

const AddDrugDrawer = observer(function AddDrugDrawer({ viewModel }: { viewModel: PrescribeViewModel }): React.ReactElement | null {
  const t = useT();
  if (!viewModel.drawerOpen) return null;
  const e = viewModel.entry;
  const num = (value: string) => {
    const n = Number.parseInt(value, 10);
    return Number.isFinite(n) ? n : 0;
  };
  return (
    <Drawer open title={t('clinRx.addDrug')} onClose={viewModel.closeDrawer}>
      {/* No clinician-readable drug master exists yet (the medicine master is
          an ops/commerce table, Rule L): search is shown, unavailable, and the
          doctor types the drug. */}
      <div className="rx-search is-unavailable" aria-disabled="true">
        <Icon name="search-2" size={18} />
        <span className="rx-search__text">{t('clinRx.searchUnavailable')}</span>
      </div>
      <form className="rx-form" onSubmit={(event) => { event.preventDefault(); viewModel.add(); }}>
        <FormField label={t('clinRx.f.generic')} hint={t('clinRx.f.genericHint')}>
          <input value={e.genericName} maxLength={RX_LIMITS.generic} required onChange={(ev) => viewModel.setEntry('genericName', ev.target.value)} data-autofocus />
        </FormField>
        <div className="rx-form__row">
          <FormField label={t('clinRx.f.brand')}><input value={e.brandName} maxLength={RX_LIMITS.generic} onChange={(ev) => viewModel.setEntry('brandName', ev.target.value)} /></FormField>
          <FormField label={t('clinRx.f.strength')}><input value={e.strength} maxLength={RX_LIMITS.strength} onChange={(ev) => viewModel.setEntry('strength', ev.target.value)} /></FormField>
        </div>
        <div className="rx-form__row">
          <FormField label={t('clinRx.f.form')}><input value={e.form} maxLength={RX_LIMITS.form} onChange={(ev) => viewModel.setEntry('form', ev.target.value)} /></FormField>
          <FormField label={t('clinRx.f.dose')}><input value={e.dose} maxLength={RX_LIMITS.dose} required onChange={(ev) => viewModel.setEntry('dose', ev.target.value)} /></FormField>
        </div>
        <FormField label={t('clinRx.f.frequency')}><input value={e.frequency} maxLength={RX_LIMITS.frequency} required onChange={(ev) => viewModel.setEntry('frequency', ev.target.value)} /></FormField>
        <div className="rx-form__row">
          <FormField label={t('clinRx.f.duration')}><input type="number" inputMode="numeric" min={1} max={RX_LIMITS.durationDays} value={e.durationDays || ''} required onChange={(ev) => viewModel.setEntry('durationDays', num(ev.target.value))} /></FormField>
          <FormField label={t('clinRx.f.quantity')}><input type="number" inputMode="numeric" min={1} max={RX_LIMITS.quantity} value={e.quantity || ''} required onChange={(ev) => viewModel.setEntry('quantity', num(ev.target.value))} /></FormField>
        </div>
        <FormField label={t('clinRx.f.schedule')} hint={t(SCHEDULE_NOTE[e.scheduleClass])}>
          <select value={e.scheduleClass} onChange={(ev) => { const v = SCHEDULES.find((s) => s === ev.target.value); if (v) viewModel.setEntry('scheduleClass', v); }}>
            {SCHEDULES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </FormField>
        <label className="rx-sub">
          <input type="checkbox" checked={e.substitutionAllowed} onChange={(ev) => viewModel.setEntry('substitutionAllowed', ev.target.checked)} />
          {t('clinRx.substitution')}
        </label>
        <SkButton type="submit" disabled={!viewModel.entryValid}>{t('clinRx.addToRx')}</SkButton>
      </form>
      <p className="rx-hint">{t('clinRx.blockedHint')}</p>
    </Drawer>
  );
});

export function PrescribeScreen({ source }: { source?: PrescribeSource }): React.ReactElement {
  const t = useT();
  const online = useOnline();
  const [viewModel] = useState(() => new PrescribeViewModel(source ?? prescribeApiSource(), t, takeHandoff()));
  useEffect(() => { void viewModel.load(); }, [viewModel]);
  useEffect(() => { viewModel.setOnline(online); }, [viewModel, online]);
  return (
    <ClinicianConsoleFrame current="prescribe" context={t('clinRx.title')}>
      <PrescribeView viewModel={viewModel} onNavigate={navigate} />
    </ClinicianConsoleFrame>
  );
}
