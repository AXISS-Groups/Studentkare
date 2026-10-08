import { describe, expect, it, vi } from 'vitest';
import type { BillingPlan, PlanCatalog } from '@/data/datasets/billing';
import type { PlansRepository } from '../../model/contractsRepository';
import { planPrice, planPriceWithPeriod } from '../../model/format';
import { PlansPricingViewModel } from '../PlansPricingViewModel';

const plan = (id: BillingPlan['id'], overrides: Partial<BillingPlan> = {}): BillingPlan => ({ id, name: id, price: 'Free', period: 'forever', audience: 'student', benefits: [], description: '', ...overrides });
const catalog = (ids: BillingPlan['id'][], checkoutAvailable = false): PlanCatalog => ({ plans: ids.map(id => plan(id)), checkoutAvailable, publicKey: '' });
const settle = async () => { for (let i = 0; i < 6; i += 1) await Promise.resolve(); };
const repository = (plans: PlansRepository['plans'] = vi.fn().mockResolvedValue(catalog(['FREE', 'STUDENT_PLUS'], true))): PlansRepository => ({ plans });

/** A plans call that waits until the test settles it, keeping the signal it was given. */
function deferred() {
  const calls: { resolve: (value: PlanCatalog) => void; reject: (reason: Error) => void; signal?: AbortSignal }[] = [];
  const plans = (signal?: AbortSignal) => new Promise<PlanCatalog>((resolve, reject) => { calls.push({ resolve, reject, signal }); });
  return { calls, plans };
}

describe('PlansPricingViewModel', () => {
  it('is loading before the first load, with no plans', () => {
    const vm = new PlansPricingViewModel(repository());
    expect(vm.loading).toBe(true);
    expect(vm.error).toBe('');
    expect(vm.catalog).toBeNull();
    expect(vm.plans).toEqual([]);
    expect(vm.checkoutAvailable).toBe(false);
  });

  it('asks the repository for the plans once, with a signal', () => {
    const repo = repository();
    new PlansPricingViewModel(repo).load();
    expect(repo.plans).toHaveBeenCalledTimes(1);
    expect(repo.plans).toHaveBeenCalledWith(expect.any(AbortSignal));
  });

  it('is loading while the request is in flight, then holds the catalogue in order', async () => {
    const vm = new PlansPricingViewModel(repository());
    vm.load();
    expect(vm.loading).toBe(true);
    await settle();
    expect(vm.loading).toBe(false);
    expect(vm.error).toBe('');
    expect(vm.plans.map(item => item.id)).toEqual(['FREE', 'STUDENT_PLUS']);
    expect(vm.checkoutAvailable).toBe(true);
  });

  it('holds an empty catalogue as no plans, not an error', async () => {
    const vm = new PlansPricingViewModel(repository(vi.fn().mockResolvedValue(catalog([]))));
    vm.load();
    await settle();
    expect(vm.plans).toEqual([]);
    expect(vm.error).toBe('');
    expect(vm.loading).toBe(false);
  });

  it('keeps the error message when the request fails', async () => {
    const vm = new PlansPricingViewModel(repository(vi.fn().mockRejectedValue(new Error('Not Found'))));
    vm.load();
    await settle();
    expect(vm.error).toBe('Not Found');
    expect(vm.catalog).toBeNull();
    expect(vm.loading).toBe(false);
  });

  it('retries after a failure', async () => {
    const plans = vi.fn().mockRejectedValueOnce(new Error('Not Found')).mockResolvedValue(catalog(['CAMPUS']));
    const vm = new PlansPricingViewModel(repository(plans));
    vm.load();
    await settle();
    vm.reload();
    expect(vm.loading).toBe(true);
    expect(vm.error).toBe('');
    await settle();
    expect(vm.plans.map(item => item.id)).toEqual(['CAMPUS']);
    expect(plans).toHaveBeenCalledTimes(2);
  });

  it('reloads fresh data, clearing the old catalogue while it loads', async () => {
    const plans = vi.fn().mockResolvedValueOnce(catalog(['FREE'])).mockResolvedValue(catalog(['FREE', 'ENTERPRISE']));
    const vm = new PlansPricingViewModel(repository(plans));
    vm.load();
    await settle();
    vm.reload();
    expect(vm.catalog).toBeNull();
    await settle();
    expect(vm.plans.map(item => item.id)).toEqual(['FREE', 'ENTERPRISE']);
  });

  it('cancels the request in flight when reloaded', () => {
    const pending = deferred();
    const vm = new PlansPricingViewModel(repository(pending.plans));
    vm.load();
    vm.reload();
    expect(pending.calls[0].signal?.aborted).toBe(true);
    expect(pending.calls[1].signal?.aborted).toBe(false);
  });

  it('ignores a stale answer or failure: only the latest request counts', async () => {
    const pending = deferred();
    const vm = new PlansPricingViewModel(repository(pending.plans));
    vm.load();
    vm.reload();
    pending.calls[1].resolve(catalog(['STUDENT_PLUS']));
    await settle();
    pending.calls[0].resolve(catalog(['FREE']));
    pending.calls[0].reject(new Error('late'));
    await settle();
    expect(vm.plans.map(item => item.id)).toEqual(['STUDENT_PLUS']);
    expect(vm.error).toBe('');
  });

  it('dispose cancels the request and ignores its late answer', async () => {
    const pending = deferred();
    const vm = new PlansPricingViewModel(repository(pending.plans));
    vm.load();
    vm.dispose();
    expect(pending.calls[0].signal?.aborted).toBe(true);
    pending.calls[0].resolve(catalog(['FREE']));
    await settle();
    expect(vm.catalog).toBeNull();
    expect(vm.loading).toBe(true);
  });

  it('makes no state change after dispose, even on a late failure', async () => {
    const pending = deferred();
    const vm = new PlansPricingViewModel(repository(pending.plans));
    vm.load();
    vm.dispose();
    pending.calls[0].reject(new Error('late'));
    await settle();
    expect(vm.error).toBe('');
    expect(vm.loading).toBe(true);
  });

  it('works again after dispose when loaded once more', async () => {
    const vm = new PlansPricingViewModel(repository());
    vm.load();
    vm.dispose();
    vm.load();
    await settle();
    expect(vm.plans).toHaveLength(2);
  });
});

describe('plan price rules (format.ts)', () => {
  it('formats a rupee price, and shows a word price as given', () => {
    expect(planPrice(plan('STUDENT_PLUS', { price: 1499, period: 'per year' }))).toBe('₹1,499');
    expect(planPrice(plan('FREE', { price: 'Free' }))).toBe('Free');
    expect(planPriceWithPeriod(plan('STUDENT_PLUS', { price: 1499, period: 'per year' }))).toBe('₹1,499 per year');
    expect(planPriceWithPeriod(plan('ENTERPRISE', { price: 'Custom', period: 'per year' }))).toBe('Custom');
  });
});
