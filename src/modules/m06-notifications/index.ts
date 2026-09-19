/**
 * Public API for M06 (notifications) Module
 * P58 Rule: Cross-module imports MUST go through this index.ts only.
 */

export * from './domain/entities';
export * from './domain/errors';
export { useNotificationsViewModel } from './viewmodel/useNotificationsViewModel';
export { NotificationsScreen } from './view/NotificationsScreen';
export { default as moduleConfig } from './module.config';
