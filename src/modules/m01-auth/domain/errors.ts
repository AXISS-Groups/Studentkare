export class AuthDomainError extends Error {
  constructor(message: string, public readonly code: string = 'AUTH_ERROR') {
    super(message);
    this.name = 'AuthDomainError';
  }
}
