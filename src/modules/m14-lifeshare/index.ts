/**
 * M14 Lifeshare Public API Boundary.
 *
 * Rule R1: Cross-module imports go through index.ts ONLY.
 * Exports domain types and viewmodel hooks only.
 * NEVER exports stores, repositories, or raw HTTP client code.
 */

export type {
  DonorProfile,
  BloodTransferRequest,
} from './domain/LifeShare';

export {
  filterCompatibleDonors,
  validateBloodUnits,
} from './domain/LifeShare';

export { useLifeShareViewModel, useLifeshareViewModel } from './viewmodel/useLifeshareViewModel';
export type {
  LifeShareViewModelState,
  LifeShareViewModelActions,
  LifeShareViewModelHook,
} from './viewmodel/useLifeshareViewModel';

export { LifeShareWebView } from './view/LifeShareWebView';
export { LifeShareNativeView } from './view/LifeShareNativeView';
