import { makeAutoObservable, runInAction } from 'mobx';
import type { DonorProfile, BloodTransferRequest } from '../domain/LifeShare';
import { filterCompatibleDonors, validateBloodUnits } from '../domain/LifeShare';
import { lifeShareRepository } from '../data/LifeShareRepository';

export type LifeShareStoreStatus =
  | { kind: 'idle' }
  | { kind: 'loading' }
  | { kind: 'success' }
  | { kind: 'error'; message: string };

export class LifeShareStore {
  selectedBloodGroup = 'O+';
  unitsNeeded = 2;
  hospitalStation = '';
  notes = '';

  donors: DonorProfile[] = [];
  activeRequests: BloodTransferRequest[] = [];
  status: LifeShareStoreStatus = { kind: 'idle' };
  submitting = false;
  createdRequest: BloodTransferRequest | null = null;

  constructor() {
    makeAutoObservable(this, {}, { autoBind: true });
    void this.fetchData();
  }

  get compatibleDonorsCount(): number {
    return filterCompatibleDonors(this.donors, this.selectedBloodGroup).length;
  }

  get canSubmit(): boolean {
    return Boolean(this.hospitalStation.trim()) && !this.submitting;
  }

  get isLoading(): boolean {
    return this.status.kind === 'loading';
  }

  get errorMessage(): string | null {
    return this.status.kind === 'error' ? this.status.message : null;
  }

  setBloodGroup(bg: string): void {
    this.selectedBloodGroup = bg;
  }

  setUnits(units: number): void {
    this.unitsNeeded = validateBloodUnits(units);
  }

  setHospitalStation(station: string): void {
    this.hospitalStation = station;
  }

  setNotes(notes: string): void {
    this.notes = notes;
  }

  async fetchData(): Promise<void> {
    this.status = { kind: 'loading' };
    try {
      const feed = await lifeShareRepository.fetchFeed();
      runInAction(() => {
        this.donors = feed.donors;
        this.activeRequests = feed.requests;
        this.status = { kind: 'success' };
      });
    } catch (err: unknown) {
      runInAction(() => {
        const message = err instanceof Error ? err.message : 'Failed to fetch donor exchange data.';
        this.status = { kind: 'error', message };
      });
    }
  }

  async createEmergencyRequest(): Promise<boolean> {
    if (!this.canSubmit) return false;
    this.submitting = true;
    try {
      const result = await lifeShareRepository.createEmergencyRequest({
        bloodGroup: this.selectedBloodGroup,
        unitsNeeded: this.unitsNeeded,
        hospitalStation: this.hospitalStation,
        notes: this.notes,
      });

      runInAction(() => {
        this.createdRequest = result;
        this.submitting = false;
      });
      await this.fetchData();
      return true;
    } catch (err: unknown) {
      runInAction(() => {
        const message = err instanceof Error ? err.message : 'Failed to dispatch blood transfer request.';
        this.status = { kind: 'error', message };
        this.submitting = false;
      });
      return false;
    }
  }

  reset(): void {
    this.hospitalStation = '';
    this.notes = '';
    this.createdRequest = null;
    this.status = { kind: 'idle' };
  }
}

export const lifeShareStore = new LifeShareStore();
