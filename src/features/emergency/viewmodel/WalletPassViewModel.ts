import { makeAutoObservable, runInAction } from 'mobx';
import { apiRequest } from '@/data/services/http';
import type { ViewModel } from '@/core/store/ViewModel';
import type { MessageKey } from '@/i18n';

/** backend/services/wallet_passes.py FIELDS, in the same order. */
export const WALLET_FIELDS = ['name', 'blood', 'contact', 'allergies', 'conditions', 'medicines'] as const;
export type WalletField = (typeof WALLET_FIELDS)[number];
/** Health details: off until the student switches each on (plan tier1-emergency-card-wallet-2026-10-24). */
export const HEALTH_FIELDS: readonly WalletField[] = ['allergies', 'conditions', 'medicines'];
export const WALLET_PLATFORMS = ['APPLE', 'GOOGLE'] as const;
export type WalletPlatform = (typeof WALLET_PLATFORMS)[number];

export interface WalletPassInfo {
  platform: WalletPlatform;
  status: 'ACTIVE' | 'VOIDED';
  fields: WalletField[];
  /** Server time, seconds. */
  updatedAt: number;
  /** Apple: a device registered the pass. Google: someone saved it. */
  inWallet: boolean;
  /** An update or removal not yet delivered to the wallet. */
  pending: boolean;
}

/** GET /api/wallet/emergency-card. */
export interface WalletStatus {
  /** Turned on in settings AND configured on the server. */
  available: { apple: boolean; google: boolean };
  fields: WalletField[];
  defaultFields: WalletField[];
  /** Active passes, and voided ones whose removal is still being sent. */
  passes: WalletPassInfo[];
  googleConsentVersion: string;
  googleConsent: { version: string; givenAt: number } | null;
}

interface AppleAdded extends WalletStatus { downloadPath: string }
interface GoogleAdded extends WalletStatus { saveUrl: string }

const PATH: Record<WalletPlatform, string> = { APPLE: 'apple', GOOGLE: 'google' };

/** Whether a wallet pass of the card sits in some wallet now (the Profile line reads this). */
export function inAnyWallet(status: WalletStatus | null): boolean {
  return Boolean(status?.passes.some((p) => p.status === 'ACTIVE' && p.inWallet));
}

/**
 * The emergency card in the phone wallet (Tier 1, plan tier1-emergency-card-wallet-2026-10-24).
 *
 * Nothing about the pass is decided here: the server builds it from the student's
 * own records and only for the fields chosen in the picker, and says which wallets
 * may be offered (turned on and configured). The wallet itself is opened by
 * `openUrl` (the platform's way to hand a .pkpass or a Google save link to the wallet).
 */
export class WalletPassViewModel implements ViewModel {
  status: WalletStatus | null = null;
  loadFailed = false;
  /** The platform whose add or remove is in flight. */
  busy: WalletPlatform | null = null;
  error: MessageKey | null = null;
  notice: MessageKey | null = null;
  /** The field picker, open for one wallet. */
  picker: WalletPlatform | null = null;
  chosen: WalletField[] = [];
  googleConsent = false;
  private disposed = false;

  constructor(
    private readonly openUrl: (platform: WalletPlatform, url: string) => Promise<void>,
    /** Wallets this device can hold: Apple on iOS, Google on Android, both on the web. */
    private readonly deviceWallets: readonly WalletPlatform[] = WALLET_PLATFORMS,
    private readonly request: typeof apiRequest = apiRequest,
  ) {
    makeAutoObservable<WalletPassViewModel, 'disposed' | 'request' | 'openUrl' | 'deviceWallets'>(
      this, { disposed: false, request: false, openUrl: false, deviceWallets: false }, { autoBind: true });
  }

  get loading(): boolean {
    return this.status === null && !this.loadFailed;
  }

  passFor(platform: WalletPlatform): WalletPassInfo | null {
    return this.status?.passes.find((p) => p.platform === platform) ?? null;
  }

  private isAvailable(platform: WalletPlatform): boolean {
    return Boolean(this.status && (platform === 'APPLE' ? this.status.available.apple : this.status.available.google));
  }

  /** Wallets to show: offered on this device, or holding a pass the student may want to remove. */
  get shown(): WalletPlatform[] {
    return WALLET_PLATFORMS.filter((p) =>
      (this.isAvailable(p) && this.deviceWallets.includes(p)) || this.passFor(p) !== null);
  }

  /** Whether the panel has anything to show at all (nothing while every wallet is off). */
  get visible(): boolean {
    return this.loadFailed || this.shown.length > 0;
  }

  canAddTo(platform: WalletPlatform): boolean {
    return this.isAvailable(platform) && this.deviceWallets.includes(platform);
  }

  get inAnyWallet(): boolean {
    return inAnyWallet(this.status);
  }

  get canAdd(): boolean {
    if (!this.picker || this.busy || this.chosen.length === 0) return false;
    return this.picker !== 'GOOGLE' || this.googleConsent;
  }

  async load(): Promise<void> {
    this.disposed = false;
    this.loadFailed = false;
    try {
      const status = await this.request<WalletStatus>('/wallet/emergency-card');
      if (this.disposed) return;
      runInAction(() => { this.status = status; });
    } catch {
      if (!this.disposed) runInAction(() => { this.loadFailed = true; });
    }
  }

  openPicker(platform: WalletPlatform): void {
    const existing = this.passFor(platform);
    const start = existing && existing.status === 'ACTIVE' ? existing.fields : this.status?.defaultFields ?? [];
    this.chosen = WALLET_FIELDS.filter((f) => start.includes(f));
    // Consent is never pre-ticked (DESIGN.md §7), even when it was given before.
    this.googleConsent = false;
    this.error = null;
    this.notice = null;
    this.picker = platform;
  }

  closePicker(): void {
    if (this.busy) return;
    this.picker = null;
  }

  toggle(field: WalletField): void {
    this.chosen = this.chosen.includes(field)
      ? this.chosen.filter((f) => f !== field)
      : WALLET_FIELDS.filter((f) => f === field || this.chosen.includes(f));
  }

  setGoogleConsent(value: boolean): void {
    this.googleConsent = value;
  }

  async add(language: string): Promise<void> {
    const platform = this.picker;
    if (!platform || !this.canAdd || !this.status) return;
    this.busy = platform;
    this.error = null;
    let url = '';
    try {
      if (platform === 'APPLE') {
        const added = await this.request<AppleAdded>('/wallet/emergency-card/apple', {
          method: 'POST', body: JSON.stringify({ fields: this.chosen }),
        });
        url = added.downloadPath;
        runInAction(() => { this.status = added; });
      } else {
        const added = await this.request<GoogleAdded>('/wallet/emergency-card/google', {
          method: 'POST',
          body: JSON.stringify({ fields: this.chosen, consentGranted: this.googleConsent,
            consentVersion: this.status.googleConsentVersion, language }),
        });
        url = added.saveUrl;
        runInAction(() => { this.status = added; });
      }
    } catch {
      // Nothing was added: the server rolls back the pass and the consent together.
      runInAction(() => { this.busy = null; this.error = 'wlt.addFailed'; });
      return;
    }
    runInAction(() => { this.picker = null; });
    try {
      await this.openUrl(platform, url);
    } catch {
      runInAction(() => { this.error = 'wlt.openFailed'; });
    }
    runInAction(() => { this.busy = null; });
  }

  async remove(platform: WalletPlatform): Promise<void> {
    if (this.busy) return;
    this.busy = platform;
    this.error = null;
    this.notice = null;
    try {
      const status = await this.request<WalletStatus>(`/wallet/emergency-card/${PATH[platform]}`, { method: 'DELETE' });
      runInAction(() => { this.status = status; this.notice = 'wlt.removed'; this.busy = null; });
    } catch {
      runInAction(() => { this.error = 'wlt.removeFailed'; this.busy = null; });
    }
  }

  dispose(): void {
    this.disposed = true;
  }

  reset(): void {
    this.status = null;
    this.loadFailed = false;
    this.busy = null;
    this.error = null;
    this.notice = null;
    this.picker = null;
  }
}
