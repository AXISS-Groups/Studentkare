import { useCallback } from 'react';
import { useModuleStore } from '../../../core/state/moduleStore';
import { emergencyStore } from '../state/emergency.store';
import { EmergencyRepository } from '../data/emergency.repository';

const repository = new EmergencyRepository();

export function useEmergencyViewModel() {
  const state = useModuleStore(emergencyStore);

  const loadData = useCallback(async () => {
    emergencyStore.set({ status: 'loading' });
    try {
      const items = await repository.fetchItems();
      emergencyStore.set({ status: 'ready', items });
    } catch (err) {
      emergencyStore.set({ status: 'error', error: String(err) });
    }
  }, []);

  return {
    state,
    actions: { loadData },
  };
}
