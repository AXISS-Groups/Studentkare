import { createModuleStore } from '../../../core/state/moduleStore';
import { ClinicianEntity } from '../domain/entities';

export interface ClinicianState {
  status: 'idle' | 'loading' | 'ready' | 'error';
  items: ClinicianEntity[];
  error?: string;
}

export const clinicianStore = createModuleStore<ClinicianState>({
  status: 'idle',
  items: [],
});
