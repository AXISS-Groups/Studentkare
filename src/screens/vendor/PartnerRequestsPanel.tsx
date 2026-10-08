import React, { useState } from 'react';
import { useApiResource } from '../../hooks/useApiResource';
import { apiRequest } from '../../data/http';
import { apiBaseUrl } from '../../core/env';
import { DataState, EmptyState, Field, FormError, SubmitButton, useMutation } from '../../components/interface/WorkflowUI';
import { ShopDialog } from '../../components/marketplace/ShopDialog';

/**
 * Partner returns, hostel visits and refills (design page 6: VendorReturns,
 * VendorHome queues; Tier 3, data model approved). The server limits each list
 * to this partner. Approving a return records the refund amount; the money is
 * arranged by the partner — Studentkare doesn't move it, and the student is told so.
 */

interface ReturnRow { id: string; item: string; student: string; reason: string; note: string | null; hasPhoto: boolean; status: string; refundPaise: number | null; decisionNote: string | null; createdAt: number }
interface VisitRow { id: string; service: string; hostelBlock: string; room: string; windowStart: number; windowEnd: number; note: string | null; status: string; mine: boolean }
interface RefillRow { id: string; medicine: string; dosage: string; student: string; quantity: number; note: string | null; status: string }

const REASON: Record<string, string> = { WRONG_ITEM: 'Wrong item', DAMAGED: 'Damaged', NOT_NEEDED: 'Not needed', OTHER: 'Other' };
const dt = (s: number) => new Date(s * 1000).toLocaleString(undefined, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

export function PartnerRequestsPanel() {
  const returns = useApiResource<{ items: ReturnRow[] }>('/work/returns');
  const visits = useApiResource<{ items: VisitRow[] }>('/work/hostel-visits');
  const refills = useApiResource<{ items: RefillRow[] }>('/work/refills');
  const mutation = useMutation();
  const [deciding, setDeciding] = useState<{ row: ReturnRow; decision: 'APPROVED' | 'DECLINED' } | null>(null);
  const [refund, setRefund] = useState('');
  const [note, setNote] = useState('');
  const act = (path: string, body: object, reload: () => void) => mutation.run(() => apiRequest(path, { method: 'POST', body: JSON.stringify(body) }), reload);
  const [declining, setDeclining] = useState<{ path: string; reload: () => void; title: string } | null>(null);
  const [reason, setReason] = useState('');
  const declineWithReason = (path: string, reload: () => void, title: string) => { setDeclining({ path, reload, title }); setReason(''); };

  return <>
    <div className="wf-panel-heading"><div>
      <span className="care-eyebrow">STUDENT REQUESTS</span>
      <h2>Returns, hostel visits & refills.</h2>
      <p>Only requests that involve you are listed. Students are notified of every decision.</p>
    </div></div>
    <FormError message={mutation.error} />

    <section className="wf-card wf-section-gap" aria-labelledby="pr-returns"><h3 id="pr-returns">Returns</h3>
      <DataState {...returns} retry={returns.reload}>{returns.data?.items.length ? <div className="wf-order-list">{returns.data.items.map(r => <div className="wf-order-line" key={r.id}>
        <div><strong>{r.item} · {REASON[r.reason] ?? r.reason}</strong><small>{r.student} · {dt(r.createdAt)} · {r.status.replace('_', ' ').toLowerCase()}{r.note ? ` · “${r.note}”` : ''}{r.refundPaise ? ` · refund ₹${(r.refundPaise / 100).toFixed(2)} to arrange` : ''}</small>
          {r.hasPhoto && <a className="health-text-button" href={`${apiBaseUrl()}/work/returns/${r.id}/photo`} target="_blank" rel="noreferrer">View photo</a>}</div>
        <div className="wf-row-actions">
          {r.status === 'REQUESTED' && <><button type="button" className="health-button health-button-primary" onClick={() => { setDeciding({ row: r, decision: 'APPROVED' }); setRefund(''); setNote(''); }}>Approve</button>
            <button type="button" className="health-button" onClick={() => { setDeciding({ row: r, decision: 'DECLINED' }); setNote(''); }}>Decline</button></>}
          {r.status === 'APPROVED' && <button type="button" className="health-button" disabled={mutation.busy} onClick={() => act(`/work/returns/${r.id}/picked-up`, {}, returns.reload)}>Mark picked up</button>}
        </div></div>)}</div> : <EmptyState title="No returns." description="Returns for items you supplied appear here." />}</DataState>
    </section>

    <section className="wf-card wf-section-gap" aria-labelledby="pr-visits"><h3 id="pr-visits">Hostel room visits</h3>
      <DataState {...visits} retry={visits.reload}>{visits.data?.items.length ? <div className="wf-order-list">{visits.data.items.map(v => <div className="wf-order-line" key={v.id}>
        <div><strong>{v.service === 'LAB_PICKUP' ? 'Lab sample pickup' : 'Nurse visit'} · {v.hostelBlock}, room {v.room}</strong><small>{dt(v.windowStart)} – {dt(v.windowEnd)} · {v.status.toLowerCase()}{v.note ? ` · “${v.note}”` : ''}</small></div>
        <div className="wf-row-actions">
          {v.status === 'REQUESTED' && <button type="button" className="health-button health-button-primary" disabled={mutation.busy} onClick={() => act(`/work/hostel-visits/${v.id}`, { action: 'CLAIM' }, visits.reload)}>Take this visit</button>}
          {v.status === 'ASSIGNED' && v.mine && <><button type="button" className="health-button" disabled={mutation.busy} onClick={() => act(`/work/hostel-visits/${v.id}`, { action: 'COMPLETE' }, visits.reload)}>Done</button>
            <button type="button" className="health-button" disabled={mutation.busy} onClick={() => declineWithReason(`/work/hostel-visits/${v.id}`, visits.reload, 'Can’t make this visit')}>Can't go</button></>}
        </div></div>)}</div> : <EmptyState title="No hostel visits." description="Open requests from students appear here for any partner to take." />}</DataState>
    </section>

    <section className="wf-card wf-section-gap" aria-labelledby="pr-refills"><h3 id="pr-refills">Refills</h3>
      <DataState {...refills} retry={refills.reload}>{refills.data?.items.length ? <div className="wf-order-list">{refills.data.items.map(r => <div className="wf-order-line" key={r.id}>
        <div><strong>{r.medicine}{r.dosage ? ` · ${r.dosage}` : ''} × {r.quantity}</strong><small>{r.student} · {r.status.toLowerCase()}{r.note ? ` · “${r.note}”` : ''}</small></div>
        <div className="wf-row-actions">
          {r.status === 'REQUESTED' && <button type="button" className="health-button health-button-primary" disabled={mutation.busy} onClick={() => act(`/work/refills/${r.id}`, { action: 'ACCEPT' }, refills.reload)}>Accept</button>}
          {r.status === 'ACCEPTED' && <button type="button" className="health-button" disabled={mutation.busy} onClick={() => act(`/work/refills/${r.id}`, { action: 'READY' }, refills.reload)}>Ready to collect</button>}
          {(r.status === 'REQUESTED' || r.status === 'ACCEPTED') && <button type="button" className="health-button" disabled={mutation.busy} onClick={() => declineWithReason(`/work/refills/${r.id}`, refills.reload, 'Decline this refill')}>Decline</button>}
        </div></div>)}</div> : <EmptyState title="No refills." description="Refill requests sent to you appear here." />}</DataState>
    </section>

    {declining && <ShopDialog title={declining.title} onClose={() => setDeclining(null)}>
      <form className="wf-form" onSubmit={e => { e.preventDefault(); mutation.run(() => apiRequest(declining.path, { method: 'POST', body: JSON.stringify({ action: 'DECLINE', note: reason }) }), () => { setDeclining(null); declining.reload(); }); }}>
        <FormError message={mutation.error} />
        <Field label="Why (the student sees this)"><textarea required minLength={3} maxLength={500} rows={3} value={reason} onChange={e => setReason(e.target.value)} /></Field>
        <SubmitButton busy={mutation.busy}>Send</SubmitButton>
      </form>
    </ShopDialog>}
    {deciding && <ShopDialog title={deciding.decision === 'APPROVED' ? `Approve return: ${deciding.row.item}` : `Decline return: ${deciding.row.item}`} onClose={() => setDeciding(null)}>
      <form className="wf-form" onSubmit={e => { e.preventDefault(); mutation.run(() => apiRequest(`/work/returns/${deciding.row.id}/decide`, { method: 'POST', body: JSON.stringify({ decision: deciding.decision, refundPaise: deciding.decision === 'APPROVED' ? Math.round(Number(refund) * 100) : 0, note }) }), () => { setDeciding(null); returns.reload(); }); }}>
        <FormError message={mutation.error} />
        {deciding.decision === 'APPROVED' && <Field label="Refund amount (₹)" hint="Up to what was paid for this item. You arrange the refund; Studentkare records it."><input required type="number" min="0.01" step="0.01" value={refund} onChange={e => setRefund(e.target.value)} /></Field>}
        <Field label={deciding.decision === 'APPROVED' ? 'Note for the student (optional)' : 'Why (the student sees this)'}><textarea required={deciding.decision === 'DECLINED'} minLength={deciding.decision === 'DECLINED' ? 3 : 0} maxLength={500} rows={3} value={note} onChange={e => setNote(e.target.value)} /></Field>
        <SubmitButton busy={mutation.busy}>{deciding.decision === 'APPROVED' ? 'Approve return' : 'Decline return'}</SubmitButton>
      </form>
    </ShopDialog>}
  </>;
}
