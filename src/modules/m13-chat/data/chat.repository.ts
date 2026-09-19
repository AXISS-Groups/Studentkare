import { ChatEntity } from '../domain/entities';

export interface IChatRepository {
  fetchItems(): Promise<ChatEntity[]>;
}

export class ChatRepository implements IChatRepository {
  async fetchItems(): Promise<ChatEntity[]> {
    return [
      { id: 'chat_1', createdAt: new Date(), updatedAt: new Date() }
    ];
  }
}
