import React, { useEffect, useState } from 'react';
import { observer } from 'mobx-react-lite';
import { Icon } from '@/design-system/icons';
import { DataState, Field, FormError, Pagination, SubmitButton } from '@/components/interface/WorkflowUI';
import { ShopDialog } from '@/components/marketplace/ShopDialog';
import { ConfirmDialog } from '@/components/interface/ConfirmDialog';
import { useT } from '@/i18n';
import { accountsRepository } from '../model/accountsRepository';
import { isCampusScopedRole } from '../model/accessRules';
import type { StaffAccount } from '@/data/types/workflowTypes';
import { ACCOUNTS_PAGE_SIZE, AccountsListViewModel } from '../viewmodels/AccountsListViewModel';
import { PARTNER_KIND_LABEL, PARTNER_KINDS } from '@/screens/vendor/partnerAccess';
import type { PartnerKind } from '@/data/types/workflowTypes';

const isPartnerKind = (value: string): value is PartnerKind => PARTNER_KINDS.some(kind => kind === value);

/** Accounts & roles, Manage accounts: list, search and filter accounts, and create staff accounts. */
export const AccountsListView = observer(function AccountsListView() {
  const t = useT();
  const [vm] = useState(() => new AccountsListViewModel(accountsRepository));
  useEffect(() => { void vm.load(); return vm.dispose; }, [vm]);
  // Whether the create form is open is presentation state.
  const [adding, setAdding] = useState(false);
  const [scopeFor, setScopeFor] = useState<StaffAccount | null>(null);
  const [scopeCampus, setScopeCampus] = useState('');

  return <><div className="wf-panel-heading"><div><span className="care-eyebrow">{t('admin.accountsList.eyebrow')}</span><h2>{t('admin.accountsList.title')}</h2><p>{t('admin.accountsList.intro')}</p></div><button type="button" className="health-button health-button-primary" onClick={() => setAdding(true)}><Icon name="plus" size={16} />{t('admin.accountsList.create')}</button></div>
  <div style={{ display: 'flex', gap: '12px', marginBottom: '16px', flexWrap: 'wrap' }}>
    <input
      type="search"
      aria-label={t('admin.accountsList.search')}
      placeholder={t('admin.accountsList.searchPlaceholder')}
      value={vm.query}
      onChange={e => vm.setQuery(e.target.value)}
      style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--rule)', backgroundColor: 'var(--surface)', color: 'var(--text)', minWidth: '240px', minHeight: 44, flex: 1 }}
    />
    <select
      aria-label={t('admin.accountsList.roleFilter')}
      value={vm.roleFilter}
      onChange={e => vm.setRoleFilter(e.target.value)}
      style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--rule)', backgroundColor: 'var(--surface)', color: 'var(--text)', minHeight: 44 }}
    >
      <option value="">{t('admin.accountsList.allRoles')}</option>
      <option value="SUPER_ADMIN">{t('admin.role.SUPER_ADMIN')}</option>
      <option value="VENDOR">{t('admin.role.VENDOR')}</option>
      <option value="NMC_DOCTOR">{t('admin.role.NMC_DOCTOR')}</option>
      <option value="CAMPUS_ADMIN">{t('admin.role.CAMPUS_ADMIN')}</option>
      <option value="COUNSELLOR">{t('admin.role.COUNSELLOR')}</option>
      <option value="STUDENT">{t('admin.role.STUDENT')}</option>
    </select>
  </div>
  {vm.resetDoneFor && <div className="wf-notice" role="status"><p>{t('admin.accountsList.resetDone', { name: vm.resetDoneFor })}</p></div>}
  <DataState loading={vm.loading} error={vm.error} retry={vm.reload}><FormError message={vm.kindError} /><div className="wf-card wf-table-scroll"><table><thead><tr><th>{t('admin.accountsList.colName')}</th><th>{t('admin.accountsList.colVerified')}</th><th>{t('admin.accountsList.colRole')}</th><th>Partner type</th><th>{t('admin.accountsList.colStatus')}</th><th>{t('admin.accountsList.colCampus')}</th><th>{t('admin.accountsList.colTwoFactor')}</th></tr></thead><tbody>{vm.data?.items.map(account => <tr key={account.id}><td>{account.fullName}</td><td>{account.identifier}</td><td>{account.role.replace(/_/g, ' ')}</td><td>{account.role === 'VENDOR'
    // Decides which partner dashboard and tools the account sees. Only a super admin can change it.
    ? <select aria-label={`Partner type for ${account.fullName}`} value={account.partnerKind || ''} disabled={vm.updatingKindFor !== ''} onChange={event => { if (isPartnerKind(event.target.value)) void vm.changePartnerKind(account.id, event.target.value); }}>{!account.partnerKind && <option value="" disabled>Not set — no tools yet</option>}{PARTNER_KINDS.map(kind => <option key={kind} value={kind}>{PARTNER_KIND_LABEL[kind]}</option>)}</select>
    : '—'}</td><td><span className="wf-status">{account.active ? t('admin.accountsList.active') : t('admin.accountsList.inactive')}</span></td><td>{isCampusScopedRole(account.role) ? <>{account.campus || <span className="wf-status status-declined">{t('admin.accountsList.campusNotSet')}</span>}{' '}<button type="button" className="health-text-button" aria-label={t('admin.accountsList.setCampusFor', { name: account.fullName })} onClick={() => { setScopeFor(account); setScopeCampus(account.campus || ''); }}>{t('admin.accountsList.setCampus')}</button></> : '—'}</td><td>{account.twoFactorEnabled ? <>{t('admin.accountsList.twoFactorOn')}{' '}<button type="button" className="health-text-button" aria-label={t('admin.accountsList.resetTwoFactorFor', { name: account.fullName })} onClick={() => vm.askResetTwoFactor(account)}>{t('admin.accountsList.resetTwoFactor')}</button></> : t('admin.accountsList.twoFactorOff')}</td></tr>)}</tbody></table></div>
  <Pagination page={vm.page} total={vm.total} pageSize={ACCOUNTS_PAGE_SIZE} onChange={vm.setPage} />
  </DataState>{scopeFor && <ShopDialog title={t('admin.accountsList.campusFor', { name: scopeFor.fullName })} onClose={() => setScopeFor(null)}><form className="wf-form" onSubmit={event => { event.preventDefault(); void vm.setCampus(scopeFor.id, scopeCampus).then(saved => { if (saved) setScopeFor(null); }); }}><FormError message={vm.scopeError} /><Field label={t('admin.accountsList.campusField')} hint={t('admin.accountsList.campusHint')}><input required minLength={2} maxLength={160} value={scopeCampus} onChange={event => setScopeCampus(event.target.value)} /></Field><SubmitButton busy={vm.scoping}>{t('admin.accountsList.saveCampus')}</SubmitButton></form></ShopDialog>}{adding && <ShopDialog title={t('admin.accountsList.createTitle')} onClose={() => setAdding(false)}><form className="wf-form" onSubmit={event => { event.preventDefault(); void vm.create().then(created => { if (created) setAdding(false); }); }}><FormError message={vm.createError} /><Field label={t('admin.accountsList.fullName')}><input required minLength={2} maxLength={120} value={vm.fullName} onChange={event => vm.setFullName(event.target.value)} /></Field><Field label={t('admin.accountsList.colRole')}><select value={vm.role} onChange={event => vm.setRole(event.target.value)}><option value="VENDOR">{t('admin.accountsList.roleVendor')}</option><option value="NMC_DOCTOR">{t('admin.role.NMC_DOCTOR')}</option><option value="CAMPUS_ADMIN">{t('admin.accountsList.roleCampusAdmin')}</option><option value="COUNSELLOR">{t('admin.accountsList.roleCounsellor')}</option></select></Field>{vm.role === 'VENDOR' && <Field label="Partner type"><select required value={vm.partnerKind} onChange={event => vm.setPartnerKind(isPartnerKind(event.target.value) ? event.target.value : '')}><option value="" disabled>Choose a partner type</option>{PARTNER_KINDS.map(kind => <option key={kind} value={kind}>{PARTNER_KIND_LABEL[kind]}</option>)}</select></Field>}{vm.role === 'VENDOR' && <p>The partner type decides which dashboard, sidebar and tools the partner sees. The partner cannot change it; you can, from this list.</p>}{isCampusScopedRole(vm.role) && <Field label={t('admin.accountsList.campusField')} hint={t(vm.role === 'COUNSELLOR' ? 'admin.accountsList.counsellorCampusHint' : 'admin.accountsList.campusHint')}><input required minLength={2} maxLength={160} value={vm.university} onChange={event => vm.setUniversity(event.target.value)} /></Field>}{vm.role === 'NMC_DOCTOR' && <Field label={t('admin.accountsList.registrationField')} hint={t('admin.accountsList.registrationHint')}><input required minLength={3} maxLength={60} value={vm.registrationNumber} onChange={event => vm.setRegistrationNumber(event.target.value)} /></Field>}<Field label={t('admin.accountsList.channel')}><select value={vm.channel} onChange={event => vm.setChannel(event.target.value)}><option value="EMAIL">{t('admin.accountsList.channelEmail')}</option><option value="WHATSAPP">WhatsApp</option></select></Field><Field label={t('admin.accountsList.contact')}><input required type={vm.channel === 'EMAIL' ? 'email' : 'tel'} maxLength={254} value={vm.identifier} onChange={event => vm.setIdentifier(event.target.value)} /></Field><p>{t('admin.accountsList.createNote')}</p><SubmitButton busy={vm.creating}>{t('admin.accountsList.createSubmit')}</SubmitButton></form></ShopDialog>}
  <ConfirmDialog
    open={vm.resetTarget !== null}
    tone="destructive"
    title={t('admin.accountsList.resetTitle', { name: vm.resetTarget?.fullName ?? '' })}
    body={<div className="wf-form"><p>{t('admin.accountsList.resetBody')}</p><FormError message={vm.resetReasonInvalid ? t('admin.accountsList.resetReasonShort') : vm.resetError} /><Field label={t('admin.accountsList.resetReason')} hint={t('admin.accountsList.resetReasonHint')}><input required minLength={10} maxLength={500} value={vm.resetReason} aria-invalid={vm.resetReasonInvalid || undefined} onChange={event => vm.setResetReason(event.target.value)} disabled={vm.resetting} /></Field></div>}
    confirmLabel={t('admin.accountsList.resetConfirm')}
    busy={vm.resetting}
    onConfirm={() => void vm.confirmResetTwoFactor()}
    onCancel={vm.cancelResetTwoFactor}
  /></>;
});
