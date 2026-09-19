import { createModuleStore } from '../../../core/state/moduleStore';
import { CareEntity } from '../domain/entities';

export interface CareState {
  status: 'idle' | 'loading' | 'ready' | 'error';
  items: CareEntity[];
  error?: string;
}

export const careStore = createModuleStore<CareState>({
  status: 'idle',
  items: [],
});
