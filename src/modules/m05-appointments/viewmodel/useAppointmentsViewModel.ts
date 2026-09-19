import { useCallback } from 'react';
import { useModuleStore } from '../../../core/state/moduleStore';
import { appointmentsStore } from '../state/appointments.store';
import { AppointmentsRepository } from '../data/appointments.repository';

const repository = new AppointmentsRepository();

export function useAppointmentsViewModel() {
  const state = useModuleStore(appointmentsStore);

  const loadData = useCallback(async () => {
    appointmentsStore.set({ status: 'loading' });
    try {
      const items = await repository.fetchItems();
      appointmentsStore.set({ status: 'ready', items });
    } catch (err) {
      appointmentsStore.set({ status: 'error', error: String(err) });
    }
  }, []);

  return {
    state,
    actions: { loadData },
  };
}
