import { useCallback, useEffect, useState } from 'react';
import { getPlans } from '@/data/datasets/billing';
import type { BillingPackage, BillingPlan, BillingPlanId } from '@/data/datasets/billing';

/**
 * The public plan list, shared by the web and native plans pages.
 *
 * Plan names, prices and benefits come only from the server catalogue
 * (`GET /billing/plans`, priced from the settings registry): the same source
 * the checkout uses. One malformed plan and no price is shown at all.
 */
export type PlansState =
  | { status: 'loading' }
  | { status: 'error' }
  | { status: 'ready'; plans: BillingPlan[] };

/** The one plan the server sells online (checkout is the monthly subscription only). */
export const ONLINE_PLAN: BillingPlanId = 'STUDENT_PLUS';

function isPackage(value: unknown): value is BillingPackage {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  return typeof v.id === 'string' && typeof v.months === 'number' && typeof v.price === 'number';
}

function isPlan(value: unknown): value is BillingPlan {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  return typeof v.id === 'string' && typeof v.name === 'string' && typeof v.period === 'string' &&
    typeof v.description === 'string' && typeof v.audience === 'string' &&
    (typeof v.price === 'number' || typeof v.price === 'string') &&
    Array.isArray(v.benefits) && v.benefits.every((b) => typeof b === 'string') &&
    (v.priceFrom === undefined || typeof v.priceFrom === 'boolean') &&
    (v.packages === undefined || (Array.isArray(v.packages) && v.packages.every(isPackage)));
}

/** Fail closed: one malformed plan and no price is shown at all. */
export function parsePlans(value: unknown): BillingPlan[] | null {
  if (typeof value !== 'object' || value === null) return null;
  const plans = (value as Record<string, unknown>).plans;
  return Array.isArray(plans) && plans.every(isPlan) ? plans : null;
}

export const isInstitutionPlan = (plan: BillingPlan): boolean => plan.audience === 'institution';

/** A priced student plan that checkout does not sell: its starting price is shown, nothing is offered. */
export const isNotSoldOnline = (plan: BillingPlan): boolean =>
  !isInstitutionPlan(plan) && typeof plan.price === 'number' && plan.id !== ONLINE_PLAN;

export function usePlanCatalog(): { state: PlansState; reload: () => void } {
  const [state, setState] = useState<PlansState>({ status: 'loading' });
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let live = true;
    setState({ status: 'loading' });
    getPlans()
      .then((catalog: unknown) => {
        if (!live) return;
        const plans = parsePlans(catalog);
        setState(plans ? { status: 'ready', plans } : { status: 'error' });
      })
      .catch(() => { if (live) setState({ status: 'error' }); });
    return () => { live = false; };
  }, [attempt]);
  const reload = useCallback(() => setAttempt((n) => n + 1), []);
  return { state, reload };
}
