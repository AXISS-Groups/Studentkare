import React, { useEffect, useState } from 'react';
import { observer } from 'mobx-react-lite';
import { navigate } from '@/lib/utils/workflowRouting';
import { AdminEmpty, AdminEmptySection, AdminError, AdminLoading, AdminPage } from '@/screens/workspace/admin/AdminPage';
import { contractsRepository } from '../model/contractsRepository';
import { planPriceWithPeriod } from '../model/format';
import { PlansPricingViewModel } from '../viewmodels/PlansPricingViewModel';
import { useT } from '@/i18n';

// Change a plan price (design: AdminPriceFix). Tier 1 in DESIGN.md; built without the
// named design review at the product owner's request, and kept read-only. Current prices
// come from the billing catalogue. There is no endpoint to set a price, check which
// screens read the catalogue, or request a second admin's approval, so none of those is
// a working control here.
export const PriceFixView = observer(function PriceFixView() {
  const t = useT();
  const [vm] = useState(() => new PlansPricingViewModel(contractsRepository));
  useEffect(() => { vm.load(); return vm.dispose; }, [vm]);
  return <AdminPage eyebrow={t('admin.plans.title')} title={t('admin.priceFix.title')} description={t('admin.priceFix.description')}>
    <button type="button" className="sk-admin-back" onClick={() => navigate('admin/plans')}><span aria-hidden="true">← </span>{t('admin.plans.title')}</button>
    <p className="sk-admin-note" role="note">{t('admin.priceFix.readOnly')}</p>
    <AdminEmptySection title={t('admin.priceFix.step1')} description={t('admin.priceFix.step1Body')} emptyTitle={t('admin.plans.noSurfaceChecks')} emptyDescription={t('admin.priceFix.step1EmptyBody')} />
    <div className="sk-admin-sections sk-admin-sections-two">
      <section className="sk-admin-card" aria-labelledby="sk-admin-price-current">
        <h3 id="sk-admin-price-current" className="sk-admin-eyebrow">{t('admin.priceFix.step2')}</h3>
        {vm.loading ? <AdminLoading label={t('admin.priceFix.loading')} />
          : vm.error ? <AdminError title={t('admin.priceFix.error')} message={vm.error} onRetry={vm.reload} />
            : !vm.plans.length ? <AdminEmpty title={t('admin.plans.empty')} description={t('admin.priceFix.emptyBody')} />
              : <ul className="sk-admin-list">{vm.plans.map(plan => <li key={plan.id}><span>{plan.name}</span><strong className="sk-admin-mono">{planPriceWithPeriod(plan)}</strong></li>)}</ul>}
        <p className="sk-admin-section-description">{t('admin.priceFix.setLater')}</p>
      </section>
      <AdminEmptySection title={t('admin.priceFix.step3')} description={t('admin.priceFix.step3Body')} emptyTitle={t('admin.priceFix.step3Empty')} emptyDescription={t('admin.priceFix.step3EmptyBody')} />
    </div>
  </AdminPage>;
});
