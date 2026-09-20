/**
 * M03 Digital ID Public API Boundary.
 *
 * Rule R1: Cross-module imports go through index.ts ONLY.
 * Exports domain types and viewmodel hooks only.
 * NEVER exports stores, repositories, or raw HTTP client code.
 */

export type {
  DigitalIdProfile,
  DigitalIdTab,
} from './domain/DigitalId';

export {
  getVerificationBadgeText,
  formatExpiryText,
} from './domain/DigitalId';

export { useDigitalIdViewModel } from './viewmodel/useDigitalIdViewModel';
export type {
  DigitalIdViewModelState,
  DigitalIdViewModelActions,
  DigitalIdViewModelHook,
} from './viewmodel/useDigitalIdViewModel';

export { DigitalIdWebView } from './view/DigitalIdWebView';
export { DigitalIdNativeView } from './view/DigitalIdNativeView';
