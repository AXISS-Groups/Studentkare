import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '@/data/services/http';
import { STEP_SOURCE_PRIORITY, byPriority, preferredProvider, sourceRank } from '../model/stepSources';
import { connectedProviders, isHealthSourceConnected, readValues, registerHealthSource, syncToday, unregisterHealthSource } from '../sources/healthSources';
import type { SyncedDay } from '../sources/healthSources';
import { failureSaid, todayFrom, weekBars } from '../data/stepsApi';
import type { ActivityTrends } from '../data/stepsApi';

const NOW = new Date(2026, 9, 21, 9, 30);
const day = (steps: number, source: SyncedDay['sources']): SyncedDay => ({
  date: '2026-10-21', steps, distanceKm: null, floors: null, activeEnergyKcal: null, standingMinutes: null, sources: source,
});
const synced = (provider: string, body: SyncedDay) => vi.fn().mockResolvedValue({ status: 'SYNCED', provider, day: body });
const sentBody = (request: ReturnType<typeof vi.fn>) => JSON.parse(String(request.mock.calls[0][1].body)) as Record<string, unknown>;

afterEach(() => registerHealthSource(null));

describe('source priority', () => {
  it('is the server’s order: health store, then the phone sensor, then typed', () => {
    const python = readFileSync(resolve(process.cwd(), 'backend/services/wellness_api.py'), 'utf8');
    const tuple = /SOURCE_PRIORITY: tuple\[str, \.\.\.\] = \(([^)]*)\)/.exec(python)?.[1] ?? '';
    expect(tuple.split(',').map((s) => s.trim().replace(/"/g, '')).filter(Boolean)).toEqual([...STEP_SOURCE_PRIORITY]);
    expect(byPriority(['phone_motion', 'health_connect', 'healthkit'])).toEqual(['healthkit', 'health_connect', 'phone_motion']);
    expect(preferredProvider(['phone_motion', 'healthkit'])).toBe('healthkit');
    expect(preferredProvider([])).toBeNull();
    expect(sourceRank('SOMETHING_OLD')).toBe(STEP_SOURCE_PRIORITY.length);
  });
});

describe('syncing today from several sources', () => {
  it('sends only the most trusted source’s total, never two', async () => {
    const motion = vi.fn(async () => ({ steps: 5200 }));
    registerHealthSource({ provider: 'phone_motion', readDay: motion });
    registerHealthSource({ provider: 'healthkit', readDay: async () => ({ steps: 5100.4, distanceKm: 3.9 }) });
    expect(connectedProviders()).toEqual(['healthkit', 'phone_motion']);
    const request = synced('healthkit', day(5100, { steps: 'HEALTHKIT' }));
    const outcome = await syncToday(request, NOW);
    expect(outcome.status).toBe('synced');
    expect(request).toHaveBeenCalledTimes(1);
    expect(sentBody(request)).toEqual({ provider: 'healthkit', date: '2026-10-21', steps: 5100, distanceKm: 3.9 });
    expect(motion).not.toHaveBeenCalled();
  });

  it('falls back to the phone sensor when the health store has nothing or fails', async () => {
    registerHealthSource({ provider: 'healthkit', readDay: async () => null });
    registerHealthSource({ provider: 'phone_motion', readDay: async () => ({ steps: 812 }) });
    let request = synced('phone_motion', day(812, { steps: 'PHONE_MOTION' }));
    expect(await syncToday(request, NOW)).toMatchObject({ status: 'synced', provider: 'phone_motion' });
    expect(sentBody(request)).toEqual({ provider: 'phone_motion', date: '2026-10-21', steps: 812 });

    registerHealthSource({ provider: 'healthkit', readDay: async () => { throw new Error('denied'); } });
    request = synced('phone_motion', day(812, { steps: 'PHONE_MOTION' }));
    expect(await syncToday(request, NOW)).toMatchObject({ status: 'synced', provider: 'phone_motion' });
  });

  it('reports failed when a read failed and nothing else had data; no_data when nobody had any', async () => {
    registerHealthSource({ provider: 'health_connect', readDay: async () => { throw new Error('revoked'); } });
    registerHealthSource({ provider: 'phone_motion', readDay: async () => null });
    const request = vi.fn();
    expect(await syncToday(request, NOW)).toEqual({ status: 'failed', provider: 'health_connect', date: '2026-10-21' });
    unregisterHealthSource('health_connect');
    expect(isHealthSourceConnected('health_connect')).toBe(false);
    expect(await syncToday(request, NOW)).toEqual({ status: 'no_data', provider: 'phone_motion', date: '2026-10-21' });
    expect(request).not.toHaveBeenCalled();
  });

  it('never invents a value: drops NaN, negatives and infinity, rounds counts', () => {
    expect(readValues({ steps: Number.NaN, distanceKm: -2, floors: Number.POSITIVE_INFINITY })).toEqual({});
    expect(readValues({ steps: 12.6, floors: 3.2, distanceKm: 1.234 })).toEqual({ steps: 13, floors: 3, distanceKm: 1.234 });
  });
});

const WEEK: ActivityTrends = {
  period: 'this_week', timezone: 'Asia/Kolkata', from: '2026-10-19', to: '2026-10-21', daysInPeriod: 3,
  metrics: { steps: { unit: 'steps', total: 9100, dailyAverage: 4550, daysWithData: 2 } },
  days: [
    { ...day(4000, { steps: 'MANUAL' }), date: '2026-10-19' },
    { ...day(5100, { steps: 'HEALTH_CONNECT' }), date: '2026-10-21' },
  ],
};

describe('the week from the server', () => {
  it('gives today with its source and a bar per day, a missing day as no number (not zero)', () => {
    expect(todayFrom(WEEK)).toEqual({ date: '2026-10-21', steps: 5100, source: 'HEALTH_CONNECT' });
    expect(weekBars(WEEK)).toEqual([
      { date: '2026-10-19', steps: 4000, source: 'MANUAL', isToday: false },
      { date: '2026-10-20', steps: null, source: null, isToday: false },
      { date: '2026-10-21', steps: 5100, source: 'HEALTH_CONNECT', isToday: true },
    ]);
    expect(todayFrom({ ...WEEK, days: [] })).toEqual({ date: '2026-10-21', steps: null, source: null });
  });

  it('words a refused save from the server’s code', () => {
    expect(failureSaid(new ApiError('x', 422, { code: 'ACTIVITY_VALUE_OUT_OF_RANGE', values: { min: 0, max: 100000 } })))
      .toEqual({ key: 'wellness.msg.ACTIVITY_VALUE_OUT_OF_RANGE', vars: { min: 0, max: 100000 } });
    expect(failureSaid(new ApiError('Server says no', 500))).toEqual({ raw: 'Server says no' });
    expect(failureSaid(new Error('boom'))).toEqual({ key: 'steps.saveFailed' });
  });
});
