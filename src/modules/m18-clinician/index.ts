/**
 * Public API for M18 (clinician) Module
 * P58 Rule: Cross-module imports MUST go through this index.ts only.
 */

export * from './domain/entities';
export * from './domain/errors';
export { useClinicianViewModel } from './viewmodel/useClinicianViewModel';
export { ClinicianScreen } from './view/ClinicianScreen';
export { default as moduleConfig } from './module.config';
