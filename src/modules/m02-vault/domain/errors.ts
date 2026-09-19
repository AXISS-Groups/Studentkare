export class VaultDomainError extends Error {
  constructor(message: string, public readonly code: string = 'VAULT_ERROR') {
    super(message);
    this.name = 'VaultDomainError';
  }
}
