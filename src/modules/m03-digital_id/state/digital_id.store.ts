import { createModuleStore } from '../../../core/state/moduleStore';
import { Digital_idEntity } from '../domain/entities';

export interface Digital_idState {
  status: 'idle' | 'loading' | 'ready' | 'error';
  items: Digital_idEntity[];
  error?: string;
}

export const digital_idStore = createModuleStore<Digital_idState>({
  status: 'idle',
  items: [],
});
