import { afterEach, describe, expect, it, vi } from 'vitest';
import { applyPublicConfig, getSetting, resetPublicConfig } from '@/data/services/config';
import { WaterRemindersViewModel, reminderTimes } from '../WaterRemindersViewModel';
import type { ClockTime, WaterReminderPlan, WaterReminderScheduler } from '../WaterRemindersViewModel';
import type { NotificationPermission } from '../MedicineRemindersViewModel';
import { slotTime } from '../MedicineRemindersViewModel';

afterEach(() => resetPublicConfig());

/** A fake phone: what is scheduled, and the permission answer. */
function phone(permission: NotificationPermission, allowOnAsk = true, initial: WaterReminderPlan | null = null) {
  let plan = initial;
  let times: readonly ClockTime[] = [];
  const scheduler = {
    current: vi.fn(async () => plan),
    permission: vi.fn(async () => permission),
    request: vi.fn(async () => allowOnAsk),
    set: vi.fn(async (next: WaterReminderPlan, at: readonly ClockTime[]) => { plan = { ...next }; times = at; }),
    clear: vi.fn(async () => { plan = null; times = []; }),
  } satisfies WaterReminderScheduler;
  return { scheduler, times: () => times };
}

describe('water reminder times', () => {
  it('runs from the start hour to the end hour, a gap apart, capped', () => {
    expect(reminderTimes({ intervalMinutes: 90, startHour: 9, endHour: 12 }, 12)).toEqual([
      { hour: 9, minute: 0 }, { hour: 10, minute: 30 }, { hour: 12, minute: 0 },
    ]);
    expect(reminderTimes({ intervalMinutes: 60, startHour: 0, endHour: 23 }, 5)).toHaveLength(5);
    expect(reminderTimes({ intervalMinutes: 60, startHour: 10, endHour: 9 }, 5)).toEqual([]);
  });
});

describe('WaterRemindersViewModel', () => {
  it('starts from the registry defaults and asks for permission only on Turn on', async () => {
    const { scheduler, times } = phone('undetermined');
    const vm = new WaterRemindersViewModel(scheduler);
    await vm.load();
    expect(vm.draft).toEqual({
      intervalMinutes: getSetting('wellness.water_reminder_interval_minutes_default'),
      startHour: getSetting('wellness.water_reminder_start_hour_default'),
      endHour: getSetting('wellness.water_reminder_end_hour_default'),
    });
    expect(scheduler.request).not.toHaveBeenCalled();
    await vm.save();
    expect(scheduler.request).toHaveBeenCalledTimes(1);
    expect(vm.on).toBe(true);
    expect(times()).toEqual(vm.times);
  });

  it('a refusal schedules nothing, says so, and is not asked again', async () => {
    const { scheduler } = phone('undetermined', false);
    const vm = new WaterRemindersViewModel(scheduler);
    await vm.load();
    await vm.save();
    await vm.save();
    expect(scheduler.set).not.toHaveBeenCalled();
    expect(scheduler.request).toHaveBeenCalledTimes(1);
    expect(vm.permissionDenied).toBe(true);
    expect(vm.on).toBe(false);
  });

  it('turning off cancels them, and the screen re-reads the phone', async () => {
    const { scheduler } = phone('granted', true, { intervalMinutes: 120, startHour: 9, endHour: 21 });
    const vm = new WaterRemindersViewModel(scheduler);
    await vm.load();
    expect(vm.on).toBe(true);
    await vm.turnOff();
    expect(scheduler.clear).toHaveBeenCalledTimes(1);
    expect(vm.on).toBe(false);
  });

  it('the gap and hours stay inside the registry bounds', async () => {
    applyPublicConfig({ settings: { 'wellness.water_reminder_interval_minutes_min': 60, 'wellness.water_reminder_interval_minutes_max': 120, 'wellness.water_reminder_interval_step_minutes': 30 } });
    const vm = new WaterRemindersViewModel(phone('granted').scheduler);
    vm.step('intervalMinutes', 1);
    expect(vm.draft.intervalMinutes).toBe(120);
    expect(vm.canStep('intervalMinutes', 1)).toBe(false);
    vm.step('intervalMinutes', 1);
    expect(vm.draft.intervalMinutes).toBe(120);
    vm.draft = { ...vm.draft, startHour: 10, endHour: 10 };
    expect(vm.canStep('startHour', 1)).toBe(false);
    expect(vm.canStep('endHour', -1)).toBe(false);
  });

  it('a phone that fails to schedule is reported, and only what it has is shown', async () => {
    const { scheduler } = phone('granted');
    scheduler.set.mockRejectedValueOnce(new Error('os'));
    const vm = new WaterRemindersViewModel(scheduler);
    await vm.load();
    await vm.save();
    expect(vm.failed).toBe(true);
    expect(vm.on).toBe(false);
  });
});

describe('medicine reminder slots', () => {
  it('read their clock times from the settings registry', () => {
    applyPublicConfig({ settings: { 'meds.reminder_minute_morning': 7 * 60 + 30 } });
    expect(slotTime('morning')).toEqual({ hour: 7, minute: 30 });
    expect(slotTime('night')).toEqual({ hour: Math.floor(getSetting('meds.reminder_minute_night') / 60), minute: getSetting('meds.reminder_minute_night') % 60 });
  });
});
