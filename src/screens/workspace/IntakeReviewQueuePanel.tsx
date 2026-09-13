import React from 'react';
import { CheckCircle2, X } from 'lucide-react';
import { useApiResource } from '../../hooks/useApiResource';
import { apiRequest } from '../../data/http';
import { useMutation } from '../../components/interface/WorkflowUI';
import { DataState, EmptyState } from '../../components/interface/WorkflowUI';
import '../../theme/workflows.css';

interface ReviewItem { id: string; intakeId: string; field: string; value: string; confidence: number; documentId: string; }

export function IntakeReviewQueuePanel() {
  const queue = useApiResource<{ items: ReviewItem[] }>('/ops/intake/review');
  const mutation = useMutation();

  const review = (item: ReviewItem, approved: boolean) => {
    const corrected = approved ? item.value : '';
    mutation.run(() => apiRequest(`/ops/intake/review/${item.id}`, { method: 'PATCH', body: JSON.stringify({ approved, correctedValue: corrected }) }), queue.reload);
  };

  return <>
    <div className="wf-panel-heading"><div>
      <span className="care-eyebrow">DOCUMENT INTAKE REVIEW</span>
      <h2>Review extracted fields.</h2>
      <p>Fields extracted from uploaded documents await human confirmation before use. Approve or correct each.</p>
    </div></div>

    <DataState {...queue} retry={queue.reload}>
      {queue.data?.items.length ? <div className="wf-order-list">{queue.data.items.map(item => <article className="wf-card" key={item.id}><div className="wf-panel-heading"><div><span className="care-eyebrow">{item.field.replace(/_/g, ' ')}</span><h3>{item.value || '(blank)'}</h3></div><span className={`wf-status ${item.confidence >= 0.7 ? 'status-accepted' : 'status-requested'}`}>confidence {Math.round(item.confidence * 100)}%</span></div><div className="wf-order-meta"><span>Document {item.documentId.slice(0, 8)}</span></div><div className="wf-row-actions"><button className="health-button health-button-primary" disabled={mutation.busy} onClick={() => review(item, true)}><CheckCircle2 size={16} />Approve</button><button className="health-button" disabled={mutation.busy} onClick={() => review(item, false)}><X size={16} />Reject</button></div></article>)}</div> : <EmptyState title="No pending review." description="Extracted fields from uploaded documents appear here for confirmation." />}
    </DataState>
  </>;
}
