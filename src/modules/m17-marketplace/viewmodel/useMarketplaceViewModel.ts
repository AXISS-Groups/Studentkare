import { useCallback } from 'react';
import { useModuleStore } from '../../../core/state/moduleStore';
import { marketplaceStore } from '../state/marketplace.store';
import { MarketplaceRepository } from '../data/marketplace.repository';

const repository = new MarketplaceRepository();

export function useMarketplaceViewModel() {
  const state = useModuleStore(marketplaceStore);

  const loadData = useCallback(async () => {
    marketplaceStore.set({ status: 'loading' });
    try {
      const items = await repository.fetchItems();
      marketplaceStore.set({ status: 'ready', items });
    } catch (err) {
      marketplaceStore.set({ status: 'error', error: String(err) });
    }
  }, []);

  return {
    state,
    actions: { loadData },
  };
}
