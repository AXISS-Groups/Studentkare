import { useCallback } from 'react';
import { useModuleStore } from '../../../core/state/moduleStore';
import { chatStore } from '../state/chat.store';
import { ChatRepository } from '../data/chat.repository';

const repository = new ChatRepository();

export function useChatViewModel() {
  const state = useModuleStore(chatStore);

  const loadData = useCallback(async () => {
    chatStore.set({ status: 'loading' });
    try {
      const items = await repository.fetchItems();
      chatStore.set({ status: 'ready', items });
    } catch (err) {
      chatStore.set({ status: 'error', error: String(err) });
    }
  }, []);

  return {
    state,
    actions: { loadData },
  };
}
