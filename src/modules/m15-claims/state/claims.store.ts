import { createModuleStore } from '../../../core/state/moduleStore';
import { ClaimsEntity } from '../domain/entities';

export interface ClaimsState {
  status: 'idle' | 'loading' | 'ready' | 'error';
  items: ClaimsEntity[];
  error?: string;
}

export const claimsStore = createModuleStore<ClaimsState>({
  status: 'idle',
  items: [],
});
