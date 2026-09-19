import { useCallback } from 'react';
import { useModuleStore } from '../../../core/state/moduleStore';
import { lifeshareStore } from '../state/lifeshare.store';
import { LifeshareRepository } from '../data/lifeshare.repository';

const repository = new LifeshareRepository();

export function useLifeshareViewModel() {
  const state = useModuleStore(lifeshareStore);

  const loadData = useCallback(async () => {
    lifeshareStore.set({ status: 'loading' });
    try {
      const items = await repository.fetchItems();
      lifeshareStore.set({ status: 'ready', items });
    } catch (err) {
      lifeshareStore.set({ status: 'error', error: String(err) });
    }
  }, []);

  return {
    state,
    actions: { loadData },
  };
}
