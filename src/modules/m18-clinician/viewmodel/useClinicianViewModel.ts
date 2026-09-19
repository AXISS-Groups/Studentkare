import { useCallback } from 'react';
import { useModuleStore } from '../../../core/state/moduleStore';
import { clinicianStore } from '../state/clinician.store';
import { ClinicianRepository } from '../data/clinician.repository';

const repository = new ClinicianRepository();

export function useClinicianViewModel() {
  const state = useModuleStore(clinicianStore);

  const loadData = useCallback(async () => {
    clinicianStore.set({ status: 'loading' });
    try {
      const items = await repository.fetchItems();
      clinicianStore.set({ status: 'ready', items });
    } catch (err) {
      clinicianStore.set({ status: 'error', error: String(err) });
    }
  }, []);

  return {
    state,
    actions: { loadData },
  };
}
