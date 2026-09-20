import { lifeShareStore } from '../state/LifeShareStore';
import type { DonorProfile, BloodTransferRequest } from '../domain/LifeShare';

export interface LifeShareViewModelState {
  selectedBloodGroup: string;
  unitsNeeded: number;
  hospitalStation: string;
  notes: string;
  donors: DonorProfile[];
  activeRequests: BloodTransferRequest[];
  compatibleDonorsCount: number;
  canSubmit: boolean;
  isLoading: boolean;
  submitting: boolean;
  error: string | null;
  createdRequest: BloodTransferRequest | null;
}

export interface LifeShareViewModelActions {
  setBloodGroup: (bg: string) => void;
  setUnits: (units: number) => void;
  setHospitalStation: (station: string) => void;
  setNotes: (notes: string) => void;
  fetchData: () => Promise<void>;
  createEmergencyRequest: () => Promise<boolean>;
  reset: () => void;
}

export interface LifeShareViewModelHook {
  state: LifeShareViewModelState;
  actions: LifeShareViewModelActions;
}

export function useLifeShareViewModel(): LifeShareViewModelHook {
  return {
    state: {
      selectedBloodGroup: lifeShareStore.selectedBloodGroup,
      unitsNeeded: lifeShareStore.unitsNeeded,
      hospitalStation: lifeShareStore.hospitalStation,
      notes: lifeShareStore.notes,
      donors: lifeShareStore.donors,
      activeRequests: lifeShareStore.activeRequests,
      compatibleDonorsCount: lifeShareStore.compatibleDonorsCount,
      canSubmit: lifeShareStore.canSubmit,
      isLoading: lifeShareStore.isLoading,
      submitting: lifeShareStore.submitting,
      error: lifeShareStore.errorMessage,
      createdRequest: lifeShareStore.createdRequest,
    },
    actions: {
      setBloodGroup: (bg: string) => lifeShareStore.setBloodGroup(bg),
      setUnits: (units: number) => lifeShareStore.setUnits(units),
      setHospitalStation: (station: string) => lifeShareStore.setHospitalStation(station),
      setNotes: (notes: string) => lifeShareStore.setNotes(notes),
      fetchData: () => lifeShareStore.fetchData(),
      createEmergencyRequest: () => lifeShareStore.createEmergencyRequest(),
      reset: () => lifeShareStore.reset(),
    },
  };
}

export { useLifeShareViewModel as useLifeshareViewModel };
export type { LifeShareViewModelState as LifeshareViewModelState };
export type { LifeShareViewModelActions as LifeshareViewModelActions };
export type { LifeShareViewModelHook as LifeshareViewModelHook };
export { lifeShareStore };
