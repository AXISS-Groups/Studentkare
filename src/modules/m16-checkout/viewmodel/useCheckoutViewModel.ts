import { useCallback } from 'react';
import { useModuleStore } from '../../../core/state/moduleStore';
import { checkoutStore } from '../state/checkout.store';
import { CheckoutRepository } from '../data/checkout.repository';

const repository = new CheckoutRepository();

export function useCheckoutViewModel() {
  const state = useModuleStore(checkoutStore);

  const loadData = useCallback(async () => {
    checkoutStore.set({ status: 'loading' });
    try {
      const items = await repository.fetchItems();
      checkoutStore.set({ status: 'ready', items });
    } catch (err) {
      checkoutStore.set({ status: 'error', error: String(err) });
    }
  }, []);

  return {
    state,
    actions: { loadData },
  };
}
