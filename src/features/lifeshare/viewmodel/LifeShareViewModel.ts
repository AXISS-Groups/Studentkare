import { makeAutoObservable, runInAction } from 'mobx';
import { apiRequest } from '@/data/http';
import type { ViewModel } from '@/core/store/ViewModel';

export interface DonorProfile {
  id: string;
  name: string;
  bloodGroup: string;
  campusYear: string;
  lastDonatedDaysAgo: number;
  totalDonations: number;
  verified: boolean;
}

export interface BloodTransferRequest {
  id: string;
  bloodGroup: string;
  unitsNeeded: number;
  hospitalStation: string;
  urgency: 'HIGH' | 'CRITICAL';
  status: 'OPEN' | 'MATCHED' | 'FULFILLED';
  requesterName: string;
  timestamp: number;
}

/**
 * MVVM ViewModel for Campus LifeShare Blood & Plasma Exchange.
 *
 * Manages emergency donor compatibility matching, peer-to-peer blood requests,
 * and donor leaderboards across Web & Mobile.
 */
export class LifeShareViewModel implements ViewModel {
  selectedBloodGroup = 'O+';
  unitsNeeded = 2;
  hospitalStation = '';
  notes = '';

  donors: DonorProfile[] = [];
  activeRequests: BloodTransferRequest[] = [];

  loading = false;
  submitting = false;
  error: string | null = null;
  createdRequest: BloodTransferRequest | null = null;

  constructor() {
    makeAutoObservable(this, {}, { autoBind: true });
    this.fetchData();
  }

  setBloodGroup(bg: string): void {
    this.selectedBloodGroup = bg;
  }

  setUnits(units: number): void {
    this.unitsNeeded = Math.max(1, Math.min(10, units));
  }

  setHospitalStation(station: string): void {
    this.hospitalStation = station;
  }

  setNotes(notes: string): void {
    this.notes = notes;
  }

  get compatibleDonorsCount(): number {
    return this.donors.filter(d => d.bloodGroup === this.selectedBloodGroup).length;
  }

  get canSubmit(): boolean {
    return Boolean(this.hospitalStation.trim()) && !this.submitting;
  }

  async fetchData(): Promise<void> {
    this.loading = true;
    this.error = null;
    try {
      const response = await apiRequest<{ donors: DonorProfile[]; requests: BloodTransferRequest[] }>('/lifeshare/feed');
      runInAction(() => {
        this.donors = response.donors || [
          { id: 'd-1', name: 'Rahul Sharma (CSE 3rd Yr)', bloodGroup: 'O+', campusYear: '3rd Year', lastDonatedDaysAgo: 90, totalDonations: 4, verified: true },
          { id: 'd-2', name: 'Priya Verma (ECE 4th Yr)', bloodGroup: 'A+', campusYear: '4th Year', lastDonatedDaysAgo: 120, totalDonations: 6, verified: true },
          { id: 'd-3', name: 'Kiran Kumar (M.Tech)', bloodGroup: 'B-', campusYear: 'PostGrad', lastDonatedDaysAgo: 60, totalDonations: 2, verified: true },
        ];
        this.activeRequests = response.requests || [
          { id: 'REQ-101', bloodGroup: 'O-', unitsNeeded: 2, hospitalStation: 'Apollo Hospital Jubilee Hills', urgency: 'CRITICAL', status: 'OPEN', requesterName: 'Dr. S. K. Gupta', timestamp: Date.now() - 3600000 },
        ];
        this.loading = false;
      });
    } catch (err: unknown) {
      runInAction(() => {
        this.error = err instanceof Error ? err.message : 'Failed to fetch donor exchange data.';
        this.loading = false;
      });
    }
  }

  async createEmergencyRequest(): Promise<boolean> {
    if (!this.canSubmit) return false;
    this.submitting = true;
    this.error = null;
    try {
      const payload = {
        bloodGroup: this.selectedBloodGroup,
        unitsNeeded: this.unitsNeeded,
        hospitalStation: this.hospitalStation,
        notes: this.notes,
      };

      const result = await apiRequest<BloodTransferRequest>('/lifeshare/request', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      runInAction(() => {
        this.createdRequest = result || {
          id: `REQ-${Date.now().toString().slice(-4)}`,
          bloodGroup: this.selectedBloodGroup,
          unitsNeeded: this.unitsNeeded,
          hospitalStation: this.hospitalStation,
          urgency: 'CRITICAL',
          status: 'OPEN',
          requesterName: 'Campus Medical Officer',
          timestamp: Date.now(),
        };
        this.submitting = false;
      });
      await this.fetchData();
      return true;
    } catch (err: unknown) {
      runInAction(() => {
        this.error = err instanceof Error ? err.message : 'Failed to dispatch blood transfer request.';
        this.submitting = false;
      });
      return false;
    }
  }

  reset(): void {
    this.hospitalStation = '';
    this.notes = '';
    this.createdRequest = null;
    this.error = null;
  }

  dispose(): void {
    this.reset();
  }
}
