export class RewardsDomainError extends Error {
  constructor(message: string, public readonly code: string = 'REWARDS_ERROR') {
    super(message);
    this.name = 'RewardsDomainError';
  }
}
