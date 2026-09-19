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

export interface ReferralRecord {
  id: string;
  referredUserEmail: string;
  dateReferred: string;
  pointsAwarded: number;
  status: 'COMPLETED' | 'PENDING';
}

export interface ReferralInfo {
  referralCode: string;
  referralLink: string;
  totalReferred: number;
  referralPointsEarned: number;
  referralHistory: ReferralRecord[];
}

export interface RewardsStateData {
  pointsBalance: number;
  streakDays: number;
  activeChallenges: HealthChallenge[];
  redemptionOptions: RewardRedemptionOption[];
  redeemedSuccessMessage: string;
  referralInfo: ReferralInfo;
}

