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

export class DigitalIdRepository {
  async fetchDigitalId(): Promise<DigitalIdApiResponse> {
    try {
      return await apiRequest<DigitalIdApiResponse>('/digital-id/me');
    } catch {
      // Mock profile fallback for offline/dev
      const mockProfile: DigitalIdProfile = {
        id: 'STU-2026-8841',
        fullName: 'Rahul Sharma',
        rollNumber: '21SNIST1042',
        university: 'Osmania University Campus Unit',
        bloodGroup: 'O+',
        isVerifiedStudent: true,
        ageVerified: true,
        emergencyContactName: 'Rajesh Sharma',
        emergencyContactPhone: '+91 98111 22334',
        emergencyContactRelation: 'Father',
        issuedAt: Date.now() - 86400000 * 30,
      };

      return {
        profile: mockProfile,
        qrToken: `QR-PASS-${mockProfile.id}-${Date.now()}`,
        ttlSeconds: 300,
      };
    }
  }

  async refreshQrToken(profileId: string): Promise<RefreshQrResponse> {
    try {
      return await apiRequest<RefreshQrResponse>('/digital-id/refresh-qr', { method: 'POST' });
    } catch {
      return {
        qrToken: `QR-PASS-${profileId}-${Date.now()}`,
        ttlSeconds: 300,
      };
    }
  }
}

export const digitalIdRepository = new DigitalIdRepository();
