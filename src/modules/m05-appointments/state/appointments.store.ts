import { createModuleStore } from '../../../core/state/moduleStore';
import { AppointmentsEntity } from '../domain/entities';

export interface AppointmentsState {
  status: 'idle' | 'loading' | 'ready' | 'error';
  items: AppointmentsEntity[];
  error?: string;
}

export const appointmentsStore = createModuleStore<AppointmentsState>({
  status: 'idle',
  items: [],
});
