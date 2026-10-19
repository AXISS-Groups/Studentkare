import { makeAutoObservable, runInAction } from 'mobx';
import { apiRequest } from '@/data/services/http';
import type { ViewModel } from '@/core/store/ViewModel';
import { APPEARANCE_PATH, readAppearance, toAccountAppearance } from '../appearance';
import type { AppearanceResponse, ThemePreference } from '../appearance';

/**
 * - `device`: signed out; the choice lives in this browser only.
 * - `checking`: signed in, reading the account's choice.
 * - `synced`: the account holds what this device shows.
 * - `saving`: sending a new choice to the account.
 * - `saveFailed`: shown here, not saved to the account.
 * - `loadFailed`: the account could not be read; this device's choice is shown.
 */
export type AppearanceSyncState = 'device' | 'checking' | 'synced' | 'saving' | 'saveFailed' | 'loadFailed';

/**
 * Keeps the web theme and the account's appearance in step (web half of the
 * ticket; native uses NativeAppearanceViewModel).
 *
 * The theme itself is applied by ThemeProvider from the browser's cached
 * choice before anything loads, so nothing here ever blocks drawing on the
 * network. This only reconciles:
 *
 * - On sign-in, the account's choice (if it has one) replaces the cached one.
 *   An account that never chose leaves the device's choice alone and is not
 *   written to — signing in is not choosing.
 * - Every later change the person makes is saved to the account. A change
 *   made while the account is still being read wins over what comes back.
 *
 * Not a gate: a failure here leaves the device's look as it is and says so.
 */
export class AccountAppearanceViewModel implements ViewModel {
  state: AppearanceSyncState = 'device';

  /** What the account is known to hold (or is being sent). Null until read. */
  private baseline: ThemePreference | null = null;
  private signedIn = false;
  private changedWhileChecking = false;
  private generation = 0;

  constructor(
    /** Applies a preference to this device (ThemeProvider.setPreference, which also caches it). */
    private readonly apply: (preference: ThemePreference) => void,
    private readonly current: () => ThemePreference,
    private readonly request: typeof apiRequest = apiRequest,
  ) {
    makeAutoObservable<AccountAppearanceViewModel, 'apply' | 'current' | 'request' | 'baseline' | 'signedIn' | 'changedWhileChecking' | 'generation'>(
      this,
      { apply: false, current: false, request: false, baseline: false, signedIn: false, changedWhileChecking: false, generation: false },
      { autoBind: true },
    );
  }

  /** Called when the session changes. Signing in reads the account; signing out keeps the look on this device. */
  async setSignedIn(signedIn: boolean): Promise<void> {
    if (signedIn === this.signedIn) return;
    this.signedIn = signedIn;
    const generation = ++this.generation;
    this.baseline = null;
    this.changedWhileChecking = false;
    if (!signedIn) {
      this.state = 'device';
      return;
    }
    this.state = 'checking';
    let fromAccount: ThemePreference | null;
    try {
      fromAccount = readAppearance(await this.request<AppearanceResponse>(APPEARANCE_PATH));
    } catch {
      if (generation !== this.generation) return;
      runInAction(() => {
        // Unknown; an explicit choice from here on is still saved.
        this.baseline = this.current();
        this.state = 'loadFailed';
      });
      if (this.changedWhileChecking) await this.save(this.current());
      return;
    }
    if (generation !== this.generation) return;
    if (this.changedWhileChecking) {
      // The person chose while we were reading: their choice wins.
      this.baseline = fromAccount;
      await this.save(this.current());
      return;
    }
    runInAction(() => {
      this.baseline = fromAccount ?? this.current();
      this.state = 'synced';
    });
    if (fromAccount && fromAccount !== this.current()) this.apply(fromAccount);
  }

  /** Called whenever the device's preference changes, from any control (settings, admin top bar). */
  async preferenceChanged(preference: ThemePreference): Promise<void> {
    if (!this.signedIn) return;
    if (this.state === 'checking') {
      this.changedWhileChecking = true;
      return;
    }
    if (preference === this.baseline && this.state !== 'saveFailed') return;
    await this.save(preference);
  }

  /** Try the last failed save again. */
  async retry(): Promise<void> {
    if (this.signedIn && this.state === 'saveFailed') await this.save(this.current());
  }

  private async save(preference: ThemePreference): Promise<void> {
    const generation = this.generation;
    this.baseline = preference;
    this.state = 'saving';
    try {
      const body = await this.request<AppearanceResponse>(APPEARANCE_PATH, {
        method: 'PATCH',
        body: JSON.stringify({ appearance: toAccountAppearance(preference) }),
      });
      if (generation !== this.generation || this.baseline !== preference) return;
      runInAction(() => {
        this.state = readAppearance(body) === preference ? 'synced' : 'saveFailed';
      });
    } catch {
      if (generation !== this.generation || this.baseline !== preference) return;
      runInAction(() => {
        this.state = 'saveFailed';
      });
    }
  }

  dispose(): void {
    this.generation += 1;
  }

  reset(): void {
    this.generation += 1;
    this.signedIn = false;
    this.baseline = null;
    this.changedWhileChecking = false;
    this.state = 'device';
  }
}
