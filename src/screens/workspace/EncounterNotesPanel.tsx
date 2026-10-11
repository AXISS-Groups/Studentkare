import React, { useState } from 'react';
import { Plus, ShieldCheck } from 'lucide-react';
import { useApiResource } from '../../hooks/useApiResource';
import { apiRequest } from '../../data/http';
import { Field, FormError, SubmitButton, useMutation } from '../../components/interface/WorkflowUI';
import { DataState, EmptyState } from '../../components/interface/WorkflowUI';
import { ShopDialog } from '../../components/marketplace/ShopDialog';
import { displayDate } from '../../data/workflowTypes';
import type { StaffAppointment } from '../../data/types/workflowTypes';
import { useT } from '@/i18n';
import type { MessageKey } from '@/i18n';
import '../../theme/workflows.css';

interface EncounterNote { id: string; appointmentId: string; status: string; subjective: string; objective: string; assessment: string; plan: string; createdAt: number; }

export function EncounterNotesPanel() {
  const t = useT();
  // Server statuses are DRAFT and FINAL; anything else is shown as sent.
  const statusLabel = (status: string) => status === 'DRAFT' || status === 'FINAL' ? t(`partner.core.notes.status.${status}` as MessageKey) : status;
  const notes = useApiResource<{ items: EncounterNote[] }>('/encounters');
  // A note is written for one of your own confirmed or completed appointments;
  // the server takes the patient from it and refuses a note without one.
  const appointments = useApiResource<{ items: StaffAppointment[] }>('/work/appointments');
  const noteable = (appointments.data?.items ?? []).filter(appt => appt.status === 'CONFIRMED' || appt.status === 'COMPLETED');
  const [drafting, setDrafting] = useState(false);
  const empty = { appointmentId: '', subjective: '', objective: '', assessment: '', plan: '' };
  const [form, setForm] = useState(empty);
  const mutation = useMutation();
  const set = (key: string, value: string) => setForm(prev => ({ ...prev, [key]: value }));

  return <>
    <div className="wf-panel-heading"><div>
      <span className="care-eyebrow">{t('partner.core.notes.eyebrow')}</span>
      <h2>{t('partner.core.notes.title')}</h2>
      <p>{t('partner.core.notes.intro')}</p>
    </div><button type="button" className="health-button health-button-primary" style={{ minHeight: 44 }} onClick={() => setDrafting(true)}><Plus size={16} aria-hidden="true" />{t('partner.core.notes.new')}</button></div>

    <DataState {...notes} retry={notes.reload}>
      {notes.data?.items.length ? <div className="wf-order-list">{notes.data.items.map(note => <article className="wf-card" key={note.id}><div className="wf-panel-heading"><div><span className="care-eyebrow">{t('partner.core.notes.cardEyebrow', { id: note.id.slice(0, 8).toUpperCase() })}</span><h3>{note.assessment || t('partner.core.notes.status.DRAFT')}</h3></div><span className={`wf-status ${note.status === 'FINAL' ? 'status-accepted' : 'status-requested'}`}>{statusLabel(note.status)}</span></div><div className="wf-request-details"><div><span>{t('partner.core.notes.subjective')}</span><strong>{note.subjective || '—'}</strong></div><div><span>{t('partner.core.notes.objective')}</span><strong>{note.objective || '—'}</strong></div><div><span>{t('partner.core.notes.assessment')}</span><strong>{note.assessment || '—'}</strong></div><div><span>{t('partner.core.notes.plan')}</span><strong>{note.plan || '—'}</strong></div></div><small>{t('partner.core.notes.created', { date: displayDate(note.createdAt) })}</small></article>)}</div> : <EmptyState title={t('partner.core.notes.emptyTitle')} description={t('partner.core.notes.emptyBody')} action={t('partner.core.notes.new')} onAction={() => setDrafting(true)} />}
    </DataState>

    {drafting && <ShopDialog title={t('partner.core.notes.new')} onClose={() => setDrafting(false)} wide><form className="wf-form" onSubmit={event => { event.preventDefault(); mutation.run(() => apiRequest('/encounters', { method: 'POST', body: JSON.stringify(form) }), () => { setDrafting(false); setForm(empty); notes.reload(); }); }}><p>{t('partner.core.notes.dialogIntro')}</p><FormError message={mutation.error} /><Field label={t('partner.core.notes.appointment')} hint={appointments.error ? t('partner.core.notes.apptError') : noteable.length ? undefined : t('partner.core.notes.apptNone')}><select required value={form.appointmentId} onChange={event => set('appointmentId', event.target.value)}><option value="">{t('partner.core.notes.chooseAppt')}</option>{noteable.map(appt => <option key={appt.id} value={appt.id}>{appt.customer} · {appt.slotStart.replace('T', ' ')} · {t(`partner.core.notes.appt.${appt.status}` as MessageKey)}</option>)}</select></Field><Field label={t('partner.core.notes.subjective')}><textarea rows={2} maxLength={2000} value={form.subjective} onChange={event => set('subjective', event.target.value)} placeholder={t('partner.core.notes.subjectivePh')} /></Field><Field label={t('partner.core.notes.objective')}><textarea rows={2} maxLength={2000} value={form.objective} onChange={event => set('objective', event.target.value)} placeholder={t('partner.core.notes.objectivePh')} /></Field><Field label={t('partner.core.notes.assessment')}><textarea rows={2} maxLength={2000} value={form.assessment} onChange={event => set('assessment', event.target.value)} placeholder={t('partner.core.notes.assessmentPh')} /></Field><Field label={t('partner.core.notes.plan')}><textarea rows={2} maxLength={2000} value={form.plan} onChange={event => set('plan', event.target.value)} placeholder={t('partner.core.notes.planPh')} /></Field><div className="wf-notice"><ShieldCheck size={18} aria-hidden="true" />{t('partner.core.notes.notice')}</div><SubmitButton busy={mutation.busy} disabled={!form.appointmentId}>{t('partner.core.notes.save')}</SubmitButton></form></ShopDialog>}
  </>;
}
