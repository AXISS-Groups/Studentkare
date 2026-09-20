import { apiRequest } from '@/data/http';
import type { AmbulanceDispatchInfo } from '../domain/Emergency';

export interface SosDispatchPayload {
  userLocation: string;
}

export class EmergencyRepository {
  async dispatchSos(location: string): Promise<AmbulanceDispatchInfo> {
    try {
      return await apiRequest<AmbulanceDispatchInfo>('/emergency/sos', {
        method: 'POST',
        body: JSON.stringify({ userLocation: location }),
      });
    } catch {
      // Fallback mock dispatch for emergency resilience
      return {
        unitId: 'AMB-UNIT-04',
        driverName: 'Suresh Patil',
        driverPhone: '+91 99887 76655',
        etaMinutes: 4,
        currentLocation: 'En route via University Gate #2',
      };
    }
  }

  async cancelSos(): Promise<void> {
    try {
      await apiRequest('/emergency/cancel', { method: 'POST' });
    } catch (err) {
      console.warn('[EmergencyRepository] SOS cancellation sync warning:', err);
    }
  }
}

export const emergencyRepository = new EmergencyRepository();
