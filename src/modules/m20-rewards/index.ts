/**
 * Public API for M20 (rewards) Module
 * P58 Rule: Cross-module imports MUST go through this index.ts only.
 */

export * from './domain/entities';
export { useRewardsViewModel, RewardsViewModel } from './viewmodel/useRewardsViewModel';
export { rewardsStore } from './state/rewards.store';
export { default as moduleConfig } from './module.config';
