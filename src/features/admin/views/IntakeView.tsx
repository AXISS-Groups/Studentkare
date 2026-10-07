import React, { useEffect, useState } from 'react';
import { observer } from 'mobx-react-lite';
import { AdminEmpty, AdminError, AdminLoading, AdminPage, AdminStatus } from '@/screens/workspace/admin/AdminPage';
import { intakeRepository } from '../model/intakeRepository';
import { confidenceTone, count, percent, readable } from '../model/format';
import { IntakeViewModel } from '../viewmodels/IntakeViewModel';

/**
 * Intake & OCR, following its design (AdminIntake) on the data and actions the backend
 * already has. Design parts with no endpoint behind them (Ask the lab, document preview)
 * are not wired as working controls.
 */
export const IntakeView = observer(function IntakeView() {
  const [vm] = useState(() => new IntakeViewModel(intakeRepository));
  useEffect(() => { void vm.load(); return vm.dispose; }, [vm]);
  const { items, documents, selected } = vm;

  return <AdminPage eyebrow="Content & AI" title="Intake & OCR" description="Uploaded reports and prescriptions read by OCR. Fields the reader isn’t sure of wait here for a person."
    status={vm.queue && items.length > 0 ? <AdminStatus tone="attention">{count(items.length)} {items.length === 1 ? 'field' : 'fields'} waiting</AdminStatus> : undefined}>
    {vm.loading ? <div className="sk-admin-card"><AdminLoading label="Loading the intake queue…" /></div>
      : vm.error ? <AdminError title="Couldn’t load the intake queue" message={vm.error} onRetry={vm.reload} />
        : !documents.length ? <div className="sk-admin-card"><AdminEmpty title="Nothing waiting for a person." description="Documents with fields the reader isn’t sure of will appear here." /></div>
          : <div className="sk-admin-intake">
            <section className="sk-admin-card" aria-labelledby="sk-admin-intake-queue">
              <h3 id="sk-admin-intake-queue" className="sk-admin-eyebrow">Needs a human · {count(documents.length)}</h3>
              <ul className="sk-admin-queue">{documents.map(document => <li key={document.intakeId}>
                <button type="button" aria-pressed={document.intakeId === selected?.intakeId} onClick={() => vm.selectDocument(document.intakeId)}>
                  <strong>Document {document.documentId.slice(0, 8)}</strong>
                  <span>{count(document.fields.length)} {document.fields.length === 1 ? 'field' : 'fields'} to check</span>
                  <span className={`sk-admin-tag ${confidenceTone(document.lowest)}`}>Lowest confidence {percent(document.lowest)}</span>
                </button>
              </li>)}</ul>
            </section>

            <section className="sk-admin-card" aria-labelledby="sk-admin-intake-original">
              <h3 id="sk-admin-intake-original" className="sk-admin-eyebrow">Original</h3>
              <AdminEmpty title="No preview." description="The original document will be shown here once document access is connected to this console." />
            </section>

            {selected && <section className="sk-admin-card" aria-labelledby="sk-admin-intake-fields">
              <h3 id="sk-admin-intake-fields" className="sk-admin-eyebrow">Extracted fields</h3>
              <div className="sk-admin-fields">{selected.fields.map(field => <label key={field.id}>
                <span className="sk-admin-field-label">{readable(field.field)}<span className={`sk-admin-tag ${confidenceTone(field.confidence)}`}>{percent(field.confidence)}</span></span>
                <input className={field.confidence < 0.9 ? 'is-uncertain' : undefined} value={vm.fieldValue(field)} onChange={event => vm.edit(field.id, event.target.value)} />
              </label>)}</div>
              {vm.decisionError && <p className="sk-admin-form-error" role="alert">{vm.decisionError}</p>}
              <div className="sk-admin-actions">
                <button type="button" className="sk-admin-button sk-admin-button-primary" disabled={vm.deciding} onClick={() => void vm.decide(true)}>Confirm fields</button>
                <button type="button" className="sk-admin-button" disabled={vm.deciding} onClick={() => void vm.decide(false)}>Reject</button>
              </div>
            </section>}
          </div>}
  </AdminPage>;
});
