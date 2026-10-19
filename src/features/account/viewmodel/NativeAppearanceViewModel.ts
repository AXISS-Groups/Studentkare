import { makeAutoObservable, runInAction } from 'mobx';
import { apiRequest } from '@/data/services/http';
import type { ViewModel } from '@/core/store/ViewModel';
import { APPEARANCE_PATH, readAppearance, toAccountAppearance } from '../appearance';
import type { AppearanceResponse, ThemePreference } from '../appearance';

export type NativeAppearancePhase = 'loading' | 'ready' | 'failed';

/**
 * The native appearance setting. The phone keeps nothing of its own: the
 * account is the only store, read at launch (src/native/boot.tsx) and here.
 *
 * A choice is saved first and applied only once the account holds it, so the
 * restart that applies it reads back the same value. A failed save changes
 * nothing and says so.
 */
export class NativeAppearanceViewModel implements ViewModel {
  phase: NativeAppearancePhase = 'loading';
  /** The account's choice; 'system' when it has never chosen. */
  preference: ThemePreference;
  saving = false;
  saveFailed = false;

  private disposed = false;

  constructor(
    /** What the app launched with, shown until the account answers. */
    initial: ThemePreference,
    /** Makes the saved choice take effect (sets the launch scheme, restarts if the look changes). */
    private readonly applySaved: (preference: ThemePreference) => void,
    private readonly request: typeof apiRequest = apiRequest,
  ) {
    this.preference = initial;
    makeAutoObservable<NativeAppearanceViewModel, 'applySaved' | 'request' | 'disposed'>(
      this, { applySaved: false, request: false, disposed: false }, { autoBind: true },
    );
  }

  async load(): Promise<void> {
    this.disposed = false;
    this.phase = 'loading';
    try {
      const body = await this.request<AppearanceResponse>(APPEARANCE_PATH);
      if (this.disposed) return;
      runInAction(() => {
        this.preference = readAppearance(body) ?? 'system';
        this.phase = 'ready';
      });
    } catch {
      if (this.disposed) return;
      runInAction(() => {
        this.phase = 'failed';
      });
    }
  }

  async choose(next: ThemePreference): Promise<void> {
    if (this.phase !== 'ready' || this.saving || next === this.preference) return;
    this.saving = true;
    this.saveFailed = false;
    let saved: ThemePreference | null = null;
    try {
      const body = await this.request<AppearanceResponse>(APPEARANCE_PATH, {
        method: 'PATCH',
        body: JSON.stringify({ appearance: toAccountAppearance(next) }),
      });
      saved = readAppearance(body);
    } catch {
      saved = null;
    }
    if (this.disposed) return;
    runInAction(() => {
      this.saving = false;
      if (saved === next) this.preference = next;
      else this.saveFailed = true;
    });
    if (saved === next) this.applySaved(next);
  }

  dispose(): void {
    this.disposed = true;
  }

  reset(): void {
    this.phase = 'loading';
    this.saving = false;
    this.saveFailed = false;
  }
}
