import { vaultStore } from '../state/VaultStore';
import type { HealthRecord, AbdmConsentRequest } from '../domain/Vault';

export interface VaultViewModelState {
  abhaAddress: string;
  abhaNumber: string;
  isLinkedWithAbdm: boolean;
  isSyncing: boolean;
  syncMessage: string;
  consentRequests: AbdmConsentRequest[];
  storedRecords: HealthRecord[];
  isLoading: boolean;
  error: string | null;
}

export interface VaultViewModelActions {
  fetchRecords: () => Promise<void>;
  syncAbdmRecords: () => void;
  grantConsent: (requestId: string) => void;
  denyConsent: (requestId: string) => void;
  reset: () => void;
}

export interface VaultViewModelHook {
  state: VaultViewModelState;
  actions: VaultViewModelActions;
}

export function useVaultViewModel(): VaultViewModelHook {
  return {
    state: {
      abhaAddress: vaultStore.abhaAddress,
      abhaNumber: vaultStore.abhaNumber,
      isLinkedWithAbdm: vaultStore.isLinkedWithAbdm,
      isSyncing: vaultStore.isSyncing,
      syncMessage: vaultStore.syncMessage,
      consentRequests: vaultStore.consentRequests,
      storedRecords: vaultStore.storedRecords,
      isLoading: vaultStore.isLoading,
      error: vaultStore.errorMessage,
    },
    actions: {
      fetchRecords: () => vaultStore.fetchRecords(),
      syncAbdmRecords: () => vaultStore.syncAbdmRecords(),
      grantConsent: (reqId) => vaultStore.grantConsent(reqId),
      denyConsent: (reqId) => vaultStore.denyConsent(reqId),
      reset: () => vaultStore.reset(),
    },
  };
}

export { vaultStore };
