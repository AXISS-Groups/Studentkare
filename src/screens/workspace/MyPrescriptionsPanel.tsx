import React, { useState } from 'react';
import { CalendarDays, FlaskConical, Pill, Send } from 'lucide-react';
import { useApiResource } from '../../hooks/api/useApiResource';
import { apiRequest } from '../../data/services/http';
import { displayDate } from '../../data/types/workflowTypes';
import { DataState, EmptyState, Field, FormError, useMutation } from '../../components/interface/WorkflowUI';
import { ShopDialog } from '../../components/marketplace/ShopDialog';
import { LabSlotPickerModal } from '../../components/health/LabSlotPickerModal';
import { Icon } from '../../design-system/icons';
import { ProviderDirectoryPanel } from './FulfilmentQueuePanel';
import { useT, type MessageKey, type Vars } from '@/i18n';
import { navigate } from '../../lib/utils/workflowRouting';
import '../../theme/workflows.css';
import { awaitsLabPayment } from '@/features/labBooking/views/labPaymentState';

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
  rejectionReason: string; createdAt: number; reviewNote: string;
  /** The chosen collection time (ISO), or empty when none has been chosen. */
  slotStart?: string;
  /** The ordering doctor's name; empty for a test the student booked themselves. */
  orderedByDoctor?: string;
  /** A self-booked test's payment (null for a doctor-ordered one). */
  paymentStatus?: string | null;
}

const LAB_PROGRESS = ['BOOKED', 'ASSIGNED', 'SAMPLE_COLLECTED', 'RECEIVED_AT_LAB', 'IN_ANALYSIS', 'REPORT_READY', 'REPORT_RELEASED'];
/** Statuses with a translation. Anything else the server sends is shown readably, in English. */
const TRANSLATED_STATUS = new Set(['ISSUED', ...LAB_PROGRESS]);

function label(status: string, t: (key: MessageKey, vars?: Vars) => string): string {
  if (TRANSLATED_STATUS.has(status)) return t(`care.rx.status.${status}` as MessageKey);
  return status.replace(/_/g, ' ').toLowerCase().replace(/^./, character => character.toUpperCase());
}

/** What the student sees: their prescriptions, where to fill them, and test progress. */
export function MyPrescriptionsPanel() {
  const t = useT();
  const prescriptions = useApiResource<{ items: Prescription[]; total: number }>('/prescriptions?limit=20');
  const labOrders = useApiResource<{ items: LabOrder[]; total: number }>('/lab-orders?limit=20');
  const mutation = useMutation();
  const [sending, setSending] = useState<Prescription | null>(null);
  const [pharmacyId, setPharmacyId] = useState('');
  /** A doctor-ordered test whose collection time the student is choosing. */
  const [scheduling, setScheduling] = useState<LabOrder | null>(null);

  const expired = (prescription: Prescription) => prescription.validUntil > 0 && prescription.validUntil * 1000 < Date.now();

  return <>
    <div className="wf-panel-heading"><div>
      <span className="care-eyebrow">{t('care.rx.eyebrow')}</span>
      <h2>{t('care.rx.title')}</h2>
      <p>{t('care.rx.intro')}</p>
    </div><button type="button" className="health-button" style={{ minHeight: 44 }} onClick={() => navigate('visit-summaries')}>{t('care.visit.listTitle')}</button></div>

    <FormError message={mutation.error} />

    <DataState {...prescriptions} retry={prescriptions.reload}>
      {prescriptions.data?.items.length ? <div className="wf-order-list">
        {prescriptions.data.items.map(prescription => <article className="wf-card" key={prescription.id}>
          <div className="wf-panel-heading">
            <div>
              <span className="care-eyebrow">{t('care.rx.ref', { ref: prescription.id.slice(0, 8).toUpperCase() })}</span>
              <h3 style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Pill size={18} aria-hidden="true" />{t('care.rx.medicineCount', { count: prescription.items.length })}
              </h3>
              <p>
                {t('care.rx.issued', { date: displayDate(new Date(prescription.issuedAt * 1000).toISOString()) })}
                {prescription.prescriberRegNo ? ` · ${t('care.rx.reg', { reg: prescription.prescriberRegNo })}` : ''}
                {prescription.validUntil ? ` · ${t('care.rx.validUntil', { date: displayDate(new Date(prescription.validUntil * 1000).toISOString()) })}` : ''}
              </p>
            </div>
            <span className={`wf-status status-${expired(prescription) ? 'declined' : 'accepted'}`}>
              {expired(prescription) ? t('care.rx.expired') : label(prescription.status, t)}
            </span>
          </div>

          <div className="wf-table-scroll">
            <table>
              <thead><tr><th>{t('care.rx.col.medicine')}</th><th>{t('care.rx.col.dose')}</th><th>{t('care.rx.col.howOften')}</th><th>{t('care.rx.col.days')}</th><th>{t('care.rx.col.qty')}</th></tr></thead>
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

          {prescription.advice && <p className="wf-fineprint">{t('care.rx.advice', { advice: prescription.advice })}</p>}

          {/* Surfaced to the student too — they should know an allergy was flagged. */}
          {prescription.allergyCheck?.conflicts?.length ? <div className="wf-notice" role="status"
            style={{ borderColor: 'var(--sk-color-attention)' }}>
            {t('care.rx.allergy', { substances: prescription.allergyCheck.conflicts.map(conflict => conflict.substance).join(', ') })}
          </div> : null}

          <div className="wf-row-actions">
            <button type="button" className="health-button health-button-primary" style={{ minHeight: 44 }}
              disabled={expired(prescription)}
              aria-label={t('care.rx.sendSpoken', { ref: prescription.id.slice(0, 8) })}
              onClick={() => { setSending(prescription); setPharmacyId(''); }}>
              <Send size={16} aria-hidden="true" />{t('care.rx.send')}
            </button>
          </div>
        </article>)}
      </div> : <EmptyState title={t('care.rx.emptyTitle')}
        description={t('care.rx.emptyBody')} />}
    </DataState>

    <ProviderDirectoryPanel kind="PHARMACY" />

    <div className="wf-panel-heading wf-section-gap"><div>
      <span className="care-eyebrow">{t('care.rx.testsEyebrow')}</span>
      <h2 style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <FlaskConical size={20} aria-hidden="true" />{t('care.rx.labTitle')}
      </h2>
    </div></div>

    <DataState {...labOrders} retry={labOrders.reload}>
      {labOrders.data?.items.length ? <div className="wf-order-list">
        {labOrders.data.items.map(order => {
          const unpaid = awaitsLabPayment(order);
          const status = unpaid ? t('care.rx.status.AWAITING_PAYMENT') : label(order.status, t);
          const stage = unpaid ? -1 : LAB_PROGRESS.indexOf(order.status);
          return <article className="wf-card" key={order.id}>
            <div className="wf-panel-heading">
              <div>
                <span className="care-eyebrow">{t('care.rx.bookingRef', { ref: order.id.slice(0, 8).toUpperCase() })}</span>
                <h3>{order.testPanel.join(', ')}</h3>
                <p>
                  {t('care.rx.booked', { date: displayDate(new Date(order.createdAt * 1000).toISOString()) })}
                  {order.orderedByDoctor ? ` · ${t('care.rx.orderedBy', { name: order.orderedByDoctor })}` : ''}
                  {order.fastingRequired ? ` · ${t('care.rx.fasting')}` : ''}
                  {order.collectorName ? ` · ${t('care.rx.collector', { name: order.collectorName })}` : ''}
                </p>
                {order.slotStart ? <p>{t('care.rx.slot', { time: displayDate(order.slotStart) })}</p> : null}
              </div>
              <span className={`wf-status ${unpaid ? 'status-requested' : 'status-accepted'}`}>{status}</span>
            </div>
            {unpaid ? <p className="wf-fineprint">{t('care.rx.awaitingPayment')}</p> : null}
            {stage >= 0 && <progress max={LAB_PROGRESS.length - 1} value={stage}
              aria-label={t('care.rx.progress', { status })} />}
            {order.orderedByDoctor && order.status === 'BOOKED' && <div className="wf-row-actions">
              <button type="button" className={`health-button ${order.slotStart ? '' : 'health-button-primary'}`} style={{ minHeight: 44 }}
                aria-label={t(order.slotStart ? 'care.rx.changeTimeSpoken' : 'care.rx.chooseTimeSpoken', { test: order.testPanel.join(', ') })}
                onClick={() => setScheduling(order)}>
                <Icon name="calendar" size={16} />{order.slotStart ? t('care.rx.changeTime') : t('care.rx.chooseTime')}
              </button>
            </div>}
            {order.rejectionReason && <div className="wf-notice" role="status">
              {t('care.rx.sampleRejected', { reason: order.rejectionReason })}
            </div>}
            {order.status === 'REPORT_READY' && <p className="wf-fineprint">{t('care.rx.awaitingReview')}</p>}
            {order.status === 'REPORT_RELEASED' && <p className="wf-fineprint">
              <CalendarDays size={14} aria-hidden="true" /> {t('care.rx.reportReleased')}
            </p>}
            {order.status === 'REPORT_RELEASED' && order.reviewNote && <div className="wf-notice" role="note">
              {t('care.rx.reviewNote', { note: order.reviewNote })}
            </div>}
          </article>;
        })}
      </div> : <EmptyState title={t('care.rx.testsEmptyTitle')}
        description={t('care.rx.testsEmptyBody')} />}
    </DataState>

    <ProviderDirectoryPanel kind="LAB" />

    {scheduling && <LabSlotPickerModal
      isOpen
      testName={scheduling.testPanel.join(', ')}
      catalogItemId=""
      labOrder={{ id: scheduling.id, fastingRequired: scheduling.fastingRequired }}
      onSlotChosen={labOrders.reload}
      onClose={() => { setScheduling(null); labOrders.reload(); }}
    />}

    {sending && <ShopDialog title={t('care.rx.send')} onClose={() => setSending(null)}>
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
        <p>{t('care.rx.sendIntro')}</p>
        <Field label={t('care.rx.pharmacyId')}>
          <input required maxLength={80} value={pharmacyId} onChange={event => setPharmacyId(event.target.value)} />
        </Field>
        <button className="health-button health-button-primary" type="submit"
          disabled={mutation.busy || !pharmacyId.trim()} style={{ minHeight: 44 }}>
          {mutation.busy ? t('care.rx.sending') : t('care.rx.sendPrescription')}
        </button>
      </form>
    </ShopDialog>}
  </>;
}
