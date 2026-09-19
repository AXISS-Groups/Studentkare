import { useCallback } from 'react';
import { useModuleStore } from '../../../core/state/moduleStore';
import { rewardsStore } from '../state/rewards.store';
import { RewardRedemptionOption } from '../domain/entities';

export { RewardsViewModel } from './RewardsViewModel';
export type { HealthChallenge, RewardRedemptionOption, ReferralRecord, ReferralInfo } from '../domain/entities';

export function useRewardsViewModel() {
  const state = useModuleStore(rewardsStore);

  const completeChallenge = useCallback((challengeId: string) => {
    rewardsStore.set((prev) => {
      const ch = prev.activeChallenges.find((c) => c.id === challengeId);
      if (!ch || ch.completed) return prev;

      const updatedChallenges = prev.activeChallenges.map((c) =>
        c.id === challengeId ? { ...c, completed: true, progressPercent: 100 } : c
      );

      return {
        ...prev,
        activeChallenges: updatedChallenges,
        pointsBalance: prev.pointsBalance + ch.pointsReward,
      };
    });
  }, []);

  const referFriend = useCallback((emailOrPhone: string) => {
    const cleanContact = emailOrPhone.trim();
    if (!cleanContact) return;

    rewardsStore.set((prev) => {
      const newRecord = {
        id: `ref-${Date.now()}`,
        referredUserEmail: cleanContact,
        dateReferred: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
        pointsAwarded: 50,
        status: 'COMPLETED' as const,
      };

      return {
        ...prev,
        pointsBalance: prev.pointsBalance + 50,
        redeemedSuccessMessage: `🎉 50 LifePoints credited for referring ${cleanContact}! Redeemable on any package.`,
        referralInfo: {
          ...prev.referralInfo,
          totalReferred: prev.referralInfo.totalReferred + 1,
          referralPointsEarned: prev.referralInfo.referralPointsEarned + 50,
          referralHistory: [newRecord, ...prev.referralInfo.referralHistory],
        },
      };
    });

    setTimeout(() => {
      rewardsStore.set({ redeemedSuccessMessage: '' });
    }, 4000);
  }, []);

  const copyReferralLink = useCallback(() => {
    return state.referralInfo.referralLink;
  }, [state.referralInfo.referralLink]);

  const redeemOption = useCallback((option: RewardRedemptionOption) => {
    rewardsStore.set((prev) => {
      if (prev.pointsBalance < option.pointsRequired) return prev;

      return {
        ...prev,
        pointsBalance: prev.pointsBalance - option.pointsRequired,
        redeemedSuccessMessage: `Voucher unlocked for ${option.title}! Added to your Health Pass Wallet.`,
      };
    });

    setTimeout(() => {
      rewardsStore.set({ redeemedSuccessMessage: '' });
    }, 4000);
  }, []);

  return {
    state,
    actions: { completeChallenge, referFriend, copyReferralLink, redeemOption },
  };
}

