import React, { useState } from 'react';
import { AdminEmpty, AdminPage, AdminStats, unreportedStats } from '@/screens/workspace/admin/AdminPage';

// Billing ledger. No admin endpoint lists receipts, payments, contracts or payouts, so the
// ledger has no rows. The design's layout is kept; its figures are not invented, and there
// is no "Run payouts" button because nothing behind it would move money.
type LedgerKind = 'campus' | 'plan' | 'commission' | 'payout' | 'refund';
interface LedgerEntry { ref: string; date: string; kind: LedgerKind; what: string; party: string; amount: string; status: string }
const LEDGER_FILTERS: { key: LedgerKind | 'all'; label: string; empty: string }[] = [
  { key: 'all', label: 'All', empty: 'No ledger entries yet.' },
  { key: 'campus', label: 'Campus', empty: 'No campus contract entries yet.' },
  { key: 'plan', label: 'Plans', empty: 'No plan subscription entries yet.' },
  { key: 'commission', label: 'Commission', empty: 'No commission entries yet.' },
  { key: 'payout', label: 'Payouts', empty: 'No payouts yet.' },
  { key: 'refund', label: 'Refunds', empty: 'No refunds yet.' },
];
// Intentionally empty until a ledger endpoint exists. Never filled with sample entries.
const LEDGER_ENTRIES: LedgerEntry[] = [];

export function BillingLedgerView() {
  // Presentation state only: which filter chip is selected.
  const [filter, setFilter] = useState<LedgerKind | 'all'>('all');
  const rows = LEDGER_ENTRIES.filter(entry => filter === 'all' || entry.kind === filter);
  const current = LEDGER_FILTERS.find(item => item.key === filter) ?? LEDGER_FILTERS[0];
  return <AdminPage eyebrow="Commerce" title="Billing ledger" description="Every rupee in and out — subscriptions, campus contracts, partner commission and payouts, refunds."
    status={<><button type="button" className="sk-admin-button" disabled aria-describedby="sk-admin-ledger-export-note">Export for accounts</button><span id="sk-admin-ledger-export-note" className="sk-admin-visually-hidden">Nothing to export until the ledger has entries.</span></>}>
    <AdminStats label="Billing summary" columns={5} stats={unreportedStats(['Revenue · this month', 'Campus contracts', 'Plans', 'Payouts due', 'Refunds'])} />
    <div className="sk-admin-chips" role="group" aria-label="Filter ledger entries">
      {LEDGER_FILTERS.map(item => <button key={item.key} type="button" aria-pressed={filter === item.key} onClick={() => setFilter(item.key)}>{item.label}</button>)}
    </div>
    <div className="sk-admin-card sk-admin-table-card">
      <table className="sk-admin-table">
        <caption className="sk-admin-visually-hidden">Ledger entries</caption>
        <thead><tr><th scope="col">Ref</th><th scope="col">Date</th><th scope="col">What</th><th scope="col">Party</th><th scope="col">Amount</th><th scope="col">Status</th></tr></thead>
        <tbody>{rows.length ? rows.map(entry => <tr key={entry.ref}><td className="sk-admin-mono">{entry.ref}</td><td>{entry.date}</td><td>{entry.what}</td><td>{entry.party}</td><td>{entry.amount}</td><td>{entry.status}</td></tr>)
          : <tr><td colSpan={6}><AdminEmpty title={current.empty} description="Receipts, contracts, commission, payouts and refunds will appear here once the ledger data source is connected. No sample data is shown." /></td></tr>}</tbody>
      </table>
    </div>
  </AdminPage>;
}
