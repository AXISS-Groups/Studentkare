/**
 * Public API for M07 (health) Module
 * P58 Rule: Cross-module imports MUST go through this index.ts only.
 */

export * from './domain/entities';
export * from './domain/errors';
export { useHealthViewModel } from './viewmodel/useHealthViewModel';
export { HealthScreen } from './view/HealthScreen';
export { default as moduleConfig } from './module.config';
