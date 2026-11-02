import React, { useState } from 'react';
import { Icon } from '@/design-system/icons';
import { AppearanceSetting } from '@/features/account/views/AppearanceSetting';
import { useAuth } from '@/data/contexts/AuthContext';
import { apiRequest } from '@/data/services/http';
import type { MemberProfile } from '@/data/types/workflowTypes';
import { Field, FormError, SubmitButton, useMutation } from '@/components/interface/WorkflowUI';
import { useT } from '@/i18n';
import './member-profile.css';

const bloodGroups = ['', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
const medicalList = (value: string) => value.split('\n').map(item => item.trim()).filter(Boolean);
const editableProfile = (profile: MemberProfile) => ({
  fullName: profile.fullName, dob: profile.dob, university: profile.university, rollNumber: profile.rollNumber,
  bloodGroup: profile.bloodGroup, emergencyContactName: profile.emergencyContactName,
  emergencyContactPhone: profile.emergencyContactPhone, emergencyContactRelation: profile.emergencyContactRelation,
  allergies: profile.allergies.join('\n'), chronicConditions: profile.chronicConditions.join('\n'),
});

export function ProfileForm({ initial, onOpenDigitalId }: { initial: MemberProfile; onOpenDigitalId: () => void }) {
  const t = useT();
  const { updateUser } = useAuth();
  const [saved, setSaved] = useState(initial);
  const [form, setForm] = useState(() => editableProfile(initial));
  const [saveDone, setSaveDone] = useState(false);
  const mutation = useMutation();
  const set = (key: keyof typeof form, value: string) => { setForm(previous => ({ ...previous, [key]: value })); setSaveDone(false); };
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
        setSaveDone(true);
      });
    }}>
      <div><span className="care-eyebrow">{t('member.profile.personalEyebrow')}</span><h3>{t('member.profile.personalTitle')}</h3></div>
      <div className="member-contact-note"><Icon name="shield-check" size={18} /><div><strong>{t('member.profile.signInContact')}</strong><span>{saved.email || saved.phone}</span><small>{t('member.profile.signInContactNote')}</small></div></div>
      <fieldset disabled={mutation.busy} className="member-fieldset">
        <legend className="member-sr-only">{t('member.profile.legend')}</legend>
        <div className="wf-form-grid">
          <Field label={t('member.profile.fullName')}><input required minLength={2} maxLength={120} autoComplete="name" value={form.fullName} onChange={e => set('fullName', e.target.value)} /></Field>
          <Field label={t('member.profile.dob')}><input type="date" required={Boolean(saved.dob)} min="1900-01-01" max={new Date().toLocaleDateString('en-CA')} autoComplete="bday" value={form.dob} onChange={e => set('dob', e.target.value)} /></Field>
          <Field label={t('member.profile.university')}><input maxLength={160} value={form.university} onChange={e => set('university', e.target.value)} /></Field>
          <Field label={t('member.profile.rollNumber')}><input maxLength={80} value={form.rollNumber} onChange={e => set('rollNumber', e.target.value)} /></Field>
        </div>
        {identityChanged && <p className="wf-notice">{t('member.profile.identityWarning')}</p>}
        <div className="member-form-divider"><span className="care-eyebrow">{t('member.profile.emergencyEyebrow')}</span><h3>{t('member.profile.emergencyTitle')}</h3><p>{t('member.profile.emergencyBody')}</p></div>
        <div className="wf-form-grid">
          <Field label={t('member.profile.bloodGroup')}><select value={form.bloodGroup} onChange={e => set('bloodGroup', e.target.value)}>{bloodGroups.map(group => <option key={group} value={group}>{group || t('member.profile.bloodUnknown')}</option>)}</select></Field>
          <Field label={t('member.profile.contactName')}><input maxLength={120} value={form.emergencyContactName} onChange={e => set('emergencyContactName', e.target.value)} /></Field>
          <Field label={t('member.profile.contactPhone')}><input type="tel" maxLength={32} value={form.emergencyContactPhone} onChange={e => set('emergencyContactPhone', e.target.value)} /></Field>
          <Field label={t('member.profile.relationship')}><input maxLength={60} placeholder={t('member.profile.relationshipPlaceholder')} value={form.emergencyContactRelation} onChange={e => set('emergencyContactRelation', e.target.value)} /></Field>
          <Field label={t('member.profile.allergies')} hint={t('member.profile.allergiesHint')}><textarea maxLength={4829} value={form.allergies} onChange={e => set('allergies', e.target.value)} /></Field>
          <Field label={t('member.profile.conditions')} hint={t('member.profile.conditionsHint')}><textarea maxLength={4829} value={form.chronicConditions} onChange={e => set('chronicConditions', e.target.value)} /></Field>
        </div>
      </fieldset>
      <FormError message={mutation.error} />
      {saveDone && <div className="wf-notice" role="status">{t('member.profile.saved')}</div>}
      <SubmitButton busy={mutation.busy}>{t('member.profile.save')}</SubmitButton>
    </form>
    <aside className="member-profile-aside">
      <section className="wf-card member-status-card">
        <Icon name="shield-check" size={24} />
        <span className="care-eyebrow">{t('member.profile.accountEyebrow')}</span>
        <h3>{saved.fullName}</h3>
        <p>{saved.isVerifiedStudent ? t('member.profile.campusVerified') : t('member.profile.campusNotVerified')}</p>
        <p>{saved.ageVerified ? t('member.profile.ageVerified') : t('member.profile.ageSelfReported')}</p>
        <button type="button" className="health-text-button" onClick={onOpenDigitalId}>
          <Icon name="id-card" size={15} /> {t('member.profile.openDigitalId')} <Icon name="arrow-up-right" size={15} />
        </button>
      </section>
      <AppearanceSetting />
      <section className="wf-card member-print-card member-emergency-card">
        <Icon name="heart-pulse" size={25} />
        <span className="care-eyebrow">{t('member.profile.cardEyebrow')}</span>
        <h3>{saved.fullName}</h3>
        <dl>
          <div><dt>{t('member.profile.cardBlood')}</dt><dd>{saved.bloodGroup || t('member.profile.notProvided')}</dd></div>
          <div><dt>{t('member.profile.cardContact')}</dt><dd>{saved.emergencyContactName || t('member.profile.notProvided')}</dd></div>
          <div><dt>{t('member.profile.cardPhone')}</dt><dd>{saved.emergencyContactPhone || t('member.profile.notProvided')}</dd></div>
          <div><dt>{t('member.profile.relationship')}</dt><dd>{saved.emergencyContactRelation || t('member.profile.notProvided')}</dd></div>
        </dl>
        <p>{t('member.profile.cardNote')}</p>
        <small>{saved.updatedAt ? t('member.profile.savedOn', { date: new Date(saved.updatedAt * 1000).toLocaleDateString() }) : t('member.profile.nothingSaved')}</small>
      </section>
      <button type="button" className="health-button" disabled={!saved.emergencyContactPhone} onClick={() => window.print()}>{t('member.profile.print')}</button>
    </aside>
  </div>;
}
