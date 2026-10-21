import React, { useCallback, useMemo, useState } from 'react';
import { ConsoleTablePage } from '@/design-system/console/ConsoleTablePage';
import type { ConsoleTableStatus } from '@/design-system/console/ConsoleTablePage';
import type { DataTableRow } from '@/design-system/data/DataTable';
import type { SkTone } from '@/design-system/primitives';
import { Drawer } from '@/design-system/overlays/Drawer';
import { Icon } from '@/design-system/icons';
import { useT } from '@/i18n';
import { navigate, RoutePath } from '@/lib/utils/workflowRouting';
import { PARTNER_EMPTY_TILE, usePartnerLoad } from '@/features/partner/PartnerPage';
import { loadDispenses, loadRegister, refOf } from '@/features/partner/work/pharmacyWork';
import type { Dispense, DispenseItem, RegisterEntry } from '@/features/partner/work/pharmacyWork';
import { clockTime, dispenseStatusKey, shortDate } from '@/features/partner/work/workCopy';
import '@/features/partner/work/partner-work.css';

/**
 * DispenseRegister — the Schedule H1 register (design page 6, Tier 1, approved 2026-10-21).
 *
 * Wired to the server's register (`GET /ops/dispense-register`: delivered
 * dispenses with Schedule H1 / X lines, derived from recorded dispenses, never
 * kept by hand) and the pharmacy's own dispenses (`GET /work/dispenses`) for
 * the other two tabs and the prescriber's registration. It used to draw only
 * what a caller passed in, with a client-side CSV download.
 *
 * Approved decisions: the register is append-only and this page has no edit,
 * delete or correction control; the client CSV is gone (an unaudited export of
 * a statutory register); "retained three years" is not printed because no
 * retention job is verified; and the board's "Sign and dispense" is not drawn
 * because the prescriber, not the pharmacy, decides a substitution
 * (`/substitutions/{id}/decide` is theirs). A proposed swap opens read-only.
 * The register carries no patient, so the board's patient column shows the
 * verifying pharmacist instead.
 */

export interface RegisterData {
  register: RegisterEntry[];
  dispenses: Dispense[];
}

export type RegisterSource = (signal: AbortSignal) => Promise<RegisterData>;

async function loadAll(signal: AbortSignal): Promise<RegisterData> {
  const [register, dispenses] = await Promise.all([loadRegister(signal), loadDispenses(signal)]);
  return { register: register.items, dispenses: dispenses.items };
}

type Tab = 'h1' | 'all' | 'subs';
const TABS: Tab[] = ['h1', 'all', 'subs'];

const TONE: Record<string, SkTone> = {
  RX_ISSUED: 'attention', SUBSTITUTION_PROPOSED: 'attention', REJECTED: 'danger', CANCELLED: 'neutral', RETURNED: 'neutral', DELIVERED: 'positive',
};

const itemLine = (item: { genericName: string; strength: string; quantity: number }) => `${[item.genericName, item.strength].filter(Boolean).join(' ')} × ${item.quantity}`;

export function DispenseRegisterScreen({ source = loadAll, onNavigate }: { source?: RegisterSource; onNavigate?: (route: string) => void; onLogout?: () => void }) {
  const t = useT();
  const load = useCallback((signal: AbortSignal) => source(signal), [source]);
  const data = usePartnerLoad<RegisterData>(load);
  const [tab, setTab] = useState<Tab>('h1');
  const [openId, setOpenId] = useState<string | null>(null);
  const go = (route: RoutePath) => (onNavigate ? onNavigate(route) : navigate(route));

  const register = useMemo(() => data.data?.register ?? [], [data.data]);
  const dispenses = useMemo(() => data.data?.dispenses ?? [], [data.data]);
  const byId = useMemo(() => new Map(dispenses.map((row) => [row.id, row])), [dispenses]);
  const status: ConsoleTableStatus = data.status === 'loading' && !data.data ? 'loading' : data.status === 'error' ? 'error' : 'ready';
  const now = new Date();
  const thisMonth = register.filter((entry) => {
    const when = new Date(entry.dispensedAt * 1000);
    return when.getFullYear() === now.getFullYear() && when.getMonth() === now.getMonth();
  }).length;
  const awaiting = dispenses.filter((row) => row.status === 'SUBSTITUTION_PROPOSED').length;
  const refused = dispenses.filter((row) => row.status === 'REJECTED').length;
  const open = dispenses.find((row) => row.id === openId) ?? null;

  const when = (epoch: number) => `${shortDate(epoch)}, ${clockTime(epoch)}`;
  const prescriber = (dispenseId: string) => byId.get(dispenseId)?.prescription?.prescriberRegNo || '—';

  const registerRows: DataTableRow[] = register.map((entry) => ({
    id: entry.dispenseId,
    cells: [
      { text: t('pt.reg.entry', { ref: refOf(entry.dispenseId) }), sub: when(entry.dispensedAt), weight: 'strong', mono: true },
      { text: entry.items.map(itemLine).join(', '), sub: t('pt.reg.schedule', { classes: Array.from(new Set(entry.items.map((item) => item.scheduleClass))).join(', ') }), weight: 'strong' },
      { text: prescriber(entry.dispenseId), mono: true, weight: 'regular' },
      { text: entry.verifiedBy || '—', weight: 'regular' },
      { pill: { label: t('pt.reg.logged'), tone: 'action' } },
    ],
  }));

  const dispenseRow = (row: Dispense): DataTableRow => {
    const items: DispenseItem[] = row.prescription?.items ?? [];
    const proposed = row.status === 'SUBSTITUTION_PROPOSED';
    return {
      id: row.id,
      cells: [
        { text: t('pt.reg.entry', { ref: refOf(row.id) }), sub: when(row.updatedAt || row.createdAt), weight: 'strong', mono: true },
        { text: items.length ? items.map(itemLine).join(', ') : '—', sub: row.substitutionNote ? t('pt.reg.swapNote', { note: row.substitutionNote }) : row.rejectionReason ? t('pt.reg.refusedNote', { reason: row.rejectionReason }) : undefined, weight: 'strong' },
        { text: row.prescription?.prescriberRegNo || '—', mono: true, weight: 'regular' },
        { text: row.verifiedBy || '—', weight: 'regular' },
        { pill: { label: t(dispenseStatusKey(row.status)), tone: TONE[row.status] ?? 'action' } },
      ],
      actions: proposed ? [{ label: t('pt.reg.openSwap'), onSelect: () => setOpenId(row.id), accessibleLabel: t('pt.reg.openSwapFor', { ref: refOf(row.id) }) }] : undefined,
    };
  };

  const rows = tab === 'h1'
    ? registerRows
    : tab === 'all'
      ? dispenses.map(dispenseRow)
      : dispenses.filter((row) => row.status === 'SUBSTITUTION_PROPOSED' || row.substitutionNote).map(dispenseRow);
  const tabLabel = (id: Tab) => t(id === 'h1' ? 'pt.reg.tab.h1' : id === 'all' ? 'pt.reg.tab.all' : 'pt.reg.tab.subs');

  const tabs = (
    <div className="pw-tabs" role="tablist" aria-label={t('pt.reg.tabsLabel')}>
      {TABS.map((id) => (
        <button key={id} id={`pw-reg-tab-${id}`} type="button" role="tab" className="pw-tab" aria-selected={tab === id} aria-controls="pw-reg-panel" onClick={() => setTab(id)}>{tabLabel(id)}</button>
      ))}
    </div>
  );

  return (
    <main className="sk-ds pc-page">
      <ConsoleTablePage
        status={status}
        header={{ eyebrow: t('pt.reg.eyebrow'), title: t('pt.reg.title'), actions: tabs }}
        stats={[
          { label: t('pt.reg.stat.awaiting'), value: String(awaiting), tone: awaiting ? 'attention' : 'text', meta: t('pt.reg.stat.awaitingMeta') },
          { label: t('pt.reg.stat.month'), value: String(thisMonth), meta: t('pt.reg.stat.monthMeta') },
          { label: t('pt.reg.stat.refused'), value: String(refused), meta: t('pt.reg.stat.refusedMeta') },
          { label: t('pt.reg.stat.gaps'), value: null },
        ]}
        statVariant="plain"
        statsLabel={t('pt.reg.statsLabel')}
        tabPanel={{ id: 'pw-reg-panel', labelledBy: `pw-reg-tab-${tab}` }}
        table={{
          caption: t('pt.reg.caption', { tab: tabLabel(tab) }),
          columns: [
            { label: t('pt.reg.col.entry'), width: '170px' },
            { label: t('pt.reg.col.drug') },
            { label: t('pt.reg.col.prescriber'), width: '170px' },
            { label: t('pt.reg.col.pharmacist'), width: '170px' },
            { label: t('pt.reg.col.state'), width: '200px', align: 'end' },
          ],
          rows,
          rowActions: tab !== 'h1',
          footnote: t('pt.reg.footnote'),
        }}
        noMatches={rows.length === 0 && (register.length > 0 || dispenses.length > 0) ? { title: t('pt.reg.tabEmptyTitle'), body: t('pt.reg.tabEmptyBody') } : undefined}
        empty={{ title: t('pt.reg.emptyTitle'), body: t('pt.reg.emptyBody'), icon3d: PARTNER_EMPTY_TILE, action: { label: t('pt.reg.emptyAction'), onSelect: () => go('rx-review') } }}
        unconnected={{ title: t('pt.reg.emptyTitle'), body: t('pt.reg.emptyBody') }}
        error={{ title: t('pt.reg.errorTitle'), reference: t('pt.reg.ref'), detail: data.error || undefined, onRetry: data.reload, onHelp: () => go('support') }}
        loadingLabel={t('console.loading', { title: t('pt.reg.title') })}
      />

      <Drawer
        open={Boolean(open)}
        eyebrow={t('pt.reg.swap.eyebrow')}
        title={open ? t('pt.reg.entry', { ref: refOf(open.id) }) : ''}
        onClose={() => setOpenId(null)}
      >
        {open ? (
          <div className="pw-drawer">
            <p className="pw-swap" aria-label={t('pt.reg.swap.line', { from: (open.prescription?.items ?? []).map((item) => [item.genericName, item.strength].filter(Boolean).join(' ')).join(', '), to: open.substitutionNote })}>
              <span>{(open.prescription?.items ?? []).map((item) => [item.genericName, item.strength].filter(Boolean).join(' ')).join(', ')}</span>
              <Icon name="arrow-right" size={18} strokeWidth={2.4} />
              <span>{open.substitutionNote}</span>
            </p>
            <ul className="pw-checklist" aria-label={t('pt.reg.swap.factsLabel')}>
              {(open.prescription?.items ?? []).map((item) => (
                <li key={item.id} className={item.substitutionAllowed ? 'is-ok' : 'is-off'}>
                  <span className="pw-checklist__mark"><Icon name={item.substitutionAllowed ? 'check' : 'x'} size={16} strokeWidth={2.6} /></span>
                  {t(item.substitutionAllowed ? 'pt.reg.swap.permitted' : 'pt.reg.swap.notPermitted', { item: [item.genericName, item.strength].filter(Boolean).join(' ') })}
                </li>
              ))}
            </ul>
            <p className="pc-note pc-note--info pc-note__text">{t('pt.reg.swap.prescriberDecides')}</p>
          </div>
        ) : null}
      </Drawer>
    </main>
  );
}
