/**
 * Public API for M08 (care) Module
 * P58 Rule: Cross-module imports MUST go through this index.ts only.
 */

export * from './domain/entities';
export * from './domain/errors';
export { useCareViewModel } from './viewmodel/useCareViewModel';
export { CareScreen } from './view/CareScreen';
export { default as moduleConfig } from './module.config';
