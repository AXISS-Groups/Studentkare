import React, { useEffect, useState } from 'react';
import { observer } from 'mobx-react-lite';
import { ArrowRight, Plus, ShieldCheck } from 'lucide-react';
import { navigate } from '@/lib/workflowRouting';
import { DataState, Field, FormError, SubmitButton } from '@/components/interface/WorkflowUI';
import { displayDate } from '@/data/workflowTypes';
import { contractsRepository } from '../model/contractsRepository';
import { INQUIRY_STATUSES } from '../model/types';
import { ContractsViewModel } from '../viewmodels/ContractsViewModel';

/** Super Admin → Organisations → Inquiries & contracts. */
export const ContractsView = observer(function ContractsView() {
  const [vm] = useState(() => new ContractsViewModel(contractsRepository));
  useEffect(() => { void vm.load(); return vm.dispose; }, [vm]);
  // Whether the contract form is shown is presentation state.
  const [showContract, setShowContract] = useState(false);
  const { inquiries, contracts, form: contract } = vm;

  return <div className="wf-panel">
    <div className="wf-panel-heading">
      <div><span className="care-eyebrow">BILLING & INSTITUTIONAL</span><h2>Inquiries and contracts.</h2><p>Review institutional inquiries, then create and activate signed contracts with recorded payments.</p></div>
      <div className="wf-row-actions"><button className="health-text-button" onClick={() => navigate('pricing')}><ShieldCheck size={15} />View public plans <ArrowRight size={15} /></button><button className="health-button" onClick={() => setShowContract(true)}><Plus size={15} />New contract</button></div>
    </div>
    <FormError message={vm.actionError} />
    <DataState loading={vm.loading} error={vm.error} retry={() => void vm.load()}>
      <div className="wf-card"><h3>Institutional inquiries</h3>
        {!inquiries.length ? <p className="wf-fineprint">No inquiries yet.</p> : <ul className="wf-billing-receipts">{inquiries.map(inquiry => <li key={inquiry.id}>
          <span><strong>{inquiry.organization}</strong><small>{inquiry.contactName} · {inquiry.email} · {inquiry.seats} seats · {inquiry.planId} · {displayDate(inquiry.createdAt)}</small>{inquiry.message && <small>{inquiry.message}</small>}</span>
          <select aria-label={`Inquiry status ${inquiry.organization}`} value={inquiry.status} onChange={e => void vm.setInquiryStatus(inquiry.id, e.target.value)}>
            {INQUIRY_STATUSES.map(status => <option key={status} value={status}>{status}</option>)}
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
      <form className="wf-form" onSubmit={e => { e.preventDefault(); void vm.createContract().then(created => { if (created) setShowContract(false); }); }}>
        <Field label="Organization"><input value={contract.organization} onChange={e => vm.setField('organization', e.target.value)} required /></Field>
        <Field label="Plan"><select value={contract.planId} onChange={e => vm.setField('planId', e.target.value)}><option value="CAMPUS">Campus</option><option value="ENTERPRISE">Enterprise</option></select></Field>
        <Field label="Manager email"><input type="email" value={contract.managerEmail} onChange={e => vm.setField('managerEmail', e.target.value)} required /></Field>
        <Field label="Seats"><input type="number" min={1} value={contract.seats} onChange={e => vm.setField('seats', Number(e.target.value))} /></Field>
        <Field label="Annual amount (paise)"><input type="number" min={0} value={contract.annualAmountPaise} onChange={e => vm.setField('annualAmountPaise', Number(e.target.value))} /></Field>
        <Field label="Signed reference"><input value={contract.signedReference} onChange={e => vm.setField('signedReference', e.target.value)} /></Field>
        <SubmitButton busy={vm.acting}>Create contract</SubmitButton>
      </form>
    </div>}
  </div>;
});
