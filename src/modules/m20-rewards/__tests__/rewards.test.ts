import { describe, it, expect, beforeEach } from 'vitest';
import config from '../module.config';
import { RewardsRepository } from '../data/rewards.repository';
import { rewardsStore } from '../state/rewards.store';
import { RewardsViewModel } from '../viewmodel/RewardsViewModel';

describe('Rewards Module (M20)', () => {
  beforeEach(() => {
    rewardsStore.set((prev) => ({
      ...prev,
      pointsBalance: 450,
      referralInfo: {
        referralCode: 'STUDENT-CARE-50',
        referralLink: 'https://studentkare.in/ref/STUDENT-CARE-50',
        totalReferred: 2,
        referralPointsEarned: 100,
        referralHistory: [],
      },
      redeemedSuccessMessage: '',
    }));
  });

  it('has valid manifest configuration', () => {
    expect(config.id).toBe('M20');
    expect(config.dataClass).toBe('commercial');
  });

  it('fetches challenges from repository', async () => {
    const repo = new RewardsRepository();
    const items = await repo.fetchChallenges();
    expect(Array.isArray(items)).toBe(true);
  });

  it('credits 50 LifePoints when referring a new friend (MobX ViewModel)', () => {
    const vm = new RewardsViewModel();
    const initialBalance = vm.pointsBalance;

    vm.referFriend('friend.alex@campus.edu');

    expect(vm.pointsBalance).toBe(initialBalance + 50);
    expect(vm.referralInfo.totalReferred).toBe(3);
    expect(vm.referralInfo.referralPointsEarned).toBe(150);
    expect(vm.referralInfo.referralHistory[0].referredUserEmail).toBe('friend.alex@campus.edu');
    expect(vm.referralInfo.referralHistory[0].pointsAwarded).toBe(50);
    expect(vm.redeemedSuccessMessage).toContain('50 LifePoints credited');
  });

  it('allows user to redeem package voucher using earned referral points', () => {
    const vm = new RewardsViewModel();
    // Earn 50 points from referral
    vm.referFriend('friend.sam@campus.edu');

    const voucherOption = vm.redemptionOptions.find((opt: { id: string }) => opt.id === 'red-1'); // 300 Pts Full Body Checkup
    expect(voucherOption).toBeDefined();

    const pointsBefore = vm.pointsBalance;
    vm.redeemOption(voucherOption!);

    expect(vm.pointsBalance).toBe(pointsBefore - voucherOption!.pointsRequired);
    expect(vm.redeemedSuccessMessage).toContain('Voucher unlocked');
  });
});

