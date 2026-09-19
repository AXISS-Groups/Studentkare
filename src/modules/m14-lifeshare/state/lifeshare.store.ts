import { createModuleStore } from '../../../core/state/moduleStore';
import { LifeshareEntity } from '../domain/entities';

export interface LifeshareState {
  status: 'idle' | 'loading' | 'ready' | 'error';
  items: LifeshareEntity[];
  error?: string;
}

export const lifeshareStore = createModuleStore<LifeshareState>({
  status: 'idle',
  items: [],
});
