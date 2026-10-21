import React, { useEffect, useState } from 'react';
import { observer } from 'mobx-react-lite';
import { ConfirmDialog, ConsolePageHeader, DataTable, SkButton } from '@/design-system';
import type { DataTableRow, SkTone } from '@/design-system';
import { Icon } from '@/design-system/icons';
import { Field, FormError, SubmitButton } from '@/components/interface/WorkflowUI';
import { ShopDialog } from '@/components/marketplace/ShopDialog';
import { BoardNote, BoardToast } from '@/features/admin/views/AdminBoard';
import { BoardFailure, BoardLoading, GovCard, ViewLink } from '@/features/admin/views/GovBoard';
import { useT } from '@/i18n';
import type { MessageKey } from '@/i18n';
import { FACILITY_KINDS } from '../model/types';
import type { FacilityKind } from '../model/types';
import { checkedDate } from '../views/careDirectoryParts';
import { CareDirectoryAdminViewModel } from '../viewmodel/CareDirectoryAdminViewModel';
import type { AdminFacility, FacilityStatus, PartnerListing } from '../viewmodel/CareDirectoryAdminViewModel';
import '@/features/admin/views/gov-board.css';
import '@/theme/workflows.css';

/**
 * Care directory listings (AdminCareDirectory, Tier 3): the super admin's page
 * (`admin/care-directory`, every campus, partners, the registry) and a campus
 * administrator's (`campus/care-directory`, their campus only). Every change is
 * audited by the server. Nothing reaches students until it carries a recent
 * verified-on date; the status column says which rows are shown.
 */
const KIND_LABEL: Record<FacilityKind, MessageKey> = {
  HOSPITAL: 'fc.kind.HOSPITAL', CLINIC: 'fc.kind.CLINIC', PHARMACY: 'fc.kind.PHARMACY', AMBULANCE: 'fc.kind.AMBULANCE', BLOOD_BANK: 'fc.kind.BLOOD_BANK',
};

function statusPill(row: AdminFacility): { label: MessageKey; tone: SkTone } {
  if (!row.active) return { label: 'fca.status.off', tone: 'neutral' };
  const by: Record<FacilityStatus, { label: MessageKey; tone: SkTone }> = {
    VERIFIED: { label: 'fca.status.shown', tone: 'positive' },
    UNVERIFIED: { label: 'fca.status.unverified', tone: 'neutral' },
    STALE: { label: 'fca.status.stale', tone: 'attention' },
  };
  return by[row.status];
}

const PARTNER_REASON: Record<NonNullable<PartnerListing['hiddenBecause']>, MessageKey> = {
  INACTIVE: 'fca.partner.inactive', LICENCE: 'fca.partner.licence', UNVERIFIED: 'fca.partner.unverified', STALE: 'fca.partner.stale',
};

const FacilityDialog = observer(function FacilityDialog({ vm }: { vm: CareDirectoryAdminViewModel }) {
  const t = useT();
  const form = vm.form;
  if (!form) return null;
  const text = (key: 'name' | 'departments' | 'address' | 'area' | 'pincode' | 'latitude' | 'longitude' | 'phone' | 'hoursText' | 'source' | 'sourceUrl' | 'campus') =>
    ({ value: form[key], onChange: (event: React.ChangeEvent<HTMLInputElement>) => vm.setField(key, event.target.value) });
  return (
    <ShopDialog title={t(form.id ? 'fca.editTitle' : 'fca.addTitle')} onClose={vm.closeForm} wide>
      <form className="wf-form" data-testid="fca-form" onSubmit={(event) => { event.preventDefault(); void vm.save(); }}>
        <p>{t('fca.formIntro', { days: vm.maxAgeDays })}</p>
        <FormError message={vm.formError} />
        <div className="wf-form-grid">
          <Field label={t('fca.f.kind')}>
            <select value={form.kind} onChange={(event) => vm.setField('kind', event.target.value as FacilityKind)}>
              {FACILITY_KINDS.map((kind) => <option key={kind} value={kind}>{t(KIND_LABEL[kind])}</option>)}
            </select>
          </Field>
          <Field label={t('fca.f.name')}><input required minLength={2} maxLength={160} {...text('name')} /></Field>
        </div>
        <Field label={t('fca.f.departments')} hint={t('fca.f.departmentsHint')}><input maxLength={1800} {...text('departments')} /></Field>
        <Field label={t('fca.f.address')}><input maxLength={400} {...text('address')} /></Field>
        <div className="wf-form-grid">
          <Field label={t('fca.f.area')}><input maxLength={120} {...text('area')} /></Field>
          <Field label={t('fca.f.pincode')}><input inputMode="numeric" pattern="[1-9][0-9]{5}" maxLength={6} {...text('pincode')} /></Field>
        </div>
        <div className="wf-form-grid">
          <Field label={t('fca.f.latitude')} hint={t('fca.f.coordsHint')}><input inputMode="decimal" {...text('latitude')} /></Field>
          <Field label={t('fca.f.longitude')}><input inputMode="decimal" {...text('longitude')} /></Field>
        </div>
        <div className="wf-form-grid">
          <Field label={t('fca.f.phone')}><input type="tel" maxLength={32} {...text('phone')} /></Field>
          <Field label={t('fca.f.hours')}><input maxLength={200} {...text('hoursText')} /></Field>
        </div>
        <label className="wf-checkbox">
          <input type="checkbox" checked={form.emergency24x7} onChange={(event) => vm.setField('emergency24x7', event.target.checked)} />
          <span>{t('fca.f.emergency')}</span>
        </label>
        <div className="wf-form-grid">
          <Field label={t('fca.f.source')} hint={t('fca.f.sourceHint')}><input required minLength={3} maxLength={200} {...text('source')} /></Field>
          <Field label={t('fca.f.sourceUrl')}><input type="url" maxLength={2000} {...text('sourceUrl')} /></Field>
        </div>
        <div className="wf-form-grid">
          <Field label={t('fca.f.verifiedOn')} hint={t('fca.f.verifiedOnHint')}>
            <input type="date" value={form.verifiedOn} onChange={(event) => vm.setField('verifiedOn', event.target.value)} />
          </Field>
          {vm.superAdmin ? <Field label={t('fca.f.campus')} hint={t('fca.f.campusHint')}><input maxLength={160} {...text('campus')} /></Field> : null}
        </div>
        <label className="wf-checkbox">
          <input type="checkbox" checked={form.active} onChange={(event) => vm.setField('active', event.target.checked)} />
          <span>{t('fca.f.active')}</span>
        </label>
        <SubmitButton busy={vm.saving}>{t(form.id ? 'fca.saveChanges' : 'fca.add')}</SubmitButton>
      </form>
    </ShopDialog>
  );
});

const PartnersCard = observer(function PartnersCard({ vm }: { vm: CareDirectoryAdminViewModel }) {
  const t = useT();
  const rows: DataTableRow[] = vm.partners.map((partner) => ({
    id: partner.id,
    cells: [
      { text: partner.name, weight: 'strong', sub: `${t(KIND_LABEL[partner.kind])} · ${partner.pincode}` },
      { text: partner.verifiedOn ? checkedDate(partner.verifiedOn) : t('fca.never'), weight: 'muted' },
      { pill: partner.shown ? { label: t('fca.status.shown'), tone: 'positive' } : { label: t(PARTNER_REASON[partner.hiddenBecause ?? 'UNVERIFIED']), tone: partner.hiddenBecause === 'STALE' ? 'attention' : 'neutral' } },
    ],
    actions: partner.hiddenBecause === 'UNVERIFIED' || partner.hiddenBecause === 'STALE' ? [{
      label: t('fca.partner.verify'), icon: 'shield-check', onSelect: () => void vm.verifyPartner(partner.id), disabled: vm.busyId !== null,
      accessibleLabel: t('fca.partner.verifySpoken', { name: partner.name }),
    }] : [],
  }));
  return (
    <GovCard title={t('fca.partners')}>
      <p className="sk-gov-text">{t('fca.partnersBody')}</p>
      {vm.partnersPhase === 'error' ? <BoardNote icon="alert-triangle" tone="attention">{t('fca.partnersFailed')}</BoardNote>
        : <DataTable variant="plain" caption={t('fca.partners')} actionsLabel={t('fca.col.actions')}
          columns={[{ label: t('fca.col.place') }, { label: t('fca.col.verified'), width: '130px' }, { label: t('fca.col.status'), width: '170px', align: 'end' }]}
          rows={rows} emptyMessage={{ title: t('fca.partnersEmpty'), body: t('fca.partnersEmptyBody') }} />}
    </GovCard>
  );
});

const RegistryCard = observer(function RegistryCard({ vm }: { vm: CareDirectoryAdminViewModel }) {
  const t = useT();
  const configured = vm.registry?.configured === true;
  return (
    <GovCard title={t('fca.registry')} aside={<Icon name="plug" size={18} />}>
      <p className="sk-gov-text" data-testid="fca-registry">{t(configured ? 'fca.registryNotBuilt' : 'fca.registryNotConfigured')}</p>
      {!configured ? <ViewLink route="admin/telemetry" label={t('fca.registrySetUp')} /> : null}
    </GovCard>
  );
});

export const CareDirectoryAdminView = observer(function CareDirectoryAdminView({ superAdmin }: { superAdmin: boolean }) {
  const t = useT();
  const [vm] = useState(() => new CareDirectoryAdminViewModel(superAdmin));
  useEffect(() => { vm.load(); return () => vm.dispose(); }, [vm]);

  if (vm.phase === 'loading' && !vm.items.length) return <BoardLoading label={t('fca.loading')} />;
  if (vm.phase === 'error') return <BoardFailure t={t} what={t('fca.what')} screen="AdminCareDirectory" onRetry={() => void vm.loadFacilities()} />;

  const rows: DataTableRow[] = vm.items.map((row) => {
    const pill = statusPill(row);
    return {
      id: row.id,
      muted: !row.active,
      cells: [
        { text: row.name, weight: 'strong', sub: [t(KIND_LABEL[row.kind]), row.area].filter(Boolean).join(' · ') },
        { text: row.campus || t('fca.everyCampus') },
        { text: row.phone || '—', mono: Boolean(row.phone) },
        { text: row.emergency24x7 ? t('fca.yes') : t('fca.no') },
        { text: row.verifiedOn ? checkedDate(row.verifiedOn) : t('fca.never'), weight: 'muted' },
        { pill: { label: t(pill.label), tone: pill.tone } },
      ],
      actions: [
        { label: t('fca.edit'), icon: 'pencil', onSelect: () => vm.startEdit(row), accessibleLabel: t('fca.editSpoken', { name: row.name }), disabled: vm.busyId !== null },
        { label: t('fca.remove'), icon: 'trash', onSelect: () => vm.askRemove(row), accessibleLabel: t('fca.removeSpoken', { name: row.name }), disabled: vm.busyId !== null },
      ],
    };
  });
  const notice: Record<NonNullable<CareDirectoryAdminViewModel['notice']>, MessageKey> = { saved: 'fca.saved', removed: 'fca.removed', verified: 'fca.verified' };

  return (
    <div className="sk-ds sk-admin-page sk-gov" data-testid="fca-page">
      <ConsolePageHeader eyebrow={t(superAdmin ? 'fca.eyebrowAdmin' : 'fca.eyebrowCampus')} title={t('fca.title')}
        subtitle={vm.campus ? t('fca.subtitleCampus', { campus: vm.campus, days: vm.maxAgeDays }) : t('fca.subtitle', { days: vm.maxAgeDays })}
        actions={<SkButton onClick={vm.startAdd} data-testid="fca-add"><Icon name="plus" size={16} />{t('fca.add')}</SkButton>} />
      {vm.actionError ? <BoardNote icon="alert-triangle" tone="attention">{vm.actionError}</BoardNote> : null}
      <div className="sk-gov-stack">
        <DataTable variant="plain" caption={t('fca.places')} title={t('fca.places')} actionsLabel={t('fca.col.actions')}
          columns={[
            { label: t('fca.col.place') }, { label: t('fca.col.campus'), width: '150px' }, { label: t('fca.col.phone'), width: '150px' },
            { label: t('fca.col.247'), width: '70px' }, { label: t('fca.col.verified'), width: '120px' }, { label: t('fca.col.status'), width: '150px', align: 'end' },
          ]}
          rows={rows} emptyMessage={{ title: t('fca.empty'), body: t('fca.emptyBody') }} />
        {!rows.length ? <p className="sk-gov-fine"><Icon name="hospital" size={16} /> {t('fca.emptyHint')}</p> : null}
        {superAdmin ? <PartnersCard vm={vm} /> : null}
        {superAdmin ? <RegistryCard vm={vm} /> : null}
      </div>
      <FacilityDialog vm={vm} />
      <ConfirmDialog open={vm.removing !== null} title={t('fca.removeTitle', { name: vm.removing?.name ?? '' })} body={t('fca.removeBody')}
        confirmLabel={t('fca.remove')} busyLabel={t('fca.removing')} cancelLabel={t('fca.keep')} tone="danger" busy={vm.busyId !== null}
        onConfirm={() => void vm.confirmRemove()} onCancel={() => vm.askRemove(null)} testID="fca-remove" />
      <BoardToast message={vm.notice ? t(notice[vm.notice]) : null} onDone={vm.clearNotice} />
    </div>
  );
});

/** Super admin console: every campus, partners and the registry. */
export function AdminCareDirectoryScreen(): React.ReactElement {
  return <CareDirectoryAdminView superAdmin />;
}

/** Campus console: the administrator's own campus. */
export function CampusCareDirectoryScreen(): React.ReactElement {
  return <CareDirectoryAdminView superAdmin={false} />;
}
