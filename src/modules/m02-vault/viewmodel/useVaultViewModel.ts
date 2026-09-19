import { useCallback } from 'react';
import { useModuleStore } from '../../../core/state/moduleStore';
import { vaultStore } from '../state/vault.store';
import { VaultRepository } from '../data/vault.repository';

const repository = new VaultRepository();

export function useVaultViewModel() {
  const state = useModuleStore(vaultStore);

  const loadData = useCallback(async () => {
    vaultStore.set({ status: 'loading' });
    try {
      const items = await repository.fetchItems();
      vaultStore.set({ status: 'ready', items });
    } catch (err) {
      vaultStore.set({ status: 'error', error: String(err) });
    }
  }, []);

  return {
    state,
    actions: { loadData },
  };
}
