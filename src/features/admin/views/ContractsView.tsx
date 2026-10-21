import React, { useEffect, useState } from 'react';
import { observer } from 'mobx-react-lite';
import { DataTable, Drawer, FormField, SkButton } from '@/design-system';
import type { DataTableRow } from '@/design-system';
import { navigate } from '@/lib/utils/workflowRouting';
import { displayDate } from '@/data/types/workflowTypes';
import { AdminError, AdminLoading } from '@/screens/workspace/admin/AdminPage';
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

/**
 * Super Admin > Organisations > Inquiries & contracts: enterprise inquiries (status can
 * be moved on) and contracts, from the billing API; a new contract is drafted in a
 * drawer. Same data and actions as before, on the design system's tables.
 */
export const ContractsView = observer(function ContractsView() {
  const t = useT();
  const [vm] = useState(() => new ContractsViewModel(contractsRepository));
  useEffect(() => { void vm.load(); return vm.dispose; }, [vm]);
  // Whether the contract form is open is presentation state.
  const [drafting, setDrafting] = useState(false);
  const { inquiries, contracts, form: contract } = vm;

  const loading = vm.loading && !inquiries.length && !contracts.length;

  const inquiryRows: DataTableRow[] = inquiries.map(inquiry => ({
    id: inquiry.id,
    cells: [
      { text: inquiry.organization, sub: inquiry.message || undefined, weight: 'strong' },
      { text: inquiry.contactName, sub: inquiry.email },
      { text: t('admin.contracts.seats', { count: inquiry.seats }) },
      { text: inquiry.planId, mono: true },
      { text: displayDate(inquiry.createdAt), weight: 'muted' },
      {
        node: <select className="sk-board-select" aria-label={t('admin.contracts.inquiryStatus', { organization: inquiry.organization })} value={inquiry.status} disabled={vm.acting} onChange={event => void vm.setInquiryStatus(inquiry.id, event.target.value)}>
          {INQUIRY_STATUSES.map(status => <option key={status} value={status}>{t(INQUIRY_STATUS_LABEL[status])}</option>)}
        </select>,
      },
    ],
  }));
  const contractRows: DataTableRow[] = contracts.map(row => ({
    id: row.id,
    cells: [
      { text: row.organization, weight: 'strong' },
      { text: row.planId, mono: true },
      { text: t('admin.contracts.seats', { count: row.seats }), sub: t('admin.contracts.assigned', { count: row.assigned.length }) },
      { text: t('adminBoard.contracts.period', { start: displayDate(row.periodStart), end: displayDate(row.periodEnd) }), weight: 'muted' },
      { pill: { label: row.status, tone: row.status === 'ACTIVE' ? 'positive' : 'neutral' } },
    ],
  }));

  return <div className="sk-ctp-panel">
    <div className="sk-board-actions">
      <SkButton variant="secondary" onClick={() => navigate('pricing')}>{t('admin.contracts.viewPlans')}</SkButton>
      <SkButton onClick={() => setDrafting(true)}>{t('admin.contracts.new')}</SkButton>
    </div>
    {!drafting && vm.actionError ? <p className="sk-board-error" role="alert">{vm.actionError}</p> : null}
    {loading ? <AdminLoading label={t('adminBoard.contracts.loading')} />
      : vm.error ? <AdminError title={t('adminBoard.contracts.error')} message={vm.error} onRetry={() => void vm.load()} />
        : <>
    <DataTable
      title={t('admin.contracts.inquiries')}
      caption={t('admin.contracts.inquiries')}
      columns={[{ label: t('admin.col.organisation') }, { label: t('adminBoard.contracts.colContact') }, { label: t('adminBoard.contracts.colSeats') }, { label: t('admin.col.plan') }, { label: t('adminBoard.contracts.colReceived') }, { label: t('admin.col.state') }]}
      rows={inquiryRows}
      emptyMessage={{ title: t('admin.contracts.noInquiries'), body: t('adminBoard.contracts.noInquiriesBody') }}
    />
    <DataTable
      title={t('admin.contracts.active')}
      caption={t('admin.contracts.active')}
      columns={[{ label: t('admin.col.organisation') }, { label: t('admin.col.plan') }, { label: t('adminBoard.contracts.colSeats') }, { label: t('adminBoard.contracts.colPeriod') }, { label: t('admin.col.state') }]}
      rows={contractRows}
      emptyMessage={{ title: t('admin.contracts.noContracts'), body: t('adminBoard.contracts.noContractsBody') }}
    />
    </>}
    {drafting ? <Drawer open title={t('admin.contracts.createTitle')} busy={vm.acting} onClose={() => setDrafting(false)}>
      <form className="sk-board-form" onSubmit={event => { event.preventDefault(); void vm.createContract().then(created => { if (created) setDrafting(false); }); }}>
        {vm.actionError ? <p className="sk-board-error" role="alert">{vm.actionError}</p> : null}
        <FormField label={t('admin.contracts.organization')}><input value={contract.organization} onChange={event => vm.setField('organization', event.target.value)} required /></FormField>
        <FormField label={t('admin.col.plan')}>
          <select value={contract.planId} onChange={event => vm.setField('planId', event.target.value)}>
            <option value="CAMPUS">{t('admin.contracts.planCampus')}</option>
            <option value="ENTERPRISE">{t('admin.contracts.planEnterprise')}</option>
          </select>
        </FormField>
        <FormField label={t('admin.contracts.managerEmail')}><input type="email" value={contract.managerEmail} onChange={event => vm.setField('managerEmail', event.target.value)} required /></FormField>
        <FormField label={t('admin.contracts.seatsField')}><input type="number" min={1} value={contract.seats} onChange={event => vm.setField('seats', Number(event.target.value))} /></FormField>
        <FormField label={t('admin.contracts.amount')}><input type="number" min={0} value={contract.annualAmountPaise} onChange={event => vm.setField('annualAmountPaise', Number(event.target.value))} /></FormField>
        <FormField label={t('admin.contracts.reference')}><input value={contract.signedReference} onChange={event => vm.setField('signedReference', event.target.value)} /></FormField>
        <SkButton type="submit" busy={vm.acting}>{t('admin.contracts.createSubmit')}</SkButton>
      </form>
    </Drawer> : null}
  </div>;
});
