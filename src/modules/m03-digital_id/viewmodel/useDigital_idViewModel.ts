import { useCallback } from 'react';
import { useModuleStore } from '../../../core/state/moduleStore';
import { digital_idStore } from '../state/digital_id.store';
import { Digital_idRepository } from '../data/digital_id.repository';

const repository = new Digital_idRepository();

export function useDigital_idViewModel() {
  const state = useModuleStore(digital_idStore);

  const loadData = useCallback(async () => {
    digital_idStore.set({ status: 'loading' });
    try {
      const items = await repository.fetchItems();
      digital_idStore.set({ status: 'ready', items });
    } catch (err) {
      digital_idStore.set({ status: 'error', error: String(err) });
    }
  }, []);

  return {
    state,
    actions: { loadData },
  };
}
