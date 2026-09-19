export class ClaimsDomainError extends Error {
  constructor(message: string, public readonly code: string = 'CLAIMS_ERROR') {
    super(message);
    this.name = 'ClaimsDomainError';
  }
}
