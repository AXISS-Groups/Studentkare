import React, { useEffect, useState } from 'react';
import { observer } from 'mobx-react-lite';
import { Plus } from 'lucide-react';
import { DataState, Field, FormError, Pagination, SubmitButton } from '@/components/interface/WorkflowUI';
import { ShopDialog } from '@/components/marketplace/ShopDialog';
import { accountsRepository } from '../model/accountsRepository';
import { ACCOUNTS_PAGE_SIZE, AccountsListViewModel } from '../viewmodels/AccountsListViewModel';
import { PARTNER_KIND_LABEL, PARTNER_KINDS } from '@/screens/vendor/partnerAccess';
import type { PartnerKind } from '@/data/workflowTypes';

const isPartnerKind = (value: string): value is PartnerKind => PARTNER_KINDS.some(kind => kind === value);

/** Accounts & roles → Manage accounts: list, search and filter accounts, and create staff accounts. */
export const AccountsListView = observer(function AccountsListView() {
  const [vm] = useState(() => new AccountsListViewModel(accountsRepository));
  useEffect(() => { void vm.load(); return vm.dispose; }, [vm]);
  // Whether the create form is open is presentation state.
  const [adding, setAdding] = useState(false);

  return <><div className="wf-panel-heading"><div><span className="care-eyebrow">SERVER-ASSIGNED ACCESS</span><h2>Accounts & provider roles.</h2><p>Staff accounts are provisioned here. Public signup always creates a student account.</p></div><button className="health-button health-button-primary" onClick={() => setAdding(true)}><Plus size={16} />Create staff account</button></div>
  <div style={{ display: 'flex', gap: '12px', marginBottom: '16px', flexWrap: 'wrap' }}>
    <input
      type="search"
      placeholder="Search accounts by name or email/phone…"
      value={vm.query}
      onChange={e => vm.setQuery(e.target.value)}
      style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--rule)', backgroundColor: 'var(--surface)', color: 'var(--text)', minWidth: '240px', flex: 1 }}
    />
    <select
      value={vm.roleFilter}
      onChange={e => vm.setRoleFilter(e.target.value)}
      style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--rule)', backgroundColor: 'var(--surface)', color: 'var(--text)' }}
    >
      <option value="">All roles</option>
      <option value="SUPER_ADMIN">Super Admin</option>
      <option value="VENDOR">Vendor / Partner</option>
      <option value="NMC_DOCTOR">Clinician</option>
      <option value="CAMPUS_ADMIN">Campus Admin</option>
      <option value="STUDENT">Student</option>
    </select>
  </div>
  <DataState loading={vm.loading} error={vm.error} retry={vm.reload}><FormError message={vm.kindError} /><div className="wf-card wf-table-scroll"><table><thead><tr><th>Name</th><th>Verified at sign-in</th><th>Role</th><th>Partner type</th><th>Status</th></tr></thead><tbody>{vm.data?.items.map(account => <tr key={account.id}><td>{account.fullName}</td><td>{account.identifier}</td><td>{account.role.replace(/_/g, ' ')}</td><td>{account.role === 'VENDOR'
    // Decides which partner dashboard and tools the account sees. Only a super admin can change it.
    ? <select aria-label={`Partner type for ${account.fullName}`} value={account.partnerKind || ''} disabled={vm.updatingKindFor !== ''} onChange={event => { if (isPartnerKind(event.target.value)) void vm.changePartnerKind(account.id, event.target.value); }}>{!account.partnerKind && <option value="" disabled>Not set — no tools yet</option>}{PARTNER_KINDS.map(kind => <option key={kind} value={kind}>{PARTNER_KIND_LABEL[kind]}</option>)}</select>
    : '—'}</td><td><span className="wf-status">{account.active ? 'Active' : 'Inactive'}</span></td></tr>)}</tbody></table></div>
  <Pagination page={vm.page} total={vm.total} pageSize={ACCOUNTS_PAGE_SIZE} onChange={vm.setPage} />
  </DataState>{adding && <ShopDialog title="Create a staff account" onClose={() => setAdding(false)}><form className="wf-form" onSubmit={event => { event.preventDefault(); void vm.create().then(created => { if (created) setAdding(false); }); }}><FormError message={vm.createError} /><Field label="Full name"><input required minLength={2} maxLength={120} value={vm.fullName} onChange={event => vm.setFullName(event.target.value)} /></Field><Field label="Role"><select value={vm.role} onChange={event => vm.setRole(event.target.value)}><option value="VENDOR">Partner (pharmacy, lab, clinic or wellness centre)</option><option value="NMC_DOCTOR">Clinician</option><option value="CAMPUS_ADMIN">Campus administrator</option></select></Field>{vm.role === 'VENDOR' && <Field label="Partner type"><select required value={vm.partnerKind} onChange={event => vm.setPartnerKind(isPartnerKind(event.target.value) ? event.target.value : '')}><option value="" disabled>Choose a partner type</option>{PARTNER_KINDS.map(kind => <option key={kind} value={kind}>{PARTNER_KIND_LABEL[kind]}</option>)}</select></Field>}{vm.role === 'VENDOR' && <p>The partner type decides which dashboard, sidebar and tools the partner sees. The partner cannot change it; you can, from this list.</p>}<Field label="Sign-in channel"><select value={vm.channel} onChange={event => vm.setChannel(event.target.value)}><option value="EMAIL">Email</option><option value="WHATSAPP">WhatsApp</option></select></Field><Field label="Contact address"><input required type={vm.channel === 'EMAIL' ? 'email' : 'tel'} maxLength={254} value={vm.identifier} onChange={event => vm.setIdentifier(event.target.value)} /></Field><p>The account holder must verify this contact address at login. Creating a clinician account does not independently validate a professional licence.</p><SubmitButton busy={vm.creating}>Create account</SubmitButton></form></ShopDialog>}</>;
});
