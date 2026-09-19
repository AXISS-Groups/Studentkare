import { createModuleStore } from '../../../core/state/moduleStore';
import { IncidentsEntity } from '../domain/entities';

export interface IncidentsState {
  status: 'idle' | 'loading' | 'ready' | 'error';
  items: IncidentsEntity[];
  error?: string;
}

export const incidentsStore = createModuleStore<IncidentsState>({
  status: 'idle',
  items: [],
});
