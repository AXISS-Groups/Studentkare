/**
 * Public API for M14 (lifeshare) Module
 * P58 Rule: Cross-module imports MUST go through this index.ts only.
 */

export * from './domain/entities';
export * from './domain/errors';
export { useLifeshareViewModel } from './viewmodel/useLifeshareViewModel';
export { LifeshareScreen } from './view/LifeshareScreen';
export { default as moduleConfig } from './module.config';
