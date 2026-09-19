/**
 * Public API for M02 (vault) Module
 * P58 Rule: Cross-module imports MUST go through this index.ts only.
 */

export * from './domain/entities';
export * from './domain/errors';
export { useVaultViewModel } from './viewmodel/useVaultViewModel';
export { VaultScreen } from './view/VaultScreen';
export { default as moduleConfig } from './module.config';
