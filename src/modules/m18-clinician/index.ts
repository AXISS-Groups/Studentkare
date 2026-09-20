/**
 * M18 Clinician Public API Boundary.
 *
 * Rule R1: Cross-module imports MUST go through this index.ts only.
 * Rule 5 / R8: Clinician service is isolated on its own network service.
 * Student-facing components MUST NEVER import predictive risk models directly.
 */

export type {
  ClinicalSignoff,
} from './domain/Clinician';

export { useClinicianViewModel } from './viewmodel/useClinicianViewModel';
export { ClinicianScreen } from './view/ClinicianScreen';
export { default as moduleConfig } from './module.config';
