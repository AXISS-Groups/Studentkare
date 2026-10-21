import { money } from '../types/workflowTypes';
import type { MessageKey, Vars } from '@/i18n';
import type { BillingPlan } from './billing';

/**
 * How plan prices read. The amounts are the server's (GET /billing/plans, from
 * the settings registry); only the wording is i18n. Pure functions, no React.
 */
type Translate = (key: MessageKey, vars?: Vars) => string;
const PAISE_PER_RUPEE = 100;

/** Whole rupees, formatted with the app's currency formatter (₹2,199). */
export const rupeeAmount = (rupees: number): string => money(rupees * PAISE_PER_RUPEE);

/** A plan's price: "₹149", "from ₹499" for a starting price, or a word price ("Free") as given. */
export function planPriceLabel(plan: BillingPlan, t: Translate): string {
  if (typeof plan.price !== 'number') return plan.price;
  const amount = rupeeAmount(plan.price);
  return plan.priceFrom ? t('shopweb.plans.amountFrom', { amount }) : amount;
}

/** "3-month package: ₹2,199" for each package of a plan. */
export const planPackageLabels = (plan: BillingPlan, t: Translate): string[] =>
  (plan.packages ?? []).map(item => t('shopweb.plans.package', { months: item.months, amount: rupeeAmount(item.price) }));
