import { makeAutoObservable, runInAction } from 'mobx';
import { getSetting } from '@/data/services/config';
import type { ViewModel } from '@/core/store/ViewModel';
import type { NotificationPermission } from './MedicineRemindersViewModel';

/**
 * Optional water reminders, kept on the phone (local notifications in the
 * Expo app; the server sends none). The student picks a gap between reminders
 * and the hours they run between; the phone repeats them every day.
 *
 * - The OS is the record of what is scheduled: the screen always re-reads it
 *   after a change, so it never claims a reminder the phone does not have.
 * - Permission is asked for when the student turns reminders on, never before,
 *   and a refusal is not asked again in the same session (the screen points to
 *   the phone's settings instead).
 * - Every bound is a setting (`wellness.water_reminder_*`).
 * - A reminder says only that it is time for water: no amount, no goal, no
 *   progress (it shows on the lock screen; DESIGN.md §7).
 */

export interface WaterReminderPlan {
  intervalMinutes: number;
  startHour: number;
  endHour: number;
}

export interface ClockTime { hour: number; minute: number }

export interface WaterReminderScheduler {
  /** What the phone has scheduled now, or null when no water reminder is set. */
  current(): Promise<WaterReminderPlan | null>;
  permission(): Promise<NotificationPermission>;
  /** Shows the OS prompt. True only if the student allowed it. */
  request(): Promise<boolean>;
  /** Replaces any water reminders with one daily reminder at each time. */
  set(plan: WaterReminderPlan, times: readonly ClockTime[]): Promise<void>;
  clear(): Promise<void>;
}

const MINUTES_PER_HOUR = 60;
const LAST_HOUR = 23;

/** Every reminder time from the start hour to the end hour (inclusive), a gap apart, at most `max`. */
export function reminderTimes(plan: WaterReminderPlan, max: number): ClockTime[] {
  const out: ClockTime[] = [];
  if (plan.intervalMinutes <= 0 || plan.endHour < plan.startHour) return out;
  const end = plan.endHour * MINUTES_PER_HOUR;
  for (let at = plan.startHour * MINUTES_PER_HOUR; at <= end && out.length < max; at += plan.intervalMinutes) {
    out.push({ hour: Math.floor(at / MINUTES_PER_HOUR), minute: at % MINUTES_PER_HOUR });
  }
  return out;
}

export function defaultWaterPlan(): WaterReminderPlan {
  return {
    intervalMinutes: getSetting('wellness.water_reminder_interval_minutes_default'),
    startHour: getSetting('wellness.water_reminder_start_hour_default'),
    endHour: getSetting('wellness.water_reminder_end_hour_default'),
  };
}

export class WaterRemindersViewModel implements ViewModel {
  /** What the phone has scheduled (null: off). */
  current: WaterReminderPlan | null = null;
  draft: WaterReminderPlan = defaultWaterPlan();
  loaded = false;
  loadFailed = false;
  permissionDenied = false;
  failed = false;
  saving = false;
  private refused = false;
  private disposed = false;

  constructor(private readonly scheduler: WaterReminderScheduler) {
    makeAutoObservable<WaterRemindersViewModel, 'scheduler' | 'refused' | 'disposed'>(
      this, { scheduler: false, refused: false, disposed: false }, { autoBind: true },
    );
  }

  get on(): boolean {
    return this.current !== null;
  }

  get times(): ClockTime[] {
    return reminderTimes(this.draft, getSetting('wellness.water_reminders_per_day_max'));
  }

  /** The draft differs from what the phone has. */
  get changed(): boolean {
    const c = this.current;
    return !c || c.intervalMinutes !== this.draft.intervalMinutes || c.startHour !== this.draft.startHour || c.endHour !== this.draft.endHour;
  }

  get intervalBounds(): { min: number; max: number; step: number } {
    return {
      min: getSetting('wellness.water_reminder_interval_minutes_min'),
      max: getSetting('wellness.water_reminder_interval_minutes_max'),
      step: getSetting('wellness.water_reminder_interval_step_minutes'),
    };
  }

  canStep(field: keyof WaterReminderPlan, direction: 1 | -1): boolean {
    const next = this.next(field, direction);
    return next !== null;
  }

  step(field: keyof WaterReminderPlan, direction: 1 | -1): void {
    const next = this.next(field, direction);
    if (next !== null) this.draft = { ...this.draft, [field]: next };
  }

  private next(field: keyof WaterReminderPlan, direction: 1 | -1): number | null {
    const d = this.draft;
    if (field === 'intervalMinutes') {
      const { min, max, step } = this.intervalBounds;
      const value = d.intervalMinutes + direction * step;
      return value >= min && value <= max ? value : null;
    }
    if (field === 'startHour') {
      const value = d.startHour + direction;
      return value >= 0 && value <= d.endHour ? value : null;
    }
    const value = d.endHour + direction;
    return value >= d.startHour && value <= LAST_HOUR ? value : null;
  }

  async load(): Promise<void> {
    this.disposed = false;
    this.loadFailed = false;
    try {
      const current = await this.scheduler.current();
      const permission = await this.scheduler.permission();
      if (this.disposed) return;
      runInAction(() => {
        this.current = current;
        if (current) this.draft = current;
        this.permissionDenied = permission === 'denied' && current !== null;
        this.loaded = true;
      });
    } catch {
      if (!this.disposed) runInAction(() => { this.loadFailed = true; this.loaded = true; });
    }
  }

  /** Turn reminders on, or save a changed gap or hours. */
  async save(): Promise<void> {
    if (this.saving) return;
    this.saving = true;
    this.failed = false;
    try {
      const permission = await this.scheduler.permission();
      const mayAsk = permission === 'undetermined' && !this.refused;
      const allowed = permission === 'granted' || (mayAsk && (await this.scheduler.request()));
      if (!allowed) {
        runInAction(() => {
          this.permissionDenied = true;
          if (mayAsk) this.refused = true;
        });
        return;
      }
      runInAction(() => { this.permissionDenied = false; });
      await this.scheduler.set(this.draft, this.times);
    } catch {
      runInAction(() => { this.failed = true; });
    } finally {
      await this.reread();
    }
  }

  async turnOff(): Promise<void> {
    if (this.saving) return;
    this.saving = true;
    this.failed = false;
    try {
      await this.scheduler.clear();
    } catch {
      runInAction(() => { this.failed = true; });
    } finally {
      await this.reread();
    }
  }

  private async reread(): Promise<void> {
    try {
      const current = await this.scheduler.current();
      runInAction(() => { this.current = current; });
    } catch {
      runInAction(() => { this.failed = true; });
    }
    runInAction(() => { this.saving = false; });
  }

  dispose(): void {
    this.disposed = true;
  }

  reset(): void {
    this.current = null;
    this.draft = defaultWaterPlan();
    this.loaded = false;
    this.loadFailed = false;
    this.permissionDenied = false;
    this.failed = false;
    this.saving = false;
  }
}
