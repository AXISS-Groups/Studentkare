/**
 * Public API for M09 (preventive) Module
 * P58 Rule: Cross-module imports MUST go through this index.ts only.
 */

export * from './domain/entities';
export * from './domain/errors';
export { usePreventiveViewModel } from './viewmodel/usePreventiveViewModel';
export { PreventiveScreen } from './view/PreventiveScreen';
export { default as moduleConfig } from './module.config';
