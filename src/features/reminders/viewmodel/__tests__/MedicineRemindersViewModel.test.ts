import { describe, expect, it, vi } from 'vitest';
import { MedicineRemindersViewModel } from '../MedicineRemindersViewModel';
import type { MedicinePlan, NotificationPermission, ReminderScheduler, ReminderSlot } from '../MedicineRemindersViewModel';

type Requester = typeof import('@/data/http').apiRequest;
const plan: MedicinePlan = { id: 'med_1', name: 'Iron', dosage: '1 tablet', frequency: 'daily' };

/** A fake phone: an in-memory schedule and a permission answer. */
function phone(permission: NotificationPermission, allowOnAsk = true, initial: Record<string, ReminderSlot> = {}) {
  const store: Record<string, ReminderSlot> = { ...initial };
  const scheduler = {
    scheduled: vi.fn(async () => ({ ...store })),
    permission: vi.fn(async () => permission),
    request: vi.fn(async () => allowOnAsk),
    set: vi.fn(async (id: string, slot: ReminderSlot) => { store[id] = slot; }),
    clear: vi.fn(async (id: string) => { delete store[id]; }),
  } satisfies ReminderScheduler;
  return { scheduler, store };
}

const api = (plans: MedicinePlan[] = [plan]) => vi.fn(async () => ({ plans })) as unknown as Requester;

describe('MedicineRemindersViewModel', () => {
  it('asks for notification permission only when a reminder is turned on', async () => {
    const { scheduler, store } = phone('undetermined');
    const vm = new MedicineRemindersViewModel(scheduler, api());
    await vm.load();
    expect(scheduler.request).not.toHaveBeenCalled();
    await vm.setReminder('med_1', 'morning');
    expect(scheduler.request).toHaveBeenCalledTimes(1);
    expect(store).toEqual({ med_1: 'morning' });
    expect(vm.reminders).toEqual({ med_1: 'morning' });
  });

  it('schedules nothing and says so when permission is refused', async () => {
    const { scheduler, store } = phone('undetermined', false);
    const vm = new MedicineRemindersViewModel(scheduler, api());
    await vm.load();
    await vm.setReminder('med_1', 'night');
    expect(scheduler.set).not.toHaveBeenCalled();
    expect(store).toEqual({});
    expect(vm.reminders).toEqual({});
    expect(vm.permissionDenied).toBe(true);
  });

  it('does not re-prompt once the OS has said no for good', async () => {
    const { scheduler } = phone('denied');
    const vm = new MedicineRemindersViewModel(scheduler, api());
    await vm.load();
    await vm.setReminder('med_1', 'evening');
    expect(scheduler.request).not.toHaveBeenCalled();
    expect(vm.permissionDenied).toBe(true);
  });

  it('shows what the phone has scheduled, even when scheduling fails', async () => {
    const { scheduler } = phone('granted');
    scheduler.set.mockRejectedValueOnce(new Error('os refused'));
    const vm = new MedicineRemindersViewModel(scheduler, api());
    await vm.load();
    await vm.setReminder('med_1', 'afternoon');
    expect(vm.failed).toBe(true);
    expect(vm.reminders).toEqual({});
  });

  it('turns a reminder off', async () => {
    const { scheduler, store } = phone('granted', true, { med_1: 'morning' });
    const vm = new MedicineRemindersViewModel(scheduler, api());
    await vm.load();
    expect(vm.reminders).toEqual({ med_1: 'morning' });
    await vm.setReminder('med_1', null);
    expect(store).toEqual({});
    expect(vm.reminders).toEqual({});
  });

  it('drops reminders for medicines that are no longer active', async () => {
    const { scheduler, store } = phone('granted', true, { med_1: 'morning', med_old: 'night' });
    const vm = new MedicineRemindersViewModel(scheduler, api());
    await vm.load();
    expect(store).toEqual({ med_1: 'morning' });
    expect(vm.reminders).toEqual({ med_1: 'morning' });
  });

  it('shows an error, not an empty list, when medicines fail to load', async () => {
    const { scheduler } = phone('granted');
    const request = vi.fn(async () => { throw new Error('offline'); }) as unknown as Requester;
    const vm = new MedicineRemindersViewModel(scheduler, request);
    await vm.load();
    expect(vm.loadFailed).toBe(true);
    expect(vm.plans).toBeNull();
  });
});
