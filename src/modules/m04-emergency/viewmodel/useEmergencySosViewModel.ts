import { emergencyStore } from '../state/EmergencyStore';
import type { EmergencyStatus, EmergencyContact, AmbulanceDispatchInfo } from '../domain/Emergency';

export interface EmergencySosViewModelState {
  status: EmergencyStatus;
  countdownSeconds: number;
  userLocation: string;
  isLocating: boolean;
  error: string;
  activeDispatch: AmbulanceDispatchInfo | null;
  emergencyContacts: EmergencyContact[];
  isEmergencyActive: boolean;
}

export interface EmergencySosViewModelActions {
  triggerSos: () => void;
  cancelSos: () => void;
  dispatchEmergency: () => Promise<void>;
  refreshLocation: () => void;
  reset: () => void;
}

export interface EmergencySosViewModelHook {
  state: EmergencySosViewModelState;
  actions: EmergencySosViewModelActions;
}

export function useEmergencySosViewModel(): EmergencySosViewModelHook {
  return {
    state: {
      status: emergencyStore.status,
      countdownSeconds: emergencyStore.countdownSeconds,
      userLocation: emergencyStore.userLocation,
      isLocating: emergencyStore.isLocating,
      error: emergencyStore.error,
      activeDispatch: emergencyStore.activeDispatch,
      emergencyContacts: emergencyStore.emergencyContacts,
      isEmergencyActive: emergencyStore.isEmergencyActive,
    },
    actions: {
      triggerSos: () => emergencyStore.triggerSos(),
      cancelSos: () => emergencyStore.cancelSos(),
      dispatchEmergency: () => emergencyStore.dispatchEmergency(),
      refreshLocation: () => emergencyStore.refreshLocation(),
      reset: () => emergencyStore.reset(),
    },
  };
}

export { emergencyStore };
