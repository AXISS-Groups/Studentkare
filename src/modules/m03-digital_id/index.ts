/**
 * Public API for M03 (digital_id) Module
 * P58 Rule: Cross-module imports MUST go through this index.ts only.
 */

export * from './domain/entities';
export * from './domain/errors';
export { useDigital_idViewModel } from './viewmodel/useDigital_idViewModel';
export { Digital_idScreen } from './view/Digital_idScreen';
export { default as moduleConfig } from './module.config';
