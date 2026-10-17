/**
 * M04 Emergency Public API Boundary.
 *
 * Rule R1: Cross-module imports go through index.ts ONLY.
 * Data Class: clinical.
 * Exports domain types and viewmodel hooks only.
 * NEVER exports stores, repositories, or raw HTTP client code.
 */

export type {
  EmergencyStatus,
  SosAlert,
  SosAlertStatus,
  SosDelivery,
  SosRecipientKind,
} from './domain/Emergency';

export {
  isEmergencyActive,
  isAlertOpen,
  anyoneReached,
} from './domain/Emergency';

export { useEmergencySosViewModel } from './viewmodel/useEmergencySosViewModel';
export type {
  EmergencySosViewModelState,
  EmergencySosViewModelActions,
  EmergencySosViewModelHook,
} from './viewmodel/useEmergencySosViewModel';

export { EmergencySosWebView } from './view/EmergencySosWebView';
export { EmergencySosNativeView } from './view/EmergencySosNativeView';
