import { makeAutoObservable, runInAction } from 'mobx';
import { apiRequest } from '@/data/services/http';
import type { ViewModel } from '@/core/store/ViewModel';

/** The times a student can pick. Fixed slots, so no free-form clock entry. */
export const REMINDER_SLOTS = ['morning', 'afternoon', 'evening', 'night'] as const;
export type ReminderSlot = (typeof REMINDER_SLOTS)[number];
export const SLOT_TIME: Record<ReminderSlot, { hour: number; minute: number }> = {
  morning: { hour: 8, minute: 0 },
  afternoon: { hour: 14, minute: 0 },
  evening: { hour: 20, minute: 0 },
  night: { hour: 22, minute: 0 },
};

/** GET /api/meds/schedule → plans[]. */
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
  /** planId → slot, for every reminder this app has scheduled. */
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
  private disposed = false;

  constructor(
    private readonly scheduler: ReminderScheduler,
    private readonly request: typeof apiRequest = apiRequest,
  ) {
    makeAutoObservable<MedicineRemindersViewModel, 'disposed' | 'scheduler' | 'request'>(
      this,
      { disposed: false, scheduler: false, request: false },
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
        const allowed = permission === 'granted' || (permission === 'undetermined' && (await this.scheduler.request()));
        if (!allowed) {
          runInAction(() => { this.permissionDenied = true; });
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
