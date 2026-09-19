export class LifeshareDomainError extends Error {
  constructor(message: string, public readonly code: string = 'LIFESHARE_ERROR') {
    super(message);
    this.name = 'LifeshareDomainError';
  }
}
