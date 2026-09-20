import { createModuleStore } from '../../../core/state/moduleStore';
import { TeleconsultEntity } from '../domain/entities';

export interface TeleconsultState {
  status: 'idle' | 'loading' | 'ready' | 'error';
  items: TeleconsultEntity[];
  error?: string;
}

export const teleconsultStore = createModuleStore<TeleconsultState>({
  status: 'idle',
  items: [],
});
