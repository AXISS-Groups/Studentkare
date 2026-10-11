import React, { useState } from 'react';
import { AlertTriangle, FlaskConical, Package, Pill, ShieldCheck } from 'lucide-react';
import { useApiResource } from '../../hooks/useApiResource';
import { apiRequest } from '../../data/http';
import { displayDate } from '../../data/workflowTypes';
import { DataState, EmptyState, Field, FormError, useMutation } from '../../components/interface/WorkflowUI';
import { ShopDialog } from '../../components/marketplace/ShopDialog';
import { useT } from '../../i18n';
import type { MessageKey } from '../../i18n';
import '../../theme/workflows.css';

interface PrescriptionItem {
  id: string; genericName: string; strength: string; dose: string; frequency: string;
  quantity: number; scheduleClass: string; registerRequired: boolean; substitutionAllowed: boolean;
}
interface Dispense {
  id: string; prescriptionId: string; status: string; verifiedBy: string;
  rejectionReason: string; substitutionNote: string; createdAt: number; nextStates: string[];
  prescription: { id: string; items: PrescriptionItem[]; prescriberRegNo: string } | null;
}
interface LabOrder {
  id: string; testPanel: string[]; collectionMode: string; slotStart: string;
  fastingRequired: boolean; collectorName: string; sampleId: string; status: string;
  criticalFlag: boolean; rejectionReason: string; createdAt: number; nextStates: string[];
}

/** A transition that needs more than a button: the field the API will demand. */
const DISPENSE_PROMPT: Record<string, { label: MessageKey; field: 'pharmacistName' | 'note'; hint: MessageKey }> = {
  RX_VERIFIED: { label: 'admin.fulfil.rxVerifiedLabel', field: 'pharmacistName', hint: 'admin.fulfil.rxVerifiedHint' },
  REJECTED: { label: 'admin.fulfil.rejectedLabel', field: 'note', hint: 'admin.fulfil.rejectedHint' },
};
const LAB_PROMPT: Record<string, { label: MessageKey; field: 'collectorName' | 'sampleId' | 'reportDocumentId' | 'rejectionReason'; hint: MessageKey }> = {
  ASSIGNED: { label: 'admin.fulfil.assignedLabel', field: 'collectorName', hint: 'admin.fulfil.assignedHint' },
  SAMPLE_COLLECTED: { label: 'admin.fulfil.collectedLabel', field: 'sampleId', hint: 'admin.fulfil.collectedHint' },
  REPORT_READY: { label: 'admin.fulfil.reportLabel', field: 'reportDocumentId', hint: 'admin.fulfil.reportHint' },
  SAMPLE_REJECTED: { label: 'admin.fulfil.sampleRejectedLabel', field: 'rejectionReason', hint: 'admin.fulfil.sampleRejectedHint' },
};

/** A server status code in readable form. The codes themselves are not translated. */
function label(status: string): string {
  return status.replace(/_/g, ' ').toLowerCase().replace(/^./, character => character.toUpperCase());
}

export function PharmacyQueuePanel() {
  const t = useT();
  const [status, setStatus] = useState('');
  const queue = useApiResource<{ items: Dispense[]; total: number }>(
    `/work/dispenses?limit=50${status ? `&status=${status}` : ''}`);
  const mutation = useMutation();
  const [step, setStep] = useState<{ dispense: Dispense; next: string } | null>(null);
  const [value, setValue] = useState('');

  const advance = (dispense: Dispense, next: string, extra: Record<string, string> = {}) => mutation.run(
    () => apiRequest(`/dispenses/${dispense.id}`, { method: 'PATCH', body: JSON.stringify({ status: next, ...extra }) }),
    () => { setStep(null); setValue(''); queue.reload(); },
  );

  const start = (dispense: Dispense, next: string) => {
    if (DISPENSE_PROMPT[next]) { setStep({ dispense, next }); setValue(''); return; }
    advance(dispense, next);
  };

  return <>
    <div className="wf-panel-heading"><div>
      <span className="care-eyebrow">{t('admin.fulfil.rxEyebrow')}</span>
      <h2>{t('admin.fulfil.rxTitle')}</h2>
      <p>{t('admin.fulfil.rxIntro')}</p>
    </div>
      <Field label={t('admin.accountsList.colStatus')}>
        <select value={status} onChange={event => setStatus(event.target.value)}>
          <option value="">{t('admin.ledger.filterAll')}</option>
          {['RX_ISSUED', 'RX_VERIFIED', 'SUBSTITUTION_PROPOSED', 'ACCEPTED', 'PARTIALLY_ACCEPTED',
            'PACKED', 'OUT_FOR_DELIVERY', 'DELIVERED', 'REJECTED'].map(value => (
              <option key={value} value={value}>{label(value)}</option>
            ))}
        </select>
      </Field>
    </div>

    <FormError message={mutation.error} />

    <DataState {...queue} retry={queue.reload}>
      {queue.data?.items.length ? <div className="wf-order-list">
        {queue.data.items.map(dispense => <article className="wf-card" key={dispense.id}>
          <div className="wf-panel-heading">
            <div>
              <span className="care-eyebrow">{t('admin.fulfil.dispenseRef', { id: dispense.id.slice(0, 8).toUpperCase() })}</span>
              <h3 style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Pill size={18} aria-hidden="true" />
                {(dispense.prescription?.items.length ?? 0) === 1 ? t('admin.fulfil.itemsOne') : t('admin.fulfil.itemsOther', { count: dispense.prescription?.items.length ?? 0 })}
              </h3>
              <p>{t('admin.fulfil.received', { date: displayDate(new Date(dispense.createdAt * 1000).toISOString()) })}
                {dispense.prescription?.prescriberRegNo ? ` · ${t('admin.fulfil.prescriber', { reg: dispense.prescription.prescriberRegNo })}` : ''}</p>
            </div>
            <span className={`wf-status status-${dispense.status === 'REJECTED' ? 'declined' : 'accepted'}`}>
              {label(dispense.status)}
            </span>
          </div>

          {dispense.prescription?.items.length ? <div className="wf-table-scroll">
            <table>
              <thead><tr><th>{t('admin.fulfil.colMedicine')}</th><th>{t('admin.fulfil.colDose')}</th><th>{t('admin.fulfil.colQty')}</th><th>{t('admin.fulfil.colSchedule')}</th><th>{t('admin.fulfil.colSubstitution')}</th></tr></thead>
              <tbody>
                {dispense.prescription.items.map(item => <tr key={item.id}>
                  <td>{item.genericName} {item.strength}</td>
                  <td>{item.dose} {item.frequency}</td>
                  <td>{item.quantity}</td>
                  <td>{item.scheduleClass}{item.registerRequired ? ` · ${t('admin.fulfil.register')}` : ''}</td>
                  <td>{item.substitutionAllowed ? t('admin.fulfil.allowed') : t('admin.fulfil.notAllowed')}</td>
                </tr>)}
              </tbody>
            </table>
          </div> : null}

          {dispense.verifiedBy && <p className="wf-fineprint">
            <ShieldCheck size={14} aria-hidden="true" /> {t('admin.fulfil.verifiedBy', { name: dispense.verifiedBy })}
          </p>}
          {dispense.substitutionNote && <div className="wf-notice" role="status">
            {t('admin.fulfil.substitution', { note: dispense.substitutionNote })}
          </div>}
          {dispense.rejectionReason && <p className="wf-fineprint">{t('admin.fulfil.rejected', { reason: dispense.rejectionReason })}</p>}

          <div className="wf-row-actions">
            {dispense.nextStates.length ? dispense.nextStates.map(next => (
              <button key={next} type="button" className={`health-button ${next === 'RX_VERIFIED' ? 'health-button-primary' : ''}`}
                disabled={mutation.busy} style={{ minHeight: 44 }}
                aria-label={t('admin.fulfil.forDispense', { action: label(next), id: dispense.id.slice(0, 8) })}
                onClick={() => start(dispense, next)}>{label(next)}</button>
            )) : <span className="wf-fineprint">{t('admin.fulfil.noFurther')}</span>}
          </div>
        </article>)}
      </div> : <EmptyState title={t('admin.fulfil.rxEmpty')}
        description={t('admin.fulfil.rxEmptyBody')} />}
    </DataState>

    {step && <ShopDialog title={label(step.next)} onClose={() => setStep(null)}>
      <form className="wf-form" onSubmit={event => {
        event.preventDefault();
        advance(step.dispense, step.next, { [DISPENSE_PROMPT[step.next].field]: value });
      }}>
        <FormError message={mutation.error} />
        <p>{t(DISPENSE_PROMPT[step.next].hint)}</p>
        <Field label={t(DISPENSE_PROMPT[step.next].label)}>
          <input required minLength={2} maxLength={300} value={value} onChange={event => setValue(event.target.value)} />
        </Field>
        <button className="health-button health-button-primary" type="submit"
          disabled={mutation.busy || value.trim().length < 2} style={{ minHeight: 44 }}>
          {mutation.busy ? t('admin.fulfil.saving') : t('admin.work.confirm')}
        </button>
      </form>
    </ShopDialog>}
  </>;
}

export function LabQueuePanel() {
  const t = useT();
  const queue = useApiResource<{ items: LabOrder[]; total: number; critical: number }>('/work/lab-orders?limit=50');
  const mutation = useMutation();
  const [step, setStep] = useState<{ order: LabOrder; next: string } | null>(null);
  const [value, setValue] = useState('');

  const advance = (order: LabOrder, next: string, extra: Record<string, string> = {}) => mutation.run(
    () => apiRequest(`/lab-orders/${order.id}`, { method: 'PATCH', body: JSON.stringify({ status: next, ...extra }) }),
    () => { setStep(null); setValue(''); queue.reload(); },
  );

  const start = (order: LabOrder, next: string) => {
    if (LAB_PROMPT[next]) { setStep({ order, next }); setValue(''); return; }
    advance(order, next);
  };

  return <>
    <div className="wf-panel-heading"><div>
      <span className="care-eyebrow">{t('admin.fulfil.labEyebrow')}</span>
      <h2>{t('admin.fulfil.labTitle')}</h2>
      <p>{t('admin.fulfil.labIntro')}</p>
    </div></div>

    <FormError message={mutation.error} />

    <DataState {...queue} retry={queue.reload}>
      {queue.data?.critical ? <div className="wf-notice" role="alert" style={{ marginBottom: 14, borderColor: 'var(--emergency)' }}>
        <AlertTriangle size={18} aria-hidden="true" />
        {queue.data.critical === 1 ? t('admin.fulfil.criticalOne') : t('admin.fulfil.criticalOther', { count: queue.data.critical })}
      </div> : null}

      {queue.data?.items.length ? <div className="wf-order-list">
        {queue.data.items.map(order => <article className="wf-card" key={order.id}
          style={order.criticalFlag ? { border: '2px solid var(--emergency)' } : undefined}>
          <div className="wf-panel-heading">
            <div>
              <span className="care-eyebrow">{t('admin.fulfil.orderRef', { id: order.id.slice(0, 8).toUpperCase() })}</span>
              <h3 style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <FlaskConical size={18} aria-hidden="true" />{order.testPanel.join(', ')}
              </h3>
              <p>
                {order.collectionMode === 'HOME' ? t('admin.fulfil.home') : t('admin.fulfil.walkIn')}
                {order.fastingRequired ? ` · ${t('admin.fulfil.fasting')}` : ''}
                {order.slotStart ? ` · ${order.slotStart}` : ''}
                {order.sampleId ? ` · ${t('admin.fulfil.sample', { id: order.sampleId })}` : ''}
              </p>
            </div>
            <span className={`wf-status status-${order.criticalFlag ? 'declined' : 'accepted'}`}>{label(order.status)}</span>
          </div>

          {order.collectorName && <p className="wf-fineprint">{t('admin.fulfil.collector', { name: order.collectorName })}</p>}
          {order.rejectionReason && <p className="wf-fineprint">{t('admin.fulfil.sampleRejected', { reason: order.rejectionReason })}</p>}

          <div className="wf-row-actions">
            {order.nextStates.length ? order.nextStates.map(next => (
              <button key={next} type="button" className={`health-button ${next === 'SAMPLE_REJECTED' ? '' : 'health-button-primary'}`}
                disabled={mutation.busy} style={{ minHeight: 44 }}
                aria-label={t('admin.fulfil.forOrder', { action: label(next), id: order.id.slice(0, 8) })}
                onClick={() => start(order, next)}>{label(next)}</button>
            )) : <span className="wf-fineprint">{t('admin.fulfil.released')}</span>}
          </div>
        </article>)}
      </div> : <EmptyState title={t('admin.fulfil.labEmpty')}
        description={t('admin.fulfil.labEmptyBody')} />}
    </DataState>

    {step && <ShopDialog title={label(step.next)} onClose={() => setStep(null)}>
      <form className="wf-form" onSubmit={event => {
        event.preventDefault();
        advance(step.order, step.next, { [LAB_PROMPT[step.next].field]: value });
      }}>
        <FormError message={mutation.error} />
        <p>{t(LAB_PROMPT[step.next].hint)}</p>
        <Field label={t(LAB_PROMPT[step.next].label)}>
          <input required minLength={1} maxLength={300} value={value} onChange={event => setValue(event.target.value)} />
        </Field>
        <button className="health-button health-button-primary" type="submit"
          disabled={mutation.busy || !value.trim()} style={{ minHeight: 44 }}>
          {mutation.busy ? t('admin.fulfil.saving') : t('admin.work.confirm')}
        </button>
      </form>
    </ShopDialog>}
  </>;
}

export function ProviderDirectoryPanel({ kind }: { kind: 'PHARMACY' | 'LAB' }) {
  const t = useT();
  const [pincode, setPincode] = useState('');
  const [submitted, setSubmitted] = useState('');
  const providers = useApiResource<{ items: Array<{
    id: string; legalName: string; address: string; pincode: string; openHours: string;
    licenceValid: boolean; accreditation: string; homeCollection: boolean; inPincode: boolean;
  }>; total: number; rankedBy: string }>(submitted ? `/providers/nearby?pincode=${submitted}&kind=${kind}` : null);

  return <section className="wf-card wf-section-gap">
    <div className="wf-panel-heading"><div>
      <span className="care-eyebrow">{kind === 'PHARMACY' ? t('admin.fulfil.nearbyPharmacies') : t('admin.fulfil.nearbyLabs')}</span>
      <h3 style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        {kind === 'PHARMACY' ? <Pill size={20} aria-hidden="true" /> : <FlaskConical size={20} aria-hidden="true" />}
        {t('admin.fulfil.findNear')}
      </h3>
    </div></div>
    <form className="wf-form" style={{ maxWidth: 360 }} onSubmit={event => { event.preventDefault(); setSubmitted(pincode); }}>
      <Field label={t('admin.fulfil.pincode')}>
        <input inputMode="numeric" pattern="[1-9][0-9]{5}" maxLength={6} value={pincode}
          onChange={event => setPincode(event.target.value.replace(/\D/g, ''))} placeholder="500001" />
      </Field>
      <button className="health-button health-button-primary" type="submit"
        disabled={!/^[1-9][0-9]{5}$/.test(pincode)} style={{ minHeight: 44 }}>
        <Package size={16} aria-hidden="true" />{t('admin.audit.search')}
      </button>
    </form>

    {submitted && <DataState {...providers} retry={providers.reload}>
      {providers.data?.items.length ? <>
        <div className="wf-order-list">
          {providers.data.items.map(provider => <div className="wf-order-line" key={provider.id}>
            <div>
              <strong>{provider.legalName}</strong>
              <small>{provider.address || provider.pincode}{provider.openHours ? ` · ${provider.openHours}` : ''}</small>
              <small>
                {provider.inPincode ? t('admin.fulfil.inPincode') : t('admin.fulfil.servesPincode')}
                {provider.accreditation ? ` · ${provider.accreditation}` : ''}
                {provider.homeCollection ? ` · ${t('admin.fulfil.homeLower')}` : ''}
              </small>
              {!provider.licenceValid && <small style={{ color: 'var(--attention)' }}>
                <AlertTriangle size={13} aria-hidden="true" /> {t('admin.fulfil.licence')}
              </small>}
            </div>
          </div>)}
        </div>
        {/* Stated plainly so a student can see the ordering is not bought. */}
        <p className="wf-fineprint">{t('admin.fulfil.rankedBy', { by: providers.data.rankedBy })}</p>
      </> : <EmptyState title={t('admin.fulfil.noneTitle')}
        description={t('admin.fulfil.noneBody')} />}
    </DataState>}
  </section>;
}
