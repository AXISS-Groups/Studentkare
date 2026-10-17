import React, { useEffect, useState } from 'react';
import { observer } from 'mobx-react-lite';
import { ArrowRight, Plus, ShieldCheck } from 'lucide-react';
import { navigate } from '@/lib/workflowRouting';
import { DataState, Field, FormError, SubmitButton } from '@/components/interface/WorkflowUI';
import { displayDate } from '@/data/workflowTypes';
import { useT } from '@/i18n';
import type { MessageKey } from '@/i18n';
import { contractsRepository } from '../model/contractsRepository';
import { INQUIRY_STATUSES } from '../model/types';
import { ContractsViewModel } from '../viewmodels/ContractsViewModel';

/** Words for each inquiry status; the option values stay the codes the server expects. */
const INQUIRY_STATUS_LABEL: Record<(typeof INQUIRY_STATUSES)[number], MessageKey> = {
  NEW: 'admin.contracts.statusNEW',
  CONTACTED: 'admin.contracts.statusCONTACTED',
  QUALIFIED: 'admin.contracts.statusQUALIFIED',
  CLOSED: 'admin.contracts.statusCLOSED',
};

/** Super Admin → Organisations → Inquiries & contracts. */
export const ContractsView = observer(function ContractsView() {
  const t = useT();
  const [vm] = useState(() => new ContractsViewModel(contractsRepository));
  useEffect(() => { void vm.load(); return vm.dispose; }, [vm]);
  // Whether the contract form is shown is presentation state.
  const [showContract, setShowContract] = useState(false);
  const { inquiries, contracts, form: contract } = vm;

  return <div className="wf-panel">
    <div className="wf-panel-heading">
      <div><span className="care-eyebrow">{t('admin.contracts.eyebrow')}</span><h2>{t('admin.contracts.title')}</h2><p>{t('admin.contracts.intro')}</p></div>
      <div className="wf-row-actions"><button type="button" className="health-text-button" onClick={() => navigate('pricing')}><ShieldCheck size={15} aria-hidden="true" />{t('admin.contracts.viewPlans')} <ArrowRight size={15} aria-hidden="true" /></button><button type="button" className="health-button" onClick={() => setShowContract(true)}><Plus size={15} aria-hidden="true" />{t('admin.contracts.new')}</button></div>
    </div>
    <FormError message={vm.actionError} />
    <DataState loading={vm.loading} error={vm.error} retry={() => void vm.load()}>
      <div className="wf-card"><h3>{t('admin.contracts.inquiries')}</h3>
        {!inquiries.length ? <p className="wf-fineprint">{t('admin.contracts.noInquiries')}</p> : <ul className="wf-billing-receipts">{inquiries.map(inquiry => <li key={inquiry.id}>
          <span><strong>{inquiry.organization}</strong><small>{inquiry.contactName} · {inquiry.email} · {t('admin.contracts.seats', { count: inquiry.seats })} · {inquiry.planId} · {displayDate(inquiry.createdAt)}</small>{inquiry.message && <small>{inquiry.message}</small>}</span>
          <select aria-label={t('admin.contracts.inquiryStatus', { organization: inquiry.organization })} value={inquiry.status} onChange={e => void vm.setInquiryStatus(inquiry.id, e.target.value)}>
            {INQUIRY_STATUSES.map(status => <option key={status} value={status}>{t(INQUIRY_STATUS_LABEL[status])}</option>)}
          </select>
        </li>)}</ul>}
      </div>
      <div className="wf-card"><h3>{t('admin.contracts.active')}</h3>
        {!contracts.length ? <p className="wf-fineprint">{t('admin.contracts.noContracts')}</p> : <ul className="wf-billing-receipts">{contracts.map(contract => <li key={contract.id}>
          <span><strong>{contract.organization}</strong><small>{contract.planId} · {t('admin.contracts.seats', { count: contract.seats })} · {t('admin.contracts.assigned', { count: contract.assigned.length })} · {displayDate(contract.periodStart)} → {displayDate(contract.periodEnd)}</small></span>
          <span className={`wf-status ${contract.status === 'ACTIVE' ? 'status-completed' : ''}`}>{contract.status}</span>
        </li>)}</ul>}
      </div>
    </DataState>

    {showContract && <div className="wf-card">
      <h3>{t('admin.contracts.createTitle')}</h3>
      <form className="wf-form" onSubmit={e => { e.preventDefault(); void vm.createContract().then(created => { if (created) setShowContract(false); }); }}>
        <Field label={t('admin.contracts.organization')}><input value={contract.organization} onChange={e => vm.setField('organization', e.target.value)} required /></Field>
        <Field label={t('admin.col.plan')}><select value={contract.planId} onChange={e => vm.setField('planId', e.target.value)}><option value="CAMPUS">{t('admin.contracts.planCampus')}</option><option value="ENTERPRISE">{t('admin.contracts.planEnterprise')}</option></select></Field>
        <Field label={t('admin.contracts.managerEmail')}><input type="email" value={contract.managerEmail} onChange={e => vm.setField('managerEmail', e.target.value)} required /></Field>
        <Field label={t('admin.contracts.seatsField')}><input type="number" min={1} value={contract.seats} onChange={e => vm.setField('seats', Number(e.target.value))} /></Field>
        <Field label={t('admin.contracts.amount')}><input type="number" min={0} value={contract.annualAmountPaise} onChange={e => vm.setField('annualAmountPaise', Number(e.target.value))} /></Field>
        <Field label={t('admin.contracts.reference')}><input value={contract.signedReference} onChange={e => vm.setField('signedReference', e.target.value)} /></Field>
        <SubmitButton busy={vm.acting}>{t('admin.contracts.createSubmit')}</SubmitButton>
      </form>
    </div>}
  </div>;
});
