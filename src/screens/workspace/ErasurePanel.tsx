import React, { useState } from 'react';
import { Lock, ShieldAlert } from 'lucide-react';
import { useApiResource } from '../../hooks/useApiResource';
import { apiRequest } from '../../data/http';
import { DataState, EmptyState, Field, FormError, SubmitButton, useMutation } from '../../components/interface/WorkflowUI';
import { ShopDialog } from '../../components/marketplace/ShopDialog';

/**
 * DPDP erasure queue and sealed archives (design page 7: DpdpQueue — Tier 1,
 * approved by the repository owner as named reviewer). Super admin only.
 * Opening an archive needs a written reason; it is audited and announced on
 * the ops feed. The archive downloads as a file and is never shown on screen.
 */

interface Queue {
  blocked: string | null;
  retentionDays: number | null;
  pending: { accountId: string; requestedAt: number; scheduledFor: number }[];
  archives: { id: string; formerAccountId: string; rowCount: number; archivedAt: number; destroyAfter: number; destroyed: boolean }[];
}

const day = (s: number) => new Date(s * 1000).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
const short = (id: string) => id.slice(0, 8).toUpperCase();

export function ErasurePanel() {
  const queue = useApiResource<Queue>('/ops/erasure');
  const mutation = useMutation();
  const [opening, setOpening] = useState<Queue['archives'][number] | null>(null);
  const [reason, setReason] = useState('');

  const open = (archive: Queue['archives'][number]) => mutation.run(async () => {
    const res = await apiRequest<{ archive: unknown }>(`/ops/erasure/archives/${archive.id}/open`, { method: 'POST', body: JSON.stringify({ reason }) });
    const url = URL.createObjectURL(new Blob([JSON.stringify(res.archive, null, 2)], { type: 'application/json' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `erasure-archive-${short(archive.id)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, () => { setOpening(null); setReason(''); });

  return <>
    <div className="wf-panel-heading"><div>
      <span className="care-eyebrow">DPDP ERASURE</span>
      <h2>Erasure queue</h2>
      <p>Accounts are erased 7 days after the request unless the student cancels. A sealed copy is kept{queue.data?.retentionDays ? ` for ${queue.data.retentionDays} days` : ''}, then destroyed.</p>
    </div></div>
    <DataState {...queue} retry={queue.reload}>
      {queue.data?.blocked && <div className="wf-notice" role="alert"><ShieldAlert size={18} />Erasure is paused: {queue.data.blocked} Requests wait until this is fixed — nothing is deleted without a sealed archive.</div>}
      <section className="wf-card wf-section-gap" aria-labelledby="erasure-pending">
        <h3 id="erasure-pending">Scheduled</h3>
        {queue.data?.pending.length ? <div className="wf-order-list">{queue.data.pending.map(p => <div className="wf-order-line" key={p.accountId}><div><strong>Account {short(p.accountId)}</strong><small>Requested {day(p.requestedAt)} · erased on or after {day(p.scheduledFor)}</small></div></div>)}</div>
          : <EmptyState title="No deletion requests." description="Students request deletion from their account settings." />}
      </section>
      <section className="wf-card wf-section-gap" aria-labelledby="erasure-archives">
        <h3 id="erasure-archives">Sealed archives</h3>
        {queue.data?.archives.length ? <div className="wf-order-list">{queue.data.archives.map(a => <div className="wf-order-line" key={a.id}><div><strong>Former account {short(a.formerAccountId)}</strong><small>{a.rowCount} rows · sealed {day(a.archivedAt)} · {a.destroyed ? 'destroyed' : `destroyed on ${day(a.destroyAfter)}`}</small></div>
          {!a.destroyed && <button type="button" className="health-button" onClick={() => { setOpening(a); setReason(''); }}><Lock size={14} />Open with reason</button>}</div>)}</div>
          : <EmptyState title="No archives." description="An archive appears here when an account is erased." />}
      </section>
    </DataState>
    {opening && <ShopDialog title={`Open archive ${short(opening.id)}`} onClose={() => setOpening(null)}>
      <form className="wf-form" onSubmit={e => { e.preventDefault(); open(opening); }}>
        <p>This is recorded on the audit log and announced on the ops feed. The file downloads to this device — store it only where policy allows.</p>
        <FormError message={mutation.error} />
        <Field label="Reason" hint="At least 10 characters, e.g. the legal request reference."><textarea required minLength={10} maxLength={500} rows={3} value={reason} onChange={e => setReason(e.target.value)} /></Field>
        <SubmitButton busy={mutation.busy}>Open and download</SubmitButton>
      </form>
    </ShopDialog>}
  </>;
}
