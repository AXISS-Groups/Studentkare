import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ClinicianTodayViewModel } from '../ClinicianTodayViewModel';
import { sampleTodaySource, unconnectedTodaySource } from '../todaySource';
import type { ClinicianTodaySource } from '../todaySource';
import type { TodayData } from '../todayModel';
import { countdown, countdownLabel, daySummary, formalName, greeting, initialsOf } from '../todayModel';

const NOW = new Date('2026-09-24T09:46:00');

async function day(): Promise<TodayData> {
  const data = await sampleTodaySource.load();
  if (!data) throw new Error('sample must load');
  return { ...data, next: data.next ? { ...data.next, startsAt: new Date(NOW.getTime() + 14 * 60_000) } : null };
}

function sourceOf(data: TodayData | null, extra: Partial<ClinicianTodaySource> = {}): ClinicianTodaySource {
  return { load: () => Promise.resolve(data), ...extra };
}

describe('ClinicianTodayViewModel', () => {
  it('starts loading and becomes ready with a day', async () => {
    const vm = new ClinicianTodayViewModel(sourceOf(await day()), () => NOW);
    expect(vm.status).toBe('loading');
    await vm.load();
    expect(vm.status).toBe('ready');
    expect(vm.summary).toBe('5 consults · 2 camp hours · 1 break');
  });

  it('is unconnected — not empty, not sample — when the source has nothing behind it', async () => {
    const vm = new ClinicianTodayViewModel(unconnectedTodaySource, () => NOW);
    await vm.load();
    expect(vm.status).toBe('unconnected');
    expect(vm.data).toBeNull();
  });

  it('is empty when connected but nothing is booked', async () => {
    const vm = new ClinicianTodayViewModel(sourceOf({ ...(await day()), slots: [], next: null }), () => NOW);
    await vm.load();
    expect(vm.status).toBe('empty');
  });

  it('shows the error state when the load fails, and recovers on retry', async () => {
    const load = vi.fn<() => Promise<TodayData | null>>().mockRejectedValueOnce(new Error('down')).mockResolvedValueOnce(await day());
    const vm = new ClinicianTodayViewModel({ load }, () => NOW);
    await vm.load();
    expect(vm.status).toBe('error');
    await vm.load();
    expect(vm.status).toBe('ready');
  });

  it('counts down to the next consult', async () => {
    let clock = NOW;
    const vm = new ClinicianTodayViewModel(sourceOf(await day()), () => clock);
    await vm.load();
    expect(vm.countdownText).toBe('00:14:00');
    expect(vm.countdownSpoken).toBe('14 minutes until start');
    clock = new Date(NOW.getTime() + 61_000);
    vm.tick();
    expect(vm.countdownText).toBe('00:12:59');
  });

  describe('availability', () => {
    it('changes only after the source accepts it, and says so', async () => {
      const setAvailability = vi.fn(() => Promise.resolve());
      const vm = new ClinicianTodayViewModel(sourceOf(await day(), { setAvailability }), () => NOW);
      await vm.load();
      await vm.toggleAvailability();
      expect(setAvailability).toHaveBeenCalledWith('paused');
      expect(vm.data?.availability).toBe('paused');
      expect(vm.toast).toBe('Paused — no new bookings');
    });

    it('stays where it was when the change fails', async () => {
      const vm = new ClinicianTodayViewModel(sourceOf(await day(), { setAvailability: () => Promise.reject(new Error('no')) }), () => NOW);
      await vm.load();
      await vm.toggleAvailability();
      expect(vm.data?.availability).toBe('taking');
      expect(vm.toast).toMatch(/Nothing changed/);
      expect(vm.availabilityBusy).toBe(false);
    });

    it('cannot be changed when the source has no way to set it', async () => {
      const vm = new ClinicianTodayViewModel(sourceOf(await day()), () => NOW);
      await vm.load();
      expect(vm.canChangeAvailability).toBe(false);
      await vm.toggleAvailability();
      expect(vm.data?.availability).toBe('taking');
    });
  });

  describe('clock', () => {
    beforeEach(() => { vi.useFakeTimers(); });
    afterEach(() => { vi.useRealTimers(); });

    it('ticks every second until stopped', () => {
      const now = vi.fn(() => NOW);
      const vm = new ClinicianTodayViewModel(unconnectedTodaySource, now);
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
    expect(greeting(new Date('2026-09-24T09:00:00'))).toBe('Good morning');
    expect(greeting(new Date('2026-09-24T13:00:00'))).toBe('Good afternoon');
    expect(greeting(new Date('2026-09-24T19:00:00'))).toBe('Good evening');
  });

  it('names the doctor formally, with or without the title', () => {
    expect(formalName('Dr. Sameer Menon')).toBe('Dr. Menon');
    expect(formalName('Sameer Menon')).toBe('Dr. Menon');
    expect(initialsOf('Dr. Sameer Menon')).toBe('SM');
    expect(initialsOf('Rohan')).toBe('R');
  });

  it('formats the countdown and never goes negative', () => {
    expect(countdown(14 * 60_000)).toBe('00:14:00');
    expect(countdown(-5000)).toBe('00:00:00');
    expect(countdownLabel(0)).toBe('Due to start now');
    expect(countdownLabel(90 * 60_000)).toBe('1 hour 30 minutes until start');
  });

  it('summarises the day from its slots, not from a stated number', () => {
    expect(daySummary({ slots: [], campHours: 0 })).toBe('0 consults');
  });
});
