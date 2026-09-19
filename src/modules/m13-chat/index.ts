/**
 * Public API for M13 (chat) Module
 * P58 Rule: Cross-module imports MUST go through this index.ts only.
 */

export * from './domain/entities';
export * from './domain/errors';
export { useChatViewModel } from './viewmodel/useChatViewModel';
export { ChatScreen } from './view/ChatScreen';
export { default as moduleConfig } from './module.config';
