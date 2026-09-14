import React from 'react';
import { ChatViewModel } from './ChatViewModel';
import { useChatStore } from '../../../store/AppStores';

/** Creates a single ChatViewModel bound to the shared ChatStore. */
export function useChatViewModel(): ChatViewModel {
  const chatStore = useChatStore();
  return React.useMemo(() => new ChatViewModel(chatStore), [chatStore]);
}
