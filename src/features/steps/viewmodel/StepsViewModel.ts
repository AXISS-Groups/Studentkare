import { makeAutoObservable, runInAction } from 'mobx';
import { apiRequest } from '@/data/services/http';
import { getSetting } from '@/data/services/config';
import type { ViewModel } from '@/core/store/ViewModel';
import type { Said } from '@/i18n';
import { Resource } from '@/features/m2health/resource';
import { failureSaid, readWeek, saveTypedSteps, todayFrom, weekBars } from '../data/stepsApi';
import type { ActivityTrends, StepsToday, WeekBar } from '../data/stepsApi';
import { byPriority, type StepProvider } from '../model/stepSources';
import type { ConnectorStatus, StepConnector } from '../sources/connectors';
import { localDate, onHealthSourcesChanged, syncToday } from '../sources/healthSources';
import type { HealthSyncOutcome } from '../sources/healthSources';

/**
 * Steps (Mobile 2.0, new screen 2026-10-21; Tier 2) and the Steps card on My
 * health. One view model for the web phone frame, the desktop page and Expo.
 *
 * Rules it keeps:
 * - No invented number. Today's steps and the week come from GET
 *   /activity/trends; a day without a number is unknown, never 0. The live
 *   count is the phone sensor's own count since the screen opened, labelled so.
 * - Every number says where it came from (the server's `sources.steps`).
 * - Sources are never added: the phone syncs only its most trusted connected
 *   source (healthSources.syncToday) and the server shows the most trusted one.
 * - No goal, ring, streak, medal or score on steps (AGENTS.md guardrail 4).
 * - A platform permission is asked only after the explainer and the
 *   student's "Continue"; nothing is asked when the screen opens.
 * - On the web `connectors` is empty: nothing is read or synced; typed entry
 *   stays and the screen says to open the phone app.
 */

export type ConnectorState = ConnectorStatus | 'checking';
export type SyncState = 'idle' | 'syncing' | 'synced' | 'no_data' | 'failed';
export type TypedState = 'idle' | 'saving' | 'saved' | 'error';

export interface StepsDeps {
  request?: typeof apiRequest;
  connectors?: readonly StepConnector[];
  sync?: (request: typeof apiRequest) => Promise<HealthSyncOutcome>;
  now?: () => Date;
  /** Interval timer (tests pass a fake). */
  every?: (ms: number, run: () => void) => () => void;
  stepsMax?: () => number;
  liveSyncSeconds?: () => number;
}

const MS_PER_SECOND = 1000;
const defaultEvery = (ms: number, run: () => void) => {
  const id = setInterval(run, ms);
  return () => clearInterval(id);
};

export class StepsViewModel implements ViewModel {
  readonly week: Resource<ActivityTrends>;
  readonly connectors: readonly StepConnector[];
  states: Partial<Record<StepProvider, ConnectorState>> = {};
  /** The source whose plain explainer is open (before any platform prompt). */
  explaining: StepProvider | null = null;
  connecting: StepProvider | null = null;
  sync: SyncState = 'idle';
  /** Steps the phone's sensor counted since this screen opened; null when not counting. */
  liveSteps: number | null = null;
  typed = '';
  typedState: TypedState = 'idle';
  typedError: Said | null = null;

  private readonly request: typeof apiRequest;
  private readonly syncFn: (request: typeof apiRequest) => Promise<HealthSyncOutcome>;
  private readonly now: () => Date;
  private readonly every: (ms: number, run: () => void) => () => void;
  private readonly stepsMax: () => number;
  private readonly liveSyncSeconds: () => number;
  private stops: Array<() => void> = [];
  private stopLive: (() => void) | null = null;
  private active = false;

  constructor(deps: StepsDeps = {}) {
    this.request = deps.request ?? apiRequest;
    this.connectors = byPriority((deps.connectors ?? []).map((c) => c.provider))
      .map((p) => (deps.connectors ?? []).find((c) => c.provider === p))
      .filter((c): c is StepConnector => Boolean(c));
    this.syncFn = deps.sync ?? ((request) => syncToday(request));
    this.now = deps.now ?? (() => new Date());
    this.every = deps.every ?? defaultEvery;
    this.stepsMax = deps.stepsMax ?? (() => getSetting('wellness.activity_steps_max'));
    this.liveSyncSeconds = deps.liveSyncSeconds ?? (() => getSetting('wellness.steps_live_sync_seconds'));
    const request = this.request;
    this.week = new Resource(() => readWeek(request));
    makeAutoObservable<StepsViewModel, 'request' | 'syncFn' | 'now' | 'every' | 'stepsMax' | 'liveSyncSeconds' | 'stops' | 'stopLive' | 'active'>(this, {
      week: false, connectors: false, request: false, syncFn: false, now: false, every: false, stepsMax: false, liveSyncSeconds: false,
      stops: false, stopLive: false, active: false,
    }, { autoBind: true });
  }

  /** Whether this device can count steps by itself (false on the web). */
  get automatic(): boolean {
    return this.connectors.length > 0;
  }

  get today(): StepsToday | null {
    return this.week.data ? todayFrom(this.week.data) : null;
  }

  get bars(): WeekBar[] {
    return this.week.data ? weekBars(this.week.data) : [];
  }

  /** The week's average over the days that have a number (the server's; days without one are not zeros). */
  get average(): number | null {
    return this.week.data?.metrics.steps.dailyAverage ?? null;
  }

  get connected(): StepProvider[] {
    return this.connectors.filter((c) => this.states[c.provider] === 'connected').map((c) => c.provider);
  }

  /** The phone sensor that can only count live (Android) is connected: the live count is all it gives. */
  get liveOnly(): boolean {
    const motion = this.connectors.find((c) => c.provider === 'phone_motion');
    return Boolean(motion && !motion.readsDayTotal && this.states.phone_motion === 'connected');
  }

  get typedMax(): number {
    return this.stepsMax();
  }

  /** Open the screen: read the week, look at each source (no prompts), sync, and start live counting. */
  open(): void {
    this.active = true;
    void this.week.load();
    void this.refreshSources().then(() => this.syncNow());
    this.stops.push(onHealthSourcesChanged(() => { void this.refreshSources(); }));
    const seconds = this.liveSyncSeconds();
    if (this.automatic && seconds > 0) this.stops.push(this.every(seconds * MS_PER_SECOND, () => { void this.syncNow(); }));
  }

  /** Card use (My health): only the week read. */
  load(): void {
    void this.week.load();
  }

  async refreshSources(): Promise<void> {
    await Promise.all(this.connectors.map(async (c) => {
      if (this.states[c.provider] === undefined) runInAction(() => { this.states[c.provider] = 'checking'; });
      let status: ConnectorStatus;
      try {
        status = await c.status();
      } catch {
        status = 'unavailable';
      }
      runInAction(() => { this.states[c.provider] = status; });
    }));
    this.updateLive();
  }

  /** Read today's total from the most trusted connected source and store it; then re-read the week. */
  async syncNow(): Promise<void> {
    if (!this.automatic || this.sync === 'syncing') return;
    this.sync = 'syncing';
    const outcome = await this.syncFn(this.request);
    runInAction(() => {
      this.sync = outcome.status === 'not_connected' ? 'idle' : outcome.status;
    });
    if (outcome.status === 'synced') await this.week.load();
  }

  explain(provider: StepProvider): void {
    this.explaining = provider;
  }

  cancelExplain(): void {
    this.explaining = null;
  }

  /** The student read the explainer and chose Continue: now the platform's prompt shows. */
  async confirmConnect(): Promise<void> {
    const provider = this.explaining;
    const connector = this.connectors.find((c) => c.provider === provider);
    this.explaining = null;
    if (!connector || !provider) return;
    this.connecting = provider;
    let status: ConnectorStatus;
    try {
      status = await connector.connect();
    } catch {
      status = 'denied';
    }
    runInAction(() => {
      this.states[provider] = status;
      this.connecting = null;
    });
    this.updateLive();
    if (status === 'connected') await this.syncNow();
  }

  disconnect(provider: StepProvider): void {
    const connector = this.connectors.find((c) => c.provider === provider);
    if (!connector) return;
    connector.disconnect();
    this.states[provider] = 'not_connected';
    this.updateLive();
  }

  openSettings(provider: StepProvider): void {
    this.connectors.find((c) => c.provider === provider)?.openSettings?.();
  }

  setTyped(text: string): void {
    this.typed = text;
    if (this.typedState !== 'saving') { this.typedState = 'idle'; this.typedError = null; }
  }

  /** Save a typed total for today. It shows only when no connected source has a number for the day. */
  async saveTyped(): Promise<void> {
    const text = this.typed.trim();
    const max = this.typedMax;
    const value = /^\d+$/.test(text) ? Number(text) : Number.NaN;
    if (!Number.isInteger(value) || value < 0 || value > max) {
      this.typedState = 'error';
      this.typedError = { key: 'wellness.msg.ACTIVITY_VALUE_OUT_OF_RANGE', vars: { min: 0, max } };
      return;
    }
    this.typedState = 'saving';
    this.typedError = null;
    try {
      await saveTypedSteps(this.week.data?.to ?? localDate(this.now()), value, this.request);
      runInAction(() => { this.typedState = 'saved'; this.typed = ''; });
      await this.week.load();
    } catch (error) {
      runInAction(() => { this.typedState = 'error'; this.typedError = failureSaid(error); });
    }
  }

  private updateLive(): void {
    const motion = this.connectors.find((c) => c.provider === 'phone_motion');
    const want = this.active && Boolean(motion?.watchLive) && this.states.phone_motion === 'connected';
    if (want && !this.stopLive && motion?.watchLive) {
      this.liveSteps = 0;
      this.stopLive = motion.watchLive((steps) => runInAction(() => { this.liveSteps = steps; }));
    } else if (!want && this.stopLive) {
      this.stopLive();
      this.stopLive = null;
      this.liveSteps = null;
    }
  }

  dispose(): void {
    this.active = false;
    this.stops.forEach((stop) => stop());
    this.stops = [];
    this.updateLive();
    this.week.cancel();
  }

  reset(): void {
    this.dispose();
  }
}
