import { createModuleStore } from '../../../core/state/moduleStore';
import { EmergencyEntity } from '../domain/entities';

export interface EmergencyState {
  status: 'idle' | 'loading' | 'ready' | 'error';
  items: EmergencyEntity[];
  error?: string;
}

export const emergencyStore = createModuleStore<EmergencyState>({
  status: 'idle',
  items: [],
});
