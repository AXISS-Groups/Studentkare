import { CrossPlatformStorage } from '@/core/storage/CrossPlatformStorage';
import type { NotificationItem } from '../domain/Notification';

const STORAGE_CACHE_KEY = 'studentkare_notifications_cache_v1';

export const NotificationStoragePort = {
  async getCachedNotifications(): Promise<NotificationItem[]> {
    return await CrossPlatformStorage.get<NotificationItem[]>(STORAGE_CACHE_KEY, []);
  },

  async setCachedNotifications(items: NotificationItem[]): Promise<void> {
    await CrossPlatformStorage.set(STORAGE_CACHE_KEY, items);
  },
};
