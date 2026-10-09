import React, { useEffect, useState } from 'react';
import { observer } from 'mobx-react-lite';
import { AlertTriangle, CheckCircle2, Plus, Trash2 } from 'lucide-react';
import { EmptyState, Field, FormError } from '../../components/interface/WorkflowUI';
import { PrescribeViewModel, SCHEDULE_CLASSES } from '@/features/clinician/viewmodel/PrescribeViewModel';
import type { ScheduleClass } from '@/features/clinician/viewmodel/PrescribeViewModel';
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
  if (vm.issued) {
    return (
      <section className="wf-card" role="status" aria-live="polite">
        <CheckCircle2 size={28} aria-hidden="true" />
        <h3>Prescription issued</h3>
        <p>Prescription <strong>{vm.issued.id}</strong>, valid until {day(vm.issued.validUntil)}.</p>
        <p>
          Issued under {vm.issued.prescriberRegNo ? <>registration <strong>{vm.issued.prescriberRegNo}</strong></> : 'your clinician account (no registration number is on your profile)'}.
          The student sees it in their prescriptions; a pharmacy sees it when the student brings it for dispensing.
        </p>
        {vm.issued.allergyCheck.acknowledged ? <p>Your acknowledgement of the allergy conflict is recorded on this prescription.</p> : null}
        <button type="button" className="health-button health-button-primary" style={{ minHeight: 44 }} onClick={vm.startAnother}>
          Write another prescription
        </button>
      </section>
    );
  }

  return (
    <form className="wf-form" onSubmit={(event) => { event.preventDefault(); void vm.issue(); }}>
      <section className="wf-card">
        <h3>Patient</h3>
        {vm.patients === null && !vm.patientsFailed ? <p role="status">Loading your patients…</p> : null}
        {vm.patientsFailed ? (
          <div className="wf-notice" role="alert">
            Your patients couldn’t be loaded, so nothing can be prescribed yet.
            <button type="button" className="health-button" style={{ minHeight: 44 }} onClick={() => void vm.loadPatients()}>Try again</button>
          </div>
        ) : null}
        {vm.patients && vm.patients.length === 0 ? (
          <EmptyState title="No patients in your care yet." description="You can prescribe for a student once they have a confirmed appointment with you." />
        ) : null}
        {vm.patients && vm.patients.length > 0 ? (
          <Field label="Patient (from your confirmed appointments)">
            <select required value={vm.patientId} onChange={(e) => vm.selectPatient(e.target.value)}>
              <option value="">Choose a patient…</option>
              {vm.patients.map((p) => <option key={p.patientId} value={p.patientId}>{`${p.name} · visit ${visit(p.lastVisit)}`}</option>)}
            </select>
          </Field>
        ) : null}
        <p className="wf-fineprint">The patient’s recorded allergies are checked by the server when you issue. Confirm anything else with the patient.</p>
      </section>

      <section className="wf-card">
        <h3>{`Medicines (${vm.lines.length})`}</h3>
        {vm.lines.map((line, index) => (
          <fieldset key={line.key} className="wf-form-grid" style={{ border: 0, padding: 0 }}>
            <legend>{`Medicine ${index + 1}`}</legend>
            <Field label="Generic name"><input required minLength={2} maxLength={160} value={line.genericName} onChange={(e) => vm.updateLine(line.key, 'genericName', e.target.value)} /></Field>
            <Field label="Strength"><input maxLength={60} value={line.strength} onChange={(e) => vm.updateLine(line.key, 'strength', e.target.value)} placeholder="e.g. 500 mg" /></Field>
            <Field label="Form"><input maxLength={40} value={line.form} onChange={(e) => vm.updateLine(line.key, 'form', e.target.value)} placeholder="e.g. tablet" /></Field>
            <Field label="Dose"><input maxLength={60} value={line.dose} onChange={(e) => vm.updateLine(line.key, 'dose', e.target.value)} /></Field>
            <Field label="Frequency"><input maxLength={60} value={line.frequency} onChange={(e) => vm.updateLine(line.key, 'frequency', e.target.value)} placeholder="e.g. twice a day" /></Field>
            <Field label="Days"><input type="number" min={0} max={365} value={line.durationDays} onChange={(e) => vm.updateLine(line.key, 'durationDays', Number(e.target.value))} /></Field>
            <Field label="Quantity"><input type="number" required min={1} max={1000} value={line.quantity || ''} onChange={(e) => vm.updateLine(line.key, 'quantity', Number(e.target.value))} /></Field>
            <Field label="Schedule">
              <select value={line.scheduleClass} onChange={(e) => vm.updateLine(line.key, 'scheduleClass', e.target.value as ScheduleClass)}>
                {SCHEDULE_CLASSES.map((c) => <option key={c} value={c}>{c === 'OTC' ? 'OTC' : `Schedule ${c}`}</option>)}
              </select>
            </Field>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, minHeight: 44 }}>
              <input type="checkbox" checked={line.substitutionAllowed} onChange={(e) => vm.updateLine(line.key, 'substitutionAllowed', e.target.checked)} />
              Generic substitution allowed
            </label>
            {vm.lines.length > 1 ? (
              <button type="button" className="health-button" style={{ minHeight: 44 }} aria-label={`Remove medicine ${index + 1}`} onClick={() => vm.removeLine(line.key)}>
                <Trash2 size={16} aria-hidden="true" /> Remove
              </button>
            ) : null}
          </fieldset>
        ))}
        <button type="button" className="health-button" style={{ minHeight: 44 }} disabled={vm.lines.length >= 20} onClick={vm.addLine}>
          <Plus size={16} aria-hidden="true" /> Add a medicine
        </button>
      </section>

      <section className="wf-card">
        <Field label="Advice for the patient"><textarea rows={3} maxLength={1000} value={vm.advice} onChange={(e) => vm.setAdvice(e.target.value)} /></Field>
        <Field label="Valid for (days)"><input type="number" min={1} max={180} value={vm.validDays} onChange={(e) => vm.setValidDays(Number(e.target.value))} /></Field>
      </section>

      {vm.conflicts.length > 0 ? (
        <section className="wf-card" role="alert" aria-labelledby="rx-allergy-heading">
          <h3 id="rx-allergy-heading"><AlertTriangle size={18} aria-hidden="true" /> Allergy conflict — not issued</h3>
          <ul>
            {vm.conflicts.flatMap((c) => c.conflicts.map((hit) => (
              <li key={`${c.genericName}-${hit.substance}`}><strong>{c.genericName}</strong>: the record lists a {hit.substance} allergy.</li>
            )))}
          </ul>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, minHeight: 44 }}>
            <input type="checkbox" checked={vm.acknowledgeConflicts} onChange={(e) => vm.setAcknowledgeConflicts(e.target.checked)} />
            I have reviewed this conflict with the patient and still intend to prescribe. Record my acknowledgement.
          </label>
        </section>
      ) : null}

      {vm.conflicts.length === 0 ? <FormError message={vm.error ?? ''} /> : null}

      <button type="submit" className="health-button health-button-primary" style={{ minHeight: 44 }} disabled={!vm.canIssue} aria-busy={vm.busy}>
        {vm.busy ? 'Issuing…' : 'Issue prescription'}
      </button>
    </form>
  );
});

export function NMCDoctorEPrescriptionScreen() {
  const [vm] = useState(() => new PrescribeViewModel());
  useEffect(() => {
    void vm.loadPatients();
    return () => vm.dispose();
  }, [vm]);
  return (
    <div className="wf-container">
      <div className="wf-panel-heading">
        <div>
          <span className="care-eyebrow">DOCTOR CONSULTATION WORKSPACE</span>
          <h2>E-prescription writer</h2>
          <p>Prescriptions are checked against the patient’s recorded allergies before they are issued.</p>
        </div>
      </div>
      <PrescribeView vm={vm} />
    </div>
  );
}
