import { describe, it, expect, beforeEach } from 'vitest';
import { notificationStore } from '../state/NotificationStore';
import type { NotificationItem } from '../domain/Notification';

describe('M06 Notifications Module Characterisation Tests', () => {
  beforeEach(() => {
    notificationStore.reset();
  });

  it('initializes with default idle state and empty items', () => {
    expect(notificationStore.items).toEqual([]);
    expect(notificationStore.status.kind).toBe('idle');
    expect(notificationStore.unreadCount).toBe(0);
    expect(notificationStore.emergencyCount).toBe(0);
  });

  it('correctly computes unreadCount and emergencyCount', () => {
    const mockItems: NotificationItem[] = [
      { id: '1', category: 'SYSTEM', title: 'T1', body: 'B1', timestamp: Date.now(), read: false },
      { id: '2', category: 'EMERGENCY', title: 'T2', body: 'B2', timestamp: Date.now(), read: false },
      { id: '3', category: 'MEDICATION', title: 'T3', body: 'B3', timestamp: Date.now(), read: true },
    ];

    notificationStore.items = mockItems;
    expect(notificationStore.unreadCount).toBe(2);
    expect(notificationStore.emergencyCount).toBe(1);
  });

  it('filters notifications correctly by category and read status', () => {
    const mockItems: NotificationItem[] = [
      { id: '1', category: 'SYSTEM', title: 'T1', body: 'B1', timestamp: Date.now(), read: false },
      { id: '2', category: 'EMERGENCY', title: 'T2', body: 'B2', timestamp: Date.now(), read: false },
      { id: '3', category: 'MEDICATION', title: 'T3', body: 'B3', timestamp: Date.now(), read: true },
    ];

    notificationStore.items = mockItems;

    notificationStore.setFilter('unread');
    expect(notificationStore.filteredItems).toHaveLength(2);

    notificationStore.setFilter('emergency');
    expect(notificationStore.filteredItems).toHaveLength(1);
    expect(notificationStore.filteredItems[0].category).toBe('EMERGENCY');

    notificationStore.setFilter('all');
    expect(notificationStore.filteredItems).toHaveLength(3);
  });

  it('optimistically marks item as read', async () => {
    const mockItems: NotificationItem[] = [
      { id: 'notif-100', category: 'SYSTEM', title: 'Test', body: 'Test body', timestamp: Date.now(), read: false },
    ];
    notificationStore.items = mockItems;

    await notificationStore.markAsRead('notif-100');
    expect(notificationStore.items[0].read).toBe(true);
    expect(notificationStore.unreadCount).toBe(0);
  });

  it('optimistically marks all items as read', async () => {
    const mockItems: NotificationItem[] = [
      { id: '1', category: 'SYSTEM', title: 'T1', body: 'B1', timestamp: Date.now(), read: false },
      { id: '2', category: 'EMERGENCY', title: 'T2', body: 'B2', timestamp: Date.now(), read: false },
    ];
    notificationStore.items = mockItems;

    await notificationStore.markAllAsRead();
    expect(notificationStore.items.every(i => i.read)).toBe(true);
    expect(notificationStore.unreadCount).toBe(0);
  });

  it('pushes realtime notifications without duplicates', () => {
    const notif: NotificationItem = {
      id: 'rt-1',
      category: 'EMERGENCY',
      title: 'Alert',
      body: 'Emergency alert',
      timestamp: Date.now(),
      read: false,
    };

    notificationStore.pushRealtimeNotification(notif);
    expect(notificationStore.items).toHaveLength(1);

    // Duplicate push should be ignored
    notificationStore.pushRealtimeNotification(notif);
    expect(notificationStore.items).toHaveLength(1);
  });
});
