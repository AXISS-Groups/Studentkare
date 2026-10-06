import React, { useEffect, useState } from 'react';
import { observer } from 'mobx-react-lite';
import { navigate } from '@/lib/workflowRouting';
import { AdminEmpty, AdminEmptySection, AdminError, AdminLoading, AdminPage } from '@/screens/workspace/admin/AdminPage';
import { contractsRepository } from '../model/contractsRepository';
import { planPriceWithPeriod } from '../model/format';
import { PlansPricingViewModel } from '../viewmodels/PlansPricingViewModel';

// Change a plan price (design: AdminPriceFix). Tier 1 in DESIGN.md; built without the
// named design review at the product owner's request, and kept read-only. Current prices
// come from the billing catalogue. There is no endpoint to set a price, check which
// screens read the catalogue, or request a second admin's approval, so none of those is
// a working control here.
export const PriceFixView = observer(function PriceFixView() {
  const [vm] = useState(() => new PlansPricingViewModel(contractsRepository));
  useEffect(() => { vm.load(); return vm.dispose; }, [vm]);
  return <AdminPage eyebrow="Plans & pricing" title="Change a plan price" description="Step 1: every surface reads one catalogue price. Step 2: set the price. Step 3: a second admin approves.">
    <button type="button" className="sk-admin-back" onClick={() => navigate('admin/plans')}>← Plans & pricing</button>
    <p className="sk-admin-note" role="note">Read-only. Nothing can be changed here until plan editing and approvals are connected.</p>
    <AdminEmptySection title="1 · Where the price appears" description="Each screen that shows a price, and whether it reads the catalogue or hard-codes it." emptyTitle="No surface checks reported." emptyDescription="Surfaces will be listed here once surface checks are connected." />
    <div className="sk-admin-sections sk-admin-sections-two">
      <section className="sk-admin-card" aria-labelledby="sk-admin-price-current">
        <h3 id="sk-admin-price-current" className="sk-admin-eyebrow">2 · Current prices</h3>
        {vm.loading ? <AdminLoading label="Loading prices…" />
          : vm.error ? <AdminError title="Couldn’t load prices" message={vm.error} onRetry={vm.reload} />
            : !vm.plans.length ? <AdminEmpty title="No plans published yet." description="Published plans and their prices will appear here." />
              : <ul className="sk-admin-list">{vm.plans.map(plan => <li key={plan.id}><span>{plan.name}</span><strong className="sk-admin-mono">{planPriceWithPeriod(plan)}</strong></li>)}</ul>}
        <p className="sk-admin-section-description">A new price can be set here once plan editing is connected.</p>
      </section>
      <AdminEmptySection title="3 · Approval" description="Any price change needs a second admin, who sees the same surface list before approving." emptyTitle="No approval requests." emptyDescription="Price changes waiting for a second admin will appear here." />
    </div>
  </AdminPage>;
});
