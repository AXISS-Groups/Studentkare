export class ChatDomainError extends Error {
  constructor(message: string, public readonly code: string = 'CHAT_ERROR') {
    super(message);
    this.name = 'ChatDomainError';
  }
}
