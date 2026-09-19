export class AppointmentsDomainError extends Error {
  constructor(message: string, public readonly code: string = 'APPOINTMENTS_ERROR') {
    super(message);
    this.name = 'AppointmentsDomainError';
  }
}
