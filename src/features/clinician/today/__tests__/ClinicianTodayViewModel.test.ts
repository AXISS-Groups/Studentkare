import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ClinicianTodayViewModel } from '../ClinicianTodayViewModel';
import { bookingsTodaySource } from '../todaySource';
import type { ClinicianTodaySource } from '../todaySource';
import type { TodayData } from '../todayModel';
import { countdown, countdownSpoken, dayCounts, greetingKey, initialsOf, isQuietDay, surname } from '../todayModel';
import { bookingsFor } from '../../queue/__tests__/queueFixture';
import { fullDay } from './todayFixture';

const NOW = new Date(2026, 8, 24, 9, 46);

function sourceOf(data: TodayData | null, extra: Partial<ClinicianTodaySource> = {}): ClinicianTodaySource {
  return { load: () => Promise.resolve(data), ...extra };
}

describe('bookingsTodaySource', () => {
  it('builds the day from bookings and leaves what the API does not report empty', async () => {
    const data = await bookingsTodaySource(async () => bookingsFor(NOW), { critical: async () => 1, reports: async () => null }, () => NOW).load();
    expect(data?.slots.map((slot) => [slot.time, slot.kind])).toEqual([['09:30', 'done'], ['10:00', 'next'], ['10:20', 'requested'], ['11:30', 'missed']]);
    expect(data?.next).toMatchObject({ appointmentId: 'b2', patientName: 'Rohan Varma', recordsShared: null });
    expect(data?.waiting).toEqual({ criticalResults: { count: 1 }, reportsToSign: { count: null }, followUps: { count: null }, renewals: { count: null } });
    expect(data).toMatchObject({ campHours: null, camp: null, availability: null, queueOpensAt: '09:30' });
  });

  it('has no next consult once every confirmed booking has ended', async () => {
    const late = new Date(2026, 8, 24, 18, 0);
    const data = await bookingsTodaySource(async () => bookingsFor(late), { critical: async () => 0, reports: async () => 0 }, () => late).load();
    expect(data?.next).toBeNull();
    expect(data?.slots.find((slot) => slot.title === 'Rohan Varma')?.kind).toBe('booked');
  });

  it('fails the page only when the bookings fail, not a count', async () => {
    const source = bookingsTodaySource(() => Promise.reject(new Error('down')), { critical: async () => 0, reports: async () => 0 }, () => NOW);
    await expect(source.load()).rejects.toThrow('down');
  });
});

describe('ClinicianTodayViewModel', () => {
  it('starts loading and becomes ready with a day', async () => {
    const vm = new ClinicianTodayViewModel(sourceOf(fullDay(NOW)), () => NOW);
    expect(vm.status).toBe('loading');
    await vm.load();
    expect(vm.status).toBe('ready');
  });

  it('is unconnected — not empty, not sample — when the source has nothing behind it', async () => {
    const vm = new ClinicianTodayViewModel(sourceOf(null), () => NOW);
    await vm.load();
    expect(vm.status).toBe('unconnected');
    expect(vm.data).toBeNull();
  });

  it('is empty only when nothing is booked and nothing reported waits', async () => {
    const quiet = { ...fullDay(NOW), slots: [], next: null, waiting: { criticalResults: { count: 0 }, reportsToSign: { count: null }, followUps: { count: null }, renewals: { count: null } } };
    const vm = new ClinicianTodayViewModel(sourceOf(quiet), () => NOW);
    await vm.load();
    expect(vm.status).toBe('empty');
    const busy = new ClinicianTodayViewModel(sourceOf({ ...quiet, waiting: { ...quiet.waiting, criticalResults: { count: 1 } } }), () => NOW);
    await busy.load();
    expect(busy.status).toBe('ready');
  });

  it('shows the error state when the load fails, and recovers on retry', async () => {
    const load = vi.fn<() => Promise<TodayData | null>>().mockRejectedValueOnce(new Error('down')).mockResolvedValueOnce(fullDay(NOW));
    const vm = new ClinicianTodayViewModel({ load }, () => NOW);
    await vm.load();
    expect(vm.status).toBe('error');
    await vm.load();
    expect(vm.status).toBe('ready');
  });

  it('counts down to the next consult', async () => {
    let clock = NOW;
    const vm = new ClinicianTodayViewModel(sourceOf(fullDay(NOW)), () => clock);
    await vm.load();
    expect(vm.countdownText).toBe('00:14:00');
    expect(vm.countdownSpoken).toEqual({ key: 'clinToday.timer.minutes', vars: { minutes: 14 } });
    clock = new Date(NOW.getTime() + 61_000);
    vm.tick();
    expect(vm.countdownText).toBe('00:12:59');
  });

  describe('availability', () => {
    it('changes only after the source accepts it, and says so', async () => {
      const setAvailability = vi.fn(() => Promise.resolve());
      const vm = new ClinicianTodayViewModel(sourceOf(fullDay(NOW), { setAvailability }), () => NOW);
      await vm.load();
      await vm.toggleAvailability();
      expect(setAvailability).toHaveBeenCalledWith('paused');
      expect(vm.data?.availability).toBe('paused');
      expect(vm.toast).toEqual({ key: 'clinToday.toast.paused', ok: true });
    });

    it('stays where it was when the change fails', async () => {
      const vm = new ClinicianTodayViewModel(sourceOf(fullDay(NOW), { setAvailability: () => Promise.reject(new Error('no')) }), () => NOW);
      await vm.load();
      await vm.toggleAvailability();
      expect(vm.data?.availability).toBe('taking');
      expect(vm.toast).toEqual({ key: 'clinToday.toast.failed', ok: false });
      expect(vm.availabilityBusy).toBe(false);
    });

    it('cannot be changed when the source has no way to set it, or availability is unknown', async () => {
      const vm = new ClinicianTodayViewModel(sourceOf(fullDay(NOW)), () => NOW);
      await vm.load();
      expect(vm.canChangeAvailability).toBe(false);
      const unknown = new ClinicianTodayViewModel(sourceOf({ ...fullDay(NOW), availability: null }, { setAvailability: vi.fn() }), () => NOW);
      await unknown.load();
      expect(unknown.canChangeAvailability).toBe(false);
      await unknown.toggleAvailability();
      expect(unknown.data?.availability).toBeNull();
    });
  });

  describe('clock', () => {
    beforeEach(() => { vi.useFakeTimers(); });
    afterEach(() => { vi.useRealTimers(); });

    it('ticks every second until stopped', () => {
      const now = vi.fn(() => NOW);
      const vm = new ClinicianTodayViewModel(sourceOf(null), now);
      const stop = vm.startClock();
      vi.advanceTimersByTime(3000);
      expect(now).toHaveBeenCalledTimes(4);
      stop();
      vi.advanceTimersByTime(3000);
      expect(now).toHaveBeenCalledTimes(4);
    });
  });
});

describe('today helpers', () => {
  it('greets by time of day', () => {
    expect(greetingKey(new Date(2026, 8, 24, 9))).toBe('clinToday.greeting.morning');
    expect(greetingKey(new Date(2026, 8, 24, 13))).toBe('clinToday.greeting.afternoon');
    expect(greetingKey(new Date(2026, 8, 24, 19))).toBe('clinToday.greeting.evening');
  });

  it('takes the surname, with or without the title', () => {
    expect(surname('Dr. Sameer Menon')).toBe('Menon');
    expect(surname('Sameer Menon')).toBe('Menon');
    expect(surname('')).toBe('');
    expect(initialsOf('Dr. Sameer Menon')).toBe('SM');
  });

  it('formats the countdown and never goes negative', () => {
    expect(countdown(14 * 60_000)).toBe('00:14:00');
    expect(countdown(-5000)).toBe('00:00:00');
    expect(countdownSpoken(0)).toEqual({ key: 'clinToday.timer.now' });
    expect(countdownSpoken(90 * 60_000)).toEqual({ key: 'clinToday.timer.hours', vars: { hours: 1, minutes: 30 } });
  });

  it('counts the day from its slots, not from a stated number', () => {
    expect(dayCounts({ slots: [], campHours: null })).toEqual({ consults: 0, campHours: 0, breaks: 0 });
    expect(isQuietDay({ ...fullDay(NOW), slots: [], next: null, waiting: { criticalResults: { count: null }, reportsToSign: { count: null }, followUps: { count: null }, renewals: { count: null } } })).toBe(true);
  });
});
