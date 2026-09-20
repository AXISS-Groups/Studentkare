import { makeAutoObservable, runInAction } from 'mobx';
import type { DigitalIdProfile, DigitalIdTab } from '../domain/DigitalId';
import { getVerificationBadgeText, formatExpiryText } from '../domain/DigitalId';
import { digitalIdRepository } from '../data/DigitalIdRepository';

export type DigitalIdStoreStatus =
  | { kind: 'idle' }
  | { kind: 'loading' }
  | { kind: 'success' }
  | { kind: 'error'; message: string };

export class DigitalIdStore {
  profile: DigitalIdProfile | null = null;
  qrToken = '';
  expiresAt = 0;
  activeTab: DigitalIdTab = 'card';

  status: DigitalIdStoreStatus = { kind: 'idle' };
  refreshingQr = false;

  constructor() {
    makeAutoObservable(this, {}, { autoBind: true });
    void this.fetchDigitalId();
  }

  get isExpired(): boolean {
    return this.expiresAt > 0 && Date.now() >= this.expiresAt;
  }

  get formattedExpiry(): string {
    return formatExpiryText(this.expiresAt);
  }

  get verificationBadgeText(): string {
    return getVerificationBadgeText(this.profile);
  }

  get isLoading(): boolean {
    return this.status.kind === 'loading';
  }

  get errorMessage(): string | null {
    return this.status.kind === 'error' ? this.status.message : null;
  }

  setActiveTab(tab: DigitalIdTab): void {
    this.activeTab = tab;
  }

  async fetchDigitalId(): Promise<void> {
    this.status = { kind: 'loading' };
    try {
      const response = await digitalIdRepository.fetchDigitalId();
      runInAction(() => {
        this.profile = response.profile;
        this.qrToken = response.qrToken;
        this.expiresAt = Date.now() + response.ttlSeconds * 1000;
        this.status = { kind: 'success' };
      });
    } catch (err: unknown) {
      runInAction(() => {
        const message = err instanceof Error ? err.message : 'Failed to fetch Digital ID.';
        this.status = { kind: 'error', message };
      });
    }
  }

  async refreshQrPass(): Promise<void> {
    this.refreshingQr = true;
    try {
      const profileId = this.profile?.id || 'ID';
      const response = await digitalIdRepository.refreshQrToken(profileId);
      runInAction(() => {
        this.qrToken = response.qrToken;
        this.expiresAt = Date.now() + response.ttlSeconds * 1000;
        this.refreshingQr = false;
      });
    } catch {
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
    this.status = { kind: 'idle' };
  }
}

export const digitalIdStore = new DigitalIdStore();
