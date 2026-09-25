import { apiRequest } from '@/data/http';
import type { DigitalIdProfile } from '../domain/DigitalId';

export interface DigitalIdApiResponse {
  profile: DigitalIdProfile;
  qrToken: string;
  ttlSeconds: number;
}

export interface RefreshQrResponse {
  qrToken: string;
  ttlSeconds: number;
}

/**
 * A campus ID is a credential. Only the server issues one.
 *
 * Both methods here used to catch a failure and return a hardcoded profile
 * carrying isVerifiedStudent: true and ageVerified: true, plus a QR pass built
 * on the device — so going offline produced a credential reading VERIFIED
 * CAMPUS MEMBER, with a blood group, that no record anywhere supported. That
 * is guardrail 1: a catch around a gate has to deny. The failure belongs to
 * the caller, which shows the student why their ID will not load.
 */
export class DigitalIdRepository {
  async fetchDigitalId(): Promise<DigitalIdApiResponse> {
    return apiRequest<DigitalIdApiResponse>('/digital-id/me');
  }

  async refreshQrToken(): Promise<RefreshQrResponse> {
    return apiRequest<RefreshQrResponse>('/digital-id/refresh-qr', { method: 'POST' });
  }
}

export const digitalIdRepository = new DigitalIdRepository();
