import { notificationStore } from '../state/NotificationStore';
import type { NotificationItem, NotificationFilter } from '../domain/Notification';

export interface NotificationViewModelState {
  items: NotificationItem[];
  filteredItems: NotificationItem[];
  unreadCount: number;
  emergencyCount: number;
  isLoading: boolean;
  error: string | null;
  filter: NotificationFilter;
  isConnected: boolean;
}

export interface NotificationViewModelActions {
  fetchNotifications: () => Promise<void>;
  setFilter: (filter: NotificationFilter) => void;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  pushRealtimeNotification: (notification: NotificationItem) => void;
}

export interface NotificationViewModelHook {
  state: NotificationViewModelState;
  actions: NotificationViewModelActions;
}

/**
 * Custom hook wrapping NotificationStore for React components.
 * Returns clean { state, actions } interface without exposing raw MobX store instance.
 */
export function useNotificationViewModel(): NotificationViewModelHook {
  return {
    state: {
      items: notificationStore.items,
      filteredItems: notificationStore.filteredItems,
      unreadCount: notificationStore.unreadCount,
      emergencyCount: notificationStore.emergencyCount,
      isLoading: notificationStore.isLoading,
      error: notificationStore.errorMessage,
      filter: notificationStore.filter,
      isConnected: notificationStore.isConnected,
    },
    actions: {
      fetchNotifications: () => notificationStore.fetchNotifications(),
      setFilter: (filter: NotificationFilter) => notificationStore.setFilter(filter),
      markAsRead: (id: string) => notificationStore.markAsRead(id),
      markAllAsRead: () => notificationStore.markAllAsRead(),
      pushRealtimeNotification: (notification: NotificationItem) => notificationStore.pushRealtimeNotification(notification),
    },
  };
}

export { notificationStore };
