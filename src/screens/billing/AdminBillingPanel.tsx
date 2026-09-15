import React, { useEffect, useState } from 'react';
import { ArrowRight, Plus, ShieldCheck } from 'lucide-react';
import { EnterpriseInquiry, ContractRecord } from '../../data/billing';
import { apiRequest } from '../../data/http';
import { navigate } from '../../lib/workflowRouting';
import { DataState, Field, FormError, SubmitButton, useMutation } from '../../components/interface/WorkflowUI';
import { displayDate } from '../../data/workflowTypes';

export function AdminBillingPanel() {
  const [inquiries, setInquiries] = useState<EnterpriseInquiry[]>([]);
  const [contracts, setContracts] = useState<ContractRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showContract, setShowContract] = useState(false);
  const action = useMutation();

  const load = () => {
    setLoading(true); setError('');
    Promise.all([apiRequest<{ items: EnterpriseInquiry[] }>('/billing/admin/inquiries'), apiRequest<{ items: ContractRecord[] }>('/billing/contracts')])
      .then(([i, c]) => { setInquiries(i.items); setContracts(c.items); }).catch(reason => setError(reason.message)).finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  const [contract, setContract] = useState({ organization: '', planId: 'CAMPUS', managerEmail: '', seats: 1000, annualAmountPaise: 0, signedReference: '' });

  return <div className="wf-panel">
    <div className="wf-panel-heading">
      <div><span className="care-eyebrow">BILLING & INSTITUTIONAL</span><h2>Inquiries and contracts.</h2><p>Review institutional inquiries, then create and activate signed contracts with recorded payments.</p></div>
      <div className="wf-row-actions"><button className="health-text-button" onClick={() => navigate('pricing')}><ShieldCheck size={15} />View public plans <ArrowRight size={15} /></button><button className="health-button" onClick={() => setShowContract(true)}><Plus size={15} />New contract</button></div>
    </div>
    <FormError message={action.error} />
    <DataState loading={loading} error={error} retry={load}>
      <div className="wf-card"><h3>Institutional inquiries</h3>
        {!inquiries.length ? <p className="wf-fineprint">No inquiries yet.</p> : <ul className="wf-billing-receipts">{inquiries.map(inquiry => <li key={inquiry.id}>
          <span><strong>{inquiry.organization}</strong><small>{inquiry.contactName} · {inquiry.email} · {inquiry.seats} seats · {inquiry.planId} · {displayDate(inquiry.createdAt)}</small>{inquiry.message && <small>{inquiry.message}</small>}</span>
          <select aria-label={`Inquiry status ${inquiry.organization}`} value={inquiry.status} onChange={e => action.run(() => apiRequest(`/billing/admin/inquiries/${inquiry.id}`, { method: 'PATCH', body: JSON.stringify({ status: e.target.value }) }).then(load))}>
            {['NEW', 'CONTACTED', 'QUALIFIED', 'CLOSED'].map(status => <option key={status} value={status}>{status}</option>)}
          </select>
        </li>)}</ul>}
      </div>
      <div className="wf-card"><h3>Active contracts</h3>
        {!contracts.length ? <p className="wf-fineprint">No contracts yet. Create one after signing.</p> : <ul className="wf-billing-receipts">{contracts.map(contract => <li key={contract.id}>
          <span><strong>{contract.organization}</strong><small>{contract.planId} · {contract.seats} seats · {contract.assigned.length} assigned · {displayDate(contract.periodStart)} → {displayDate(contract.periodEnd)}</small></span>
          <span className={`wf-status ${contract.status === 'ACTIVE' ? 'status-completed' : ''}`}>{contract.status}</span>
        </li>)}</ul>}
      </div>
    </DataState>

    {showContract && <div className="wf-card">
      <h3>Create a contract</h3>
      <form className="wf-form" onSubmit={e => { e.preventDefault(); action.run(() => apiRequest('/billing/admin/contracts', { method: 'POST', body: JSON.stringify(contract) }).then(() => { setShowContract(false); load(); })); }}>
        <Field label="Organization"><input value={contract.organization} onChange={e => setContract({ ...contract, organization: e.target.value })} required /></Field>
        <Field label="Plan"><select value={contract.planId} onChange={e => setContract({ ...contract, planId: e.target.value })}><option value="CAMPUS">Campus</option><option value="ENTERPRISE">Enterprise</option></select></Field>
        <Field label="Manager email"><input type="email" value={contract.managerEmail} onChange={e => setContract({ ...contract, managerEmail: e.target.value })} required /></Field>
        <Field label="Seats"><input type="number" min={1} value={contract.seats} onChange={e => setContract({ ...contract, seats: Number(e.target.value) })} /></Field>
        <Field label="Annual amount (paise)"><input type="number" min={0} value={contract.annualAmountPaise} onChange={e => setContract({ ...contract, annualAmountPaise: Number(e.target.value) })} /></Field>
        <Field label="Signed reference"><input value={contract.signedReference} onChange={e => setContract({ ...contract, signedReference: e.target.value })} /></Field>
        <SubmitButton busy={action.busy}>Create contract</SubmitButton>
      </form>
    </div>}
  </div>;
}
