import { createModuleStore } from '../../../core/state/moduleStore';
import { CheckoutEntity } from '../domain/entities';

export interface CheckoutState {
  status: 'idle' | 'loading' | 'ready' | 'error';
  items: CheckoutEntity[];
  error?: string;
}

export const checkoutStore = createModuleStore<CheckoutState>({
  status: 'idle',
  items: [],
});
