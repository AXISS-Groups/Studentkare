import { afterEach, describe, expect, it, vi } from 'vitest';
import { localDate, registerHealthSource, syncToday, type SyncedDay } from '../healthSync';

const NOW = new Date(2026, 9, 20, 9, 30);
const DAY: SyncedDay = { date: '2026-10-20', steps: 1234, distanceKm: null, floors: null, activeEnergyKcal: null, standingMinutes: null };

afterEach(() => registerHealthSource(null));

describe('healthSync', () => {
  it('reads and sends nothing when no health source is connected', async () => {
    const request = vi.fn();
    await expect(syncToday(request, NOW)).resolves.toEqual({ status: 'not_connected' });
    expect(request).not.toHaveBeenCalled();
  });

  it('sends only the values the platform returned, for the local day', async () => {
    registerHealthSource({ provider: 'healthkit', readDay: async () => ({ steps: 1234 }) });
    const request = vi.fn().mockResolvedValue({ status: 'SYNCED', provider: 'healthkit', day: DAY });
    const outcome = await syncToday(request, NOW);
    expect(outcome).toEqual({ status: 'synced', provider: 'healthkit', date: '2026-10-20', day: DAY });
    expect(request).toHaveBeenCalledTimes(1);
    const [path, init] = request.mock.calls[0];
    expect(path).toBe('/v1/movement/background-sync');
    expect(JSON.parse(String(init.body))).toEqual({ provider: 'healthkit', date: localDate(NOW), steps: 1234 });
  });

  it('sends nothing when the platform has no data or only invalid values', async () => {
    const request = vi.fn();
    registerHealthSource({ provider: 'health_connect', readDay: async () => null });
    expect((await syncToday(request, NOW)).status).toBe('no_data');
    registerHealthSource({ provider: 'health_connect', readDay: async () => ({ steps: Number.NaN, distanceKm: -1 }) });
    expect((await syncToday(request, NOW)).status).toBe('no_data');
    expect(request).not.toHaveBeenCalled();
  });

  it('reports a failed read or upload as failed, never as synced', async () => {
    registerHealthSource({ provider: 'healthkit', readDay: async () => { throw new Error('denied'); } });
    expect((await syncToday(vi.fn(), NOW)).status).toBe('failed');
    registerHealthSource({ provider: 'healthkit', readDay: async () => ({ steps: 10 }) });
    expect((await syncToday(vi.fn().mockRejectedValue(new Error('offline')), NOW)).status).toBe('failed');
  });
});
