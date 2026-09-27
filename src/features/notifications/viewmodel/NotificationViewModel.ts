import { makeAutoObservable, runInAction } from 'mobx';
import { apiRequest } from '@/data/http';
import type { ViewModel } from '@/core/store/ViewModel';
import { CrossPlatformStorage } from '@/core/storage/CrossPlatformStorage';

export type NotificationCategory = 'EMERGENCY' | 'MEDICATION' | 'APPOINTMENT' | 'SYSTEM';

export interface NotificationItem {
  id: string;
  category: NotificationCategory;
  title: string;
  body: string;
  timestamp: number;
  read: boolean;
  actionUrl?: string;
  metadata?: Record<string, unknown>;
}

export type NotificationFilter = 'all' | 'unread' | 'emergency';

const STORAGE_CACHE_KEY = 'studentkare_notifications_cache_v1';

/**
 * MVVM ViewModel for Real-Time Campus Notifications & Emergency Sync.
 *
 * Owns observable notification states, unread computeds, optimistic read flags,
 * and cross-platform persistent caching across Web & Mobile.
 */
export class NotificationViewModel implements ViewModel {
  items: NotificationItem[] = [];
  loading = false;
  error: string | null = null;
  filter: NotificationFilter = 'all';
  isConnected = true;

  constructor() {
    makeAutoObservable(this, {}, { autoBind: true });
    this.initFromCache();
  }

  get unreadCount(): number {
    return this.items.filter(item => !item.read).length;
  }

  get emergencyCount(): number {
    return this.items.filter(item => item.category === 'EMERGENCY' && !item.read).length;
  }

  get filteredItems(): NotificationItem[] {
    switch (this.filter) {
      case 'unread':
        return this.items.filter(item => !item.read);
      case 'emergency':
        return this.items.filter(item => item.category === 'EMERGENCY');
      case 'all':
      default:
        return this.items;
    }
  }

  private async initFromCache(): Promise<void> {
    const cached = await CrossPlatformStorage.get<NotificationItem[]>(STORAGE_CACHE_KEY, []);
    if (cached.length > 0) {
      runInAction(() => {
        this.items = cached;
      });
    }
    await this.fetchNotifications();
  }

  async fetchNotifications(): Promise<void> {
    this.loading = true;
    this.error = null;
    try {
      const response = await apiRequest<{ notifications: NotificationItem[] }>('/notifications');
      runInAction(() => {
        this.items = response.notifications || [];
        this.loading = false;
      });
      await CrossPlatformStorage.set(STORAGE_CACHE_KEY, this.items);
    } catch (err: unknown) {
      runInAction(() => {
        this.error = err instanceof Error ? err.message : 'Failed to synchronize notifications.';
        this.loading = false;
      });
    }
  }

  setFilter(filter: NotificationFilter): void {
    this.filter = filter;
  }

  async markAsRead(id: string): Promise<void> {
    const item = this.items.find(i => i.id === id);
    if (!item || item.read) return;

    // Optimistic update
    item.read = true;
    await CrossPlatformStorage.set(STORAGE_CACHE_KEY, this.items);

    try {
      await apiRequest(`/notifications/${encodeURIComponent(id)}/read`, { method: 'PATCH' });
    } catch (err) {
      console.warn('[NotificationViewModel] Mark read sync error:', err);
    }
  }

  async markAllAsRead(): Promise<void> {
    if (this.items.length === 0) return;

    // Optimistic update
    this.items.forEach(item => {
      item.read = true;
    });
    await CrossPlatformStorage.set(STORAGE_CACHE_KEY, this.items);

    try {
      await apiRequest('/notifications/read-all', { method: 'POST' });
    } catch (err) {
      console.warn('[NotificationViewModel] Mark all read sync error:', err);
    }
  }

  pushRealtimeNotification(notification: NotificationItem): void {
    const exists = this.items.some(i => i.id === notification.id);
    if (!exists) {
      this.items.unshift(notification);
      CrossPlatformStorage.set(STORAGE_CACHE_KEY, this.items);
    }
  }

  setConnectionStatus(connected: boolean): void {
    this.isConnected = connected;
  }

  reset(): void {
    this.items = [];
    this.loading = false;
    this.error = null;
    this.filter = 'all';
  }

  dispose(): void {
    this.reset();
  }
}
