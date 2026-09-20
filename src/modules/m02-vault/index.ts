/**
 * M02 Vault Public API Boundary.
 *
 * Rule R1: Cross-module imports go through index.ts ONLY.
 * Data Class: clinical.
 * Rule L: Commercial modules MUST NEVER import clinical PHI schemas or vault state.
 * Exports domain types, viewmodel hooks, and views only.
 * NEVER exports stores, repositories, or raw HTTP client code.
 */

export type {
  ObservationItem,
  HealthRecord,
  AbdmConsentRequest,
} from './domain/Vault';

export {
  isRecordStale,
  getAbnormalObservations,
} from './domain/Vault';

export { useVaultViewModel } from './viewmodel/useVaultViewModel';
export type {
  VaultViewModelState,
  VaultViewModelActions,
  VaultViewModelHook,
} from './viewmodel/useVaultViewModel';

export { HealthVaultWebView } from './view/HealthVaultWebView';
export { HealthVaultNativeView } from './view/HealthVaultNativeView';
export { VaultScreen } from './view/VaultScreen';
