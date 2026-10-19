import { makeAutoObservable, runInAction } from 'mobx';
import type { Said } from '@/i18n';
import { apiRequest } from '@/data/services/http';
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

/**
 * Earlier builds cached notification text on the device under this key.
 * Summaries can describe health events ("Your SOS has been closed"), and
 * guardrail 9 keeps PHI out of client-side storage, so the cache is gone and
 * any copy left behind is deleted on start.
 */
const LEGACY_CACHE_KEY = 'studentkare_notifications_cache_v1';

/** One row of GET /api/notifications (backend/services/workflow_api.py notification_inbox). */
export interface InboxEvent {
  id: string;
  eventType: string;
  payload: Record<string, unknown> | null;
  status: string;
  createdAt: number;
  sentAt: number | null;
  readAt: number | null;
}

function categoryOf(eventType: string): NotificationCategory {
  const type = eventType.toLowerCase();
  if (type.startsWith('sos_') || type.includes('crisis')) return 'EMERGENCY';
  if (type.includes('medication') || type.includes('refill')) return 'MEDICATION';
  if (type.includes('appointment') || type.includes('camp_slot')) return 'APPOINTMENT';
  return 'SYSTEM';
}

/** Same wording as the web inbox: the server's summary, else the event name. */
export function toNotificationItem(event: InboxEvent): NotificationItem {
  const label = event.eventType.replace(/_/g, ' ');
  const summary = typeof event.payload?.summary === 'string' ? event.payload.summary : '';
  return {
    id: event.id,
    category: categoryOf(event.eventType),
    title: label,
    body: summary || label,
    timestamp: event.createdAt * 1000,
    read: event.readAt !== null,
  };
}

/**
 * MVVM ViewModel for Real-Time Campus Notifications & Emergency Sync.
 *
 * Owns observable notification states, unread computeds, optimistic read flags,
 * and cross-platform persistent caching across Web & Mobile.
 */
export class NotificationViewModel implements ViewModel {
  items: NotificationItem[] = [];
  loading = false;
  error: Said | null = null;
  filter: NotificationFilter = 'all';
  isConnected = true;

  constructor() {
    makeAutoObservable(this, {}, { autoBind: true });
    void CrossPlatformStorage.remove(LEGACY_CACHE_KEY);
    void this.fetchNotifications();
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

  async fetchNotifications(): Promise<void> {
    this.loading = true;
    this.error = null;
    try {
      const response = await apiRequest<{ items: InboxEvent[] }>('/notifications');
      runInAction(() => {
        this.items = response.items.map(toNotificationItem);
        this.loading = false;
      });
    } catch (err: unknown) {
      runInAction(() => {
        this.error = err instanceof Error && err.message ? { raw: err.message } : { key: 'notif.failedBody' };
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

    item.read = true;
    try {
      await apiRequest(`/notifications/${encodeURIComponent(id)}/read`, { method: 'POST' });
    } catch {
      // The server still has it unread, so the screen must too.
      runInAction(() => { item.read = false; this.error = { key: 'notif.markFailed' }; });
    }
  }

  async markAllAsRead(): Promise<void> {
    // The backend has no bulk endpoint; mark each unread one (the inbox holds at most 100).
    const unread = this.items.filter(item => !item.read);
    await Promise.all(unread.map(item => this.markAsRead(item.id)));
  }

  pushRealtimeNotification(notification: NotificationItem): void {
    const exists = this.items.some(i => i.id === notification.id);
    if (!exists) {
      this.items.unshift(notification);
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
