import { createModuleStore } from '../../../core/state/moduleStore';
import { HealthChallenge, RewardRedemptionOption, RewardsStateData } from '../domain/entities';

export interface RewardsState extends RewardsStateData {
  status: 'idle' | 'loading' | 'ready' | 'error';
  error?: string;
}

const INITIAL_CHALLENGES: HealthChallenge[] = [
  {
    id: 'ch-1',
    title: '10,000 Steps Campus Fitness Walk',
    description: 'Log 10,000 daily steps for 5 consecutive days on campus.',
    pointsReward: 150,
    progressPercent: 80,
    completed: false,
    category: 'WALK',
  },
  {
    id: 'ch-2',
    title: 'Annual Diagnostic Camp Passport Verification',
    description: 'Complete all 5 screening stations at the campus health camp.',
    pointsReward: 200,
    progressPercent: 100,
    completed: true,
    category: 'CAMP',
  },
  {
    id: 'ch-3',
    title: 'Adult Influenza Vaccine Shield',
    description: 'Log annual quadrivalent flu vaccine in your digital vault.',
    pointsReward: 100,
    progressPercent: 0,
    completed: false,
    category: 'VACCINE',
  },
];

const INITIAL_REDEMPTIONS: RewardRedemptionOption[] = [
  {
    id: 'red-1',
    title: 'Free Full Body Health Checkup Voucher',
    pointsRequired: 300,
    partnerName: 'Metropolis Healthcare',
    discountValue: '₹500 OFF',
  },
  {
    id: 'red-2',
    title: 'Campus Pharmacy OTC Wellness Discount',
    pointsRequired: 150,
    partnerName: 'Studentkare Care Pass',
    discountValue: '15% OFF',
  },
  {
    id: 'red-3',
    title: 'Teleconsultation Video Voucher',
    pointsRequired: 100,
    partnerName: 'Senior Physician Network',
    discountValue: 'FREE CONSULT',
  },
];

export const rewardsStore = createModuleStore<RewardsState>({
  status: 'ready',
  pointsBalance: 450,
  streakDays: 7,
  activeChallenges: INITIAL_CHALLENGES,
  redemptionOptions: INITIAL_REDEMPTIONS,
  redeemedSuccessMessage: '',
});
