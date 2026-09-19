export class ScannersDomainError extends Error {
  constructor(message: string, public readonly code: string = 'SCANNERS_ERROR') {
    super(message);
    this.name = 'ScannersDomainError';
  }
}
