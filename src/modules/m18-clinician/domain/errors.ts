export class ClinicianDomainError extends Error {
  constructor(message: string, public readonly code: string = 'CLINICIAN_ERROR') {
    super(message);
    this.name = 'ClinicianDomainError';
  }
}
