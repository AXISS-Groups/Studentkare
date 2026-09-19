export class NotificationsDomainError extends Error {
  constructor(message: string, public readonly code: string = 'NOTIFICATIONS_ERROR') {
    super(message);
    this.name = 'NotificationsDomainError';
  }
}
