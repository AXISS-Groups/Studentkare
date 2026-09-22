import React, { useState } from 'react';
import { AlertTriangle, FlaskConical, Package, Pill, ShieldCheck } from 'lucide-react';
import { useApiResource } from '../../hooks/useApiResource';
import { apiRequest } from '../../data/http';
import { displayDate } from '../../data/workflowTypes';
import { DataState, EmptyState, Field, FormError, useMutation } from '../../components/interface/WorkflowUI';
import { ShopDialog } from '../../components/marketplace/ShopDialog';
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
const DISPENSE_PROMPT: Record<string, { label: string; field: 'pharmacistName' | 'note'; hint: string }> = {
  RX_VERIFIED: { label: 'Verifying pharmacist', field: 'pharmacistName', hint: 'A dispense cannot be verified anonymously.' },
  REJECTED: { label: 'Reason for the patient', field: 'note', hint: 'The student is told exactly this.' },
};
const LAB_PROMPT: Record<string, { label: string; field: 'collectorName' | 'sampleId' | 'reportDocumentId' | 'rejectionReason'; hint: string }> = {
  ASSIGNED: { label: 'Assigned collector', field: 'collectorName', hint: 'The student is told who is coming.' },
  SAMPLE_COLLECTED: { label: 'Sample identifier', field: 'sampleId', hint: 'Starts the chain of custody.' },
  REPORT_READY: { label: 'Report document id', field: 'reportDocumentId', hint: 'Must be a document in this student’s own vault.' },
  SAMPLE_REJECTED: { label: 'Why the sample failed', field: 'rejectionReason', hint: 'The student is being asked for another sample.' },
};

function label(status: string): string {
  return status.replace(/_/g, ' ').toLowerCase().replace(/^./, character => character.toUpperCase());
}

export function PharmacyQueuePanel() {
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
      <span className="care-eyebrow">PRESCRIPTIONS SENT TO YOU</span>
      <h2>Dispensing queue.</h2>
      <p>Every prescription here was issued by a registered clinician. Verify it before anything else — a dispense cannot move past verification without a named pharmacist.</p>
    </div>
      <Field label="Status">
        <select value={status} onChange={event => setStatus(event.target.value)}>
          <option value="">All</option>
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
              <span className="care-eyebrow">DISPENSE {dispense.id.slice(0, 8).toUpperCase()}</span>
              <h3 style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Pill size={18} aria-hidden="true" />
                {dispense.prescription?.items.length ?? 0} item(s)
              </h3>
              <p>Received {displayDate(new Date(dispense.createdAt * 1000).toISOString())}
                {dispense.prescription?.prescriberRegNo ? ` · prescriber ${dispense.prescription.prescriberRegNo}` : ''}</p>
            </div>
            <span className={`wf-status status-${dispense.status === 'REJECTED' ? 'declined' : 'accepted'}`}>
              {label(dispense.status)}
            </span>
          </div>

          {dispense.prescription?.items.length ? <div className="wf-table-scroll">
            <table>
              <thead><tr><th>Medicine</th><th>Dose</th><th>Qty</th><th>Schedule</th><th>Substitution</th></tr></thead>
              <tbody>
                {dispense.prescription.items.map(item => <tr key={item.id}>
                  <td>{item.genericName} {item.strength}</td>
                  <td>{item.dose} {item.frequency}</td>
                  <td>{item.quantity}</td>
                  <td>{item.scheduleClass}{item.registerRequired ? ' · register' : ''}</td>
                  <td>{item.substitutionAllowed ? 'Allowed' : 'Not allowed'}</td>
                </tr>)}
              </tbody>
            </table>
          </div> : null}

          {dispense.verifiedBy && <p className="wf-fineprint">
            <ShieldCheck size={14} aria-hidden="true" /> Verified by {dispense.verifiedBy}
          </p>}
          {dispense.substitutionNote && <div className="wf-notice" role="status">
            Substitution proposed: {dispense.substitutionNote} — waiting on the prescriber.
          </div>}
          {dispense.rejectionReason && <p className="wf-fineprint">Rejected: {dispense.rejectionReason}</p>}

          <div className="wf-row-actions">
            {dispense.nextStates.length ? dispense.nextStates.map(next => (
              <button key={next} className={`health-button ${next === 'RX_VERIFIED' ? 'health-button-primary' : ''}`}
                disabled={mutation.busy} style={{ minHeight: 44 }}
                aria-label={`${label(next)} for dispense ${dispense.id.slice(0, 8)}`}
                onClick={() => start(dispense, next)}>{label(next)}</button>
            )) : <span className="wf-fineprint">No further action.</span>}
          </div>
        </article>)}
      </div> : <EmptyState title="Nothing to dispense."
        description="Prescriptions a student sends to your pharmacy appear here." />}
    </DataState>

    {step && <ShopDialog title={label(step.next)} onClose={() => setStep(null)}>
      <form className="wf-form" onSubmit={event => {
        event.preventDefault();
        advance(step.dispense, step.next, { [DISPENSE_PROMPT[step.next].field]: value });
      }}>
        <FormError message={mutation.error} />
        <p>{DISPENSE_PROMPT[step.next].hint}</p>
        <Field label={DISPENSE_PROMPT[step.next].label}>
          <input required minLength={2} maxLength={300} value={value} onChange={event => setValue(event.target.value)} />
        </Field>
        <button className="health-button health-button-primary" type="submit"
          disabled={mutation.busy || value.trim().length < 2} style={{ minHeight: 44 }}>
          {mutation.busy ? 'Saving…' : 'Confirm'}
        </button>
      </form>
    </ShopDialog>}
  </>;
}

export function LabQueuePanel() {
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
      <span className="care-eyebrow">SAMPLES AND REPORTS</span>
      <h2>Diagnostic queue.</h2>
      <p>A sample is collected, transported, analysed and only then released. If a sample cannot be used, reject it and request a recollection rather than reporting on it.</p>
    </div></div>

    <FormError message={mutation.error} />

    <DataState {...queue} retry={queue.reload}>
      {queue.data?.critical ? <div className="wf-notice" role="alert" style={{ marginBottom: 14, borderColor: 'var(--emergency)' }}>
        <AlertTriangle size={18} aria-hidden="true" />
        {queue.data.critical} result(s) flagged critical — a clinician is being asked to acknowledge them.
      </div> : null}

      {queue.data?.items.length ? <div className="wf-order-list">
        {queue.data.items.map(order => <article className="wf-card" key={order.id}
          style={order.criticalFlag ? { border: '2px solid var(--emergency)' } : undefined}>
          <div className="wf-panel-heading">
            <div>
              <span className="care-eyebrow">ORDER {order.id.slice(0, 8).toUpperCase()}</span>
              <h3 style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <FlaskConical size={18} aria-hidden="true" />{order.testPanel.join(', ')}
              </h3>
              <p>
                {order.collectionMode === 'HOME' ? 'Home collection' : 'Walk-in'}
                {order.fastingRequired ? ' · fasting required' : ''}
                {order.slotStart ? ` · ${order.slotStart}` : ''}
                {order.sampleId ? ` · sample ${order.sampleId}` : ''}
              </p>
            </div>
            <span className={`wf-status status-${order.criticalFlag ? 'declined' : 'accepted'}`}>{label(order.status)}</span>
          </div>

          {order.collectorName && <p className="wf-fineprint">Collector: {order.collectorName}</p>}
          {order.rejectionReason && <p className="wf-fineprint">Sample rejected: {order.rejectionReason}</p>}

          <div className="wf-row-actions">
            {order.nextStates.length ? order.nextStates.map(next => (
              <button key={next} className={`health-button ${next === 'SAMPLE_REJECTED' ? '' : 'health-button-primary'}`}
                disabled={mutation.busy} style={{ minHeight: 44 }}
                aria-label={`${label(next)} for order ${order.id.slice(0, 8)}`}
                onClick={() => start(order, next)}>{label(next)}</button>
            )) : <span className="wf-fineprint">Released. No further action.</span>}
          </div>
        </article>)}
      </div> : <EmptyState title="No bookings yet."
        description="Tests a student books with your laboratory appear here." />}
    </DataState>

    {step && <ShopDialog title={label(step.next)} onClose={() => setStep(null)}>
      <form className="wf-form" onSubmit={event => {
        event.preventDefault();
        advance(step.order, step.next, { [LAB_PROMPT[step.next].field]: value });
      }}>
        <FormError message={mutation.error} />
        <p>{LAB_PROMPT[step.next].hint}</p>
        <Field label={LAB_PROMPT[step.next].label}>
          <input required minLength={1} maxLength={300} value={value} onChange={event => setValue(event.target.value)} />
        </Field>
        <button className="health-button health-button-primary" type="submit"
          disabled={mutation.busy || !value.trim()} style={{ minHeight: 44 }}>
          {mutation.busy ? 'Saving…' : 'Confirm'}
        </button>
      </form>
    </ShopDialog>}
  </>;
}

export function ProviderDirectoryPanel({ kind }: { kind: 'PHARMACY' | 'LAB' }) {
  const [pincode, setPincode] = useState('');
  const [submitted, setSubmitted] = useState('');
  const providers = useApiResource<{ items: Array<{
    id: string; legalName: string; address: string; pincode: string; openHours: string;
    licenceValid: boolean; accreditation: string; homeCollection: boolean; inPincode: boolean;
  }>; total: number; rankedBy: string }>(submitted ? `/providers/nearby?pincode=${submitted}&kind=${kind}` : null);

  return <section className="wf-card wf-section-gap">
    <div className="wf-panel-heading"><div>
      <span className="care-eyebrow">{kind === 'PHARMACY' ? 'NEARBY PHARMACIES' : 'NEARBY LABORATORIES'}</span>
      <h3 style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        {kind === 'PHARMACY' ? <Pill size={20} aria-hidden="true" /> : <FlaskConical size={20} aria-hidden="true" />}
        Find one near you
      </h3>
    </div></div>
    <form className="wf-form" style={{ maxWidth: 360 }} onSubmit={event => { event.preventDefault(); setSubmitted(pincode); }}>
      <Field label="Your pincode">
        <input inputMode="numeric" pattern="[1-9][0-9]{5}" maxLength={6} value={pincode}
          onChange={event => setPincode(event.target.value.replace(/\D/g, ''))} placeholder="500001" />
      </Field>
      <button className="health-button health-button-primary" type="submit"
        disabled={!/^[1-9][0-9]{5}$/.test(pincode)} style={{ minHeight: 44 }}>
        <Package size={16} aria-hidden="true" />Search
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
                {provider.inPincode ? 'In your pincode' : 'Serves your pincode'}
                {provider.accreditation ? ` · ${provider.accreditation}` : ''}
                {provider.homeCollection ? ' · home collection' : ''}
              </small>
              {!provider.licenceValid && <small style={{ color: 'var(--attention)' }}>
                <AlertTriangle size={13} aria-hidden="true" /> Licence not currently verified
              </small>}
            </div>
          </div>)}
        </div>
        {/* Stated plainly so a student can see the ordering is not bought. */}
        <p className="wf-fineprint">Ordered by {providers.data.rankedBy}.</p>
      </> : <EmptyState title="Nothing serving that pincode yet."
        description="No verified provider covers this area. Try a nearby pincode." />}
    </DataState>}
  </section>;
}
