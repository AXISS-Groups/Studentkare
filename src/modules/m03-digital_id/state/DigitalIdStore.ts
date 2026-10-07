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
      const response = await digitalIdRepository.refreshQrToken();
      runInAction(() => {
        this.qrToken = response.qrToken;
        this.expiresAt = Date.now() + response.ttlSeconds * 1000;
        this.refreshingQr = false;
      });
    } catch {
      runInAction(() => {
        // Deny, do not improvise. This used to mint `QR-PASS-<id>-<now>` on
        // the device and give it five minutes of apparent validity — a pass no
        // server issued and no scanner could honour. An expired pass the
        // student can see is safer than a fake one they cannot.
        this.qrToken = '';
        this.expiresAt = 0;
        this.status = { kind: 'error', message: 'That pass could not be refreshed. Check your connection and try again.' };
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
