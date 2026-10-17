import React, { useEffect, useState } from 'react';
import { observer } from 'mobx-react-lite';
import { navigate } from '@/lib/workflowRouting';
import { AdminEmpty, AdminEmptySection, AdminError, AdminLoading, AdminPage } from '@/screens/workspace/admin/AdminPage';
import { contractsRepository } from '../model/contractsRepository';
import { planPrice } from '../model/format';
import { PlansPricingViewModel } from '../viewmodels/PlansPricingViewModel';
import { useT } from '@/i18n';

// Plans & pricing (design: AdminPlansPricing). Plans come from the billing catalogue.
// There is no endpoint for editing plans, for which screens read the catalogue, or for
// price history, so "New plan"/"Edit plan" are not shown and those two panels are empty.
export const PlansPricingView = observer(function PlansPricingView() {
  const t = useT();
  const [vm] = useState(() => new PlansPricingViewModel(contractsRepository));
  useEffect(() => { vm.load(); return vm.dispose; }, [vm]);
  return <AdminPage eyebrow={t('admin.eyebrow.commerce')} title={t('admin.plans.title')} description={t('admin.plans.description')}
    status={<button type="button" className="sk-admin-button" onClick={() => navigate('admin/price-fix')}>{t('admin.plans.change')}</button>}>
    {vm.loading ? <AdminLoading label={t('admin.plans.loading')} />
      : vm.error ? <AdminError title={t('admin.plans.error')} message={vm.error} onRetry={vm.reload} />
        : !vm.plans.length ? <div className="sk-admin-card"><AdminEmpty title={t('admin.plans.empty')} description={t('admin.plans.emptyBody')} /></div>
          : <>
            <div className="sk-admin-plans">{vm.plans.map(plan => <article key={plan.id} className="sk-admin-card sk-admin-plan">
              <div className="sk-admin-plan-heading"><h3>{plan.name}</h3><span className="sk-admin-tag is-positive">{t('admin.catalogue.published')}</span></div>
              <p className="sk-admin-plan-price"><strong>{planPrice(plan)}</strong> <span>{plan.period}</span></p>
              <p>{plan.description}</p>
              <ul>{plan.benefits.map(benefit => <li key={benefit}>{benefit}</li>)}</ul>
            </article>)}</div>
            <p className="sk-admin-note">{vm.checkoutAvailable ? t('admin.plans.checkoutOn') : t('admin.plans.checkoutOff')}</p>
          </>}
    <div className="sk-admin-sections sk-admin-sections-two">
      <AdminEmptySection title={t('admin.plans.where')} description={t('admin.plans.whereBody')} emptyTitle={t('admin.plans.noSurfaceChecks')} emptyDescription={t('admin.plans.whereEmptyBody')} />
      <AdminEmptySection title={t('admin.plans.history')} description={t('admin.plans.historyBody')} emptyTitle={t('admin.plans.historyEmpty')} emptyDescription={t('admin.plans.historyEmptyBody')} />
    </div>
  </AdminPage>;
});
