import { makeAutoObservable, runInAction } from 'mobx';
import { apiRequest } from '@/data/services/http';
import { getSetting } from '@/data/services/config';
import type { ViewModel } from '@/core/store/ViewModel';

/** The times a student can pick. Fixed slots, so no free-form clock entry. */
export const REMINDER_SLOTS = ['morning', 'afternoon', 'evening', 'night'] as const;
export type ReminderSlot = (typeof REMINDER_SLOTS)[number];

const MINUTES_PER_HOUR = 60;
const SLOT_SETTING = {
  morning: 'meds.reminder_minute_morning',
  afternoon: 'meds.reminder_minute_afternoon',
  evening: 'meds.reminder_minute_evening',
  night: 'meds.reminder_minute_night',
} as const satisfies Record<ReminderSlot, string>;

/** A slot's clock time, from the settings registry (`meds.reminder_minute_*`, minutes after midnight). */
export function slotTime(slot: ReminderSlot): { hour: number; minute: number } {
  const minutes = getSetting(SLOT_SETTING[slot]);
  return { hour: Math.floor(minutes / MINUTES_PER_HOUR), minute: minutes % MINUTES_PER_HOUR };
}

/** GET /api/meds/schedule: plans[]. */
export interface MedicinePlan {
  id: string;
  name: string;
  dosage: string;
  frequency: string;
}

export type NotificationPermission = 'granted' | 'denied' | 'undetermined';

/**
 * The phone's own reminder store. The OS is the record of what is scheduled;
 * nothing is mirrored into app storage.
 */
export interface ReminderScheduler {
  /** planId to slot, for every reminder this app has scheduled. */
  scheduled(): Promise<Record<string, ReminderSlot>>;
  permission(): Promise<NotificationPermission>;
  /** Shows the OS prompt. True only if the student allowed it. */
  request(): Promise<boolean>;
  set(planId: string, slot: ReminderSlot): Promise<void>;
  clear(planId: string): Promise<void>;
}

/**
 * Daily medicine reminders, kept on the phone.
 *
 * Notification permission is asked for when the student turns a reminder on,
 * not before. What the screen shows is always re-read from the OS after a
 * change, so it never claims a reminder exists that the phone does not have.
 */
export class MedicineRemindersViewModel implements ViewModel {
  plans: MedicinePlan[] | null = null;
  reminders: Record<string, ReminderSlot> = {};
  loadFailed = false;
  permissionDenied = false;
  changingId: string | null = null;
  failed = false;
  /** The student refused the OS prompt in this session; never show it again. */
  private refused = false;
  private disposed = false;

  constructor(
    private readonly scheduler: ReminderScheduler,
    private readonly request: typeof apiRequest = apiRequest,
  ) {
    makeAutoObservable<MedicineRemindersViewModel, 'disposed' | 'refused' | 'scheduler' | 'request'>(
      this,
      { disposed: false, refused: false, scheduler: false, request: false },
      { autoBind: true },
    );
  }

  get loading(): boolean {
    return this.plans === null && !this.loadFailed;
  }

  async load(): Promise<void> {
    this.disposed = false;
    this.loadFailed = false;
    try {
      const schedule = await this.request<{ plans: MedicinePlan[] }>('/meds/schedule');
      const plans = schedule.plans;
      // A reminder for a medicine that is no longer active would keep nudging; drop it.
      const scheduled = await this.scheduler.scheduled();
      const active = new Set(plans.map((plan) => plan.id));
      await Promise.all(Object.keys(scheduled).filter((id) => !active.has(id)).map((id) => this.scheduler.clear(id)));
      const reminders = await this.scheduler.scheduled();
      const permission = await this.scheduler.permission();
      if (this.disposed) return;
      runInAction(() => {
        this.plans = plans;
        this.reminders = reminders;
        this.permissionDenied = permission === 'denied' && Object.keys(reminders).length > 0;
      });
    } catch {
      if (!this.disposed) runInAction(() => { this.loadFailed = true; });
    }
  }

  async setReminder(planId: string, slot: ReminderSlot | null): Promise<void> {
    if (this.changingId) return;
    this.changingId = planId;
    this.failed = false;
    try {
      if (slot) {
        const permission = await this.scheduler.permission();
        // Android 13+ still reports "can ask again" after the first refusal.
        // A student who said no is not asked again; the screen shows how to
        // change it in the phone's settings instead.
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
        await this.scheduler.set(planId, slot);
      } else {
        await this.scheduler.clear(planId);
      }
    } catch {
      runInAction(() => { this.failed = true; });
    } finally {
      // Whatever happened, show what the phone actually has scheduled.
      try {
        const reminders = await this.scheduler.scheduled();
        runInAction(() => { this.reminders = reminders; });
      } catch {
        runInAction(() => { this.failed = true; });
      }
      runInAction(() => { this.changingId = null; });
    }
  }

  dispose(): void {
    this.disposed = true;
  }

  reset(): void {
    this.plans = null;
    this.reminders = {};
    this.loadFailed = false;
    this.permissionDenied = false;
    this.changingId = null;
    this.failed = false;
  }
}
