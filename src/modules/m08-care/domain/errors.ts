export class CareDomainError extends Error {
  constructor(message: string, public readonly code: string = 'CARE_ERROR') {
    super(message);
    this.name = 'CareDomainError';
  }
}
