import { createModuleStore } from '../../../core/state/moduleStore';
import { ChatEntity } from '../domain/entities';

export interface ChatState {
  status: 'idle' | 'loading' | 'ready' | 'error';
  items: ChatEntity[];
  error?: string;
}

export const chatStore = createModuleStore<ChatState>({
  status: 'idle',
  items: [],
});
