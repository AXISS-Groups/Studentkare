import { createModuleStore } from '../../../core/state/moduleStore';
import { CampEntity } from '../domain/entities';

export interface CampState {
  status: 'idle' | 'loading' | 'ready' | 'error';
  items: CampEntity[];
  error?: string;
}

export const campStore = createModuleStore<CampState>({
  status: 'idle',
  items: [],
});
