import { useCallback } from 'react';
import { useModuleStore } from '../../../core/state/moduleStore';
import { notificationsStore } from '../state/notifications.store';
import { NotificationsRepository } from '../data/notifications.repository';

const repository = new NotificationsRepository();

export function useNotificationsViewModel() {
  const state = useModuleStore(notificationsStore);

  const loadData = useCallback(async () => {
    notificationsStore.set({ status: 'loading' });
    try {
      const items = await repository.fetchItems();
      notificationsStore.set({ status: 'ready', items });
    } catch (err) {
      notificationsStore.set({ status: 'error', error: String(err) });
    }
  }, []);

  return {
    state,
    actions: { loadData },
  };
}
