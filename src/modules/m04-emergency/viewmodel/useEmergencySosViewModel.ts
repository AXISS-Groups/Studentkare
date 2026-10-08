import { emergencyStore } from '../state/EmergencyStore';
import type { EmergencyStatus, SosAlert } from '../domain/Emergency';

export interface EmergencySosViewModelState {
  status: EmergencyStatus;
  countdownSeconds: number;
  locationNote: string;
  error: string;
  alert: SosAlert | null;
  isEmergencyActive: boolean;
}

export interface EmergencySosViewModelActions {
  loadCurrent: () => Promise<void>;
  setLocationNote: (value: string) => void;
  triggerSos: () => void;
  cancelCountdown: () => void;
  cancelAlert: () => Promise<void>;
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
      locationNote: emergencyStore.locationNote,
      error: emergencyStore.error,
      alert: emergencyStore.alert,
      isEmergencyActive: emergencyStore.isEmergencyActive,
    },
    actions: {
      loadCurrent: () => emergencyStore.loadCurrent(),
      setLocationNote: (v) => emergencyStore.setLocationNote(v),
      triggerSos: () => emergencyStore.triggerSos(),
      cancelCountdown: () => emergencyStore.cancelCountdown(),
      cancelAlert: () => emergencyStore.cancelAlert(),
      reset: () => emergencyStore.reset(),
    },
  };
}

export { emergencyStore };
