import React from 'react';
import { observer } from 'mobx-react-lite';
import { ConsolePageHeader, SkButton } from '@/design-system';
import { Icon } from '@/design-system/icons';
import { navigate } from '@/lib/utils/workflowRouting';
import { useT } from '@/i18n';
import { governanceRepository } from '../model/governanceRepository';
import { BoardNote } from './AdminBoard';
import { BackLink, BoardFailure, BoardLoading, GovCard, GovLines, useResource } from './GovBoard';
import { BILLING_AREA, settingLabel, settingValue } from './PlansPricingView';
import './gov-board.css';

/**
 * Fix the Premium price, SK-006 (design: AdminPriceFix, Tier 1). Retired: SK-006 is
 * resolved by the settings registry — each plan price is one setting that the plan
 * catalogue and checkout read, and a price is changed in Plans & pricing (reason
 * required, audited, history kept). This page says so and shows the price settings as
 * the server has them; it has no price field and no approval button of its own. The
 * board's "Demo: second admin approves" never ships.
 */
export const PriceFixView = observer(function PriceFixView() {
  const t = useT();
  const vm = useResource(governanceRepository.settings);
  if (vm.status === 'loading') return <BoardLoading label={t('admin.priceFix.loading')} />;
  if (vm.status === 'error') return <BoardFailure t={t} what={t('gov.priceFix.what')} screen="AdminPriceFix" onRetry={vm.reload} detail={vm.error} />;
  const prices = (vm.data?.items ?? []).filter(item => item.area === BILLING_AREA);
  return <div className="sk-ds sk-admin-page sk-gov">
    <BackLink route="admin/plans" label={t('admin.plans.title')} />
    <ConsolePageHeader title={t('gov.priceFix.title')} subtitle={t('gov.priceFix.subtitle')} />
    <BoardNote icon="check">{t('gov.priceFix.resolved')}</BoardNote>
    <GovCard eyebrow={t('gov.priceFix.settings')}>
      <GovLines label={t('gov.priceFix.settings')} lines={prices.map(item => ({ label: settingLabel(t, item), value: settingValue(t, item), mono: true }))} />
      <SkButton onClick={() => navigate('admin/plans')}>{t('gov.priceFix.open')}<Icon name="arrow-right" size={16} /></SkButton>
    </GovCard>
  </div>;
});
