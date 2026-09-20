import { useCallback } from 'react';
import { useModuleStore } from '../../../core/state/moduleStore';
import { campStore } from '../state/camp.store';
import { CampRepository } from '../data/camp.repository';

const repository = new CampRepository();

export function useCampViewModel() {
  const state = useModuleStore(campStore);

  const loadData = useCallback(async () => {
    campStore.set({ status: 'loading' });
    try {
      const items = await repository.fetchItems();
      campStore.set({ status: 'ready', items });
    } catch (err) {
      campStore.set({ status: 'error', error: String(err) });
    }
  }, []);

  return {
    state,
    actions: { loadData },
  };
}
