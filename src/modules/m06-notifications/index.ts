/**
 * M06 Notifications Public API Boundary.
 *
 * Rule R1: Cross-module imports go through index.ts ONLY.
 * Exports domain types and viewmodel hooks only.
 * NEVER exports stores, repositories, or raw HTTP client code.
 */

export type {
  NotificationCategory,
  NotificationItem,
  NotificationFilter,
} from './domain/Notification';

export {
  isNotificationUnread,
  isEmergencyNotification,
  filterNotifications,
} from './domain/Notification';

export { useNotificationViewModel } from './viewmodel/useNotificationViewModel';
export type {
  NotificationViewModelState,
  NotificationViewModelActions,
  NotificationViewModelHook,
} from './viewmodel/useNotificationViewModel';

export { NotificationBellView } from './view/NotificationBellView';
export { NotificationNativeView } from './view/NotificationNativeView';
