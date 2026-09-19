export class MarketplaceDomainError extends Error {
  constructor(message: string, public readonly code: string = 'MARKETPLACE_ERROR') {
    super(message);
    this.name = 'MarketplaceDomainError';
  }
}
