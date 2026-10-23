import { makeAutoObservable, runInAction } from 'mobx';
import type { ViewModel } from '@/core/store/ViewModel';
import { getSetting } from '@/data/services/config';
import type { Said } from '@/i18n';
import { Resource } from '@/features/m2health/resource';
import { refillsApi, type NewRefill, type OrderedItem, type Refill, type RefillsApi, type TrackablePlan } from '../data/refillsApi';
import { isoDay, refillSaid, wholeIn } from './refillMessages';

/**
 * Refills (M2Refills, web phone frame, desktop column and Expo).
 *
 * The student picks a medicine (a past shop order line, or a plan from
 * Medicines today), types the pack size and how many they take how often, and
 * the server counts the run-out date and the reminder day. This view model
 * never computes a date itself and never suggests a number: every count is
 * the student's (the fields start empty, or from their own order quantity or
 * the plan's own times a day). Limits come from the settings registry.
 *
 * Nothing is kept on the device and nothing is queued offline (D7-1): every
 * change is refused offline and the screen says why.
 */

export type SetupStep = 'pick' | 'counts';
export type StartFrom = 'today' | 'order';

export interface SetupChoice {
  source: 'ORDER' | 'PLAN';
  name: string;
  orderId?: string;
  itemId?: string;
  planId?: string;
  orderedAt?: number;
}

export interface SetupFields {
  packSize: string;
  packs: string;
  perDose: string;
  perDay: string;
  daysBefore: string;
  startFrom: StartFrom;
}

export type FieldName = 'packSize' | 'packs' | 'perDose' | 'perDay' | 'daysBefore';

export interface Limits { packSize: number; packs: number; perDose: number; perDay: number; daysBefore: number }

export type SheetKind = 'adjust' | 'restock' | 'remove';

export function limits(): Limits {
  return {
    packSize: getSetting('refill.pack_units_max'),
    packs: getSetting('refill.packs_max'),
    perDose: getSetting('refill.units_per_dose_max'),
    perDay: getSetting('meds.times_per_day_max'),
    daysBefore: getSetting('refill.remind_days_before_max'),
  };
}

/** A tracked medicine that runs out within its own reminder window (and is not switched off). */
export function runsOutSoon(refill: Refill): boolean {
  return refill.enabled && refill.daysLeft <= refill.remindDaysBefore;
}

export class RefillsViewModel implements ViewModel {
  readonly list: Resource<Refill[]>;
  readonly plans: Resource<TrackablePlan[]>;
  readonly ordered: Resource<OrderedItem[]>;
  online = true;
  /** The refill a reminder or link opened (`?id=`), shown first and outlined. */
  focusId: string | null = null;
  busyId: string | null = null;
  status: Said | null = null;

  setupOpen = false;
  setupStep: SetupStep = 'pick';
  choice: SetupChoice | null = null;
  fields: SetupFields = RefillsViewModel.emptyFields();
  setupError: Said | null = null;
  saving = false;

  sheet: { kind: SheetKind; refill: Refill } | null = null;
  sheetValue = '';
  sheetError: Said | null = null;

  /**
   * `onReminderSet` runs after a refill reminder is saved: on the phone it is
   * the moment to ask for notifications (src/native/M2RefillScreens.tsx).
   */
  constructor(private readonly api: RefillsApi = refillsApi, private readonly onReminderSet?: () => void) {
    this.list = new Resource(() => api.list());
    this.plans = new Resource(() => api.plans());
    this.ordered = new Resource(() => api.orderedItems());
    makeAutoObservable<RefillsViewModel, 'api' | 'onReminderSet'>(this, { api: false, onReminderSet: false, list: false, plans: false, ordered: false }, { autoBind: true });
  }

  static emptyFields(): SetupFields {
    return { packSize: '', packs: '1', perDose: '', perDay: '', daysBefore: String(getSetting('refill.remind_days_before_default')), startFrom: 'today' };
  }

  get items(): Refill[] {
    const rows = this.list.data ?? [];
    if (!this.focusId) return rows;
    const focus = rows.filter((r) => r.id === this.focusId);
    return [...focus, ...rows.filter((r) => r.id !== this.focusId)];
  }

  get soonCount(): number {
    return (this.list.data ?? []).filter(runsOutSoon).length;
  }

  get limits(): Limits {
    return limits();
  }

  load(): void {
    void this.list.load();
  }

  setOnline(online: boolean): void {
    this.online = online;
  }

  setFocus(id: string | null): void {
    this.focusId = id;
  }

  // --- track a refill -----------------------------------------------------------

  openSetup(prefill?: { orderId: string; itemId: string }): void {
    this.setupOpen = true;
    this.setupStep = 'pick';
    this.choice = null;
    this.fields = RefillsViewModel.emptyFields();
    this.setupError = null;
    void Promise.all([this.plans.load(), this.ordered.load()]).then(() => {
      if (!prefill) return;
      const line = (this.ordered.data ?? []).find((o) => o.orderId === prefill.orderId && o.itemId === prefill.itemId)
        ?? (this.ordered.data ?? []).find((o) => o.itemId === prefill.itemId);
      if (line) this.pickOrdered(line);
    });
  }

  closeSetup(): void {
    if (this.saving) return;
    this.setupOpen = false;
  }

  backToPick(): void {
    this.setupStep = 'pick';
    this.setupError = null;
  }

  pickOrdered(line: OrderedItem): void {
    this.choice = { source: 'ORDER', name: line.name, orderId: line.orderId, itemId: line.itemId, orderedAt: line.orderedAt };
    // Their own order quantity is the packs they have; nothing else is filled in for them.
    this.fields = { ...RefillsViewModel.emptyFields(), packs: String(line.quantity) };
    this.setupStep = 'counts';
    this.setupError = null;
  }

  pickPlan(plan: TrackablePlan): void {
    this.choice = { source: 'PLAN', name: plan.name, planId: plan.id };
    this.fields = { ...RefillsViewModel.emptyFields(), perDay: plan.timesPerDay ? String(plan.timesPerDay) : '' };
    this.setupStep = 'counts';
    this.setupError = null;
  }

  setField(name: FieldName, value: string): void {
    this.fields = { ...this.fields, [name]: value };
  }

  setStartFrom(value: StartFrom): void {
    this.fields = { ...this.fields, startFrom: value };
  }

  /** Each field's value when it is a whole number in range, else null. */
  get parsed(): Record<FieldName, number | null> {
    const l = this.limits;
    return {
      packSize: wholeIn(this.fields.packSize, 1, l.packSize),
      packs: wholeIn(this.fields.packs, 1, l.packs),
      perDose: wholeIn(this.fields.perDose, 1, l.perDose),
      perDay: wholeIn(this.fields.perDay, 1, l.perDay),
      daysBefore: wholeIn(this.fields.daysBefore, 1, l.daysBefore),
    };
  }

  get canSave(): boolean {
    const p = this.parsed;
    return this.choice !== null && Object.values(p).every((v) => v !== null) && this.online && !this.saving;
  }

  async saveSetup(): Promise<void> {
    const choice = this.choice;
    const p = this.parsed;
    if (!choice || !this.canSave || p.packSize === null || p.packs === null || p.perDose === null || p.perDay === null || p.daysBefore === null) return;
    const body: NewRefill = {
      source: choice.source, packSize: p.packSize, packs: p.packs, unitsPerDose: p.perDose, dosesPerDay: p.perDay,
      remindDaysBefore: p.daysBefore,
      ...(choice.source === 'ORDER' ? { orderId: choice.orderId, itemId: choice.itemId } : { planId: choice.planId }),
      ...(this.fields.startFrom === 'order' && choice.orderedAt ? { startedOn: isoDay(choice.orderedAt) } : {}),
    };
    this.saving = true;
    this.setupError = null;
    try {
      const created = await this.api.create(body);
      runInAction(() => {
        this.list.set([created, ...(this.list.data ?? []).filter((r) => r.id !== created.id)]);
        this.focusId = created.id;
        this.setupOpen = false;
        this.status = { key: 'refill.status.saved' };
      });
      this.onReminderSet?.();
    } catch (error) {
      runInAction(() => { this.setupError = refillSaid(error, 'refill.status.failed'); });
    } finally {
      runInAction(() => { this.saving = false; });
    }
  }

  // --- per-row actions ----------------------------------------------------------

  private replace(row: Refill): void {
    this.list.set((this.list.data ?? []).map((r) => (r.id === row.id ? row : r)));
  }

  private async act(id: string, run: () => Promise<Refill | null>, done: Said): Promise<boolean> {
    if (!this.online || this.busyId) return false;
    this.busyId = id;
    this.status = null;
    try {
      const row = await run();
      runInAction(() => {
        if (row) this.replace(row);
        else this.list.set((this.list.data ?? []).filter((r) => r.id !== id));
        this.status = done;
      });
      return true;
    } catch (error) {
      runInAction(() => { this.status = refillSaid(error, 'refill.status.failed'); });
      return false;
    } finally {
      runInAction(() => { this.busyId = null; });
    }
  }

  toggle(refill: Refill, enabled: boolean): Promise<boolean> {
    return this.act(refill.id, () => this.api.update(refill.id, { enabled }), { key: 'refill.status.saved' });
  }

  snooze(refill: Refill): Promise<boolean> {
    return this.act(refill.id, () => this.api.snooze(refill.id), { key: 'refill.status.snoozed' });
  }

  openSheet(kind: SheetKind, refill: Refill): void {
    this.sheet = { kind, refill };
    this.sheetValue = kind === 'restock' ? String(refill.packs) : '';
    this.sheetError = null;
  }

  closeSheet(): void {
    if (this.busyId) return;
    this.sheet = null;
  }

  setSheetValue(value: string): void {
    this.sheetValue = value;
    this.sheetError = null;
  }

  /** The most the sheet's field takes: what one count can hold, or the packs limit. */
  get sheetMax(): number {
    const sheet = this.sheet;
    if (!sheet) return 0;
    return sheet.kind === 'adjust' ? sheet.refill.packSize * this.limits.packs : this.limits.packs;
  }

  async confirmSheet(): Promise<void> {
    const sheet = this.sheet;
    if (!sheet) return;
    const { refill } = sheet;
    if (sheet.kind === 'remove') {
      const ok = await this.act(refill.id, async () => { await this.api.remove(refill.id); return null; }, { key: 'refill.status.removed' });
      if (ok) runInAction(() => { this.sheet = null; });
      return;
    }
    const value = wholeIn(this.sheetValue, sheet.kind === 'adjust' ? 0 : 1, this.sheetMax);
    if (value === null) {
      this.sheetError = { key: 'refill.setup.range', vars: { min: sheet.kind === 'adjust' ? 0 : 1, max: this.sheetMax } };
      return;
    }
    const run = sheet.kind === 'adjust' ? () => this.api.adjust(refill.id, value) : () => this.api.restock(refill.id, value);
    const ok = await this.act(refill.id, run, { key: 'refill.status.saved' });
    runInAction(() => {
      if (ok) this.sheet = null;
      else this.sheetError = this.status;
    });
  }

  dispose(): void {
    this.list.cancel();
    this.plans.cancel();
    this.ordered.cancel();
  }

  reset(): void {
    this.dispose();
    this.focusId = null;
    this.status = null;
    this.setupOpen = false;
    this.sheet = null;
  }
}
