import React, { useState } from 'react';
import { ArrowUpRight, HeartPulse, IdCard, Printer, ShieldCheck, UserRound } from 'lucide-react';
import { useAuth } from '../../data/AuthContext';
import { apiRequest } from '../../data/http';
import type { MemberProfile } from '../../data/workflowTypes';
import { useApiResource } from '../../hooks/useApiResource';
import { DataState, Field, FormError, SubmitButton, useMutation } from '../../components/interface/WorkflowUI';
import { BillingPanel } from '../billing/BillingPanel';
import { DigitalIdPanel } from './DigitalIdPanel';
import { InsurancePanel } from './MemberPanels';
import './member-profile.css';

const bloodGroups = ['', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
const medicalList = (value: string) => value.split('\n').map(item => item.trim()).filter(Boolean);
const editableProfile = (profile: MemberProfile) => ({
  fullName: profile.fullName, dob: profile.dob, university: profile.university, rollNumber: profile.rollNumber,
  bloodGroup: profile.bloodGroup, emergencyContactName: profile.emergencyContactName,
  emergencyContactPhone: profile.emergencyContactPhone, emergencyContactRelation: profile.emergencyContactRelation,
  allergies: profile.allergies.join('\n'), chronicConditions: profile.chronicConditions.join('\n'),
});

export function MemberProfilePanel({ initialTab = 'profile' }: { initialTab?: 'profile' | 'plan' | 'digital-id' | 'insurance' }) {
  const [activeTab, setActiveTab] = useState<'profile' | 'plan' | 'digital-id' | 'insurance'>(initialTab);
  const resource = useApiResource<MemberProfile>('/profile');

  return <>
    <div className="wf-panel-heading">
      <div>
        <span className="care-eyebrow">MY PROFILE & ACCOUNT WORKSPACE</span>
        <h2>Your profile, plan, digital ID & insurance.</h2>
        <p>Your details, emergency contact, active plan, campus digital ID, and coverage details in one place.</p>
      </div>
    </div>

    {/* Unified Tab Bar */}
    <div className="wf-choice-row" style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBlock: '8px 24px' }}>
      <button
        type="button"
        className={`health-button ${activeTab === 'profile' ? 'health-button-primary' : ''}`}
        aria-pressed={activeTab === 'profile'}
        onClick={() => setActiveTab('profile')}
      >
        <UserRound size={16} /> Personal Details
      </button>

      <button
        type="button"
        className={`health-button ${activeTab === 'plan' ? 'health-button-primary' : ''}`}
        aria-pressed={activeTab === 'plan'}
        onClick={() => setActiveTab('plan')}
      >
        <ShieldCheck size={16} /> My Plan
      </button>

      <button
        type="button"
        className={`health-button ${activeTab === 'digital-id' ? 'health-button-primary' : ''}`}
        aria-pressed={activeTab === 'digital-id'}
        onClick={() => setActiveTab('digital-id')}
      >
        <IdCard size={16} /> Digital ID
      </button>

      <button
        type="button"
        className={`health-button ${activeTab === 'insurance' ? 'health-button-primary' : ''}`}
        aria-pressed={activeTab === 'insurance'}
        onClick={() => setActiveTab('insurance')}
      >
        <ShieldCheck size={16} /> Insurance Details
      </button>
    </div>

    {activeTab === 'profile' && (
      <DataState {...resource} retry={resource.reload}>
        {resource.data && <ProfileForm initial={resource.data} onOpenDigitalId={() => setActiveTab('digital-id')} />}
      </DataState>
    )}

    {activeTab === 'plan' && <BillingPanel />}
    {activeTab === 'digital-id' && <DigitalIdPanel />}
    {activeTab === 'insurance' && <InsurancePanel />}
  </>;
}

function ProfileForm({ initial, onOpenDigitalId }: { initial: MemberProfile; onOpenDigitalId: () => void }) {
  const { updateUser, user } = useAuth();
  const [saved, setSaved] = useState(initial);
  const [form, setForm] = useState(() => editableProfile(initial));
  const [notice, setNotice] = useState('');
  const mutation = useMutation();
  const set = (key: keyof typeof form, value: string) => { setForm(previous => ({ ...previous, [key]: value })); setNotice(''); };
  const identityChanged = ['fullName', 'dob', 'university', 'rollNumber'].some(key => form[key as keyof typeof form].trim() !== saved[key as 'fullName' | 'dob' | 'university' | 'rollNumber']);

  return <div className="member-profile-grid">
    <form className="wf-card wf-form member-profile-form" onSubmit={event => {
      event.preventDefault();
      const { dob, ...details } = form;
      const payload = { ...details, ...(dob ? { dob } : {}), allergies: medicalList(form.allergies), chronicConditions: medicalList(form.chronicConditions) };
      mutation.run(() => apiRequest<MemberProfile>('/profile', { method: 'PATCH', body: JSON.stringify(payload) }), result => {
        setSaved(result); setForm(editableProfile(result));
        updateUser({ id: result.id, fullName: result.fullName, role: result.role, email: result.email,
          phone: result.phone, dob: result.dob, university: result.university, rollNumber: result.rollNumber,
          bloodGroup: result.bloodGroup, ageVerified: result.ageVerified, isVerifiedStudent: result.isVerifiedStudent });
        setNotice('Profile saved to your account.');
      });
    }}>
      <div><span className="care-eyebrow">01 / PERSONAL DETAILS</span><h3>The essentials.</h3></div>
      <div className="member-contact-note"><ShieldCheck size={18} /><div><strong>Verified sign-in contact</strong><span>{saved.email || saved.phone}</span><small>Changing your sign-in contact requires a separate verification flow.</small></div></div>
      <fieldset disabled={mutation.busy} className="member-fieldset">
        <legend className="member-sr-only">Personal and emergency details</legend>
        <div className="wf-form-grid">
          <Field label="Full name"><input required minLength={2} maxLength={120} autoComplete="name" value={form.fullName} onChange={e => set('fullName', e.target.value)} /></Field>
          <Field label="Date of birth"><input type="date" required={Boolean(saved.dob)} min="1900-01-01" max={new Date().toLocaleDateString('en-CA')} autoComplete="bday" value={form.dob} onChange={e => set('dob', e.target.value)} /></Field>
          <Field label="University or institution"><input maxLength={160} value={form.university} onChange={e => set('university', e.target.value)} /></Field>
          <Field label="Student or roll number"><input maxLength={80} value={form.rollNumber} onChange={e => set('rollNumber', e.target.value)} /></Field>
        </div>
        {identityChanged && <p className="wf-notice">Changing identity details resets verification and revokes your existing QR code. You can create a new code after saving.</p>}
        <div className="member-form-divider"><span className="care-eyebrow">02 / EMERGENCY DETAILS</span><h3>Help someone reach your person.</h3><p>These details are self-reported. They are not embedded in your Digital ID.</p></div>
        <div className="wf-form-grid">
          <Field label="Blood group"><select value={form.bloodGroup} onChange={e => set('bloodGroup', e.target.value)}>{bloodGroups.map(group => <option key={group} value={group}>{group || 'Unknown / not provided'}</option>)}</select></Field>
          <Field label="Emergency contact name"><input maxLength={120} value={form.emergencyContactName} onChange={e => set('emergencyContactName', e.target.value)} /></Field>
          <Field label="Emergency phone"><input type="tel" maxLength={32} value={form.emergencyContactPhone} onChange={e => set('emergencyContactPhone', e.target.value)} /></Field>
          <Field label="Relationship"><input maxLength={60} placeholder="e.g. Parent, partner, friend" value={form.emergencyContactRelation} onChange={e => set('emergencyContactRelation', e.target.value)} /></Field>
          <Field label="Allergies" hint="One per line. Leave blank if not recorded; blank does not mean no allergies."><textarea maxLength={4829} value={form.allergies} onChange={e => set('allergies', e.target.value)} /></Field>
          <Field label="Long-term conditions" hint="Optional, one per line. Only record information you want saved in your account."><textarea maxLength={4829} value={form.chronicConditions} onChange={e => set('chronicConditions', e.target.value)} /></Field>
        </div>
      </fieldset>
      <FormError message={mutation.error} />
      {notice && <div className="wf-notice" role="status">{notice}</div>}
      <SubmitButton busy={mutation.busy}>Save profile</SubmitButton>
    </form>
    <aside className="member-profile-aside">
      <section className="wf-card member-status-card">
        <ShieldCheck size={24} />
        <span className="care-eyebrow">YOUR ACCOUNT</span>
        <h3>{saved.fullName}</h3>
        <p>{saved.isVerifiedStudent ? 'Campus affiliation verified' : 'Campus affiliation not verified'}</p>
        <p>{saved.ageVerified ? 'Age evidence verified' : 'Date of birth is self-reported'}</p>
        <button className="health-text-button" onClick={onOpenDigitalId}>
          <IdCard size={15} /> Open Digital ID <ArrowUpRight size={15} />
        </button>
      </section>
      <section className="wf-card member-print-card member-emergency-card">
        <HeartPulse size={25} />
        <span className="care-eyebrow">PERSONAL EMERGENCY CONTACT CARD</span>
        <h3>{saved.fullName}</h3>
        <dl>
          <div><dt>Blood group · self-reported</dt><dd>{saved.bloodGroup || 'Not provided'}</dd></div>
          <div><dt>Emergency contact</dt><dd>{saved.emergencyContactName || 'Not provided'}</dd></div>
          <div><dt>Phone</dt><dd>{saved.emergencyContactPhone || 'Not provided'}</dd></div>
          <div><dt>Relationship</dt><dd>{saved.emergencyContactRelation || 'Not provided'}</dd></div>
        </dl>
        <p>Self-reported contact details. Not a medical record or government ID. This printed copy cannot be remotely updated or revoked.</p>
        <small>{saved.updatedAt ? `Saved ${new Date(saved.updatedAt * 1000).toLocaleDateString()}` : 'No emergency details saved yet.'}</small>
      </section>
      <button className="health-button" disabled={!saved.emergencyContactPhone} onClick={() => window.print()}><Printer size={17} />Print contact card / save PDF</button>
    </aside>
  </div>;
}
