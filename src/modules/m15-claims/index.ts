/**
 * Public API for M15 (claims) Module
 * P58 Rule: Cross-module imports MUST go through this index.ts only.
 */

export * from './domain/entities';
export * from './domain/errors';
export { useClaimsViewModel } from './viewmodel/useClaimsViewModel';
export { ClaimsScreen } from './view/ClaimsScreen';
export { default as moduleConfig } from './module.config';
