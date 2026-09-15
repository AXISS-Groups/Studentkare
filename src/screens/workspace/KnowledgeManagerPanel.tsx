import React, { useState } from 'react';
import { Plus, ShieldCheck } from 'lucide-react';
import { useApiResource } from '../../hooks/useApiResource';
import { apiRequest } from '../../data/http';
import { Field, FormError, SubmitButton, useMutation } from '../../components/interface/WorkflowUI';
import { DataState, EmptyState } from '../../components/interface/WorkflowUI';
import { ShopDialog } from '../../components/marketplace/ShopDialog';
import '../../theme/workflows.css';

interface Source { id: string; title: string; category: string; version: number; author: string; reviewed: boolean; expiresAt: number | null; }

export function KnowledgeManagerPanel() {
  const sources = useApiResource<{ items: Source[] }>('/knowledge/sources');
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ title: '', category: 'appointments', content: '', author: '', expiresInDays: '365' });
  const mutation = useMutation();
  const set = (key: string, value: string) => setForm(prev => ({ ...prev, [key]: value }));

  return <>
    <div className="wf-panel-heading"><div>
      <span className="care-eyebrow">APPROVED KNOWLEDGE</span>
      <h2>Knowledge sources.</h2>
      <p>Publish approved entries the care navigator can answer from. Each is versioned and expires.</p>
    </div><button className="health-button health-button-primary" onClick={() => setAdding(true)}><Plus size={16} />Publish a source</button></div>

    <DataState {...sources} retry={sources.reload}>
      {sources.data?.items.length ? <div className="wf-order-list">{sources.data.items.map(source => <article className="wf-card" key={source.id}><div className="wf-panel-heading"><div><span className="care-eyebrow">{source.category.replace(/_/g, ' ')}</span><h3>{source.title}</h3></div><span className="wf-status status-accepted">v{source.version} · approved</span></div><div className="wf-order-meta"><span>{source.author || 'Staff'}</span><small>{source.expiresAt ? `Expires ${new Date(source.expiresAt * 1000).toDateString()}` : 'No expiry'}</small></div></article>)}</div> : <EmptyState title="No knowledge sources yet." description="Publish approved entries so the care navigator can answer with citations." action="Publish a source" onAction={() => setAdding(true)} />}
    </DataState>

    {adding && <ShopDialog title="Publish a knowledge source" onClose={() => setAdding(false)} wide><form className="wf-form" onSubmit={event => { event.preventDefault(); mutation.run(() => apiRequest('/ops/knowledge', { method: 'POST', body: JSON.stringify({ ...form, expiresInDays: Number(form.expiresInDays) }) }), () => { setAdding(false); setForm({ title: '', category: 'appointments', content: '', author: '', expiresInDays: '365' }); sources.reload(); }); }}><p>This entry is marked reviewed and used by the navigator only after publication.</p><FormError message={mutation.error} /><div className="wf-form-grid"><Field label="Title"><input required minLength={3} maxLength={180} value={form.title} onChange={event => set('title', event.target.value)} /></Field><Field label="Category"><select value={form.category} onChange={event => set('category', event.target.value)}>{['appointments', 'records', 'insurance', 'medications', 'support', 'services', 'general'].map(value => <option key={value}>{value}</option>)}</select></Field></div><Field label="Content"><textarea required minLength={10} maxLength={4000} rows={4} value={form.content} onChange={event => set('content', event.target.value)} /></Field><Field label="Author"><input maxLength={120} value={form.author} onChange={event => set('author', event.target.value)} /></Field><Field label="Expires (days)"><input required type="number" min="1" max="3650" value={form.expiresInDays} onChange={event => set('expiresInDays', event.target.value)} /></Field><div className="wf-notice"><ShieldCheck size={18} />Only reviewed, non-expired sources are retrieved by the navigator.</div><SubmitButton busy={mutation.busy}>Publish source</SubmitButton></form></ShopDialog>}
  </>;
}
