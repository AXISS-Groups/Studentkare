import React, { useCallback, useState } from 'react';
import { ConsoleTablePage } from '@/design-system/console/ConsoleTablePage';
import type { ConsoleTableStatus } from '@/design-system/console/ConsoleTablePage';
import type { DataTableRow } from '@/design-system/data/DataTable';
import { ConfirmDialog } from '@/design-system/overlays/ConfirmDialog';
import { Drawer } from '@/design-system/overlays/Drawer';
import { FormField } from '@/design-system/feedback/FormField';
import { SkButton, Toast } from '@/design-system/primitives';
import { useAuth } from '@/data/contexts/AuthContext';
import { navigate, RoutePath } from '@/lib/utils/workflowRouting';
import { useT } from '@/i18n';
import { useEffectivePartnerKind } from './partnerPreview';
import { partnerDisplayName } from './partnerAccess';
import { addCollector, loadCollectors, retireCollector } from '@/features/partner/partnerApi';
import type { LabCollector } from '@/features/partner/partnerApi';
import { PartnerNote, usePartnerLoad } from '@/features/partner/PartnerPage';

/**
 * PartnerStaff — staff and roles (design page 6, Tier 2).
 *
 * A lab's staff are its sample collectors, and they are connected:
 * `GET/POST/PATCH /work/lab-collectors` list, add (with their own sign-in) and
 * remove them. Removing deactivates the collector's account, so the server
 * refuses them at once, even mid-session; their past actions stay in the
 * audit log. Scan counts and stops per person have no source, so they read "—".
 *
 * No endpoint holds pharmacy, clinic or wellness staff yet, so for those the
 * table is in its not-connected state and "Add staff" is unavailable. The
 * rule stays on the page either way: only a pharmacist with a council
 * registration hands over prescription medicines.
 */

export type StaffSource = (signal: AbortSignal) => Promise<{ items: LabCollector[]; total: number }>;

export interface PartnerStaffScreenProps {
  source?: StaffSource;
  onNavigate?: (route: string) => void;
  onLogout?: () => void;
}

export function PartnerStaffScreen({ source = loadCollectors, onNavigate }: PartnerStaffScreenProps) {
  const t = useT();
  const { user } = useAuth();
  const lab = useEffectivePartnerKind(user) === 'LAB';
  const load = useCallback((signal: AbortSignal) => source(signal), [source]);
  const staff = usePartnerLoad(lab ? load : null);
  const [adding, setAdding] = useState(false);
  const [removing, setRemoving] = useState<LabCollector | null>(null);
  const [removeBusy, setRemoveBusy] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const go = (route: RoutePath) => (onNavigate ? onNavigate(route) : navigate(route));
  const name = user ? partnerDisplayName(user) : t('partner.vhome.home.accountFallback');

  const status: ConsoleTableStatus = !lab ? 'unconnected' : staff.status === 'loading' && !staff.data ? 'loading' : staff.status === 'error' ? 'error' : 'ready';
  const rows: DataTableRow[] = (staff.data?.items ?? []).map((person) => ({
    id: person.id,
    muted: !person.active,
    cells: [
      { text: person.fullName, sub: person.identifier, weight: 'strong' },
      { text: t('pc.staff.role.collector'), weight: 'regular' },
      { text: '—', weight: 'muted', mono: true },
      { pill: person.active ? { label: t('pc.staff.active'), tone: 'positive' } : { label: t('pc.staff.removed'), tone: 'neutral' } },
      { text: '—', weight: 'muted' },
      { text: '—', weight: 'muted', mono: true },
      { text: '—', weight: 'muted', mono: true },
    ],
    actions: person.active ? [{ label: t('pc.staff.remove'), onSelect: () => setRemoving(person), accessibleLabel: t('pc.staff.removeFor', { name: person.fullName }) }] : [],
  }));

  const remove = async () => {
    if (!removing) return;
    setRemoveBusy(true);
    try {
      await retireCollector(removing.id);
      setToast(t('pc.staff.removedDone', { name: removing.fullName }));
      setRemoving(null);
      staff.reload();
    } catch (error) {
      setToast(error instanceof Error && error.message ? error.message : t('pc.home.decideFailed'));
    } finally {
      setRemoveBusy(false);
    }
  };

  return (
    <main className="sk-ds pc-page">
      <ConsoleTablePage
        status={status}
        header={{
          title: t('pc.staff.title'),
          subtitle: t('pc.staff.sub', { name }),
          actions: lab
            ? <SkButton onClick={() => setAdding(true)}>{t('pc.staff.add')}</SkButton>
            : <SkButton disabled title={t('console.notAvailable')}>{t('pc.staff.add')}<span className="sk-visually-hidden"> · {t('console.notAvailable')}</span></SkButton>,
        }}
        table={{
          caption: t('pc.staff.caption'),
          columns: [
            { label: t('pc.staff.col.name') },
            { label: t('pc.staff.col.role'), width: '150px' },
            { label: t('pc.staff.col.reg'), width: '130px' },
            { label: t('pc.staff.col.status'), width: '110px' },
            { label: t('pc.staff.col.lastScan'), width: '120px' },
            { label: t('pc.staff.col.scans'), width: '90px' },
            { label: t('pc.staff.col.stops'), width: '70px' },
          ],
          rows,
          rowActions: true,
        }}
        empty={{ title: t('pc.staff.emptyTitle'), body: t('pc.staff.emptyBody'), icon3d: 'cart-alt--p3', action: { label: t('pc.staff.add'), onSelect: () => setAdding(true) } }}
        unconnected={{ title: t('pc.staff.unconnectedTitle'), body: t('pc.staff.unconnectedBody') }}
        error={{ title: t('pc.staff.errorTitle'), reference: t('pc.staff.ref'), detail: staff.error || undefined, onRetry: staff.reload, onHelp: () => go('support') }}
        loadingLabel={t('console.loading', { title: t('pc.staff.title') })}
      >
        <div className="pc-notes">
          <PartnerNote tone="info" lead={t('pc.staff.rolesLead')}>{t('pc.staff.rolesBody')}</PartnerNote>
          <PartnerNote tone="danger" lead={t('pc.staff.leavesLead')}>{t('pc.staff.leavesBody')}</PartnerNote>
        </div>
      </ConsoleTablePage>

      <AddCollector open={adding} onClose={() => setAdding(false)} onAdded={(person) => { setAdding(false); setToast(t('pc.staff.addedDone', { name: person.fullName })); staff.reload(); }} />

      <ConfirmDialog
        open={removing !== null}
        tone="danger"
        title={removing ? t('pc.staff.removeTitle', { name: removing.fullName }) : ''}
        body={t('pc.staff.removeBody')}
        confirmLabel={t('pc.staff.remove')}
        busyLabel={t('pc.staff.removing')}
        cancelLabel={t('pc.staff.keep')}
        busy={removeBusy}
        onConfirm={() => { void remove(); }}
        onCancel={() => setRemoving(null)}
      />
      <Toast message={toast} onDone={() => setToast(null)} />
    </main>
  );
}

const PHONE = /^[6-9][0-9]{9}$/;

/** Add a lab's sample collector: their own sign-in by email or WhatsApp. */
function AddCollector({ open, onClose, onAdded }: { open: boolean; onClose: () => void; onAdded: (person: LabCollector) => void }): React.ReactElement {
  const t = useT();
  const [fullName, setFullName] = useState('');
  const [channel, setChannel] = useState<'EMAIL' | 'WHATSAPP'>('WHATSAPP');
  const [contact, setContact] = useState('');
  const [tried, setTried] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const nameOk = fullName.trim().length >= 2;
  const contactOk = channel === 'EMAIL' ? /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact.trim()) : PHONE.test(contact.trim());

  const reset = () => { setFullName(''); setContact(''); setTried(false); setError(''); };
  const close = () => { reset(); onClose(); };
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setTried(true);
    if (!nameOk || !contactOk) return;
    setBusy(true);
    setError('');
    try {
      const person = await addCollector({ fullName: fullName.trim(), identifier: contact.trim(), channel });
      reset();
      onAdded(person);
    } catch (reason) {
      setError(reason instanceof Error && reason.message ? reason.message : t('pc.home.decideFailed'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Drawer open={open} title={t('pc.staff.addTitle')} subtitle={t('pc.staff.addSub')} busy={busy} onClose={close}>
      <form className="pc-form" noValidate onSubmit={(event) => { void submit(event); }}>
        <FormField label={t('pc.staff.field.name')} status={tried && !nameOk ? 'invalid' : 'idle'} message={t('pc.staff.field.nameInvalid')}>
          <input className="pc-input" autoComplete="name" value={fullName} onChange={(event) => setFullName(event.target.value)} />
        </FormField>
        <FormField label={t('pc.staff.field.channel')}>
          <select className="pc-select" value={channel} onChange={(event) => { setChannel(event.target.value === 'EMAIL' ? 'EMAIL' : 'WHATSAPP'); setContact(''); }}>
            <option value="WHATSAPP">{t('pc.staff.channel.WHATSAPP')}</option>
            <option value="EMAIL">{t('pc.staff.channel.EMAIL')}</option>
          </select>
        </FormField>
        <FormField
          label={t(channel === 'EMAIL' ? 'pc.staff.field.email' : 'pc.staff.field.phone')}
          hint={t('pc.staff.field.contactHint')}
          status={tried && !contactOk ? 'invalid' : 'idle'}
          message={t(channel === 'EMAIL' ? 'pc.staff.field.emailInvalid' : 'pc.staff.field.phoneInvalid')}
        >
          <input className="pc-input" inputMode={channel === 'EMAIL' ? 'email' : 'numeric'} autoComplete={channel === 'EMAIL' ? 'email' : 'tel-national'} value={contact} onChange={(event) => setContact(event.target.value)} />
        </FormField>
        <PartnerNote tone="info">{t('pc.staff.collectorRole')}</PartnerNote>
        {error ? <p className="pc-form__error" role="alert">{error}</p> : null}
        <div className="pc-form__actions">
          <SkButton variant="secondary" onClick={close} disabled={busy}>{t('common.cancel')}</SkButton>
          <SkButton type="submit" busy={busy}>{t('pc.staff.addSubmit')}</SkButton>
        </div>
      </form>
    </Drawer>
  );
}
