import React, { useEffect, useState } from 'react';
import { PhoneCall, ShieldAlert, Trash2 } from 'lucide-react';
import { useApiResource } from '../../hooks/useApiResource';
import { apiRequest } from '../../data/http';
import { useAuth } from '../../data/AuthContext';
import { DataState, EmptyState, Field, FormError, SubmitButton, useMutation } from '../../components/interface/WorkflowUI';
import { ShopDialog } from '../../components/marketplace/ShopDialog';

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
const KIND: Record<string, string> = { CAMPUS_CONSOLE: 'Console', CAMPUS_SECURITY: 'Security', EMERGENCY_CONTACT: 'Emergency contact' };

export function CampusSosDesk() {
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
      <span className="care-eyebrow">SOS DESK</span>
      <h2>Open SOS alerts.</h2>
      <p>Alerts from students at your campus. Acknowledge as soon as someone is responding — the student sees it.</p>
    </div></div>
    <FormError message={mutation.error} />
    <DataState {...alerts} retry={alerts.reload}>
      {alerts.data?.items.length ? <div className="wf-order-list">{alerts.data.items.map(a => <article key={a.id} className="wf-card wf-order" aria-label={`SOS from ${a.student.name}`}>
        <div className="wf-panel-heading"><div>
          <span className="care-eyebrow" style={{ color: 'var(--sk-color-danger)' }}><ShieldAlert size={14} /> {a.status === 'ACTIVE' ? 'NEEDS RESPONSE' : 'ACKNOWLEDGED'} · {time(a.createdAt)}</span>
          <h3>{a.student.name}</h3>
          <p>{a.locationNote ? `Location: ${a.locationNote}` : 'Location not shared'}{a.student.hostel ? ` · Hostel ${a.student.hostel}` : ''}</p>
          {a.coordinates && <a className="health-text-button" href={`https://www.google.com/maps?q=${a.coordinates.latitude},${a.coordinates.longitude}`} target="_blank" rel="noreferrer">Open map</a>}
        </div>
        {a.student.contact && /^\+?\d[\d\s-]{8,}$/.test(a.student.contact) && <a className="health-button" href={`tel:${a.student.contact.replace(/[^\d+]/g, '')}`}><PhoneCall size={16} />Call student</a>}
        </div>
        <ul className="wf-order-meta" aria-label="Who was alerted">{a.deliveries.map((d, i) => <li key={i}>{KIND[d.recipientKind] ?? d.recipientKind}{d.recipient ? ` · ${d.recipient}` : ''}: <strong>{d.status === 'SENT' ? 'sent' : d.status === 'FAILED' ? 'not delivered' : 'not set up'}</strong></li>)}</ul>
        <div className="wf-row-actions">
          {a.status === 'ACTIVE' && <button type="button" className="health-button health-button-primary" disabled={mutation.busy} onClick={() => mutation.run(() => apiRequest(`/ops/sos/${a.id}/acknowledge`, { method: 'POST' }), alerts.reload)}>Acknowledge — we're responding</button>}
          <button type="button" className="health-button" disabled={mutation.busy} onClick={() => { setResolving(a); setNote(''); }}>Close with a note</button>
        </div>
      </article>)}</div> : <EmptyState title="No open SOS alerts." description="New alerts appear here within 15 seconds, and campus security is also messaged on WhatsApp." />}
    </DataState>

    <SecurityContacts isSuperAdmin={isSuperAdmin} />

    {resolving && <ShopDialog title={`Close SOS from ${resolving.student.name}`} onClose={() => setResolving(null)}>
      <form className="wf-form" onSubmit={e => { e.preventDefault(); mutation.run(() => apiRequest(`/ops/sos/${resolving.id}/resolve`, { method: 'POST', body: JSON.stringify({ note }) }), () => { setResolving(null); alerts.reload(); }); }}>
        <FormError message={mutation.error} />
        <Field label="What happened" hint="The student sees this note. No diagnosis or medical detail."><textarea required minLength={2} maxLength={1000} rows={3} value={note} onChange={e => setNote(e.target.value)} /></Field>
        <SubmitButton busy={mutation.busy}>Close SOS</SubmitButton>
      </form>
    </ShopDialog>}
  </>;
}

function SecurityContacts({ isSuperAdmin }: { isSuperAdmin: boolean }) {
  const [campus, setCampus] = useState('');
  const path = isSuperAdmin ? (campus.trim().length >= 2 ? `/ops/campus/security-contacts?campus=${encodeURIComponent(campus.trim())}` : null) : '/ops/campus/security-contacts';
  const contacts = useApiResource<{ items: SecurityContact[] }>(path);
  const mutation = useMutation();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');

  return <section className="wf-card wf-section-gap" aria-labelledby="sos-contacts-title">
    <div className="wf-panel-heading"><div>
      <span className="care-eyebrow">WHO AN SOS WAKES UP</span>
      <h3 id="sos-contacts-title">Campus security contacts</h3>
      <p>Each gets a WhatsApp message the moment a student at this campus presses SOS. Numbers are shown masked.</p>
    </div></div>
    {isSuperAdmin && <Field label="Campus"><input value={campus} onChange={e => setCampus(e.target.value)} placeholder="e.g. IIT Hyderabad" /></Field>}
    {path && <DataState {...contacts} retry={contacts.reload}>
      {contacts.data?.items.length ? <div className="wf-order-list">{contacts.data.items.map(c => <div className="wf-order-line" key={c.id}><div><strong>{c.name}</strong><small>{c.phone}</small></div>
        <button type="button" className="wf-icon-button" aria-label={`Remove ${c.name}`} disabled={mutation.busy} onClick={() => mutation.run(() => apiRequest(`/ops/campus/security-contacts/${c.id}`, { method: 'DELETE' }), contacts.reload)}><Trash2 size={16} /></button></div>)}</div>
        : <EmptyState title="No security contacts yet." description="Until you add one, an SOS reaches only this console and the student's emergency contact." />}
    </DataState>}
    {path && <form className="wf-form wf-section-gap" onSubmit={e => { e.preventDefault(); mutation.run(() => apiRequest('/ops/campus/security-contacts', { method: 'POST', body: JSON.stringify({ name, phone, ...(isSuperAdmin ? { campus: campus.trim() } : {}) }) }), () => { setName(''); setPhone(''); contacts.reload(); }); }}>
      <FormError message={mutation.error} />
      <div className="wf-form-grid">
        <Field label="Name or desk"><input required minLength={2} maxLength={120} value={name} onChange={e => setName(e.target.value)} placeholder="Main gate security" /></Field>
        <Field label="WhatsApp number"><input required type="tel" minLength={10} maxLength={32} value={phone} onChange={e => setPhone(e.target.value)} placeholder="+91 90000 00000" /></Field>
      </div>
      <SubmitButton busy={mutation.busy}>Add contact</SubmitButton>
    </form>}
  </section>;
}
