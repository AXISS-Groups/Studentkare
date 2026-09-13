import React, { useState } from 'react';
import { AlertTriangle, Send, ShieldCheck } from 'lucide-react';
import { apiRequest } from '../../data/http';
import { FormError, useMutation } from '../../components/interface/WorkflowUI';
import { EmptyState } from '../../components/interface/WorkflowUI';
import '../../theme/workflows.css';

interface NavigateResult { answer: string; citations: { sourceId: string; title: string; snippet: string; version: number }[]; confident: boolean; domain: string; }

export function CareNavigatorPanel() {
  const [query, setQuery] = useState('');
  const [result, setResult] = useState<NavigateResult | null>(null);
  const mutation = useMutation();

  const ask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    mutation.run(() => apiRequest<NavigateResult>('/care/navigate', { method: 'POST', body: JSON.stringify({ query }) }), (res) => { setResult(res); });
  };

  return <>
    <div className="wf-panel-heading"><div>
      <span className="care-eyebrow">CARE NAVIGATOR</span>
      <h2>Ask about your care.</h2>
      <p>A read-only assistant that answers from approved sources with citations. It never diagnoses or prescribes.</p>
    </div></div>

    <form className="wf-card wf-form" onSubmit={ask} style={{ maxWidth: 640 }}>
      <FormError message={mutation.error} />
      <label className="wf-field">Question
        <input value={query} onChange={event => setQuery(event.target.value)} placeholder="e.g. How do I book an appointment?" maxLength={500} />
      </label>
      <button className="health-button health-button-primary" type="submit" disabled={mutation.busy || !query.trim()}><Send size={16} />Ask</button>
    </form>

    {result && <section className="wf-card wf-section-gap">
      <div className="wf-notice" role="status" style={{ marginBottom: 14, background: result.confident ? '#ecfdf5' : '#fef3c7', color: result.confident ? '#065f46' : '#92400e', borderColor: result.confident ? '#a7f3d0' : '#fde68a' }}>
        {result.confident ? <ShieldCheck size={18} /> : <AlertTriangle size={18} />}{result.answer}
      </div>
      {result.citations.length ? <div className="wf-order-list">{result.citations.map(c => <div className="wf-order-line" key={c.sourceId}><div><strong>{c.title}</strong><small>Approved source · v{c.version}</small><p style={{ fontSize: 12 }}>{c.snippet}…</p></div></div>)}</div> : <EmptyState title="No approved source." description="This answer is unverified. Contact support for guidance." />}
    </section>}
  </>;
}
