import { apiRequest } from '@/data/services/http';
import type { SosAlert } from '../domain/Emergency';

/** backend/services/emergency_api.py. No fallbacks: a failure is the caller's to show. */
class EmergencyRepository {
  async raiseSos(locationNote: string, requestId: string): Promise<SosAlert> {
    const res = await apiRequest<{ alert: SosAlert }>('/emergency/sos', {
      method: 'POST',
      body: JSON.stringify({ requestId, ...(locationNote.trim() ? { locationNote: locationNote.trim() } : {}) }),
    });
    return res.alert;
  }

  async current(requestId?: string): Promise<SosAlert | null> {
    const path = requestId ? `/emergency/sos/current?requestId=${encodeURIComponent(requestId)}` : '/emergency/sos/current';
    const res = await apiRequest<{ alert: SosAlert | null }>(path);
    return res.alert;
  }

  async cancel(alertId: string): Promise<SosAlert> {
    const res = await apiRequest<{ alert: SosAlert }>(`/emergency/sos/${encodeURIComponent(alertId)}/cancel`, { method: 'POST' });
    return res.alert;
  }
}

export const emergencyRepository = new EmergencyRepository();
