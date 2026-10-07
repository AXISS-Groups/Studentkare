import React, { useState } from 'react';
import { Phone, UserPlus, Trash2, Lock } from 'lucide-react';
import { Field } from '../../components/interface/WorkflowUI';
import '../../theme/workflows.css';

interface EmergencyContact {
  id: string;
  name: string;
  phone: string;
  relation: string;
  isPrimary: boolean;
  notifyOnSos: boolean;
  breakGlassAccessAllowed: boolean;
}

export function EmergencyContactsSetupScreen() {
  const [contacts, setContacts] = useState<EmergencyContact[]>([
    {
      id: '1',
      name: 'Dr. Ramesh Sharma',
      phone: '+91 98765 43210',
      relation: 'Parent / Father',
      isPrimary: true,
      notifyOnSos: true,
      breakGlassAccessAllowed: true
    },
    {
      id: '2',
      name: 'Hostel Block B Warden Desk',
      phone: '+91 91234 56789',
      relation: 'Campus Warden',
      isPrimary: false,
      notifyOnSos: true,
      breakGlassAccessAllowed: false
    }
  ]);

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [relation, setRelation] = useState('Parent');

  const addContact = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim() && phone.trim()) {
      setContacts([
        ...contacts,
        {
          id: String(Date.now()),
          name,
          phone,
          relation,
          isPrimary: contacts.length === 0,
          notifyOnSos: true,
          breakGlassAccessAllowed: false
        }
      ]);
      setName('');
      setPhone('');
    }
  };

  const removeContact = (id: string) => {
    setContacts(contacts.filter(c => c.id !== id));
  };

  return (
    <div className="wf-container" style={{ padding: '24px', maxWidth: 900, margin: '0 auto' }}>
      <div className="wf-panel-heading">
        <div>
          <span className="care-eyebrow">SAFETY & CRISIS RESPONDERS</span>
          <h2>Emergency Contacts & SOS Setup</h2>
          <p>Designate trusted contacts who receive immediate SMS alerts and break-glass emergency access during campus crisis events.</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 24 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Contact List */}
          <section className="wf-card" style={{ padding: 20 }}>
            <h3 style={{ fontSize: 16, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Phone size={18} /> Emergency Responders ({contacts.length})
            </h3>

            {contacts.length === 0 ? (
              <p style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: 20 }}>No emergency contacts added yet.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {contacts.map(c => (
                  <div key={c.id} style={{ border: '1px solid var(--border)', borderRadius: 10, padding: 16, background: 'var(--surface-card, #fff)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div>
                        <strong style={{ fontSize: 15 }}>{c.name}</strong> {c.isPrimary && <span style={{ fontSize: 11, background: '#dbeafe', color: '#1e40af', padding: '2px 8px', borderRadius: 999, fontWeight: 700, marginLeft: 6 }}>PRIMARY</span>}
                        <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: '2px 0 8px' }}>
                          {c.phone} · Relationship: <strong>{c.relation}</strong>
                        </p>
                      </div>
                      <button 
                        className="health-button" 
                        style={{ minHeight: 36, padding: '0 8px', color: 'var(--emergency, #ef4444)' }}
                        onClick={() => removeContact(c.id)}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>

                    <div style={{ display: 'flex', gap: 16, fontSize: 12, paddingTop: 10, borderTop: '1px dashed var(--border)' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
                        <input 
                          type="checkbox" 
                          checked={c.notifyOnSos}
                          onChange={e => {
                            setContacts(contacts.map(item => item.id === c.id ? { ...item, notifyOnSos: e.target.checked } : item));
                          }}
                        />
                        Send Instant SOS SMS
                      </label>
                      <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
                        <input 
                          type="checkbox" 
                          checked={c.breakGlassAccessAllowed}
                          onChange={e => {
                            setContacts(contacts.map(item => item.id === c.id ? { ...item, breakGlassAccessAllowed: e.target.checked } : item));
                          }}
                        />
                        Allow Break-Glass Health View
                      </label>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Add New Contact Form */}
          <section className="wf-card" style={{ padding: 20 }}>
            <h3 style={{ fontSize: 16, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
              <UserPlus size={18} /> Add New Emergency Contact
            </h3>
            <form onSubmit={addContact} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <Field label="Contact Full Name">
                  <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Smt. Meena Sharma" required />
                </Field>
                <Field label="Mobile Phone Number">
                  <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="+91 98765 43210" required />
                </Field>
              </div>

              <Field label="Relationship to Student">
                <select value={relation} onChange={e => setRelation(e.target.value)}>
                  <option value="Parent / Guardian">Parent / Guardian</option>
                  <option value="Sibling">Sibling</option>
                  <option value="Hostel Warden">Hostel Warden</option>
                  <option value="Campus Resident Doctor">Campus Resident Doctor</option>
                  <option value="Local Guardian">Local Guardian</option>
                </select>
              </Field>

              <button className="health-button health-button-primary" type="submit" style={{ minHeight: 44, width: 'fit-content' }}>
                Save Emergency Contact
              </button>
            </form>
          </section>
        </div>

        {/* Information Sidebar */}
        <div className="wf-card" style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
          <span className="care-eyebrow">DPDP & PRIVACY SAFEGUARD</span>
          <h4 style={{ fontSize: 15, marginTop: 4 }}>How Emergency Access Works</h4>
          <p style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
            Under DPDP Act 2023, your medical records are private by default. Emergency contacts only receive health access when an explicit <strong>Break-Glass Crisis Trigger</strong> is logged by campus medical officers.
          </p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: '#065f46', background: 'rgba(16, 185, 129, 0.1)', padding: 10, borderRadius: 8 }}>
            <Lock size={16} /> All emergency break-glass views generate immutable audit logs.
          </div>
        </div>
      </div>
    </div>
  );
}
