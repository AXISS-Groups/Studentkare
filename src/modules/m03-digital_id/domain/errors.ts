export class Digital_idDomainError extends Error {
  constructor(message: string, public readonly code: string = 'DIGITAL_ID_ERROR') {
    super(message);
    this.name = 'Digital_idDomainError';
  }
}
