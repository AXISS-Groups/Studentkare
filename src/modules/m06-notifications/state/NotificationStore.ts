import { makeAutoObservable, runInAction } from 'mobx';
import type { NotificationItem, NotificationFilter } from '../domain/Notification';
import { filterNotifications } from '../domain/Notification';
import { notificationRepository } from '../data/NotificationRepository';

export type NotificationStoreStatus =
  | { kind: 'idle' }
  | { kind: 'loading' }
  | { kind: 'success' }
  | { kind: 'error'; message: string };

export class NotificationStore {
  items: NotificationItem[] = [];
  status: NotificationStoreStatus = { kind: 'idle' };
  filter: NotificationFilter = 'all';
  isConnected = true;

  constructor() {
    makeAutoObservable(this, {}, { autoBind: true });
    void this.initFromCache();
  }

  get unreadCount(): number {
    return this.items.filter(item => !item.read).length;
  }

  get emergencyCount(): number {
    return this.items.filter(item => item.category === 'EMERGENCY' && !item.read).length;
  }

  get filteredItems(): NotificationItem[] {
    return filterNotifications(this.items, this.filter);
  }

  get isLoading(): boolean {
    return this.status.kind === 'loading';
  }

  get errorMessage(): string | null {
    return this.status.kind === 'error' ? this.status.message : null;
  }

  private async initFromCache(): Promise<void> {
    const cached = await notificationRepository.getCached();
    if (cached.length > 0) {
      runInAction(() => {
        this.items = cached;
      });
    }
    await this.fetchNotifications();
  }

  async fetchNotifications(): Promise<void> {
    this.status = { kind: 'loading' };
    try {
      const items = await notificationRepository.fetchRemote();
      runInAction(() => {
        this.items = items;
        this.status = { kind: 'success' };
      });
    } catch (err: unknown) {
      runInAction(() => {
        const message = err instanceof Error ? err.message : 'Failed to synchronize notifications.';
        this.status = { kind: 'error', message };
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
    await notificationRepository.saveCache(this.items);

    try {
      await notificationRepository.markReadRemote(id);
    } catch (err) {
      console.warn('[NotificationStore] Mark read sync error:', err);
    }
  }

  async markAllAsRead(): Promise<void> {
    if (this.items.length === 0) return;

    this.items.forEach(item => {
      item.read = true;
    });
    await notificationRepository.saveCache(this.items);

    try {
      await notificationRepository.markAllReadRemote();
    } catch (err) {
      console.warn('[NotificationStore] Mark all read sync error:', err);
    }
  }

  pushRealtimeNotification(notification: NotificationItem): void {
    const exists = this.items.some(i => i.id === notification.id);
    if (!exists) {
      this.items.unshift(notification);
      void notificationRepository.saveCache(this.items);
    }
  }

  setConnectionStatus(connected: boolean): void {
    this.isConnected = connected;
  }

  reset(): void {
    this.items = [];
    this.status = { kind: 'idle' };
    this.filter = 'all';
  }
}

export const notificationStore = new NotificationStore();
