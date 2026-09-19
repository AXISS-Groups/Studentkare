import { createModuleStore } from '../../../core/state/moduleStore';
import { PreventiveEntity } from '../domain/entities';

export interface PreventiveState {
  status: 'idle' | 'loading' | 'ready' | 'error';
  items: PreventiveEntity[];
  error?: string;
}

export const preventiveStore = createModuleStore<PreventiveState>({
  status: 'idle',
  items: [],
});
