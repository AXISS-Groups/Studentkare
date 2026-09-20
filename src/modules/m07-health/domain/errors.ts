export class HealthDomainError extends Error {
  constructor(message: string, public readonly code: string = 'HEALTH_ERROR') {
    super(message);
    this.name = 'HealthDomainError';
  }
}
