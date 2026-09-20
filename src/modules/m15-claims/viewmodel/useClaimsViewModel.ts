import { useCallback } from 'react';
import { useModuleStore } from '../../../core/state/moduleStore';
import { claimsStore } from '../state/claims.store';
import { ClaimsRepository } from '../data/claims.repository';

const repository = new ClaimsRepository();

export function useClaimsViewModel() {
  const state = useModuleStore(claimsStore);

  const loadData = useCallback(async () => {
    claimsStore.set({ status: 'loading' });
    try {
      const items = await repository.fetchItems();
      claimsStore.set({ status: 'ready', items });
    } catch (err) {
      claimsStore.set({ status: 'error', error: String(err) });
    }
  }, []);

  return {
    state,
    actions: { loadData },
  };
}
