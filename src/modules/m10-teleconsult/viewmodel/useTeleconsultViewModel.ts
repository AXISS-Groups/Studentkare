import { useCallback } from 'react';
import { useModuleStore } from '../../../core/state/moduleStore';
import { teleconsultStore } from '../state/teleconsult.store';
import { TeleconsultRepository } from '../data/teleconsult.repository';

const repository = new TeleconsultRepository();

export function useTeleconsultViewModel() {
  const state = useModuleStore(teleconsultStore);

  const loadData = useCallback(async () => {
    teleconsultStore.set({ status: 'loading' });
    try {
      const items = await repository.fetchItems();
      teleconsultStore.set({ status: 'ready', items });
    } catch (err) {
      teleconsultStore.set({ status: 'error', error: String(err) });
    }
  }, []);

  return {
    state,
    actions: { loadData },
  };
}
