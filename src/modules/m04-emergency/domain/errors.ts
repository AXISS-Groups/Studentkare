export class EmergencyDomainError extends Error {
  constructor(message: string, public readonly code: string = 'EMERGENCY_ERROR') {
    super(message);
    this.name = 'EmergencyDomainError';
  }
}
