import { createModuleStore } from '../../../core/state/moduleStore';
import { HealthEntity } from '../domain/entities';

export interface HealthState {
  status: 'idle' | 'loading' | 'ready' | 'error';
  items: HealthEntity[];
  error?: string;
}

export const healthStore = createModuleStore<HealthState>({
  status: 'idle',
  items: [],
});
