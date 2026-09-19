export class PreventiveDomainError extends Error {
  constructor(message: string, public readonly code: string = 'PREVENTIVE_ERROR') {
    super(message);
    this.name = 'PreventiveDomainError';
  }
}
