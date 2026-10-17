import { apiRequest } from '@/data/http';
import type { SosAlert } from '../domain/Emergency';

/** backend/services/emergency_api.py. No fallbacks: a failure is the caller's to show. */
export class EmergencyRepository {
  async raiseSos(locationNote: string): Promise<SosAlert> {
    const res = await apiRequest<{ alert: SosAlert }>('/emergency/sos', {
      method: 'POST',
      body: JSON.stringify(locationNote.trim() ? { locationNote: locationNote.trim() } : {}),
    });
    return res.alert;
  }

  async current(): Promise<SosAlert | null> {
    const res = await apiRequest<{ alert: SosAlert | null }>('/emergency/sos/current');
    return res.alert;
  }

  async cancel(alertId: string): Promise<SosAlert> {
    const res = await apiRequest<{ alert: SosAlert }>(`/emergency/sos/${encodeURIComponent(alertId)}/cancel`, { method: 'POST' });
    return res.alert;
  }
}

export const emergencyRepository = new EmergencyRepository();
