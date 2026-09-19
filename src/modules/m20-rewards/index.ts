/**
 * Public API for M20 (rewards) Module
 * P58 Rule: Cross-module imports MUST go through this index.ts only.
 */

export * from './domain/entities';
export { useRewardsViewModel, RewardsViewModel } from './viewmodel/useRewardsViewModel';
export { RewardsScreen } from './view/RewardsScreen';
export { RewardsWebView } from './view/RewardsWebView';
export { RewardsNativeView } from './view/RewardsNativeView';
export { default as moduleConfig } from './module.config';
