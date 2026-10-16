import React, { useState } from 'react';
import { useApiResource } from '../../hooks/useApiResource';
import { ApiError, apiRequest } from '../../data/http';
import { Field, FormError, SubmitButton, useMutation } from '../../components/interface/WorkflowUI';
import { DataState, EmptyState } from '../../components/interface/WorkflowUI';
import { ConfirmDialog } from '../../components/interface/ConfirmDialog';
import { ShopDialog } from '../../components/marketplace/ShopDialog';
import { Icon } from '../../design-system/icons';
import { displayDate } from '../../data/workflowTypes';
import type { StaffAppointment } from '../../data/types/workflowTypes';
import { useT } from '@/i18n';
import type { MessageKey } from '@/i18n';
import '../../theme/workflows.css';

interface EncounterNote { id: string; appointmentId: string; status: string; subjective: string; objective: string; assessment: string; plan: string; createdAt: number; signedAt?: number | null; }

const SOAP_FIELDS = ['subjective', 'objective', 'assessment', 'plan'] as const;
type Soap = Record<(typeof SOAP_FIELDS)[number], string>;
const BLANK_SOAP: Soap = { subjective: '', objective: '', assessment: '', plan: '' };

// 409: the server already holds this note as signed (another tab or device).
const isConflict = (reason: unknown) => reason instanceof ApiError && reason.status === 409;

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
  const [notice, setNotice] = useState<{ tone: 'done' | 'conflict'; key: MessageKey } | null>(null);

  // Editing a draft. The text lives only in component state: never written to
  // browser storage, never logged.
  const [editing, setEditing] = useState<EncounterNote | null>(null);
  const [editForm, setEditForm] = useState<Soap>(BLANK_SOAP);
  const [editConflict, setEditConflict] = useState(false);
  const edit = useMutation();
  const openEditor = (note: EncounterNote) => {
    setEditing(note);
    setEditForm({ subjective: note.subjective, objective: note.objective, assessment: note.assessment, plan: note.plan });
    setEditConflict(false); edit.setError(''); setNotice(null);
  };
  const closeEditor = () => { setEditing(null); setEditConflict(false); edit.setError(''); };

  // Signing is confirmed first, because a signed note cannot be changed.
  const [signing, setSigning] = useState<EncounterNote | null>(null);
  const sign = useMutation();
  const openSign = (note: EncounterNote) => { sign.setError(''); setNotice(null); setSigning(note); };
  const cancelSign = () => { if (!sign.busy) { setSigning(null); sign.setError(''); } };

  const saveEdit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!editing || editConflict) return;
    const id = editing.id;
    edit.run(async () => {
      try {
        await apiRequest(`/encounters/${encodeURIComponent(id)}`, { method: 'PATCH', body: JSON.stringify(editForm) });
        return true;
      } catch (reason) {
        if (!isConflict(reason)) throw reason;
        // Signed elsewhere. The dialog stays open, read-only, so the doctor can
        // see what did not save before closing it; the list refreshes behind it.
        setEditConflict(true);
        notes.reload();
        return false;
      }
    }, saved => { if (saved) { closeEditor(); setNotice({ tone: 'done', key: 'partner.core.notes.saved' }); notes.reload(); } });
  };

  const confirmSign = () => {
    if (!signing) return;
    const id = signing.id;
    sign.run(async () => {
      try {
        await apiRequest(`/encounters/${encodeURIComponent(id)}/finalize`, { method: 'POST' });
        return 'signed' as const;
      } catch (reason) {
        if (isConflict(reason)) return 'conflict' as const;
        throw reason;
      }
    }, outcome => {
      setSigning(null);
      setNotice(outcome === 'signed' ? { tone: 'done', key: 'partner.core.notes.signedNotice' } : { tone: 'conflict', key: 'partner.core.notes.signConflict' });
      notes.reload();
    });
  };

  return <>
    <div className="wf-panel-heading"><div>
      <span className="care-eyebrow">{t('partner.core.notes.eyebrow')}</span>
      <h2>{t('partner.core.notes.title')}</h2>
      <p>{t('partner.core.notes.intro')}</p>
    </div><button type="button" className="health-button health-button-primary" style={{ minHeight: 44 }} onClick={() => setDrafting(true)}><Icon name="plus" size={16} />{t('partner.core.notes.new')}</button></div>

    <div role="status" aria-live="polite">{notice && <div className={notice.tone === 'done' ? 'wf-notice wf-notice-positive' : 'wf-notice'}>{notice.tone === 'conflict' && <Icon name="alert-triangle" size={16} />} {t(notice.key)}</div>}</div>

    <DataState {...notes} retry={notes.reload}>
      {notes.data?.items.length ? <div className="wf-order-list">{notes.data.items.map(note => {
        const ref = note.id.slice(0, 8).toUpperCase();
        const signed = note.status === 'FINAL';
        return <article className="wf-card" key={note.id} aria-label={t('partner.core.notes.cardEyebrow', { id: ref })}>
          <div className="wf-panel-heading"><div><span className="care-eyebrow">{t('partner.core.notes.cardEyebrow', { id: ref })}</span><h3>{note.assessment || t('partner.core.notes.status.DRAFT')}</h3></div><span className={`wf-status ${signed ? 'status-accepted' : 'status-requested'}`}>{statusLabel(note.status)}</span></div>
          <div className="wf-request-details"><div><span>{t('partner.core.notes.subjective')}</span><strong>{note.subjective || '—'}</strong></div><div><span>{t('partner.core.notes.objective')}</span><strong>{note.objective || '—'}</strong></div><div><span>{t('partner.core.notes.assessment')}</span><strong>{note.assessment || '—'}</strong></div><div><span>{t('partner.core.notes.plan')}</span><strong>{note.plan || '—'}</strong></div></div>
          <small>{t('partner.core.notes.created', { date: displayDate(note.createdAt) })}</small>
          {signed && <p className="wf-fineprint"><Icon name="clock" size={14} /> {note.signedAt ? `${t('partner.core.notes.signedAt', { date: displayDate(note.signedAt) })} · ` : ''}{t('partner.core.notes.readOnly')}</p>}
          {note.status === 'DRAFT' && <div className="wf-row-actions">
            <button type="button" className="health-button" style={{ minHeight: 44 }} aria-label={t('partner.core.notes.editFor', { id: ref })} onClick={() => openEditor(note)}><Icon name="doc" size={16} />{t('partner.core.notes.edit')}</button>
            <button type="button" className="health-button health-button-primary" style={{ minHeight: 44 }} aria-label={t('partner.core.notes.signFor', { id: ref })} onClick={() => openSign(note)}>{t('partner.core.notes.sign')}</button>
          </div>}
        </article>;
      })}</div> : <EmptyState title={t('partner.core.notes.emptyTitle')} description={t('partner.core.notes.emptyBody')} action={t('partner.core.notes.new')} onAction={() => setDrafting(true)} />}
    </DataState>

    {drafting && <ShopDialog title={t('partner.core.notes.new')} onClose={() => setDrafting(false)} wide><form className="wf-form" onSubmit={event => { event.preventDefault(); mutation.run(() => apiRequest('/encounters', { method: 'POST', body: JSON.stringify(form) }), () => { setDrafting(false); setForm(empty); notes.reload(); }); }}><p>{t('partner.core.notes.dialogIntro')}</p><FormError message={mutation.error} /><Field label={t('partner.core.notes.appointment')} hint={appointments.error ? t('partner.core.notes.apptError') : noteable.length ? undefined : t('partner.core.notes.apptNone')}><select required value={form.appointmentId} onChange={event => set('appointmentId', event.target.value)}><option value="">{t('partner.core.notes.chooseAppt')}</option>{noteable.map(appt => <option key={appt.id} value={appt.id}>{appt.customer} · {appt.slotStart.replace('T', ' ')} · {t(`partner.core.notes.appt.${appt.status}` as MessageKey)}</option>)}</select></Field><Field label={t('partner.core.notes.subjective')}><textarea rows={2} maxLength={2000} value={form.subjective} onChange={event => set('subjective', event.target.value)} placeholder={t('partner.core.notes.subjectivePh')} /></Field><Field label={t('partner.core.notes.objective')}><textarea rows={2} maxLength={2000} value={form.objective} onChange={event => set('objective', event.target.value)} placeholder={t('partner.core.notes.objectivePh')} /></Field><Field label={t('partner.core.notes.assessment')}><textarea rows={2} maxLength={2000} value={form.assessment} onChange={event => set('assessment', event.target.value)} placeholder={t('partner.core.notes.assessmentPh')} /></Field><Field label={t('partner.core.notes.plan')}><textarea rows={2} maxLength={2000} value={form.plan} onChange={event => set('plan', event.target.value)} placeholder={t('partner.core.notes.planPh')} /></Field><div className="wf-notice"><Icon name="shield-check" size={18} />{t('partner.core.notes.notice')}</div><SubmitButton busy={mutation.busy} disabled={!form.appointmentId}>{t('partner.core.notes.save')}</SubmitButton></form></ShopDialog>}

    {editing && <ShopDialog title={t('partner.core.notes.editTitle')} onClose={closeEditor} wide><form className="wf-form" onSubmit={saveEdit}>
      <p>{t('partner.core.notes.editIntro')}</p>
      <FormError message={edit.error} />
      {editConflict && <div className="care-form-error" role="alert"><Icon name="alert-triangle" size={16} />{t('partner.core.notes.editConflict')}</div>}
      {SOAP_FIELDS.map(key => <Field key={key} label={t(`partner.core.notes.${key}`)}><textarea rows={3} maxLength={2000} readOnly={editConflict} value={editForm[key]} onChange={event => setEditForm(prev => ({ ...prev, [key]: event.target.value }))} placeholder={t(`partner.core.notes.${key}Ph`)} /></Field>)}
      <SubmitButton busy={edit.busy} disabled={editConflict}>{t('partner.core.notes.saveChanges')}</SubmitButton>
    </form></ShopDialog>}

    <ConfirmDialog
      open={signing !== null}
      title={t('partner.core.notes.signTitle')}
      body={<><p>{t('partner.core.notes.signBody')}</p><FormError message={sign.error} /></>}
      confirmLabel={t('partner.core.notes.sign')}
      cancelLabel={t('common.cancel')}
      busy={sign.busy}
      onConfirm={confirmSign}
      onCancel={cancelSign}
    />
  </>;
}
