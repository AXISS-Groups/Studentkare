import React, { useEffect, useState } from 'react';
import { observer } from 'mobx-react-lite';
import { AdminEmpty, AdminError, AdminLoading, AdminPage, AdminStatus } from '@/screens/workspace/admin/AdminPage';
import { intakeRepository } from '../model/intakeRepository';
import { confidenceTone, count, percent, readable } from '../model/format';
import { IntakeViewModel } from '../viewmodels/IntakeViewModel';
import { useT } from '@/i18n';

/**
 * Intake & OCR, following its design (AdminIntake) on the data and actions the backend
 * already has. Design parts with no endpoint behind them (Ask the lab, document preview)
 * are not wired as working controls.
 */
export const IntakeView = observer(function IntakeView() {
  const t = useT();
  const [vm] = useState(() => new IntakeViewModel(intakeRepository));
  useEffect(() => { void vm.load(); return vm.dispose; }, [vm]);
  const { items, documents, selected } = vm;

  return <AdminPage eyebrow={t('admin.eyebrow.contentAi')} title={t('admin.intake.title')} description={t('admin.intake.description')}
    status={vm.queue && items.length > 0 ? <AdminStatus tone="attention">{items.length === 1 ? t('admin.intake.waitingOne') : t('admin.intake.waitingOther', { count: count(items.length) })}</AdminStatus> : undefined}>
    {vm.loading ? <div className="sk-admin-card"><AdminLoading label={t('admin.intake.loading')} /></div>
      : vm.error ? <AdminError title={t('admin.intake.error')} message={vm.error} onRetry={vm.reload} />
        : !documents.length ? <div className="sk-admin-card"><AdminEmpty title={t('admin.intake.empty')} description={t('admin.intake.emptyBody')} /></div>
          : <div className="sk-admin-intake">
            <section className="sk-admin-card" aria-labelledby="sk-admin-intake-queue">
              <h3 id="sk-admin-intake-queue" className="sk-admin-eyebrow">{t('admin.intake.needsHuman', { count: count(documents.length) })}</h3>
              <ul className="sk-admin-queue">{documents.map(document => <li key={document.intakeId}>
                <button type="button" aria-pressed={document.intakeId === selected?.intakeId} onClick={() => vm.selectDocument(document.intakeId)}>
                  <strong>{t('admin.intake.document', { id: document.documentId.slice(0, 8) })}</strong>
                  <span>{document.fields.length === 1 ? t('admin.intake.toCheckOne') : t('admin.intake.toCheckOther', { count: count(document.fields.length) })}</span>
                  <span className={`sk-admin-tag ${confidenceTone(document.lowest)}`}>{t('admin.intake.lowest', { percent: percent(document.lowest) })}</span>
                </button>
              </li>)}</ul>
            </section>

            <section className="sk-admin-card" aria-labelledby="sk-admin-intake-original">
              <h3 id="sk-admin-intake-original" className="sk-admin-eyebrow">{t('admin.intake.original')}</h3>
              <AdminEmpty title={t('admin.intake.noPreview')} description={t('admin.intake.noPreviewBody')} />
            </section>

            {selected && <section className="sk-admin-card" aria-labelledby="sk-admin-intake-fields">
              <h3 id="sk-admin-intake-fields" className="sk-admin-eyebrow">{t('admin.intake.fields')}</h3>
              <div className="sk-admin-fields">{selected.fields.map(field => <label key={field.id}>
                <span className="sk-admin-field-label">{readable(field.field)}<span className={`sk-admin-tag ${confidenceTone(field.confidence)}`}>{percent(field.confidence)}</span></span>
                <input className={field.confidence < 0.9 ? 'is-uncertain' : undefined} value={vm.fieldValue(field)} onChange={event => vm.edit(field.id, event.target.value)} />
              </label>)}</div>
              {vm.decisionError && <p className="sk-admin-form-error" role="alert">{vm.decisionError}</p>}
              <div className="sk-admin-actions">
                <button type="button" className="sk-admin-button sk-admin-button-primary" disabled={vm.deciding} onClick={() => void vm.decide(true)}>{t('admin.intake.confirm')}</button>
                <button type="button" className="sk-admin-button" disabled={vm.deciding} onClick={() => void vm.decide(false)}>{t('admin.intake.reject')}</button>
              </div>
            </section>}
          </div>}
  </AdminPage>;
});
