import { apiRequest } from '@/data/http';
import type { DonorProfile, BloodTransferRequest } from '../domain/LifeShare';

export interface FeedResponse {
  donors: DonorProfile[];
  requests: BloodTransferRequest[];
}

export interface CreateRequestPayload {
  bloodGroup: string;
  unitsNeeded: number;
  hospitalStation: string;
  notes?: string;
}

export class LifeShareRepository {
  async fetchFeed(): Promise<FeedResponse> {
    try {
      return await apiRequest<FeedResponse>('/lifeshare/feed');
    } catch {
      // Fallback mock feed for offline/dev
      return {
        donors: [
          { id: 'd-1', name: 'Rahul Sharma (CSE 3rd Yr)', bloodGroup: 'O+', campusYear: '3rd Year', lastDonatedDaysAgo: 90, totalDonations: 4, verified: true },
          { id: 'd-2', name: 'Priya Verma (ECE 4th Yr)', bloodGroup: 'A+', campusYear: '4th Year', lastDonatedDaysAgo: 120, totalDonations: 6, verified: true },
          { id: 'd-3', name: 'Kiran Kumar (M.Tech)', bloodGroup: 'B-', campusYear: 'PostGrad', lastDonatedDaysAgo: 60, totalDonations: 2, verified: true },
        ],
        requests: [
          { id: 'REQ-101', bloodGroup: 'O-', unitsNeeded: 2, hospitalStation: 'Apollo Hospital Jubilee Hills', urgency: 'CRITICAL', status: 'OPEN', requesterName: 'Dr. S. K. Gupta', timestamp: Date.now() - 3600000 },
        ],
      };
    }
  }

  async createEmergencyRequest(payload: CreateRequestPayload): Promise<BloodTransferRequest> {
    try {
      return await apiRequest<BloodTransferRequest>('/lifeshare/request', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    } catch {
      return {
        id: `REQ-${Date.now().toString().slice(-4)}`,
        bloodGroup: payload.bloodGroup,
        unitsNeeded: payload.unitsNeeded,
        hospitalStation: payload.hospitalStation,
        urgency: 'CRITICAL',
        status: 'OPEN',
        requesterName: 'Campus Medical Officer',
        timestamp: Date.now(),
      };
    }
  }
}

export const lifeShareRepository = new LifeShareRepository();
