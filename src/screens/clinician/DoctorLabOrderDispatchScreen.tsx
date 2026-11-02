import React, { useEffect, useState } from 'react';
import { observer } from 'mobx-react-lite';
import { EmptyState, Field, FormError } from '../../components/interface/WorkflowUI';
import { Icon } from '@/design-system/icons';
import { DoctorLabOrderViewModel, INDICATION_MAX, INDICATION_MIN } from '@/features/clinician/viewmodel/DoctorLabOrderViewModel';
import { useT, type MessageKey, type Vars } from '@/i18n';
import '../../theme/workflows.css';

type T = (key: MessageKey, vars?: Vars) => string;

const TRANSLATED_STATUS = new Set(['BOOKED', 'ASSIGNED', 'SAMPLE_COLLECTED', 'RECEIVED_AT_LAB', 'IN_ANALYSIS', 'REPORT_READY', 'REPORT_RELEASED']);
const OPEN_STATUS = new Set(['BOOKED', 'ASSIGNED', 'SAMPLE_COLLECTED', 'IN_TRANSIT', 'RECEIVED_AT_LAB', 'IN_ANALYSIS', 'REPORT_READY', 'RECOLLECTION_REQUIRED']);

function statusLabel(status: string, t: T): string {
  if (TRANSLATED_STATUS.has(status)) return t(`care.rx.status.${status}` as MessageKey);
  return status.replace(/_/g, ' ').toLowerCase().replace(/^./, (c) => c.toUpperCase());
}

const visit = (iso: string) => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
};
const day = (seconds: number) => new Date(seconds * 1000).toLocaleDateString(undefined, { day: 'numeric', month: 'short' });

const row: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 'var(--sk-space-8)' };
const touch: React.CSSProperties = { ...row, minHeight: 'var(--sk-size-touch-target)', cursor: 'pointer' };
const tall: React.CSSProperties = { minHeight: 'var(--sk-size-touch-target)' };

function Retry({ message, onRetry, t }: { message: string; onRetry: () => void; t: T }) {
  return (
    <div className="wf-notice" role="alert" style={row}>
      <Icon name="alert-triangle" size={18} />
      <span>{message}</span>
      <button type="button" className="health-button" style={tall} onClick={onRetry}>
        <Icon name="repeat" size={16} /> {t('common.tryAgain')}
      </button>
    </div>
  );
}

const OrderForm = observer(function OrderForm({ vm }: { vm: DoctorLabOrderViewModel }) {
  const t = useT();
  if (vm.placed) {
    return (
      <section className="wf-card" role="status" aria-live="polite">
        <h3 style={row}><Icon name="flask" size={20} /> {t('partner.clin.lab.placedTitle')}</h3>
        <p>{t('partner.clin.lab.placedLine', { test: vm.placed.testName, name: vm.placed.patientName || t('partner.clin.lab.yourPatient') })}</p>
        <p>{t('partner.clin.lab.placedNext')}</p>
        <p className="wf-fineprint">{t('partner.clin.lab.noCharge')}</p>
        <button type="button" className="health-button health-button-primary" style={tall} onClick={vm.startAnother}>
          {t('partner.clin.lab.another')}
        </button>
      </section>
    );
  }

  const indicationLength = vm.indication.trim().length;
  return (
    <form className="wf-form" onSubmit={(event) => { event.preventDefault(); void vm.submit(); }}>
      <section className="wf-card">
        <h3 style={row}><Icon name="users" size={18} /> {t('partner.clin.rx.patient')}</h3>
        {vm.patients === null && !vm.patientsFailed ? <p role="status">{t('partner.clin.rx.loadingPatients')}</p> : null}
        {vm.patientsFailed ? <Retry message={t('partner.clin.lab.patientsFailed')} onRetry={() => void vm.loadPatients()} t={t} /> : null}
        {vm.patients && vm.patients.length === 0 ? (
          <EmptyState title={t('partner.clin.rx.noPatientsTitle')} description={t('partner.clin.lab.noPatientsBody')} />
        ) : null}
        {vm.patients && vm.patients.length > 0 ? (
          <Field label={t('partner.clin.rx.patientField')}>
            <select required value={vm.patientId} onChange={(e) => vm.selectPatient(e.target.value)}>
              <option value="">{t('partner.clin.rx.choosePatient')}</option>
              {vm.patients.map((p) => <option key={p.patientId} value={p.patientId}>{t('partner.clin.rx.patientOption', { name: p.name, date: visit(p.lastVisit) })}</option>)}
            </select>
          </Field>
        ) : null}
      </section>

      <section className="wf-card">
        <h3 style={row}><Icon name="flask" size={18} /> {t('partner.clin.lab.selectHeading')}</h3>
        {vm.tests === null && !vm.testsFailed ? <p role="status">{t('partner.clin.lab.loadingTests')}</p> : null}
        {vm.testsFailed ? <Retry message={t('partner.clin.lab.testsFailed')} onRetry={() => void vm.loadTests()} t={t} /> : null}
        {vm.tests && vm.tests.length === 0 ? (
          <EmptyState title={t('partner.clin.lab.noTestsTitle')} description={t('partner.clin.lab.noTestsBody')} />
        ) : null}
        {vm.tests && vm.tests.length > 0 ? (
          <Field label={t('partner.clin.lab.testField')}
            hint={vm.selectedTest ? t('partner.clin.lab.testHint', { lab: vm.selectedTest.labName, prep: vm.selectedTest.preparation || '—' }) : undefined}>
            <select required value={vm.testId} onChange={(e) => vm.selectTest(e.target.value)}>
              <option value="">{t('partner.clin.lab.chooseTest')}</option>
              {vm.tests.map((test) => <option key={test.id} value={test.id}>{test.name}</option>)}
            </select>
          </Field>
        ) : null}

        <fieldset style={{ border: 0, padding: 0, margin: 0 }}>
          <legend>{t('partner.clin.lab.mode')}</legend>
          <div style={{ ...row, gap: 'var(--sk-space-16)', flexWrap: 'wrap' }}>
            <label style={touch}>
              <input type="radio" name="lab-mode" checked={vm.collectionMode === 'WALK_IN'} onChange={() => vm.setCollectionMode('WALK_IN')} />
              {t('partner.clin.lab.walkIn')}
            </label>
            <label style={touch}>
              <input type="radio" name="lab-mode" disabled={!vm.hostelAvailable} checked={vm.collectionMode === 'HOME'} onChange={() => vm.setCollectionMode('HOME')} />
              {t('partner.clin.lab.hostel')}
            </label>
          </div>
          {vm.selectedTest && !vm.hostelAvailable ? <p className="wf-fineprint">{t('partner.clin.lab.noHostel')}</p> : null}
        </fieldset>

        <label style={touch}>
          <input type="checkbox" checked={vm.fastingRequired} onChange={(e) => vm.setFastingRequired(e.target.checked)} />
          <Icon name="clock" size={16} /> {t('partner.clin.lab.fasting')}
        </label>
      </section>

      <section className="wf-card">
        <Field label={t('partner.clin.lab.indication')}
          hint={t('partner.clin.lab.indicationHint', { min: INDICATION_MIN, max: INDICATION_MAX, count: indicationLength })}>
          <textarea required rows={3} minLength={INDICATION_MIN} maxLength={INDICATION_MAX} value={vm.indication}
            aria-invalid={indicationLength > 0 && !vm.indicationValid}
            onChange={(e) => vm.setIndication(e.target.value)} />
        </Field>
        <p className="wf-fineprint" style={row}><Icon name="align-left" size={16} /> {t('partner.clin.lab.indicationWhy')}</p>
      </section>

      <FormError message={vm.error ?? ''} />
      <p className="wf-fineprint">{t('partner.clin.lab.noCharge')}</p>

      <button type="submit" className="health-button health-button-primary" style={tall} disabled={!vm.canSubmit} aria-busy={vm.busy}>
        <Icon name="arrow-up-right" size={16} /> {vm.busy ? t('partner.clin.lab.submitting') : t('partner.clin.lab.submit')}
      </button>
    </form>
  );
});

const PlacedOrders = observer(function PlacedOrders({ vm }: { vm: DoctorLabOrderViewModel }) {
  const t = useT();
  const orders = vm.orders;
  return (
    <section className="wf-card wf-section-gap" aria-labelledby="lab-placed-heading">
      <h3 id="lab-placed-heading" style={row}><Icon name="file" size={18} /> {t('partner.clin.lab.placedHeading')}</h3>
      {orders === null && !vm.ordersFailed ? <p role="status">{t('partner.clin.lab.loadingOrders')}</p> : null}
      {vm.ordersFailed ? <Retry message={t('partner.clin.lab.ordersFailed')} onRetry={() => void vm.loadOrders()} t={t} /> : null}
      {orders && orders.length === 0 ? (
        <div>
          <Icon name="inbox" size={24} />
          <EmptyState title={t('partner.clin.lab.noOrdersTitle')} description={t('partner.clin.lab.noOrdersBody')} />
        </div>
      ) : null}
      {orders && orders.length > 0 ? (
        <>
          <p className="wf-fineprint">
            {t('partner.clin.lab.counts', {
              open: orders.filter((o) => OPEN_STATUS.has(o.status)).length,
              fasting: orders.filter((o) => o.fastingRequired).length,
            })}
          </p>
          <div className="wf-table-scroll">
            <table>
              <caption className="wf-fineprint">{t('partner.clin.lab.tableCaption')}</caption>
              <thead><tr>
                <th>{t('partner.clin.lab.col.student')}</th>
                <th>{t('partner.clin.lab.col.panel')}</th>
                <th>{t('partner.clin.lab.col.prep')}</th>
                <th>{t('partner.clin.lab.col.lab')}</th>
                <th>{t('partner.clin.lab.col.state')}</th>
              </tr></thead>
              <tbody>
                {orders.map((o) => (
                  <tr key={o.id}>
                    <td>{o.patientName || '—'}</td>
                    <td><strong>{o.testPanel.join(', ')}</strong><br />{o.clinicalIndication}</td>
                    <td>
                      <span style={row}>
                        <Icon name={o.fastingRequired ? 'clock' : 'leaf'} size={14} />
                        {o.fastingRequired ? t('partner.clin.lab.fastingShort') : t('partner.clin.lab.noFasting')}
                      </span>
                      {o.collectionMode === 'HOME' ? t('partner.clin.lab.hostelShort') : t('partner.clin.lab.walkInShort')}
                    </td>
                    <td>{o.labName || '—'}</td>
                    <td>{t('partner.clin.lab.stateLine', { status: statusLabel(o.status, t), date: day(o.createdAt) })}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      ) : null}
      <p className="wf-fineprint" style={row}><Icon name="help-circle" size={16} /> {t('partner.clin.lab.reviewNote')}</p>
    </section>
  );
});

/**
 * Lab orders (design page 5: ClinicianLabOrder, Tier 1). A doctor orders a
 * catalogue test for a patient in their care; all logic lives in
 * DoctorLabOrderViewModel. Tier 1: a named design and clinical review is still
 * owed before release.
 */
export const DoctorLabOrderView = observer(function DoctorLabOrderView({ vm }: { vm: DoctorLabOrderViewModel }) {
  return (
    <>
      <OrderForm vm={vm} />
      <PlacedOrders vm={vm} />
    </>
  );
});

export function DoctorLabOrderDispatchScreen({ viewModel }: { viewModel?: DoctorLabOrderViewModel } = {}) {
  const t = useT();
  const [vm] = useState(() => viewModel ?? new DoctorLabOrderViewModel());
  useEffect(() => {
    void vm.load();
    return () => vm.dispose();
  }, [vm]);
  return (
    <div className="wf-container">
      <div className="wf-panel-heading">
        <div>
          <span className="care-eyebrow">{t('partner.clin.lab.eyebrow')}</span>
          <h2>{t('partner.clin.lab.title')}</h2>
          <p>{t('partner.clin.lab.intro')}</p>
        </div>
      </div>
      <DoctorLabOrderView vm={vm} />
    </div>
  );
}
