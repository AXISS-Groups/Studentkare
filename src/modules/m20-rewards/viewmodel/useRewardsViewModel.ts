import { useCallback } from 'react';
import { useModuleStore } from '../../../core/state/moduleStore';
import { rewardsStore } from '../state/rewards.store';
import { RewardRedemptionOption } from '../domain/entities';

export { RewardsViewModel } from '../../../features/rewards/viewmodel/RewardsViewModel';
export type { HealthChallenge, RewardRedemptionOption } from '../../../features/rewards/viewmodel/RewardsViewModel';

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
    actions: { completeChallenge, redeemOption },
  };
}
