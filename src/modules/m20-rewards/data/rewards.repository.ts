import { HealthChallenge, RewardRedemptionOption } from '../domain/entities';

export interface IRewardsRepository {
  fetchChallenges(): Promise<HealthChallenge[]>;
  fetchRedemptionOptions(): Promise<RewardRedemptionOption[]>;
}

export class RewardsRepository implements IRewardsRepository {
  async fetchChallenges(): Promise<HealthChallenge[]> {
    return [];
  }

  async fetchRedemptionOptions(): Promise<RewardRedemptionOption[]> {
    return [];
  }
}
