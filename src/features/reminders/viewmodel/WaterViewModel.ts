import { makeAutoObservable, runInAction } from 'mobx';
import { apiRequest } from '@/data/services/http';
import { getSetting } from '@/data/services/config';
import type { ViewModel } from '@/core/store/ViewModel';
import type { Said } from '@/i18n';
import { Resource } from '@/features/m2health/resource';
import { serverSaid } from './serverMessage';

/**
 * Water for Mobile 2.0 My health (the Water card on M2Insights and the M2Water
 * screen, web and Expo). The student's own log: GET /wellness/water/today,
 * POST /wellness/water, DELETE /wellness/water/latest, GET/PUT
 * /wellness/water/goal and GET /wellness/water/days (backend/services/wellness_api.py).
 *
 * Rules kept:
 * - Every number is the server's: today's total, the goal the student set (or
 *   the default, said as such), the goal's bounds, and each day of the week. A
 *   day with nothing logged is unknown (null), never drawn as 0.
 * - No streak, medal, score or "goal met" history (AGENTS.md guardrail 4). Past
 *   days are not compared with a goal: goals are not kept per day.
 * - One tap logs `wellness.water_glass_ml`; the goal steps by the same glass.
 * - Nothing is kept on the device and nothing is queued offline (WP-07 D7-1):
 *   while offline the actions are refused here and the screen says why.
 */

export interface WaterEntry { id: string; amountMl: number; recordedAt: string; source: string }
export interface WaterToday {
  date: string;
  timezone: string;
  consumedMl: number;
  goalMl: number;
  goalSource: 'OWNER' | 'DEFAULT';
  percent: number;
  entries: WaterEntry[];
}
export interface WaterGoal { goalMl: number; goalSource: 'OWNER' | 'DEFAULT'; minMl: number; maxMl: number }
export interface WaterDay { date: string; consumedMl: number | null; entries: number }
export interface WaterDays { timezone: string; from: string; to: string; goalMl: number; goalSource: 'OWNER' | 'DEFAULT'; days: WaterDay[] }

export type WaterBusy = 'add' | 'undo' | 'goal' | null;

/** How full the glass is drawn: 0 to 1, capped (the server's percent is not). */
export function waterFill(today: Pick<WaterToday, 'consumedMl' | 'goalMl'>): number {
  if (today.goalMl <= 0) return 0;
  return Math.max(0, Math.min(1, today.consumedMl / today.goalMl));
}

/** Bar heights for the week, 0 to 1 against the largest of the week's totals and today's goal. Unknown days stay null. */
export function weekBars(days: readonly Pick<WaterDay, 'consumedMl'>[], goalMl: number): (number | null)[] {
  const top = Math.max(goalMl, ...days.map((d) => d.consumedMl ?? 0));
  return days.map((d) => (d.consumedMl === null ? null : top > 0 ? d.consumedMl / top : 0));
}

export class WaterViewModel implements ViewModel {
  readonly today: Resource<WaterToday>;
  readonly goal: Resource<WaterGoal>;
  readonly days: Resource<WaterDays>;
  busy: WaterBusy = null;
  /** The last refusal, in the student's words (server code to i18n). */
  error: Said | null = null;
  /** A goal being chosen, not yet saved. */
  goalDraft: number | null = null;
  online = true;
  private weekWanted = false;

  constructor(private readonly request: typeof apiRequest = apiRequest) {
    this.today = new Resource(() => request<WaterToday>('/wellness/water/today'));
    this.goal = new Resource(() => request<WaterGoal>('/wellness/water/goal'));
    this.days = new Resource(() => request<WaterDays>('/wellness/water/days'));
    makeAutoObservable<WaterViewModel, 'request' | 'weekWanted'>(this, {
      request: false, today: false, goal: false, days: false, weekWanted: false,
    }, { autoBind: true });
  }

  /** One tap's amount (setting `wellness.water_glass_ml`). */
  get glassMl(): number {
    return getSetting('wellness.water_glass_ml');
  }

  get fill(): number {
    return this.today.data ? waterFill(this.today.data) : 0;
  }

  get canUndo(): boolean {
    return Boolean(this.online && this.busy === null && this.today.data && this.today.data.entries.length > 0);
  }

  get canAdd(): boolean {
    return this.online && this.busy === null && this.today.ready;
  }

  get goalBounds(): { min: number; max: number } {
    const g = this.goal.data;
    return g ? { min: g.minMl, max: g.maxMl } : { min: getSetting('wellness.water_goal_ml_min'), max: getSetting('wellness.water_goal_ml_max') };
  }

  get canGoalDown(): boolean {
    return this.goalDraft !== null && this.goalDraft - this.glassMl >= this.goalBounds.min;
  }

  get canGoalUp(): boolean {
    return this.goalDraft !== null && this.goalDraft + this.glassMl <= this.goalBounds.max;
  }

  setOnline(online: boolean): void {
    this.online = online;
  }

  load(): void {
    void this.today.load();
    void this.goal.load();
    if (this.weekWanted) void this.days.load();
  }

  /** The Water screen's week (the card on Insights does not read it). */
  loadWeek(): void {
    this.weekWanted = true;
    void this.days.load();
  }

  async addGlass(): Promise<void> {
    if (!this.canAdd) {
      if (!this.online) this.error = { key: 'm2r.water.offlineAction' };
      return;
    }
    await this.write('add', () => this.request<WaterToday & { id: string }>('/wellness/water', {
      method: 'POST', body: JSON.stringify({ amountMl: this.glassMl }),
    }));
  }

  /** Take back the most recent glass of today (the server removes it; never a negative amount). */
  async undo(): Promise<void> {
    if (!this.canUndo) {
      if (!this.online) this.error = { key: 'm2r.water.offlineAction' };
      return;
    }
    await this.write('undo', () => this.request<WaterToday & { removedId: string }>('/wellness/water/latest', { method: 'DELETE' }));
  }

  startGoalEdit(): void {
    const current = this.goal.data?.goalMl ?? this.today.data?.goalMl;
    if (current === undefined) return;
    this.goalDraft = current;
    this.error = null;
  }

  stepGoal(direction: 1 | -1): void {
    if (this.goalDraft === null) return;
    if (direction > 0 ? !this.canGoalUp : !this.canGoalDown) return;
    this.goalDraft += direction * this.glassMl;
  }

  cancelGoalEdit(): void {
    this.goalDraft = null;
  }

  async saveGoal(): Promise<void> {
    const goalMl = this.goalDraft;
    if (goalMl === null || this.busy !== null) return;
    if (!this.online) {
      this.error = { key: 'm2r.water.offlineAction' };
      return;
    }
    this.busy = 'goal';
    this.error = null;
    try {
      const saved = await this.request<WaterGoal>('/wellness/water/goal', { method: 'PUT', body: JSON.stringify({ goalMl }) });
      runInAction(() => {
        this.goal.set(saved);
        this.goalDraft = null;
      });
      void this.today.load();
      if (this.weekWanted) void this.days.load();
    } catch (error) {
      runInAction(() => { this.error = serverSaid(error, 'm2r.water.saveFailed'); });
    } finally {
      runInAction(() => { this.busy = null; });
    }
  }

  private async write(kind: Exclude<WaterBusy, null>, send: () => Promise<WaterToday>): Promise<void> {
    this.busy = kind;
    this.error = null;
    try {
      const today = await send();
      runInAction(() => {
        this.today.set({
          date: today.date, timezone: today.timezone, consumedMl: today.consumedMl, goalMl: today.goalMl,
          goalSource: today.goalSource, percent: today.percent, entries: today.entries,
        });
      });
      if (this.weekWanted) void this.days.load();
    } catch (error) {
      runInAction(() => { this.error = serverSaid(error, kind === 'add' ? 'm2r.water.addFailed' : 'm2r.water.undoFailed'); });
    } finally {
      runInAction(() => { this.busy = null; });
    }
  }

  dispose(): void {
    this.today.cancel();
    this.goal.cancel();
    this.days.cancel();
  }

  reset(): void {
    this.dispose();
    this.busy = null;
    this.error = null;
    this.goalDraft = null;
    this.weekWanted = false;
  }
}
