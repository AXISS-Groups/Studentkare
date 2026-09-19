/**
 * Public API for M10 (teleconsult) Module
 * P58 Rule: Cross-module imports MUST go through this index.ts only.
 */

export * from './domain/entities';
export * from './domain/errors';
export { useTeleconsultViewModel } from './viewmodel/useTeleconsultViewModel';
export { TeleconsultScreen } from './view/TeleconsultScreen';
export { default as moduleConfig } from './module.config';
