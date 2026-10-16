import React, { useState } from 'react';
import { navigate } from '../../lib/workflowRouting';
import { CheckCircle2, GraduationCap, ShieldCheck } from 'lucide-react';
import { useApiResource } from '../../hooks/useApiResource';
import { useAuth } from '../../data/AuthContext';
import { apiRequest } from '../../data/http';
import { Field, FormError, SubmitButton, useMutation } from '../../components/interface/WorkflowUI';
import { DataState, EmptyState } from '../../components/interface/WorkflowUI';
import { useT } from '@/i18n';
import type { MessageKey } from '@/i18n';
import '../../theme/workflows.css';

interface Verification { status: string; university: string; rollNumber: string; verifiedBy?: string; verifiedAt?: number; }
const CAMPUS_STATUSES = ['VERIFIED', 'PENDING', 'NOT_SUBMITTED', 'REJECTED'] as const;
const isCampusStatus = (value: string): value is typeof CAMPUS_STATUSES[number] => (CAMPUS_STATUSES as readonly string[]).includes(value);

interface Pending { accountId: string; fullName: string; email: string; university: string; rollNumber: string; status: string; }

const positiveNotice: React.CSSProperties = { background: 'var(--sk-color-positive-bg)', color: 'var(--sk-color-text)', borderColor: 'var(--sk-color-positive)' };

export function CampusVerificationPanel() {
  const t = useT();
  const { user } = useAuth();
  const isStaff = user?.role === 'CAMPUS_ADMIN' || user?.role === 'SUPER_ADMIN';
  const resource = useApiResource<Verification>('/campus/verification');
  const pending = useApiResource<{ items: Pending[] }>(isStaff ? '/ops/campus/pending' : null);
  const [university, setUniversity] = useState('');
  const [rollNumber, setRollNumber] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const mutation = useMutation();
  const verifyMutation = useMutation();

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    mutation.run(() => apiRequest('/campus/verification', { method: 'POST', body: JSON.stringify({ university, rollNumber }) }), () => { setSubmitted(true); resource.reload(); });
  };

  const statusLabel = (status: string | undefined) => !status ? t('member.campus.notSubmitted') : isCampusStatus(status) ? t(`member.digitalId.campus.${status}` as MessageKey) : status;

  return <>
    <div className="wf-panel-heading"><div>
      <span className="care-eyebrow">{isStaff ? t('member.campus.staffEyebrow') : t('member.campus.eyebrow')}</span>
      <h2>{isStaff ? t('member.campus.staffTitle') : t('member.campus.title')}</h2>
      <p>{isStaff ? t('member.campus.staffBody') : t('member.campus.body')}</p>
    </div></div>

    {!isStaff && <section className="wf-card wf-form" style={{ maxWidth: 560 }}>
      <span className="care-eyebrow">{t('member.campus.submitEyebrow')}</span>
      <DataState {...resource} retry={resource.reload}>
        <div className="wf-notice" role="status" style={{ marginBottom: 14 }}><GraduationCap size={18} aria-hidden="true" />{t('member.campus.currentStatus')} <strong>{statusLabel(resource.data?.status)}</strong></div>
        {resource.data?.status === 'VERIFIED' ? <><div className="wf-notice" style={positiveNotice}><CheckCircle2 size={18} aria-hidden="true" />{t('member.campus.verified')}</div>{!isStaff && <button type="button" className="health-text-button" onClick={() => navigate('leave-campus')}>{t('member.campus.leaving')}</button>}</> : <form className="wf-form" onSubmit={submit}>
          <FormError message={mutation.error} />
          <Field label={t('member.profile.university')}><input required minLength={2} maxLength={160} value={university} onChange={event => setUniversity(event.target.value)} /></Field>
          <Field label={t('member.profile.rollNumber')}><input required maxLength={80} value={rollNumber} onChange={event => setRollNumber(event.target.value)} /></Field>
          <SubmitButton busy={mutation.busy}>{t('member.campus.submit')}</SubmitButton>
        </form>}
        {submitted && <div className="wf-notice" role="status" style={{ marginTop: 14, ...positiveNotice }}><CheckCircle2 size={18} aria-hidden="true" />{t('member.campus.submitted')}</div>}
      </DataState>
    </section>}

    {isStaff && <section className="wf-card">
      <div className="wf-panel-heading"><div><span className="care-eyebrow">{t('member.campus.pendingEyebrow')}</span><h3>{t('member.campus.pendingTitle')}</h3></div></div>
      <FormError message={verifyMutation.error} />
      <DataState {...pending} retry={pending.reload}>
        {pending.data?.items.length ? <div className="wf-order-list">{pending.data.items.map(item => <div className="wf-order-line" key={item.accountId}><div><strong>{item.fullName}</strong><small>{item.email} · {item.university} · {item.rollNumber}</small></div><div className="wf-row-actions"><button type="button" className="health-button health-button-primary" disabled={verifyMutation.busy} onClick={() => verifyMutation.run(() => apiRequest(`/ops/campus/${item.accountId}`, { method: 'PATCH', body: JSON.stringify({ status: 'VERIFIED' }) }), pending.reload)}><ShieldCheck size={16} aria-hidden="true" />{t('member.campus.verify')}</button><button type="button" className="health-button" disabled={verifyMutation.busy} onClick={() => verifyMutation.run(() => apiRequest(`/ops/campus/${item.accountId}`, { method: 'PATCH', body: JSON.stringify({ status: 'REJECTED' }) }), pending.reload)}>{t('member.campus.reject')}</button></div></div>)}</div> : <EmptyState title={t('member.campus.noPendingTitle')} description={t('member.campus.noPendingBody')} />}
      </DataState>
    </section>}
  </>;
}
