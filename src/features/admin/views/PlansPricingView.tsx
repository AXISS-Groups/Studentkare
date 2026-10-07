import React, { useEffect, useState } from 'react';
import { observer } from 'mobx-react-lite';
import { navigate } from '@/lib/workflowRouting';
import { AdminEmpty, AdminEmptySection, AdminError, AdminLoading, AdminPage } from '@/screens/workspace/admin/AdminPage';
import { contractsRepository } from '../model/contractsRepository';
import { planPrice } from '../model/format';
import { PlansPricingViewModel } from '../viewmodels/PlansPricingViewModel';

// Plans & pricing (design: AdminPlansPricing). Plans come from the billing catalogue.
// There is no endpoint for editing plans, for which screens read the catalogue, or for
// price history, so "New plan"/"Edit plan" are not shown and those two panels are empty.
export const PlansPricingView = observer(function PlansPricingView() {
  const [vm] = useState(() => new PlansPricingViewModel(contractsRepository));
  useEffect(() => { vm.load(); return vm.dispose; }, [vm]);
  return <AdminPage eyebrow="Commerce" title="Plans & pricing" description="The single source for every price students see. Care itself is always pay-per-use and never gated by plan."
    status={<button type="button" className="sk-admin-button" onClick={() => navigate('admin/price-fix')}>Change a price</button>}>
    {vm.loading ? <AdminLoading label="Loading plans…" />
      : vm.error ? <AdminError title="Couldn’t load plans & pricing" message={vm.error} onRetry={vm.reload} />
        : !vm.plans.length ? <div className="sk-admin-card"><AdminEmpty title="No plans published yet." description="Plans will appear here once they are published." /></div>
          : <>
            <div className="sk-admin-plans">{vm.plans.map(plan => <article key={plan.id} className="sk-admin-card sk-admin-plan">
              <div className="sk-admin-plan-heading"><h3>{plan.name}</h3><span className="sk-admin-tag is-positive">Published</span></div>
              <p className="sk-admin-plan-price"><strong>{planPrice(plan)}</strong> <span>{plan.period}</span></p>
              <p>{plan.description}</p>
              <ul>{plan.benefits.map(benefit => <li key={benefit}>{benefit}</li>)}</ul>
            </article>)}</div>
            <p className="sk-admin-note">{vm.checkoutAvailable ? 'Online checkout is configured.' : 'Online checkout is not configured, so paid plans cannot be bought yet.'}</p>
          </>}
    <div className="sk-admin-sections sk-admin-sections-two">
      <AdminEmptySection title="Where prices appear" description="Every surface that shows a price should read it from this catalogue." emptyTitle="No surface checks reported." emptyDescription="Which screens read the catalogue, and which hard-code a price, will appear here once surface checks are connected." />
      <AdminEmptySection title="Change history" description="Price changes, and who approved them." emptyTitle="No price changes recorded." emptyDescription="Price changes will be listed here once plan editing is connected." />
    </div>
  </AdminPage>;
});
