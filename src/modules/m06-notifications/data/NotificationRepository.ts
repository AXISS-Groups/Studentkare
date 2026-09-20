import { apiRequest } from '@/data/http';
import type { NotificationItem } from '../domain/Notification';
import { NotificationStoragePort } from '../platform/NotificationStoragePort';

export class NotificationRepository {
  async getCached(): Promise<NotificationItem[]> {
    return NotificationStoragePort.getCachedNotifications();
  }

  async saveCache(items: NotificationItem[]): Promise<void> {
    return NotificationStoragePort.setCachedNotifications(items);
  }

  async fetchRemote(): Promise<NotificationItem[]> {
    const response = await apiRequest<{ notifications: NotificationItem[] }>('/notifications');
    const items = response.notifications || [];
    await this.saveCache(items);
    return items;
  }

  async markReadRemote(id: string): Promise<void> {
    await apiRequest(`/notifications/${encodeURIComponent(id)}/read`, { method: 'PATCH' });
  }

  async markAllReadRemote(): Promise<void> {
    await apiRequest('/notifications/read-all', { method: 'POST' });
  }
}

export const notificationRepository = new NotificationRepository();
