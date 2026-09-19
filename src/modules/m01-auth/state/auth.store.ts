import { createModuleStore } from '../../../core/state/moduleStore';
import { AuthEntity } from '../domain/entities';

export interface AuthState {
  status: 'idle' | 'loading' | 'ready' | 'error';
  items: AuthEntity[];
  error?: string;
}

export const authStore = createModuleStore<AuthState>({
  status: 'idle',
  items: [],
});
