/**
 * Public API for M17 (marketplace) Module
 * P58 Rule: Cross-module imports MUST go through this index.ts only.
 */

export * from './domain/entities';
export * from './domain/errors';
export { useMarketplaceViewModel } from './viewmodel/useMarketplaceViewModel';
export { MarketplaceScreen } from './view/MarketplaceScreen';
export { default as moduleConfig } from './module.config';
