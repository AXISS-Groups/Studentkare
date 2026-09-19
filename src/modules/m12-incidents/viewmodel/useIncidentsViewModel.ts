import { useCallback } from 'react';
import { useModuleStore } from '../../../core/state/moduleStore';
import { incidentsStore } from '../state/incidents.store';
import { IncidentsRepository } from '../data/incidents.repository';

const repository = new IncidentsRepository();

export function useIncidentsViewModel() {
  const state = useModuleStore(incidentsStore);

  const loadData = useCallback(async () => {
    incidentsStore.set({ status: 'loading' });
    try {
      const items = await repository.fetchItems();
      incidentsStore.set({ status: 'ready', items });
    } catch (err) {
      incidentsStore.set({ status: 'error', error: String(err) });
    }
  }, []);

  return {
    state,
    actions: { loadData },
  };
}
