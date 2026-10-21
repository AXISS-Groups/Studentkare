import React, { useEffect, useState } from 'react';
import { observer } from 'mobx-react-lite';
import { ConsoleTablePage, DataTable } from '@/design-system';
import { Icon } from '@/design-system/icons';
import { useT } from '@/i18n';
import type { MessageKey } from '@/i18n';
import { contractsRepository } from '../model/contractsRepository';
import { planPriceWithPeriod } from '../model/format';
import { PlansPricingViewModel } from '../viewmodels/PlansPricingViewModel';
import { BoardChips, BoardNote, boardEmpty, boardError } from './AdminBoard';

/**
 * Billing ledger (design: AdminBilling). No admin endpoint lists receipts, payments,
 * contracts or payouts, so the ledger has no rows and its five figures are "—". The
 * board's layout is kept; its figures are not invented, export stays disabled until
 * there is something to export, and there is no "Run payouts" button because nothing
 * behind it would move money. Plan prices are not hard-coded: the note reads them from
 * the billing API (/billing/plans), the same catalogue checkout charges from.
 */
type LedgerKind = 'all' | 'campus' | 'plan' | 'commission' | 'payout' | 'refund';
const LEDGER_FILTERS: readonly { key: LedgerKind; label: MessageKey; empty: MessageKey }[] = [
  { key: 'all', label: 'admin.ledger.filterAll', empty: 'admin.ledger.emptyAll' },
  { key: 'campus', label: 'admin.ledger.filterCampus', empty: 'admin.ledger.emptyCampus' },
  { key: 'plan', label: 'admin.ledger.filterPlans', empty: 'admin.ledger.emptyPlans' },
  { key: 'commission', label: 'admin.ledger.filterCommission', empty: 'admin.ledger.emptyCommission' },
  { key: 'payout', label: 'admin.ledger.filterPayouts', empty: 'admin.ledger.emptyPayouts' },
  { key: 'refund', label: 'admin.ledger.filterRefunds', empty: 'admin.ledger.emptyRefunds' },
];

/** The plan prices in force, from the billing catalogue; nothing while it loads or if it fails. */
const PlanPrices = observer(function PlanPrices({ vm }: { vm: PlansPricingViewModel }) {
  const t = useT();
  if (vm.loading || vm.error || !vm.plans.length) return null;
  const prices = vm.plans.map(plan => `${plan.name} ${planPriceWithPeriod(plan, t)}`).join(' · ');
  return <BoardNote icon="banknote">{t('adminBoard.billing.prices', { prices })}</BoardNote>;
});

export function BillingLedgerView() {
  const t = useT();
  const [plans] = useState(() => new PlansPricingViewModel(contractsRepository));
  useEffect(() => { plans.load(); return plans.dispose; }, [plans]);
  // Presentation state only: which filter chip is selected.
  const [filter, setFilter] = useState<LedgerKind>('all');
  const current = LEDGER_FILTERS.find(item => item.key === filter) ?? LEDGER_FILTERS[0];
  const columns = [
    { label: t('admin.ledger.colRef') }, { label: t('admin.ledger.colDate') }, { label: t('admin.ledger.colWhat'), width: '30%' },
    { label: t('admin.ledger.colParty') }, { label: t('admin.ledger.colAmount'), align: 'end' as const }, { label: t('admin.ledger.colStatus') },
  ];
  return <div className="sk-admin-page">
    <ConsoleTablePage
      status="unconnected"
      header={{
        title: t('admin.ledger.title'),
        subtitle: t('admin.ledger.description'),
        actions: <>
          <button type="button" className="sk-btn sk-btn--secondary" disabled aria-describedby="sk-admin-ledger-export-note"><Icon name="download-2" size={17} />{t('admin.ledger.export')}</button>
          <span id="sk-admin-ledger-export-note" className="sk-board-visually-hidden">{t('admin.ledger.exportNote')}</span>
        </>,
      }}
      note={<PlanPrices vm={plans} />}
      statLabels={[t('admin.ledger.statRevenue'), t('admin.ledger.statCampus'), t('admin.ledger.statPlans'), t('admin.ledger.statPayouts'), t('admin.ledger.statRefunds')]}
      statsLabel={t('admin.ledger.summary')}
      alternate={<>
        <BoardChips label={t('admin.ledger.filterLabel')} options={LEDGER_FILTERS.map(item => ({ id: item.key, label: t(item.label) }))} value={filter} onChange={setFilter} />
        <DataTable caption={t('admin.ledger.caption')} columns={columns} rows={[]} emptyMessage={{ title: t(current.empty), body: t('admin.ledger.emptyBody') }} />
      </>}
      table={{ caption: t('admin.ledger.caption'), columns, rows: [] }}
      empty={boardEmpty(t, t('adminBoard.billing.empty'))}
      unconnected={{ title: t(current.empty), body: t('admin.ledger.emptyBody') }}
      error={boardError(t, t('adminBoard.billing.what'), 'AdminBilling', () => undefined)}
      loadingLabel={t('adminBoard.billing.loading')}
    />
  </div>;
}
