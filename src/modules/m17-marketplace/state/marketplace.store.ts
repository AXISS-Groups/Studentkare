import { createModuleStore } from '../../../core/state/moduleStore';
import { MarketplaceEntity } from '../domain/entities';

export interface MarketplaceState {
  status: 'idle' | 'loading' | 'ready' | 'error';
  items: MarketplaceEntity[];
  error?: string;
}

export const marketplaceStore = createModuleStore<MarketplaceState>({
  status: 'idle',
  items: [],
});
