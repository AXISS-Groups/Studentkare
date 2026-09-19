export interface HealthChallenge {
  id: string;
  title: string;
  description: string;
  pointsReward: number;
  progressPercent: number;
  completed: boolean;
  category: 'WALK' | 'CAMP' | 'VACCINE' | 'HYDRATION';
}

export interface RewardRedemptionOption {
  id: string;
  title: string;
  pointsRequired: number;
  partnerName: string;
  discountValue: string;
}

export interface RewardsStateData {
  pointsBalance: number;
  streakDays: number;
  activeChallenges: HealthChallenge[];
  redemptionOptions: RewardRedemptionOption[];
  redeemedSuccessMessage: string;
}
