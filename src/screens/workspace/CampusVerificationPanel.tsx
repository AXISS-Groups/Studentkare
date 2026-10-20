import React from 'react';
import { navigate } from '../../lib/utils/workflowRouting';
import { Icon } from '@/design-system/icons';
import { useApiResource } from '../../hooks/api/useApiResource';
import { useAuth } from '../../data/contexts/AuthContext';
import { apiRequest } from '../../data/services/http';
import { FormError, useMutation } from '../../components/interface/WorkflowUI';
import { DataState, EmptyState } from '../../components/interface/WorkflowUI';
import { useT } from '@/i18n';
import { CampusVerifyView } from '@/features/auth/views/CampusVerifyView';
import '../../theme/workflows.css';

interface Pending { accountId: string; fullName: string; email: string; university: string; rollNumber: string; status: string; }

export function CampusVerificationPanel() {
  const t = useT();
  const { user } = useAuth();
  const isStaff = user?.role === 'CAMPUS_ADMIN' || user?.role === 'SUPER_ADMIN';
  const pending = useApiResource<{ items: Pending[] }>(isStaff ? '/ops/campus/pending' : null);
  const verifyMutation = useMutation();

  return <>
    {isStaff && <div className="wf-panel-heading"><div>
      <span className="care-eyebrow">{t('member.campus.staffEyebrow')}</span>
      <h2>{t('member.campus.staffTitle')}</h2>
      <p>{t('member.campus.staffBody')}</p>
    </div></div>}

    {!isStaff && <section className="wf-card">
      {/* The student's side is the canvas CampusVerify board; campuses come from the server. */}
      <CampusVerifyView onLeaving={() => navigate('leave-campus')} />
    </section>}

    {isStaff && <section className="wf-card">
      <div className="wf-panel-heading"><div><span className="care-eyebrow">{t('member.campus.pendingEyebrow')}</span><h3>{t('member.campus.pendingTitle')}</h3></div></div>
      <FormError message={verifyMutation.error} />
      <DataState {...pending} retry={pending.reload}>
        {pending.data?.items.length ? <div className="wf-order-list">{pending.data.items.map(item => <div className="wf-order-line" key={item.accountId}><div><strong>{item.fullName}</strong><small>{item.email} · {item.university} · {item.rollNumber}</small></div><div className="wf-row-actions"><button type="button" className="health-button health-button-primary" disabled={verifyMutation.busy} onClick={() => verifyMutation.run(() => apiRequest(`/ops/campus/${item.accountId}`, { method: 'PATCH', body: JSON.stringify({ status: 'VERIFIED' }) }), pending.reload)}><Icon name="check" size={16} />{t('member.campus.verify')}</button><button type="button" className="health-button" disabled={verifyMutation.busy} onClick={() => verifyMutation.run(() => apiRequest(`/ops/campus/${item.accountId}`, { method: 'PATCH', body: JSON.stringify({ status: 'REJECTED' }) }), pending.reload)}>{t('member.campus.reject')}</button></div></div>)}</div> : <EmptyState title={t('member.campus.noPendingTitle')} description={t('member.campus.noPendingBody')} />}
      </DataState>
    </section>}
  </>;
}
