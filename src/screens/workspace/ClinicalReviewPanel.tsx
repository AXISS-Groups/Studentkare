import React, { useState } from 'react';
import { AlertTriangle, Check, FlaskConical, Pill, X } from 'lucide-react';
import { useApiResource } from '../../hooks/useApiResource';
import { apiRequest } from '../../data/http';
import { displayDate } from '../../data/workflowTypes';
import { DataState, EmptyState, Field, FormError, useMutation } from '../../components/interface/WorkflowUI';
import { ShopDialog } from '../../components/marketplace/ShopDialog';
import '../../theme/workflows.css';

interface CriticalResult {
  id: string; testPanel: string[]; sampleId: string; criticalNote: string;
  waitingSeconds: number; updatedAt: number;
}
interface AwaitingCollection {
  id: string; testPanel: string[]; patientId: string; slotStart: string;
  overdueReason: string; waitingSeconds: number; status: string;
}
interface Substitution {
  id: string; dispenseId: string; prescriptionItemId: string;
  proposedGeneric: string; proposedBrand: string; reason: string; createdAt: number;
}

export function waited(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)} min`;
  // Days matter here: an uncollected sample can sit for a week, and "168 hr"
  // is a number a reader has to stop and divide.
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} hr ${Math.floor((seconds % 3600) / 60)} min`;
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  return `${days} day${days === 1 ? '' : 's'}${hours ? ` ${hours} hr` : ''}`;
}

/** Why a sample is still uncollected, in words a clinician can act on. */
export function overdueReason(reason: string): string {
  return reason === 'no_slot_recorded'
    ? 'No collection slot was recorded'
    : 'The booked collection slot has passed';
}

/** The clinician's decision queue: results nobody has read, and swaps awaiting an answer. */
export function ClinicalReviewPanel() {
  const critical = useApiResource<{ items: CriticalResult[]; total: number }>('/work/critical-results');
  const substitutions = useApiResource<{ items: Substitution[]; total: number }>('/work/substitutions');
  const uncollected = useApiResource<{ items: AwaitingCollection[]; total: number }>('/work/lab-orders/awaiting-collection');
  const mutation = useMutation();
  const [acknowledging, setAcknowledging] = useState<CriticalResult | null>(null);
  const [note, setNote] = useState('');

  const decide = (proposal: Substitution, approve: boolean) => mutation.run(
    () => apiRequest(`/substitutions/${proposal.id}/decide`, {
      method: 'POST', body: JSON.stringify({ approve, note: '' }),
    }),
    substitutions.reload,
  );

  return <>
    <div className="wf-panel-heading"><div>
      <span className="care-eyebrow">DECISIONS WAITING ON YOU</span>
      <h2>Clinical review queue.</h2>
      <p>Critical results that nobody has read yet, and pharmacy substitutions that need your answer.</p>
    </div></div>

    <FormError message={mutation.error} />

    {/* Critical results first: a flagged value nobody has seen is the actual risk. */}
    <section className="wf-card wf-section-gap" style={critical.data?.total ? { border: '2px solid var(--emergency)' } : undefined}>
      <div className="wf-panel-heading"><div>
        <span className="care-eyebrow" style={{ color: 'var(--emergency)' }}>CRITICAL RESULTS</span>
        <h3 style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <AlertTriangle size={20} aria-hidden="true" />Unacknowledged critical values
        </h3>
      </div></div>
      <DataState {...critical} retry={critical.reload}>
        {critical.data?.items.length ? <div className="wf-order-list" role="alert">
          {critical.data.items.map(result => <div className="wf-order-line" key={result.id}>
            <div>
              <strong>{result.testPanel.join(', ')}</strong>
              <small>Sample {result.sampleId} · reported {displayDate(new Date(result.updatedAt * 1000).toISOString())}</small>
              <small style={{ color: 'var(--emergency)' }}>{result.criticalNote}</small>
              <small>Waiting {waited(result.waitingSeconds)}</small>
            </div>
            <button className="health-button health-button-primary" style={{ minHeight: 44 }}
              aria-label={`Acknowledge critical result for ${result.testPanel.join(', ')}`}
              onClick={() => { setAcknowledging(result); setNote(''); }}>
              <Check size={16} aria-hidden="true" />Acknowledge
            </button>
          </div>)}
        </div> : <EmptyState title="No unread critical results."
          description="Flagged values appear here until a clinician records what was done about them." />}
      </DataState>
    </section>

    {uncollected.data?.total ? (
      <section className="wf-card wf-section-gap">
        <div className="wf-panel-heading"><div>
          <h3><FlaskConical size={20} aria-hidden="true" />Ordered, never collected</h3>
          <p>
            No sample has reached a lab for these. Until one does, no result is coming — and
            nothing in the system was waiting for it.
          </p>
        </div></div>
        <div className="wf-order-list">
          {uncollected.data.items.map(order => (
            <div className="wf-order-line" key={order.id}>
              <div>
                <strong>{order.testPanel.join(', ') || 'Lab order'}</strong>
                <small>{overdueReason(order.overdueReason)} · waiting {waited(order.waitingSeconds)}</small>
              </div>
              <span className="wf-status status-requested">{order.status.replace(/_/g, ' ')}</span>
            </div>
          ))}
        </div>
      </section>
    ) : null}

    <section className="wf-card">
      <div className="wf-panel-heading"><div>
        <span className="care-eyebrow">PHARMACY SUBSTITUTIONS</span>
        <h3 style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Pill size={20} aria-hidden="true" />Proposed swaps awaiting your decision
        </h3>
        <p>A pharmacy cannot substitute a prescribed medicine on its own.</p>
      </div></div>
      <DataState {...substitutions} retry={substitutions.reload}>
        {substitutions.data?.items.length ? <div className="wf-order-list">
          {substitutions.data.items.map(proposal => <div className="wf-order-line" key={proposal.id}>
            <div>
              <strong>{proposal.proposedGeneric}{proposal.proposedBrand ? ` (${proposal.proposedBrand})` : ''}</strong>
              <small>Reason given: {proposal.reason}</small>
              <small>Proposed {displayDate(new Date(proposal.createdAt * 1000).toISOString())}</small>
            </div>
            <div className="wf-row-actions">
              <button className="health-button health-button-primary" disabled={mutation.busy} style={{ minHeight: 44 }}
                aria-label={`Approve substitution to ${proposal.proposedGeneric}`}
                onClick={() => decide(proposal, true)}><Check size={16} aria-hidden="true" />Approve</button>
              <button className="health-button" disabled={mutation.busy} style={{ minHeight: 44 }}
                aria-label={`Refuse substitution to ${proposal.proposedGeneric}`}
                onClick={() => decide(proposal, false)}><X size={16} aria-hidden="true" />Refuse</button>
            </div>
          </div>)}
        </div> : <EmptyState title="No substitutions waiting."
          description="When a pharmacy proposes a swap on one of your prescriptions, it appears here." />}
      </DataState>
    </section>

    {acknowledging && <ShopDialog title="Acknowledge critical result" onClose={() => setAcknowledging(null)}>
      <form className="wf-form" onSubmit={event => {
        event.preventDefault();
        mutation.run(
          () => apiRequest(`/lab-orders/${acknowledging.id}/acknowledge-critical`, {
            method: 'POST', body: JSON.stringify({ note }),
          }),
          () => { setAcknowledging(null); setNote(''); critical.reload(); },
        );
      }}>
        <div className="wf-notice" role="status" style={{ marginBottom: 12 }}>
          <FlaskConical size={18} aria-hidden="true" />
          {acknowledging.testPanel.join(', ')} · {acknowledging.criticalNote}
        </div>
        <p>Record what was done. This is the evidence that the result was acted on, not just seen.</p>
        <FormError message={mutation.error} />
        <Field label="Action taken">
          <textarea required minLength={3} maxLength={500} rows={3} value={note}
            onChange={event => setNote(event.target.value)}
            placeholder="e.g. Called the student, advised immediate review at the campus clinic." />
        </Field>
        <button className="health-button health-button-primary" type="submit"
          disabled={mutation.busy || note.trim().length < 3} style={{ minHeight: 44 }}>
          {mutation.busy ? 'Saving…' : 'Acknowledge result'}
        </button>
      </form>
    </ShopDialog>}
  </>;
}
