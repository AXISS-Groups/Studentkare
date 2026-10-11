import React, { useState } from 'react';
import { AdminEmpty, AdminPage, AdminStats, unreportedStats } from '@/screens/workspace/admin/AdminPage';
import { useT } from '@/i18n';
import type { MessageKey } from '@/i18n';

// Billing ledger. No admin endpoint lists receipts, payments, contracts or payouts, so the
// ledger has no rows. The design's layout is kept; its figures are not invented, and there
// is no "Run payouts" button because nothing behind it would move money.
type LedgerKind = 'campus' | 'plan' | 'commission' | 'payout' | 'refund';
interface LedgerEntry { ref: string; date: string; kind: LedgerKind; what: string; party: string; amount: string; status: string }
const LEDGER_FILTERS: { key: LedgerKind | 'all'; label: MessageKey; empty: MessageKey }[] = [
  { key: 'all', label: 'admin.ledger.filterAll', empty: 'admin.ledger.emptyAll' },
  { key: 'campus', label: 'admin.ledger.filterCampus', empty: 'admin.ledger.emptyCampus' },
  { key: 'plan', label: 'admin.ledger.filterPlans', empty: 'admin.ledger.emptyPlans' },
  { key: 'commission', label: 'admin.ledger.filterCommission', empty: 'admin.ledger.emptyCommission' },
  { key: 'payout', label: 'admin.ledger.filterPayouts', empty: 'admin.ledger.emptyPayouts' },
  { key: 'refund', label: 'admin.ledger.filterRefunds', empty: 'admin.ledger.emptyRefunds' },
];
// Intentionally empty until a ledger endpoint exists. Never filled with sample entries.
const LEDGER_ENTRIES: LedgerEntry[] = [];

export function BillingLedgerView() {
  const t = useT();
  // Presentation state only: which filter chip is selected.
  const [filter, setFilter] = useState<LedgerKind | 'all'>('all');
  const rows = LEDGER_ENTRIES.filter(entry => filter === 'all' || entry.kind === filter);
  const current = LEDGER_FILTERS.find(item => item.key === filter) ?? LEDGER_FILTERS[0];
  return <AdminPage eyebrow={t('admin.eyebrow.commerce')} title={t('admin.ledger.title')} description={t('admin.ledger.description')}
    status={<><button type="button" className="sk-admin-button" disabled aria-describedby="sk-admin-ledger-export-note">{t('admin.ledger.export')}</button><span id="sk-admin-ledger-export-note" className="sk-admin-visually-hidden">{t('admin.ledger.exportNote')}</span></>}>
    <AdminStats label={t('admin.ledger.summary')} columns={5} stats={unreportedStats([t('admin.ledger.statRevenue'), t('admin.ledger.statCampus'), t('admin.ledger.statPlans'), t('admin.ledger.statPayouts'), t('admin.ledger.statRefunds')])} />
    <div className="sk-admin-chips" role="group" aria-label={t('admin.ledger.filterLabel')}>
      {LEDGER_FILTERS.map(item => <button key={item.key} type="button" aria-pressed={filter === item.key} onClick={() => setFilter(item.key)}>{t(item.label)}</button>)}
    </div>
    <div className="sk-admin-card sk-admin-table-card">
      <table className="sk-admin-table">
        <caption className="sk-admin-visually-hidden">{t('admin.ledger.caption')}</caption>
        <thead><tr><th scope="col">{t('admin.ledger.colRef')}</th><th scope="col">{t('admin.ledger.colDate')}</th><th scope="col">{t('admin.ledger.colWhat')}</th><th scope="col">{t('admin.ledger.colParty')}</th><th scope="col">{t('admin.ledger.colAmount')}</th><th scope="col">{t('admin.ledger.colStatus')}</th></tr></thead>
        <tbody>{rows.length ? rows.map(entry => <tr key={entry.ref}><td className="sk-admin-mono">{entry.ref}</td><td>{entry.date}</td><td>{entry.what}</td><td>{entry.party}</td><td>{entry.amount}</td><td>{entry.status}</td></tr>)
          : <tr><td colSpan={6}><AdminEmpty title={t(current.empty)} description={t('admin.ledger.emptyBody')} /></td></tr>}</tbody>
      </table>
    </div>
  </AdminPage>;
}
