/**
 * Public API for M04 (emergency) Module
 * P58 Rule: Cross-module imports MUST go through this index.ts only.
 */

export * from './domain/entities';
export * from './domain/errors';
export { useEmergencyViewModel } from './viewmodel/useEmergencyViewModel';
export { EmergencyScreen } from './view/EmergencyScreen';
export { default as moduleConfig } from './module.config';
