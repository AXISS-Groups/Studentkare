/**
 * M01 Auth Public API Boundary.
 *
 * Rule R1: Cross-module imports go through index.ts ONLY.
 * Rule 2: Fail closed — no auth fallback grants a session.
 * Exports domain types and viewmodel hooks only.
 * NEVER exports stores, repositories, or raw HTTP client code.
 */

export type {
  AuthMode,
  Channel,
  AuthUser,
  SessionResponse,
  OtpSendResponse,
} from './domain/Auth';

export {
  isValidIndianPhone,
  isValidEmail,
} from './domain/Auth';

export { useAuthViewModel } from './viewmodel/useAuthViewModel';
export type {
  AuthViewModelState,
  AuthViewModelActions,
  AuthViewModelHook,
} from './viewmodel/useAuthViewModel';

export { AuthenticatedFlowScreen } from './view/AuthenticatedFlowScreen';
