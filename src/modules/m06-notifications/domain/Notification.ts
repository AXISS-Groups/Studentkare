/**
 * M06 Notifications Domain Model.
 * Pure TypeScript entity, type definitions, and invariants.
 * No react, no fetch, no platform imports.
 */

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

export function isNotificationUnread(item: NotificationItem): boolean {
  return !item.read;
}

export function isEmergencyNotification(item: NotificationItem): boolean {
  return item.category === 'EMERGENCY';
}

export function filterNotifications(
  items: NotificationItem[],
  filter: NotificationFilter
): NotificationItem[] {
  switch (filter) {
    case 'unread':
      return items.filter(isNotificationUnread);
    case 'emergency':
      return items.filter(isEmergencyNotification);
    case 'all':
    default:
      return items;
  }
}
