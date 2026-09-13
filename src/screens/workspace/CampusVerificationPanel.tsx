import React, { useState } from 'react';
import { CheckCircle2, GraduationCap, ShieldCheck } from 'lucide-react';
import { useApiResource } from '../../hooks/useApiResource';
import { useAuth } from '../../data/AuthContext';
import { apiRequest } from '../../data/http';
import { Field, FormError, SubmitButton, useMutation } from '../../components/interface/WorkflowUI';
import { DataState, EmptyState } from '../../components/interface/WorkflowUI';
import '../../theme/workflows.css';

interface Verification { status: string; university: string; rollNumber: string; verifiedBy?: string; verifiedAt?: number; }
interface Pending { accountId: string; fullName: string; email: string; university: string; rollNumber: string; status: string; }

export function CampusVerificationPanel() {
  const { user } = useAuth();
  const resource = useApiResource<Verification>('/campus/verification');
  const pending = useApiResource<{ items: Pending[] }>('/ops/campus/pending');
  const [university, setUniversity] = useState('');
  const [rollNumber, setRollNumber] = useState('');
  const [notice, setNotice] = useState('');
  const mutation = useMutation();
  const verifyMutation = useMutation();

  const isStaff = user?.role !== 'STUDENT';

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    mutation.run(() => apiRequest('/campus/verification', { method: 'POST', body: JSON.stringify({ university, rollNumber }) }), () => { setNotice('Verification submitted. A campus administrator will review it.'); resource.reload(); });
  };

  return <>
    <div className="wf-panel-heading"><div>
      <span className="care-eyebrow">{isStaff ? 'CAMPUS VERIFICATION QUEUE' : 'CAMPUS AFFILIATION'}</span>
      <h2>{isStaff ? 'Verify student affiliations.' : 'Confirm your campus affiliation.'}</h2>
      <p>{isStaff ? 'Review and verify student campus membership submissions.' : 'Confirm your university and roll number to unlock verified-student status.'}</p>
    </div></div>

    {!isStaff && <section className="wf-card wf-form" style={{ maxWidth: 560 }}>
      <span className="care-eyebrow">SUBMIT YOUR DETAILS</span>
      <DataState {...resource} retry={resource.reload}>
        <div className="wf-notice" role="status" style={{ marginBottom: 14 }}><GraduationCap size={18} />Current status: <strong>{resource.data?.status || 'Not submitted'}</strong></div>
        {resource.data?.status === 'VERIFIED' ? <div className="wf-notice" style={{ background: '#ecfdf5', color: '#065f46', borderColor: '#a7f3d0' }}><CheckCircle2 size={18} />Your campus affiliation is verified.</div> : <form className="wf-form" onSubmit={submit}>
          <FormError message={mutation.error} />
          <Field label="University or institution"><input required minLength={2} maxLength={160} value={university} onChange={event => setUniversity(event.target.value)} /></Field>
          <Field label="Student or roll number"><input required maxLength={80} value={rollNumber} onChange={event => setRollNumber(event.target.value)} /></Field>
          <SubmitButton busy={mutation.busy}>Submit for verification</SubmitButton>
        </form>}
        {notice && <div className="wf-notice" role="status" style={{ marginTop: 14, background: '#ecfdf5', color: '#065f46', borderColor: '#a7f3d0' }}><CheckCircle2 size={18} />{notice}</div>}
      </DataState>
    </section>}

    {isStaff && <section className="wf-card">
      <div className="wf-panel-heading"><div><span className="care-eyebrow">PENDING SUBMISSIONS</span><h3>Awaiting review</h3></div></div>
      <DataState {...pending} retry={pending.reload}>
        {pending.data?.items.length ? <div className="wf-order-list">{pending.data.items.map(item => <div className="wf-order-line" key={item.accountId}><div><strong>{item.fullName}</strong><small>{item.email} · {item.university} · {item.rollNumber}</small></div><div className="wf-row-actions"><button className="health-button health-button-primary" disabled={verifyMutation.busy} onClick={() => verifyMutation.run(() => apiRequest(`/ops/campus/${item.accountId}`, { method: 'PATCH', body: JSON.stringify({ status: 'VERIFIED' }) }), pending.reload)}><ShieldCheck size={16} />Verify</button><button className="health-button" disabled={verifyMutation.busy} onClick={() => verifyMutation.run(() => apiRequest(`/ops/campus/${item.accountId}`, { method: 'PATCH', body: JSON.stringify({ status: 'REJECTED' }) }), pending.reload)}>Reject</button></div></div>)}</div> : <EmptyState title="No pending verifications." description="Student submissions appear here for review." />}
      </DataState>
    </section>}
  </>;
}
