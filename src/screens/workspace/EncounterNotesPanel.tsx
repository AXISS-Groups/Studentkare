import React, { useState } from 'react';
import { Plus, ShieldCheck } from 'lucide-react';
import { useApiResource } from '../../hooks/useApiResource';
import { apiRequest } from '../../data/http';
import { Field, FormError, SubmitButton, useMutation } from '../../components/interface/WorkflowUI';
import { DataState, EmptyState } from '../../components/interface/WorkflowUI';
import { ShopDialog } from '../../components/marketplace/ShopDialog';
import { displayDate } from '../../data/workflowTypes';
import '../../theme/workflows.css';

interface EncounterNote { id: string; appointmentId: string; status: string; subjective: string; objective: string; assessment: string; plan: string; createdAt: number; }

export function EncounterNotesPanel() {
  const notes = useApiResource<{ items: EncounterNote[] }>('/encounters');
  const [drafting, setDrafting] = useState(false);
  const [form, setForm] = useState({ subjective: '', objective: '', assessment: '', plan: '' });
  const mutation = useMutation();
  const set = (key: string, value: string) => setForm(prev => ({ ...prev, [key]: value }));

  return <>
    <div className="wf-panel-heading"><div>
      <span className="care-eyebrow">CLINICAL NOTES</span>
      <h2>Encounter notes.</h2>
      <p>Clinician-authored drafts. Notes are never auto-written — you author and finalize them.</p>
    </div><button className="health-button health-button-primary" onClick={() => setDrafting(true)}><Plus size={16} />New encounter note</button></div>

    <DataState {...notes} retry={notes.reload}>
      {notes.data?.items.length ? <div className="wf-order-list">{notes.data.items.map(note => <article className="wf-card" key={note.id}><div className="wf-panel-heading"><div><span className="care-eyebrow">ENCOUNTER {note.id.slice(0, 8).toUpperCase()}</span><h3>{note.assessment || 'Draft'}</h3></div><span className={`wf-status ${note.status === 'FINAL' ? 'status-accepted' : 'status-requested'}`}>{note.status}</span></div><div className="wf-request-details"><div><span>Subjective</span><strong>{note.subjective || '—'}</strong></div><div><span>Objective</span><strong>{note.objective || '—'}</strong></div><div><span>Assessment</span><strong>{note.assessment || '—'}</strong></div><div><span>Plan</span><strong>{note.plan || '—'}</strong></div></div><small>Created {displayDate(note.createdAt)}</small></article>)}</div> : <EmptyState title="No encounter notes yet." description="Create a draft for a consultation you performed." action="New encounter note" onAction={() => setDrafting(true)} />}
    </DataState>

    {drafting && <ShopDialog title="New encounter note" onClose={() => setDrafting(false)} wide><form className="wf-form" onSubmit={event => { event.preventDefault(); mutation.run(() => apiRequest('/encounters', { method: 'POST', body: JSON.stringify(form) }), () => { setDrafting(false); setForm({ subjective: '', objective: '', assessment: '', plan: '' }); notes.reload(); }); }}><p>Record what you observed and assessed. This is authored by you, not generated.</p><FormError message={mutation.error} /><Field label="Subjective"><textarea rows={2} maxLength={2000} value={form.subjective} onChange={event => set('subjective', event.target.value)} placeholder="Patient-reported symptoms" /></Field><Field label="Objective"><textarea rows={2} maxLength={2000} value={form.objective} onChange={event => set('objective', event.target.value)} placeholder="Observed findings and vitals" /></Field><Field label="Assessment"><textarea rows={2} maxLength={2000} value={form.assessment} onChange={event => set('assessment', event.target.value)} placeholder="Clinical assessment" /></Field><Field label="Plan"><textarea rows={2} maxLength={2000} value={form.plan} onChange={event => set('plan', event.target.value)} placeholder="Next steps and follow-up" /></Field><div className="wf-notice"><ShieldCheck size={18} />Drafts are authored by you. Finalize only after review.</div><SubmitButton busy={mutation.busy}>Save draft</SubmitButton></form></ShopDialog>}
  </>;
}
