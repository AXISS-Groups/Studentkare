import { makeAutoObservable, runInAction } from 'mobx';
import { apiRequest } from '@/data/http';
import type { ViewModel } from '@/core/store/ViewModel';

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
}

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
  saveError = '';
  savedAt: number | null = null;

  private disposed = false;

  constructor(private readonly request: typeof apiRequest = apiRequest) {
    makeAutoObservable<NotificationSettingsViewModel, 'disposed' | 'request'>(this, { disposed: false, request: false }, { autoBind: true });
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

  get quietStartError(): string {
    return this.draft && !isClockTime(this.draft.quietStart) ? 'Use 24-hour time, like 22:00.' : '';
  }

  get quietEndError(): string {
    return this.draft && !isClockTime(this.draft.quietEnd) ? 'Use 24-hour time, like 07:00.' : '';
  }

  get dirty(): boolean {
    if (!this.draft || !this.loaded) return false;
    const a = this.draft;
    const b = this.loaded;
    return (Object.keys(a) as Array<keyof NotificationPreferences>).some((k) => a[k] !== b[k]);
  }

  get canSave(): boolean {
    return this.phase === 'ready' && this.dirty && !this.saving && !this.quietStartError && !this.quietEndError;
  }

  async save(): Promise<void> {
    if (!this.canSave || !this.draft || !this.loaded) return;
    // Consents are carried over from what was loaded, never from the draft.
    const body: NotificationPreferences = {
      ...this.draft,
      pickupLocationEnabled: this.loaded.pickupLocationEnabled,
      ayushHistoryEnabled: this.loaded.ayushHistoryEnabled,
    };
    this.saving = true;
    this.saveError = '';
    try {
      await this.request('/notifications/preferences', { method: 'PUT', body: JSON.stringify(body) });
      if (this.disposed) return;
      runInAction(() => {
        this.loaded = { ...body };
        this.draft = { ...body };
        this.savedAt = Date.now();
      });
    } catch {
      if (this.disposed) return;
      runInAction(() => {
        this.saveError = "Your settings weren't saved. Nothing has changed — try again.";
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
