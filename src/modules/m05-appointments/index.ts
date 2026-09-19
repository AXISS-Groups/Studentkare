/**
 * Public API for M05 (appointments) Module
 * P58 Rule: Cross-module imports MUST go through this index.ts only.
 */

export * from './domain/entities';
export * from './domain/errors';
export { useAppointmentsViewModel } from './viewmodel/useAppointmentsViewModel';
export { AppointmentsScreen } from './view/AppointmentsScreen';
export { default as moduleConfig } from './module.config';
