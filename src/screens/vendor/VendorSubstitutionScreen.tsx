import React, { useCallback, useState } from 'react';
import { ConsoleTablePage } from '@/design-system/console/ConsoleTablePage';
import type { ConsoleTableStatus } from '@/design-system/console/ConsoleTablePage';
import type { DataTableRow } from '@/design-system/data/DataTable';
import { Drawer } from '@/design-system/overlays/Drawer';
import { SkButton, Toast } from '@/design-system/primitives';
import { useT } from '@/i18n';
import { navigate, RoutePath } from '@/lib/utils/workflowRouting';
import { PARTNER_EMPTY_TILE, PartnerNote, usePartnerLoad } from '@/features/partner/PartnerPage';
import { loadDispenses, proposeSubstitution, refOf } from '@/features/partner/work/pharmacyWork';
import type { Dispense, DispenseItem } from '@/features/partner/work/pharmacyWork';
import { useOnline } from '@/features/partner/work/workCopy';
import '@/features/partner/work/partner-work.css';

/**
 * VendorSubstitution — generic substitutions (design page 6, Tier 1, approved 2026-10-21).
 *
 * One row per prescribed line on the pharmacy's verified and swap-pending
 * prescriptions (`GET /work/dispenses`). A swap is proposed with
 * `POST /dispenses/{id}/substitutions`; the server refuses it for a line the
 * prescriber marked no-substitution, and only on a verified prescription that
 * is not yet paid. It used to draw only what a caller passed in.
 *
 * Follows the server, not the picture (approved decisions):
 * - the prescriber decides a swap, not the student, and the pharmacy cannot
 *   see the decision until the order comes back verified;
 * - saving, accepted and declined have no source: "—";
 * - the board's narrow-therapeutic-index rule (levothyroxine dispensed as
 *   written) is not on the server and no NTI list exists, so the page does not
 *   claim it; only the prescriber's own no-substitution mark blocks a swap.
 */

export type SubstitutionsSource = (signal: AbortSignal) => Promise<{ items: Dispense[] }>;

const SHOWN = new Set(['RX_VERIFIED', 'SUBSTITUTION_PROPOSED']);

interface Line { dispense: Dispense; item: DispenseItem }

const nameOf = (item: DispenseItem) => [item.brandName || item.genericName, item.strength].filter(Boolean).join(' ');

export function VendorSubstitutionScreen({ source = loadDispenses, onNavigate }: { source?: SubstitutionsSource; onNavigate?: (route: string) => void; onLogout?: () => void }) {
  const t = useT();
  const online = useOnline();
  const load = useCallback((signal: AbortSignal) => source(signal), [source]);
  const data = usePartnerLoad<{ items: Dispense[] }>(load);
  const [proposing, setProposing] = useState<Line | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const go = (route: RoutePath) => (onNavigate ? onNavigate(route) : navigate(route));

  const lines: Line[] = (data.data?.items ?? []).filter((row) => SHOWN.has(row.status))
    .flatMap((dispense) => (dispense.prescription?.items ?? []).map((item) => ({ dispense, item })));
  const status: ConsoleTableStatus = data.status === 'loading' && !data.data ? 'loading' : data.status === 'error' ? 'error' : 'ready';
  const withPrescriber = new Set(lines.filter((line) => line.dispense.status === 'SUBSTITUTION_PROPOSED').map((line) => line.dispense.id)).size;
  const blocked = lines.filter((line) => !line.item.substitutionAllowed).length;

  const rows: DataTableRow[] = lines.map((line) => {
    const { dispense, item } = line;
    const proposed = dispense.status === 'SUBSTITUTION_PROPOSED';
    const canOffer = !proposed && item.substitutionAllowed && dispense.quoteStatus !== 'PAYMENT_STARTED' && dispense.quoteStatus !== 'PAID';
    return {
      id: `${dispense.id}:${item.id}`,
      cells: [
        { text: nameOf(item), sub: t('pt.sub.onOrder', { ref: refOf(dispense.id) }), weight: 'strong' },
        { text: proposed && dispense.substitutionNote ? dispense.substitutionNote : '—', weight: proposed ? 'regular' : 'muted' },
        { text: '—', weight: 'muted' },
        item.substitutionAllowed
          ? { text: t('pt.sub.permitted'), tone: 'positive', weight: 'strong' }
          : { text: t('pt.sub.notPermitted'), tone: 'attention', weight: 'strong' },
        { pill: proposed
          ? { label: t('pt.sub.outcome.withPrescriber'), tone: 'attention' }
          : item.substitutionAllowed ? { label: t('pt.sub.outcome.asWritten'), tone: 'neutral' } : { label: t('pt.sub.outcome.dispensedAsWritten'), tone: 'action' } },
      ],
      actions: canOffer ? [{ label: t('pt.sub.offer'), disabled: !online, onSelect: () => setProposing(line), accessibleLabel: t('pt.sub.offerFor', { item: nameOf(item), ref: refOf(dispense.id) }) }] : [],
    };
  });

  return (
    <main className="sk-ds pc-page">
      <ConsoleTablePage
        status={status}
        header={{ title: t('pt.sub.title'), subtitle: t('pt.sub.sub'), badge: blocked ? { label: t('pt.sub.blockedBadge', { count: blocked }), tone: 'attention' } : undefined }}
        note={!online && status === 'ready' ? <PartnerNote tone="attention">{t('pt.offline.readOnly')}</PartnerNote> : undefined}
        stats={[
          { label: t('pt.sub.stat.saved'), value: null },
          { label: t('pt.sub.stat.withPrescriber'), value: String(withPrescriber), tone: withPrescriber ? 'attention' : 'text' },
          { label: t('pt.sub.stat.declined'), value: null },
          { label: t('pt.sub.stat.blocked'), value: String(blocked) },
        ]}
        statsLabel={t('pt.sub.statsLabel')}
        table={{
          caption: t('pt.sub.caption'),
          columns: [
            { label: t('pt.sub.col.prescribed') },
            { label: t('pt.sub.col.generic'), width: '240px' },
            { label: t('pt.sub.col.saving'), width: '110px' },
            { label: t('pt.sub.col.prescriber'), width: '200px' },
            { label: t('pt.sub.col.outcome'), width: '200px', align: 'end' },
          ],
          rows,
          rowActions: true,
          footnote: t('pt.sub.footnote'),
        }}
        empty={{ title: t('pt.sub.emptyTitle'), body: t('pt.sub.emptyBody'), icon3d: PARTNER_EMPTY_TILE, action: { label: t('pt.sub.emptyAction'), onSelect: () => go('rx-review') } }}
        unconnected={{ title: t('pt.sub.emptyTitle'), body: t('pt.sub.emptyBody') }}
        error={{ title: t('pt.sub.errorTitle'), reference: t('pt.sub.ref'), detail: data.error || undefined, onRetry: data.reload, onHelp: () => go('support') }}
        loadingLabel={t('console.loading', { title: t('pt.sub.title') })}
      />
      {proposing ? (
        <ProposeDrawer line={proposing} online={online} onClose={() => setProposing(null)} onDone={() => { setProposing(null); setToast(t('pt.sub.sent')); data.reload(); }} />
      ) : null}
      {toast ? <Toast message={toast} onDone={() => setToast(null)} /> : null}
    </main>
  );
}

function ProposeDrawer({ line, online, onClose, onDone }: { line: Line; online: boolean; onClose: () => void; onDone: () => void }) {
  const t = useT();
  const [generic, setGeneric] = useState('');
  const [brand, setBrand] = useState('');
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const valid = generic.trim().length >= 2 && reason.trim().length >= 3;

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!valid || busy || !online) return;
    setBusy(true);
    setError('');
    try {
      await proposeSubstitution(line.dispense.id, { prescriptionItemId: line.item.id, proposedGeneric: generic.trim(), proposedBrand: brand.trim(), reason: reason.trim() });
      onDone();
    } catch (reasonError) {
      setError(reasonError instanceof Error && reasonError.message ? reasonError.message : t('pt.saveFailed'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Drawer open title={t('pt.sub.drawer.title', { item: nameOf(line.item) })} eyebrow={t('pt.sub.drawer.eyebrow')} subtitle={t('pt.sub.drawer.sub')} busy={busy} onClose={onClose}>
      <form className="pc-form" onSubmit={(event) => { void submit(event); }}>
        <label className="pw-field">{t('pt.sub.field.generic')}
          <input className="pc-input" required minLength={2} maxLength={160} value={generic} onChange={(event) => setGeneric(event.target.value)} />
        </label>
        <label className="pw-field">{t('pt.sub.field.brand')}
          <input className="pc-input" maxLength={160} value={brand} onChange={(event) => setBrand(event.target.value)} />
        </label>
        <label className="pw-field">{t('pt.sub.field.reason')}
          <textarea className="pc-textarea" required minLength={3} maxLength={300} value={reason} onChange={(event) => setReason(event.target.value)} />
          <span className="pw-hint">{t('pt.sub.field.reasonHint')}</span>
        </label>
        {error ? <p className="pc-form__error" role="alert">{error}</p> : null}
        {!online ? <p className="pw-hint" role="status">{t('pt.offline.readOnly')}</p> : null}
        <div className="pc-form__actions">
          <SkButton variant="secondary" disabled={busy} onClick={onClose}>{t('common.cancel')}</SkButton>
          <SkButton type="submit" busy={busy} disabled={!valid || busy || !online}>{t('pt.sub.drawer.send')}</SkButton>
        </div>
      </form>
    </Drawer>
  );
}
