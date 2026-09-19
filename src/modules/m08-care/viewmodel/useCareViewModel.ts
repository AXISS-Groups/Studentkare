import { useCallback } from 'react';
import { useModuleStore } from '../../../core/state/moduleStore';
import { careStore } from '../state/care.store';
import { CareRepository } from '../data/care.repository';

const repository = new CareRepository();

export function useCareViewModel() {
  const state = useModuleStore(careStore);

  const loadData = useCallback(async () => {
    careStore.set({ status: 'loading' });
    try {
      const items = await repository.fetchItems();
      careStore.set({ status: 'ready', items });
    } catch (err) {
      careStore.set({ status: 'error', error: String(err) });
    }
  }, []);

  return {
    state,
    actions: { loadData },
  };
}
