export class TeleconsultDomainError extends Error {
  constructor(message: string, public readonly code: string = 'TELECONSULT_ERROR') {
    super(message);
    this.name = 'TeleconsultDomainError';
  }
}
