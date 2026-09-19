import { NotificationsEntity } from '../domain/entities';

export interface INotificationsRepository {
  fetchItems(): Promise<NotificationsEntity[]>;
}

export class NotificationsRepository implements INotificationsRepository {
  async fetchItems(): Promise<NotificationsEntity[]> {
    return [
      { id: 'notifications_1', createdAt: new Date(), updatedAt: new Date() }
    ];
  }
}
