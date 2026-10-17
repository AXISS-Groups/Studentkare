import React, { useEffect, useState } from 'react';
import { PhoneCall, ShieldAlert, Trash2 } from 'lucide-react';
import { useApiResource } from '../../hooks/useApiResource';
import { apiRequest } from '../../data/http';
import { useAuth } from '../../data/AuthContext';
import { DataState, EmptyState, Field, FormError, SubmitButton, useMutation } from '../../components/interface/WorkflowUI';
import { ShopDialog } from '../../components/marketplace/ShopDialog';
import { useT } from '@/i18n';
import type { MessageKey } from '@/i18n';

/**
 * Campus SOS desk (design page 4/7: campus admin console, super admin "operations
 * & SOS"; Tier 1, approved by the repository owner as named reviewer).
 *
 * Shows open SOS alerts for this admin's campus only (the server scopes them),
 * with who was reached and how, and lets staff acknowledge and close them. Also
 * manages the WhatsApp numbers an SOS wakes up. Refreshes every 15 seconds.
 */

interface Delivery { recipientKind: string; channel: string; recipient: string; status: 'SENT' | 'FAILED' | 'SKIPPED'; detail: string }
interface StaffAlert {
  id: string; status: 'ACTIVE' | 'ACKNOWLEDGED' | 'RESOLVED' | 'CANCELLED'; campus: string; locationNote: string | null;
  coordinates?: { latitude: number; longitude: number }; createdAt: number; acknowledgedAt: number | null;
  student: { name: string; contact: string; hostel: string | null }; deliveries: Delivery[];
}
interface SecurityContact { id: string; name: string; phone: string }

const time = (s: number | null) => (s ? new Date(s * 1000).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' }) : '');
const KIND: Record<string, MessageKey> = { CAMPUS_CONSOLE: 'campus.sos.kind.CAMPUS_CONSOLE', CAMPUS_SECURITY: 'campus.sos.kind.CAMPUS_SECURITY', EMERGENCY_CONTACT: 'campus.sos.kind.EMERGENCY_CONTACT' };

export function CampusSosDesk() {
  const t = useT();
  const { user } = useAuth();
  const isSuperAdmin = user?.role === 'SUPER_ADMIN';
  const alerts = useApiResource<{ items: StaffAlert[] }>('/ops/sos');
  const mutation = useMutation();
  const [resolving, setResolving] = useState<StaffAlert | null>(null);
  const [note, setNote] = useState('');

  useEffect(() => {
    const timer = window.setInterval(alerts.reload, 15000);
    return () => window.clearInterval(timer);
  }, [alerts.reload]);

  return <>
    <div className="wf-panel-heading"><div>
      <span className="care-eyebrow">{t('campus.sos.eyebrow')}</span>
      <h2>{t('campus.sos.title')}</h2>
      <p>{t('campus.sos.lead')}</p>
    </div></div>
    <FormError message={mutation.error} />
    <DataState {...alerts} retry={alerts.reload}>
      {alerts.data?.items.length ? <div className="wf-order-list">{alerts.data.items.map(a => <article key={a.id} className="wf-card wf-order" aria-label={t('campus.sos.alertLabel', { name: a.student.name })}>
        <div className="wf-panel-heading"><div>
          <span className="care-eyebrow" style={{ color: 'var(--sk-color-danger)' }}><ShieldAlert size={14} aria-hidden="true" /> {a.status === 'ACTIVE' ? t('campus.sos.needsResponse') : t('campus.sos.acknowledged')} · {time(a.createdAt)}</span>
          <h3>{a.student.name}</h3>
          <p>{a.locationNote ? t('campus.sos.location', { place: a.locationNote }) : t('campus.sos.locationNone')}{a.student.hostel ? ` · ${t('campus.sos.hostel', { hostel: a.student.hostel })}` : ''}</p>
          {a.coordinates && <a className="health-text-button" href={`https://www.google.com/maps?q=${a.coordinates.latitude},${a.coordinates.longitude}`} target="_blank" rel="noreferrer">{t('campus.sos.openMap')}</a>}
        </div>
        {a.student.contact && /^\+?\d[\d\s-]{8,}$/.test(a.student.contact) && <a className="health-button" href={`tel:${a.student.contact.replace(/[^\d+]/g, '')}`}><PhoneCall size={16} aria-hidden="true" />{t('campus.sos.callStudent')}</a>}
        </div>
        <ul className="wf-order-meta" aria-label={t('campus.sos.whoAlerted')}>{a.deliveries.map((d, i) => <li key={i}>{Object.prototype.hasOwnProperty.call(KIND, d.recipientKind) ? t(KIND[d.recipientKind]) : d.recipientKind}{d.recipient ? ` · ${d.recipient}` : ''}: <strong>{t(`campus.sos.delivery.${d.status}` as MessageKey)}</strong></li>)}</ul>
        <div className="wf-row-actions">
          {a.status === 'ACTIVE' && <button type="button" className="health-button health-button-primary" disabled={mutation.busy} onClick={() => mutation.run(() => apiRequest(`/ops/sos/${a.id}/acknowledge`, { method: 'POST' }), alerts.reload)}>{t('campus.sos.acknowledge')}</button>}
          <button type="button" className="health-button" disabled={mutation.busy} onClick={() => { setResolving(a); setNote(''); }}>{t('campus.sos.closeWithNote')}</button>
        </div>
      </article>)}</div> : <EmptyState title={t('campus.sos.emptyTitle')} description={t('campus.sos.emptyBody')} />}
    </DataState>

    <SecurityContacts isSuperAdmin={isSuperAdmin} />

    {resolving && <ShopDialog title={t('campus.sos.closeTitle', { name: resolving.student.name })} onClose={() => setResolving(null)}>
      <form className="wf-form" onSubmit={e => { e.preventDefault(); mutation.run(() => apiRequest(`/ops/sos/${resolving.id}/resolve`, { method: 'POST', body: JSON.stringify({ note }) }), () => { setResolving(null); alerts.reload(); }); }}>
        <FormError message={mutation.error} />
        <Field label={t('campus.sos.whatHappened')} hint={t('campus.sos.whatHappenedHint')}><textarea required minLength={2} maxLength={1000} rows={3} value={note} onChange={e => setNote(e.target.value)} /></Field>
        <SubmitButton busy={mutation.busy}>{t('campus.sos.closeSubmit')}</SubmitButton>
      </form>
    </ShopDialog>}
  </>;
}

function SecurityContacts({ isSuperAdmin }: { isSuperAdmin: boolean }) {
  const t = useT();
  const [campus, setCampus] = useState('');
  const path = isSuperAdmin ? (campus.trim().length >= 2 ? `/ops/campus/security-contacts?campus=${encodeURIComponent(campus.trim())}` : null) : '/ops/campus/security-contacts';
  const contacts = useApiResource<{ items: SecurityContact[] }>(path);
  const mutation = useMutation();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');

  return <section className="wf-card wf-section-gap" aria-labelledby="sos-contacts-title">
    <div className="wf-panel-heading"><div>
      <span className="care-eyebrow">{t('campus.sos.contacts.eyebrow')}</span>
      <h3 id="sos-contacts-title">{t('campus.sos.contacts.title')}</h3>
      <p>{t('campus.sos.contacts.lead')}</p>
    </div></div>
    {isSuperAdmin && <Field label={t('campus.sos.contacts.campus')}><input value={campus} onChange={e => setCampus(e.target.value)} placeholder={t('campus.sos.contacts.campusPlaceholder')} /></Field>}
    {path && <DataState {...contacts} retry={contacts.reload}>
      {contacts.data?.items.length ? <div className="wf-order-list">{contacts.data.items.map(c => <div className="wf-order-line" key={c.id}><div><strong>{c.name}</strong><small>{c.phone}</small></div>
        <button type="button" className="wf-icon-button" aria-label={t('campus.sos.contacts.remove', { name: c.name })} disabled={mutation.busy} onClick={() => mutation.run(() => apiRequest(`/ops/campus/security-contacts/${c.id}`, { method: 'DELETE' }), contacts.reload)}><Trash2 size={16} aria-hidden="true" /></button></div>)}</div>
        : <EmptyState title={t('campus.sos.contacts.emptyTitle')} description={t('campus.sos.contacts.emptyBody')} />}
    </DataState>}
    {path && <form className="wf-form wf-section-gap" onSubmit={e => { e.preventDefault(); mutation.run(() => apiRequest('/ops/campus/security-contacts', { method: 'POST', body: JSON.stringify({ name, phone, ...(isSuperAdmin ? { campus: campus.trim() } : {}) }) }), () => { setName(''); setPhone(''); contacts.reload(); }); }}>
      <FormError message={mutation.error} />
      <div className="wf-form-grid">
        <Field label={t('campus.sos.contacts.name')}><input required minLength={2} maxLength={120} value={name} onChange={e => setName(e.target.value)} placeholder={t('campus.sos.contacts.namePlaceholder')} /></Field>
        <Field label={t('campus.sos.contacts.phone')}><input required type="tel" minLength={10} maxLength={32} value={phone} onChange={e => setPhone(e.target.value)} placeholder="+91 90000 00000" /></Field>
      </div>
      <SubmitButton busy={mutation.busy}>{t('campus.sos.contacts.add')}</SubmitButton>
    </form>}
  </section>;
}
