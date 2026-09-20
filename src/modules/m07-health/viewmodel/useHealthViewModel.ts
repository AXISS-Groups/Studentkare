import { useCallback } from 'react';
import { useModuleStore } from '../../../core/state/moduleStore';
import { healthStore } from '../state/health.store';
import { HealthRepository } from '../data/health.repository';

const repository = new HealthRepository();

export function useHealthViewModel() {
  const state = useModuleStore(healthStore);

  const loadData = useCallback(async () => {
    healthStore.set({ status: 'loading' });
    try {
      const items = await repository.fetchItems();
      healthStore.set({ status: 'ready', items });
    } catch (err) {
      healthStore.set({ status: 'error', error: String(err) });
    }
  }, []);

  return {
    state,
    actions: { loadData },
  };
}
