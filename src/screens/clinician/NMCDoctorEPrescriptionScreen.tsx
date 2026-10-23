import React, { useEffect, useState } from 'react';
import { observer } from 'mobx-react-lite';
import { AlertTriangle, CheckCircle2, Plus, Trash2 } from 'lucide-react';
import { EmptyState, Field, FormError } from '../../components/interface/WorkflowUI';
import { PrescribeViewModel, SCHEDULE_CLASSES } from '@/features/clinician/viewmodel/PrescribeViewModel';
import type { ScheduleClass } from '@/features/clinician/viewmodel/PrescribeViewModel';
import { useT } from '@/i18n';
import '../../theme/workflows.css';

const day = (seconds: number) => new Date(seconds * 1000).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
const visit = (iso: string) => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
};

/**
 * E-prescription writer (design page 5: Prescribe, Tier 1). Approved for rebuild
 * by the repository owner as named reviewer, 2026-10-09; clinical/legal review
 * is still owed before release. All logic lives in PrescribeViewModel.
 */
export const PrescribeView = observer(function PrescribeView({ vm }: { vm: PrescribeViewModel }) {
  const t = useT();
  if (vm.issued) {
    return (
      <section className="wf-card" role="status" aria-live="polite">
        <CheckCircle2 size={28} aria-hidden="true" />
        <h3>{t('partner.clin.rx.issuedTitle')}</h3>
        <p>{t('partner.clin.rx.issuedLine', { id: vm.issued.id, date: day(vm.issued.validUntil) })}</p>
        <p>
          {vm.issued.prescriberRegNo
            ? t('partner.clin.rx.issuedUnderReg', { reg: vm.issued.prescriberRegNo })
            : t('partner.clin.rx.issuedUnderAccount')}{' '}
          {t('partner.clin.rx.whoSees')}
        </p>
        {vm.issued.allergyCheck.acknowledged ? <p>{t('partner.clin.rx.ackRecorded')}</p> : null}
        <button type="button" className="health-button health-button-primary" style={{ minHeight: 44 }} onClick={vm.startAnother}>
          {t('partner.clin.rx.another')}
        </button>
      </section>
    );
  }

  return (
    <form className="wf-form" onSubmit={(event) => { event.preventDefault(); void vm.issue(); }}>
      <section className="wf-card">
        <h3>{t('partner.clin.rx.patient')}</h3>
        {vm.patients === null && !vm.patientsFailed ? <p role="status">{t('partner.clin.rx.loadingPatients')}</p> : null}
        {vm.patientsFailed ? (
          <div className="wf-notice" role="alert">
            {t('partner.clin.rx.patientsFailed')}
            <button type="button" className="health-button" style={{ minHeight: 44 }} onClick={() => void vm.loadPatients()}>{t('common.tryAgain')}</button>
          </div>
        ) : null}
        {vm.patients && vm.patients.length === 0 ? (
          <EmptyState title={t('partner.clin.rx.noPatientsTitle')} description={t('partner.clin.rx.noPatientsBody')} />
        ) : null}
        {vm.patients && vm.patients.length > 0 ? (
          <Field label={t('partner.clin.rx.patientField')}>
            <select required value={vm.patientId} onChange={(e) => vm.selectPatient(e.target.value)}>
              <option value="">{t('partner.clin.rx.choosePatient')}</option>
              {vm.patients.map((p) => <option key={p.patientId} value={p.patientId}>{t('partner.clin.rx.patientOption', { name: p.name, date: visit(p.lastVisit) })}</option>)}
            </select>
          </Field>
        ) : null}
        {vm.patientId && vm.notesFailed ? <p className="wf-fineprint" role="status">{t('partner.clin.rx.notesFailed')}</p> : null}
        {vm.patientId && !vm.notesFailed ? (
          <Field label={t('partner.clin.rx.noteField')} hint={t('partner.clin.rx.noteHint')}>
            <select value={vm.encounterId} onChange={(e) => vm.selectNote(e.target.value)}>
              <option value="">{t('partner.clin.rx.noNote')}</option>
              {vm.patientNotes.map((n) => (
                <option key={n.id} value={n.id}>
                  {t(n.status === 'FINAL' ? 'partner.clin.rx.noteSigned' : 'partner.clin.rx.noteDraft', { date: day(n.createdAt) })}
                </option>
              ))}
            </select>
          </Field>
        ) : null}
        <p className="wf-fineprint">{t('partner.clin.rx.allergyNote')}</p>
      </section>

      <section className="wf-card">
        <h3>{t('partner.clin.rx.medicines', { count: vm.lines.length })}</h3>
        {vm.lines.map((line, index) => (
          <fieldset key={line.key} className="wf-form-grid" style={{ border: 0, padding: 0 }}>
            <legend>{t('partner.clin.rx.medicineN', { n: index + 1 })}</legend>
            <Field label={t('partner.clin.rx.genericName')}><input required minLength={2} maxLength={160} value={line.genericName} onChange={(e) => vm.updateLine(line.key, 'genericName', e.target.value)} /></Field>
            <Field label={t('partner.clin.rx.strength')}><input maxLength={60} value={line.strength} onChange={(e) => vm.updateLine(line.key, 'strength', e.target.value)} placeholder={t('partner.clin.rx.strengthHint')} /></Field>
            <Field label={t('partner.clin.rx.form')}><input maxLength={40} value={line.form} onChange={(e) => vm.updateLine(line.key, 'form', e.target.value)} placeholder={t('partner.clin.rx.formHint')} /></Field>
            <Field label={t('partner.clin.rx.dose')}><input maxLength={60} value={line.dose} onChange={(e) => vm.updateLine(line.key, 'dose', e.target.value)} /></Field>
            <Field label={t('partner.clin.rx.frequency')}><input maxLength={60} value={line.frequency} onChange={(e) => vm.updateLine(line.key, 'frequency', e.target.value)} placeholder={t('partner.clin.rx.frequencyHint')} /></Field>
            <Field label={t('partner.clin.rx.days')}><input type="number" min={0} max={365} value={line.durationDays} onChange={(e) => vm.updateLine(line.key, 'durationDays', Number(e.target.value))} /></Field>
            <Field label={t('partner.clin.rx.quantity')}><input type="number" required min={1} max={1000} value={line.quantity || ''} onChange={(e) => vm.updateLine(line.key, 'quantity', Number(e.target.value))} /></Field>
            <Field label={t('partner.clin.rx.schedule')}>
              <select value={line.scheduleClass} onChange={(e) => vm.updateLine(line.key, 'scheduleClass', e.target.value as ScheduleClass)}>
                {SCHEDULE_CLASSES.map((c) => <option key={c} value={c}>{c === 'OTC' ? 'OTC' : t('partner.clin.rx.scheduleClass', { c })}</option>)}
              </select>
            </Field>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, minHeight: 44 }}>
              <input type="checkbox" checked={line.substitutionAllowed} onChange={(e) => vm.updateLine(line.key, 'substitutionAllowed', e.target.checked)} />
              {t('partner.clin.rx.substitution')}
            </label>
            {vm.lines.length > 1 ? (
              <button type="button" className="health-button" style={{ minHeight: 44 }} aria-label={t('partner.clin.rx.removeN', { n: index + 1 })} onClick={() => vm.removeLine(line.key)}>
                <Trash2 size={16} aria-hidden="true" /> {t('partner.clin.rx.remove')}
              </button>
            ) : null}
          </fieldset>
        ))}
        <button type="button" className="health-button" style={{ minHeight: 44 }} disabled={vm.lines.length >= 20} onClick={vm.addLine}>
          <Plus size={16} aria-hidden="true" /> {t('partner.clin.rx.add')}
        </button>
      </section>

      <section className="wf-card">
        <Field label={t('partner.clin.rx.advice')}><textarea rows={3} maxLength={1000} value={vm.advice} onChange={(e) => vm.setAdvice(e.target.value)} /></Field>
        <Field label={t('partner.clin.rx.validDays')}><input type="number" min={1} max={180} value={vm.validDays} onChange={(e) => vm.setValidDays(Number(e.target.value))} /></Field>
      </section>

      {vm.conflicts.length > 0 ? (
        <section className="wf-card" role="alert" aria-labelledby="rx-allergy-heading">
          <h3 id="rx-allergy-heading"><AlertTriangle size={18} aria-hidden="true" /> {t('partner.clin.rx.conflictTitle')}</h3>
          <ul>
            {vm.conflicts.flatMap((c) => c.conflicts.map((hit) => (
              <li key={`${c.genericName}-${hit.substance}`}><strong>{c.genericName}</strong>: {t('partner.clin.rx.conflictLine', { substance: hit.substance })}</li>
            )))}
          </ul>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, minHeight: 44 }}>
            <input type="checkbox" checked={vm.acknowledgeConflicts} onChange={(e) => vm.setAcknowledgeConflicts(e.target.checked)} />
            {t('partner.clin.rx.conflictAck')}
          </label>
        </section>
      ) : null}

      {vm.conflicts.length === 0 ? <FormError message={vm.error ?? ''} /> : null}

      <button type="submit" className="health-button health-button-primary" style={{ minHeight: 44 }} disabled={!vm.canIssue} aria-busy={vm.busy}>
        {vm.busy ? t('partner.clin.rx.issuing') : t('partner.clin.rx.issue')}
      </button>
    </form>
  );
});

export function NMCDoctorEPrescriptionScreen() {
  const t = useT();
  const [vm] = useState(() => new PrescribeViewModel());
  useEffect(() => {
    void vm.loadPatients();
    return () => vm.dispose();
  }, [vm]);
  return (
    <div className="wf-container">
      <div className="wf-panel-heading">
        <div>
          <span className="care-eyebrow">{t('partner.clin.rx.eyebrow')}</span>
          <h2>{t('partner.clin.rx.title')}</h2>
          <p>{t('partner.clin.rx.intro')}</p>
        </div>
      </div>
      <PrescribeView vm={vm} />
    </div>
  );
}
