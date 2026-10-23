import { makeAutoObservable, runInAction } from 'mobx';
import type { MessageKey } from '@/i18n';
import { apiRequest } from '@/data/services/http';
import type { ViewModel } from '@/core/store/ViewModel';
import type { PushDeviceController, PushDeviceState } from '../data/pushDevice';

export type PushChannel = 'PUSH' | 'WHATSAPP' | 'EMAIL';
export type PushCategory = 'SAFETY' | 'CARE' | 'REMINDERS' | 'ORDERS' | 'CAMPS' | 'ACCOUNT' | 'ANNOUNCEMENTS';

/** One kind of message and the channels it may use (backend/core/push_copy.CATEGORIES). */
export interface CategoryDefinition {
  key: PushCategory;
  channels: PushChannel[];
  locked: boolean;
}

/** The exact body of GET / PUT /notifications/preferences (backend/services/workflow_api.py). */
export interface NotificationPreferences {
  emailEnabled: boolean;
  pushEnabled: boolean;
  remindersEnabled: boolean;
  pickupLocationEnabled: boolean;
  ayushHistoryEnabled: boolean;
  timezone: string;
  quietStart: string;
  quietEnd: string;
  /** Per category, the channels chosen (absent from an older server: the grid is not drawn). */
  channels?: Partial<Record<PushCategory, PushChannel[]>>;
  /** Read-only: which categories exist and what each may use. */
  categories?: CategoryDefinition[];
  /** Partner offers by push; off until the student turns it on (Rule L). */
  marketingOptIn?: boolean;
}

const sameValue = (a: unknown, b: unknown): boolean => JSON.stringify(a) === JSON.stringify(b);

/** The switches this screen owns. The two consents belong to the Permissions screen. */
export type SettingsSwitch = 'pushEnabled' | 'emailEnabled' | 'remindersEnabled';

const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/;

/** A 24-hour "HH:MM" time, the only shape the scheduler can read. */
export function isClockTime(value: string): boolean {
  return HHMM.test(value);
}

export type SettingsPhase = 'loading' | 'ready' | 'failed';

/**
 * Notification settings (design page 2, NotificationSettings, Tier 3).
 *
 * Fails closed on load: if the stored preferences cannot be read, nothing is
 * editable, because PUT replaces every field and saving over an unknown state
 * could silently withdraw or grant a consent. Every save sends back the
 * consents exactly as loaded.
 */
export class NotificationSettingsViewModel implements ViewModel {
  phase: SettingsPhase = 'loading';
  loaded: NotificationPreferences | null = null;
  draft: NotificationPreferences | null = null;
  saving = false;
  /** A message key, or '' for none. */
  saveError: MessageKey | '' = '';
  savedAt: number | null = null;
  /** The category the lock-screen preview shows. */
  previewCategory: PushCategory = 'CARE';
  /** This phone / browser; null until read (or when the platform has no controller). */
  deviceState: PushDeviceState | null = null;
  deviceBusy = false;
  deviceError = false;

  private disposed = false;

  constructor(
    private readonly request: typeof apiRequest = apiRequest,
    private readonly device: PushDeviceController | null = null,
  ) {
    makeAutoObservable<NotificationSettingsViewModel, 'disposed' | 'request' | 'device'>(this, { disposed: false, request: false, device: false }, { autoBind: true });
  }

  get deviceKind(): 'phone' | 'browser' | null {
    return this.device?.kind ?? null;
  }

  /** The categories the server describes, in its order; empty from an older server. */
  get categories(): CategoryDefinition[] {
    return this.loaded?.categories ?? [];
  }

  channelOn(category: PushCategory, channel: PushChannel): boolean {
    const definition = this.categories.find((c) => c.key === category);
    if (definition?.locked) return true;
    return (this.draft?.channels?.[category] ?? []).includes(channel);
  }

  /** Turns one channel of one category on or off. Safety is locked: nothing happens. */
  toggleChannel(category: PushCategory, channel: PushChannel): void {
    const definition = this.categories.find((c) => c.key === category);
    if (!this.draft || !definition || definition.locked || !definition.channels.includes(channel)) return;
    const current = this.draft.channels?.[category] ?? [];
    const next = current.includes(channel) ? current.filter((c) => c !== channel) : [...current, channel];
    this.draft = { ...this.draft, channels: { ...this.draft.channels, [category]: definition.channels.filter((c) => next.includes(c)) } };
    this.previewCategory = category;
    this.savedAt = null;
  }

  setPreview(category: PushCategory): void {
    this.previewCategory = category;
  }

  setMarketing(value: boolean): void {
    if (!this.draft) return;
    this.draft = { ...this.draft, marketingOptIn: value };
    this.savedAt = null;
  }

  async loadDevice(): Promise<void> {
    if (!this.device) return;
    try {
      const state = await this.device.state();
      if (!this.disposed) runInAction(() => { this.deviceState = state; });
    } catch {
      if (!this.disposed) runInAction(() => { this.deviceState = 'unavailable'; });
    }
  }

  async setDevice(on: boolean): Promise<void> {
    if (!this.device || this.deviceBusy) return;
    this.deviceBusy = true;
    this.deviceError = false;
    try {
      const state = on ? await this.device.enable() : await this.device.disable();
      if (!this.disposed) runInAction(() => { this.deviceState = state; });
    } catch {
      if (!this.disposed) runInAction(() => { this.deviceError = true; });
    } finally {
      if (!this.disposed) runInAction(() => { this.deviceBusy = false; });
    }
  }

  async load(): Promise<void> {
    // A remount (React StrictMode runs effects twice) reuses this instance
    // after dispose(); loading again means it is live again.
    this.disposed = false;
    this.phase = 'loading';
    try {
      const prefs = await this.request<NotificationPreferences>('/notifications/preferences');
      if (this.disposed) return;
      runInAction(() => {
        this.loaded = { ...prefs };
        this.draft = { ...prefs };
        this.phase = 'ready';
      });
    } catch {
      if (this.disposed) return;
      runInAction(() => {
        this.loaded = null;
        this.draft = null;
        this.phase = 'failed';
      });
    }
  }

  setSwitch(key: SettingsSwitch, value: boolean): void {
    if (!this.draft) return;
    this.draft = { ...this.draft, [key]: value };
    this.savedAt = null;
  }

  setQuiet(which: 'quietStart' | 'quietEnd', value: string): void {
    if (!this.draft) return;
    this.draft = { ...this.draft, [which]: value.trim() };
    this.savedAt = null;
  }

  get quietStartError(): MessageKey | '' {
    return this.draft && !isClockTime(this.draft.quietStart) ? 'nset.badTime' : '';
  }

  get quietEndError(): MessageKey | '' {
    return this.draft && !isClockTime(this.draft.quietEnd) ? 'nset.badTime' : '';
  }

  get dirty(): boolean {
    if (!this.draft || !this.loaded) return false;
    const a = this.draft;
    const b = this.loaded;
    return (Object.keys(a) as Array<keyof NotificationPreferences>).some((k) => !sameValue(a[k], b[k]));
  }

  get canSave(): boolean {
    return this.phase === 'ready' && this.dirty && !this.saving && !this.quietStartError && !this.quietEndError;
  }

  async save(): Promise<void> {
    if (!this.canSave || !this.draft || !this.loaded) return;
    // Consents are carried over from what was loaded, never from the draft.
    // Locked categories (safety) are never sent: the server refuses a change to them.
    const locked = new Set(this.categories.filter((c) => c.locked).map((c) => c.key));
    const channels = this.draft.channels
      ? Object.fromEntries(Object.entries(this.draft.channels).filter(([key]) => !locked.has(key as PushCategory)))
      : undefined;
    const body: NotificationPreferences = {
      ...this.draft,
      ...(channels ? { channels } : {}),
      pickupLocationEnabled: this.loaded.pickupLocationEnabled,
      ayushHistoryEnabled: this.loaded.ayushHistoryEnabled,
    };
    delete body.categories;
    this.saving = true;
    this.saveError = '';
    try {
      await this.request('/notifications/preferences', { method: 'PUT', body: JSON.stringify(body) });
      if (this.disposed) return;
      runInAction(() => {
        const kept = { ...body, channels: this.draft?.channels, categories: this.loaded?.categories };
        this.loaded = { ...kept };
        this.draft = { ...kept };
        this.savedAt = Date.now();
      });
    } catch {
      if (this.disposed) return;
      runInAction(() => {
        this.saveError = 'nset.saveFailed';
      });
    } finally {
      if (!this.disposed) runInAction(() => { this.saving = false; });
    }
  }

  dispose(): void {
    this.disposed = true;
  }

  reset(): void {
    this.phase = 'loading';
    this.loaded = null;
    this.draft = null;
    this.saving = false;
    this.saveError = '';
    this.savedAt = null;
  }
}
