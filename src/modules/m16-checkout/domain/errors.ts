export class CheckoutDomainError extends Error {
  constructor(message: string, public readonly code: string = 'CHECKOUT_ERROR') {
    super(message);
    this.name = 'CheckoutDomainError';
  }
}
