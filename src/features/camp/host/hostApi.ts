import { apiRequest } from '@/data/services/http';
import type { CampBase, CampEligibility, CampService } from '../data/campsApi';

/** GET /ops/camps: a camp a host runs or may approve, with counts per slot (never who booked). */
export interface HostSlot {
  id: string;
  slotStart: string;
  slotEnd: string;
  capacity: number;
  booked: number;
  waitlisted: number;
  checkedIn: number;
  cancelled: number;
}

export interface HostCamp extends CampBase {
  slots: HostSlot[];
  isHost: boolean;
  canDecide: boolean;
  canCancel: boolean;
  cancelReason: string | null;
}

export type HostKind = 'CAMPUS' | 'PARTNER' | 'PLATFORM';

export interface HostOptions {
  hostKind: HostKind;
  campuses: string[];
  campusFixed: boolean;
  services: Array<{ code: CampService; held: boolean }>;
  eligibility: CampEligibility[];
  needsApproval: boolean;
}

export interface NewCampBody {
  name: string;
  date: string;
  campus: string;
  location: string;
  whatToBring: string;
  services: CampService[];
  eligibility: CampEligibility;
  pricePaise: number;
  /** "HH:MM" from the time inputs; the server stores "9:30 AM". */
  slots: Array<{ start: string; end: string; capacity: number }>;
}

export interface CampsHostSource {
  load(): Promise<{ items: HostCamp[]; hostKind: HostKind }>;
  options(): Promise<HostOptions>;
  create(body: NewCampBody): Promise<{ id: string; status: string }>;
  decide(id: string, decision: 'APPROVE' | 'DECLINE'): Promise<void>;
  cancel(id: string, reason: string): Promise<void>;
}

const path = (id: string) => `/ops/camps/${encodeURIComponent(id)}`;

export const liveHostSource: CampsHostSource = {
  load: () => apiRequest('/ops/camps'),
  options: () => apiRequest('/ops/camps/options'),
  create: (body) => apiRequest('/ops/camps', { method: 'POST', body: JSON.stringify(body) }),
  async decide(id, decision) {
    await apiRequest(`${path(id)}/decision`, { method: 'POST', body: JSON.stringify({ decision }) });
  },
  async cancel(id, reason) {
    await apiRequest(`${path(id)}/cancel`, { method: 'POST', body: JSON.stringify({ reason }) });
  },
};
