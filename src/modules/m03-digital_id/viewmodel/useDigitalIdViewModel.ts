import { digitalIdStore } from '../state/DigitalIdStore';
import type { DigitalIdProfile, DigitalIdTab } from '../domain/DigitalId';

export interface DigitalIdViewModelState {
  profile: DigitalIdProfile | null;
  qrToken: string;
  expiresAt: number;
  activeTab: DigitalIdTab;
  isExpired: boolean;
  formattedExpiry: string;
  verificationBadgeText: string;
  isLoading: boolean;
  refreshingQr: boolean;
  error: string | null;
}

export interface DigitalIdViewModelActions {
  setActiveTab: (tab: DigitalIdTab) => void;
  fetchDigitalId: () => Promise<void>;
  refreshQrPass: () => Promise<void>;
  reset: () => void;
}

export interface DigitalIdViewModelHook {
  state: DigitalIdViewModelState;
  actions: DigitalIdViewModelActions;
}

export function useDigitalIdViewModel(): DigitalIdViewModelHook {
  return {
    state: {
      profile: digitalIdStore.profile,
      qrToken: digitalIdStore.qrToken,
      expiresAt: digitalIdStore.expiresAt,
      activeTab: digitalIdStore.activeTab,
      isExpired: digitalIdStore.isExpired,
      formattedExpiry: digitalIdStore.formattedExpiry,
      verificationBadgeText: digitalIdStore.verificationBadgeText,
      isLoading: digitalIdStore.isLoading,
      refreshingQr: digitalIdStore.refreshingQr,
      error: digitalIdStore.errorMessage,
    },
    actions: {
      setActiveTab: (tab) => digitalIdStore.setActiveTab(tab),
      fetchDigitalId: () => digitalIdStore.fetchDigitalId(),
      refreshQrPass: () => digitalIdStore.refreshQrPass(),
      reset: () => digitalIdStore.reset(),
    },
  };
}

export { digitalIdStore };
