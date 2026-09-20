/**
 * M16 Checkout Public API Boundary.
 *
 * Rule R1: Cross-module imports go through index.ts ONLY.
 * Rule L: Commercial data class module.
 * Exports domain types and viewmodel hooks only.
 * NEVER exports stores, repositories, or raw HTTP client code.
 */

export type {
  CartLineItem,
  OrderSummary,
} from './domain/Checkout';

export {
  calculateCartItemCount,
  calculateSubtotalPaise,
  calculateDeliveryFeePaise,
  calculateTotalPaise,
} from './domain/Checkout';

export { useCheckoutViewModel } from './viewmodel/useCheckoutViewModel';
export type {
  CheckoutViewModelState,
  CheckoutViewModelActions,
  CheckoutViewModelHook,
} from './viewmodel/useCheckoutViewModel';

export { CartCheckoutWebView } from './view/CartCheckoutWebView';
export { CartCheckoutNativeView } from './view/CartCheckoutNativeView';
