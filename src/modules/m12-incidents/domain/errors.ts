export class IncidentsDomainError extends Error {
  constructor(message: string, public readonly code: string = 'INCIDENTS_ERROR') {
    super(message);
    this.name = 'IncidentsDomainError';
  }
}
