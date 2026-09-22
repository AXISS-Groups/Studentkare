import React, { useState } from 'react';
import { CalendarDays, FlaskConical, Pill, Send } from 'lucide-react';
import { useApiResource } from '../../hooks/useApiResource';
import { apiRequest } from '../../data/http';
import { displayDate } from '../../data/workflowTypes';
import { DataState, EmptyState, Field, FormError, useMutation } from '../../components/interface/WorkflowUI';
import { ShopDialog } from '../../components/marketplace/ShopDialog';
import { ProviderDirectoryPanel } from './FulfilmentQueuePanel';
import '../../theme/workflows.css';

interface PrescriptionItem {
  id: string; genericName: string; brandName: string; strength: string; dose: string;
  frequency: string; durationDays: number; quantity: number; scheduleClass: string;
}
interface Prescription {
  id: string; issuedAt: number; validUntil: number; status: string; advice: string;
  prescriberRegNo: string; items: PrescriptionItem[];
  allergyCheck: { conflicts?: Array<{ substance: string; flag: string }>; acknowledged?: boolean };
}
interface LabOrder {
  id: string; testPanel: string[]; status: string; sampleId: string; collectorName: string;
  fastingRequired: boolean; collectionMode: string; criticalFlag: boolean;
  rejectionReason: string; createdAt: number;
}

const LAB_PROGRESS = ['BOOKED', 'ASSIGNED', 'SAMPLE_COLLECTED', 'RECEIVED_AT_LAB', 'IN_ANALYSIS', 'REPORT_READY', 'REPORT_RELEASED'];

function label(status: string): string {
  return status.replace(/_/g, ' ').toLowerCase().replace(/^./, character => character.toUpperCase());
}

/** What the student sees: their prescriptions, where to fill them, and test progress. */
export function MyPrescriptionsPanel() {
  const prescriptions = useApiResource<{ items: Prescription[]; total: number }>('/prescriptions?limit=20');
  const labOrders = useApiResource<{ items: LabOrder[]; total: number }>('/lab-orders?limit=20');
  const mutation = useMutation();
  const [sending, setSending] = useState<Prescription | null>(null);
  const [pharmacyId, setPharmacyId] = useState('');

  const expired = (prescription: Prescription) => prescription.validUntil > 0 && prescription.validUntil * 1000 < Date.now();

  return <>
    <div className="wf-panel-heading"><div>
      <span className="care-eyebrow">YOUR MEDICINES AND TESTS</span>
      <h2>Prescriptions & lab tests.</h2>
      <p>Prescriptions your clinician issued, and the tests you have booked. Send a prescription to a pharmacy when you are ready.</p>
    </div></div>

    <FormError message={mutation.error} />

    <DataState {...prescriptions} retry={prescriptions.reload}>
      {prescriptions.data?.items.length ? <div className="wf-order-list">
        {prescriptions.data.items.map(prescription => <article className="wf-card" key={prescription.id}>
          <div className="wf-panel-heading">
            <div>
              <span className="care-eyebrow">PRESCRIPTION {prescription.id.slice(0, 8).toUpperCase()}</span>
              <h3 style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Pill size={18} aria-hidden="true" />{prescription.items.length} medicine(s)
              </h3>
              <p>
                Issued {displayDate(new Date(prescription.issuedAt * 1000).toISOString())}
                {prescription.prescriberRegNo ? ` · reg. ${prescription.prescriberRegNo}` : ''}
                {prescription.validUntil ? ` · valid until ${displayDate(new Date(prescription.validUntil * 1000).toISOString())}` : ''}
              </p>
            </div>
            <span className={`wf-status status-${expired(prescription) ? 'declined' : 'accepted'}`}>
              {expired(prescription) ? 'Expired' : label(prescription.status)}
            </span>
          </div>

          <div className="wf-table-scroll">
            <table>
              <thead><tr><th>Medicine</th><th>Dose</th><th>How often</th><th>Days</th><th>Qty</th></tr></thead>
              <tbody>
                {prescription.items.map(item => <tr key={item.id}>
                  <td>{item.genericName}{item.brandName ? ` (${item.brandName})` : ''} {item.strength}</td>
                  <td>{item.dose || '—'}</td>
                  <td>{item.frequency || '—'}</td>
                  <td>{item.durationDays || '—'}</td>
                  <td>{item.quantity}</td>
                </tr>)}
              </tbody>
            </table>
          </div>

          {prescription.advice && <p className="wf-fineprint">Advice: {prescription.advice}</p>}

          {/* Surfaced to the student too — they should know an allergy was flagged. */}
          {prescription.allergyCheck?.conflicts?.length ? <div className="wf-notice" role="status"
            style={{ borderColor: 'var(--attention)' }}>
            Your clinician prescribed this despite an allergy recorded on your profile
            ({prescription.allergyCheck.conflicts.map(conflict => conflict.substance).join(', ')}).
            Ask them about it if you are unsure.
          </div> : null}

          <div className="wf-row-actions">
            <button className="health-button health-button-primary" style={{ minHeight: 44 }}
              disabled={expired(prescription)}
              aria-label={`Send prescription ${prescription.id.slice(0, 8)} to a pharmacy`}
              onClick={() => { setSending(prescription); setPharmacyId(''); }}>
              <Send size={16} aria-hidden="true" />Send to a pharmacy
            </button>
          </div>
        </article>)}
      </div> : <EmptyState title="No prescriptions yet."
        description="Prescriptions issued during a consultation appear here." />}
    </DataState>

    <ProviderDirectoryPanel kind="PHARMACY" />

    <div className="wf-panel-heading wf-section-gap"><div>
      <span className="care-eyebrow">YOUR TESTS</span>
      <h2 style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <FlaskConical size={20} aria-hidden="true" />Lab bookings
      </h2>
    </div></div>

    <DataState {...labOrders} retry={labOrders.reload}>
      {labOrders.data?.items.length ? <div className="wf-order-list">
        {labOrders.data.items.map(order => {
          const stage = LAB_PROGRESS.indexOf(order.status);
          return <article className="wf-card" key={order.id}>
            <div className="wf-panel-heading">
              <div>
                <span className="care-eyebrow">BOOKING {order.id.slice(0, 8).toUpperCase()}</span>
                <h3>{order.testPanel.join(', ')}</h3>
                <p>
                  Booked {displayDate(new Date(order.createdAt * 1000).toISOString())}
                  {order.fastingRequired ? ' · fasting required' : ''}
                  {order.collectorName ? ` · collector ${order.collectorName}` : ''}
                </p>
              </div>
              <span className="wf-status status-accepted">{label(order.status)}</span>
            </div>
            {stage >= 0 && <progress max={LAB_PROGRESS.length - 1} value={stage}
              aria-label={`Progress: ${label(order.status)}`} />}
            {order.rejectionReason && <div className="wf-notice" role="status">
              Your sample could not be used ({order.rejectionReason}). The laboratory will arrange a new collection.
            </div>}
            {order.status === 'REPORT_RELEASED' && <p className="wf-fineprint">
              <CalendarDays size={14} aria-hidden="true" /> Your report is in your health vault.
            </p>}
          </article>;
        })}
      </div> : <EmptyState title="No tests booked."
        description="Tests you book with a partner laboratory appear here with their progress." />}
    </DataState>

    <ProviderDirectoryPanel kind="LAB" />

    {sending && <ShopDialog title="Send to a pharmacy" onClose={() => setSending(null)}>
      <form className="wf-form" onSubmit={event => {
        event.preventDefault();
        mutation.run(
          () => apiRequest('/dispenses', {
            method: 'POST',
            body: JSON.stringify({ prescriptionId: sending.id, pharmacyId }),
          }),
          () => { setSending(null); setPharmacyId(''); prescriptions.reload(); },
        );
      }}>
        <FormError message={mutation.error} />
        <p>Find a pharmacy in the directory above, then paste its identifier here. A pharmacist verifies every prescription before dispensing.</p>
        <Field label="Pharmacy identifier">
          <input required maxLength={80} value={pharmacyId} onChange={event => setPharmacyId(event.target.value)} />
        </Field>
        <button className="health-button health-button-primary" type="submit"
          disabled={mutation.busy || !pharmacyId.trim()} style={{ minHeight: 44 }}>
          {mutation.busy ? 'Sending…' : 'Send prescription'}
        </button>
      </form>
    </ShopDialog>}
  </>;
}
