/**
 * Public API for M01 (auth) Module
 * P58 Rule: Cross-module imports MUST go through this index.ts only.
 */

export * from './domain/entities';
export * from './domain/errors';
export { useAuthViewModel } from './viewmodel/useAuthViewModel';
export { AuthScreen } from './view/AuthScreen';
export { default as moduleConfig } from './module.config';
