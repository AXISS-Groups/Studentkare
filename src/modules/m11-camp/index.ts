/**
 * Public API for M11 (camp) Module
 * P58 Rule: Cross-module imports MUST go through this index.ts only.
 */

export * from './domain/entities';
export * from './domain/errors';
export { useCampViewModel } from './viewmodel/useCampViewModel';
export { CampScreen } from './view/CampScreen';
export { default as moduleConfig } from './module.config';
