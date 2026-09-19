export class CampDomainError extends Error {
  constructor(message: string, public readonly code: string = 'CAMP_ERROR') {
    super(message);
    this.name = 'CampDomainError';
  }
}
