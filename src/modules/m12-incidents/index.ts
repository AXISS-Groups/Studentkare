/**
 * Public API for M12 (incidents) Module
 * P58 Rule: Cross-module imports MUST go through this index.ts only.
 */

export * from './domain/entities';
export * from './domain/errors';
export { useIncidentsViewModel } from './viewmodel/useIncidentsViewModel';
export { IncidentsScreen } from './view/IncidentsScreen';
export { default as moduleConfig } from './module.config';
