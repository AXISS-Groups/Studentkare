import { createModuleStore } from '../../../core/state/moduleStore';
import { ScannersEntity } from '../domain/entities';

export interface ScannersState {
  status: 'idle' | 'loading' | 'ready' | 'error';
  items: ScannersEntity[];
  error?: string;
}

export const scannersStore = createModuleStore<ScannersState>({
  status: 'idle',
  items: [],
});
