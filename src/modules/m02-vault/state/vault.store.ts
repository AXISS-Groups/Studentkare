import { createModuleStore } from '../../../core/state/moduleStore';
import { VaultEntity } from '../domain/entities';

export interface VaultState {
  status: 'idle' | 'loading' | 'ready' | 'error';
  items: VaultEntity[];
  error?: string;
}

export const vaultStore = createModuleStore<VaultState>({
  status: 'idle',
  items: [],
});
