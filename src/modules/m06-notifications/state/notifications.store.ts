import { createModuleStore } from '../../../core/state/moduleStore';
import { NotificationsEntity } from '../domain/entities';

export interface NotificationsState {
  status: 'idle' | 'loading' | 'ready' | 'error';
  items: NotificationsEntity[];
  error?: string;
}

export const notificationsStore = createModuleStore<NotificationsState>({
  status: 'idle',
  items: [],
});
