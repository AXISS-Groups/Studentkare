import { useCallback } from 'react';
import { useModuleStore } from '../../../core/state/moduleStore';
import { preventiveStore } from '../state/preventive.store';
import { PreventiveRepository } from '../data/preventive.repository';

const repository = new PreventiveRepository();

export function usePreventiveViewModel() {
  const state = useModuleStore(preventiveStore);

  const loadData = useCallback(async () => {
    preventiveStore.set({ status: 'loading' });
    try {
      const items = await repository.fetchItems();
      preventiveStore.set({ status: 'ready', items });
    } catch (err) {
      preventiveStore.set({ status: 'error', error: String(err) });
    }
  }, []);

  return {
    state,
    actions: { loadData },
  };
}
