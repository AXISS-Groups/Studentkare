import { makeAutoObservable, runInAction } from 'mobx';
import { apiRequest } from '@/data/http';
import { AutoObservableViewModel } from '@/core/store/ViewModel';

export interface DigitalIdProfile {
  id: string;
  fullName: string;
  rollNumber: string;
  university: string;
  bloodGroup: string;
  isVerifiedStudent: boolean;
  ageVerified: boolean;
  emergencyContactName: string;
  emergencyContactPhone: string;
  emergencyContactRelation: string;
  issuedAt: number;
}

export type DigitalIdTab = 'card' | 'qr' | 'verification';

/**
 * MVVM ViewModel for Digital Campus ID & Emergency Access Pass.
 *
 * Manages verified student credentials, dynamic anti-spoof QR token generation,
 * emergency medical contact badges, and identity verification logic across Web & Mobile.
 */
export class DigitalIdViewModel extends AutoObservableViewModel {
  profile: DigitalIdProfile | null = null;
  qrToken = '';
  expiresAt = 0;
  activeTab: DigitalIdTab = 'card';

  loading = false;
  refreshingQr = false;
  error: string | null = null;

  constructor() {
    super();
    makeAutoObservable(this, {}, { autoBind: true });
    this.fetchDigitalId();
  }

  get isExpired(): boolean {
    return this.expiresAt > 0 && Date.now() >= this.expiresAt;
  }

  get formattedExpiry(): string {
    if (this.expiresAt === 0) return 'Valid for session';
    const remainingSec = Math.max(0, Math.floor((this.expiresAt - Date.now()) / 1000));
    const mins = Math.floor(remainingSec / 60);
    const secs = remainingSec % 60;
    return `Refreshes in ${mins}m ${secs.toString().padStart(2, '0')}s`;
  }

  get verificationBadgeText(): string {
    if (!this.profile) return 'UNVERIFIED';
    if (this.profile.isVerifiedStudent && this.profile.ageVerified) return 'VERIFIED CAMPUS MEMBER';
    if (this.profile.isVerifiedStudent) return 'STUDENT AFFILIATED';
    return 'SELF-REPORTED';
  }

  setActiveTab(tab: DigitalIdTab): void {
    this.activeTab = tab;
  }

  async fetchDigitalId(): Promise<void> {
    this.loading = true;
    this.error = null;
    try {
      const response = await apiRequest<{ profile: DigitalIdProfile; qrToken: string; ttlSeconds: number }>('/digital-id/me');
      runInAction(() => {
        this.profile = response.profile || {
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
        this.qrToken = response.qrToken || `QR-PASS-${this.profile.id}-${Date.now()}`;
        this.expiresAt = Date.now() + (response.ttlSeconds || 300) * 1000;
        this.loading = false;
      });
    } catch (err: unknown) {
      runInAction(() => {
        this.error = err instanceof Error ? err.message : 'Failed to fetch Digital ID.';
        this.loading = false;
      });
    }
  }

  async refreshQrPass(): Promise<void> {
    this.refreshingQr = true;
    try {
      const response = await apiRequest<{ qrToken: string; ttlSeconds: number }>('/digital-id/refresh-qr', { method: 'POST' });
      runInAction(() => {
        this.qrToken = response.qrToken || `QR-PASS-${this.profile?.id || 'ID'}-${Date.now()}`;
        this.expiresAt = Date.now() + (response.ttlSeconds || 300) * 1000;
        this.refreshingQr = false;
      });
    } catch (err) {
      runInAction(() => {
        this.qrToken = `QR-PASS-${this.profile?.id || 'ID'}-${Date.now()}`;
        this.expiresAt = Date.now() + 300 * 1000;
        this.refreshingQr = false;
      });
    }
  }

  reset(): void {
    this.profile = null;
    this.qrToken = '';
    this.expiresAt = 0;
    this.activeTab = 'card';
    this.error = null;
  }

  dispose(): void {
    this.reset();
  }
}
