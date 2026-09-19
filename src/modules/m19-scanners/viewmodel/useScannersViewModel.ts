import { useCallback } from 'react';
import { useModuleStore } from '../../../core/state/moduleStore';
import { scannersStore } from '../state/scanners.store';
import { ScannersRepository } from '../data/scanners.repository';

const repository = new ScannersRepository();

export function useScannersViewModel() {
  const state = useModuleStore(scannersStore);

  const loadData = useCallback(async () => {
    scannersStore.set({ status: 'loading' });
    try {
      const items = await repository.fetchItems();
      scannersStore.set({ status: 'ready', items });
    } catch (err) {
      scannersStore.set({ status: 'error', error: String(err) });
    }
  }, []);

  return {
    state,
    actions: { loadData },
  };
}
