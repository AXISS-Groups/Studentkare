import { useCallback } from 'react';
import { useModuleStore } from '../../../core/state/moduleStore';
import { authStore } from '../state/auth.store';
import { AuthRepository } from '../data/auth.repository';

const repository = new AuthRepository();

export function useAuthViewModel() {
  const state = useModuleStore(authStore);

  const loadData = useCallback(async () => {
    authStore.set({ status: 'loading' });
    try {
      const items = await repository.fetchItems();
      authStore.set({ status: 'ready', items });
    } catch (err) {
      authStore.set({ status: 'error', error: String(err) });
    }
  }, []);

  return {
    state,
    actions: { loadData },
  };
}
