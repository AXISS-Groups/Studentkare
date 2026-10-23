import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  createHealthConnectConnector, createHealthKitConnector, createPhoneMotionConnector, dayWindow,
} from '../sources/connectors';
import type { HealthConnectModule, HealthKitModule, MotionPermission, PedometerModule } from '../sources/connectors';
import { connectedProviders, registerHealthSource, syncToday } from '../sources/healthSources';

const NOW = new Date(2026, 9, 21, 15, 0);
const now = () => NOW;
const TODAY = '2026-10-21';
const granted: MotionPermission = { granted: true, canAskAgain: true };
const undetermined: MotionPermission = { granted: false, canAskAgain: true };
const refused: MotionPermission = { granted: false, canAskAgain: false };

afterEach(() => registerHealthSource(null));

function pedometer(over: Partial<PedometerModule> = {}): PedometerModule & { emit: (steps: number) => void; removed: () => boolean } {
  let listener: ((r: { steps: number }) => void) | null = null;
  let removed = false;
  return {
    isAvailableAsync: vi.fn(async () => true),
    getPermissionsAsync: vi.fn(async () => undetermined),
    requestPermissionsAsync: vi.fn(async () => granted),
    getStepCountAsync: vi.fn(async () => ({ steps: 3456 })),
    watchStepCount: vi.fn((cb) => { listener = cb; return { remove: () => { removed = true; listener = null; } }; }),
    emit: (steps) => listener?.({ steps }),
    removed: () => removed,
    ...over,
  };
}

describe('phone motion sensor', () => {
  it('asks nothing when looked at, and reconnects only if the phone already allows it', async () => {
    const p = pedometer();
    const c = createPhoneMotionConnector(p, { now });
    expect(await c.status()).toBe('not_connected');
    expect(p.requestPermissionsAsync).not.toHaveBeenCalled();
    expect(connectedProviders()).toEqual([]);
    (p.getPermissionsAsync as ReturnType<typeof vi.fn>).mockResolvedValue(granted);
    expect(await c.status()).toBe('connected');
    expect(connectedProviders()).toEqual(['phone_motion']);
  });

  it('reads today from midnight to now (iOS day total)', async () => {
    const p = pedometer();
    const c = createPhoneMotionConnector(p, { now });
    expect(await c.connect()).toBe('connected');
    const request = vi.fn().mockResolvedValue({ status: 'SYNCED', provider: 'phone_motion', day: { date: TODAY } });
    await syncToday(request, NOW);
    expect(p.getStepCountAsync).toHaveBeenCalledWith(new Date(2026, 9, 21), NOW);
    expect(JSON.parse(String(request.mock.calls[0][1].body))).toEqual({ provider: 'phone_motion', date: TODAY, steps: 3456 });
  });

  it('permission denied: not registered, says so; refused for good: blocked', async () => {
    const p = pedometer({ requestPermissionsAsync: vi.fn(async () => undetermined) });
    const c = createPhoneMotionConnector(p, { now });
    expect(await c.connect()).toBe('denied');
    expect(connectedProviders()).toEqual([]);
    (p.requestPermissionsAsync as ReturnType<typeof vi.fn>).mockResolvedValue(refused);
    expect(await c.connect()).toBe('blocked');
    expect(connectedProviders()).toEqual([]);
  });

  it('sensor unavailable: never asks, never registers', async () => {
    const p = pedometer({ isAvailableAsync: vi.fn(async () => false) });
    const c = createPhoneMotionConnector(p, { now });
    expect(await c.status()).toBe('unavailable');
    expect(await c.connect()).toBe('unavailable');
    expect(p.requestPermissionsAsync).not.toHaveBeenCalled();
    expect(connectedProviders()).toEqual([]);
  });

  it('Android (no day total): counts live only and never sends a day', async () => {
    const p = pedometer({ getStepCountAsync: undefined });
    const c = createPhoneMotionConnector(p, { now });
    expect(c.readsDayTotal).toBe(false);
    await c.connect();
    const request = vi.fn();
    expect((await syncToday(request, NOW)).status).toBe('no_data');
    expect(request).not.toHaveBeenCalled();
    const seen: number[] = [];
    const stop = c.watchLive?.((n) => seen.push(n)) ?? (() => undefined);
    p.emit(4); p.emit(Number.NaN); p.emit(9);
    stop();
    expect(seen).toEqual([4, 9]);
    expect(p.removed()).toBe(true);
  });

  it('disconnect stops reading for this session even though the phone still allows it', async () => {
    const p = pedometer({ getPermissionsAsync: vi.fn(async () => granted) });
    const c = createPhoneMotionConnector(p, { now });
    expect(await c.status()).toBe('connected');
    c.disconnect();
    expect(connectedProviders()).toEqual([]);
    expect(await c.status()).toBe('not_connected');
  });
});

function healthKit(over: Partial<HealthKitModule> = {}): HealthKitModule {
  return {
    isAvailable: vi.fn(async () => true),
    requestRead: vi.fn(async () => undefined),
    stepCount: vi.fn(async () => 6120),
    distanceMetres: vi.fn(async () => 4300),
    ...over,
  };
}

describe('Apple Health', () => {
  it('connects only from connect(), then reads steps and distance for the local day', async () => {
    const hk = healthKit();
    const c = createHealthKitConnector(hk);
    expect(await c.status()).toBe('not_connected');
    expect(hk.requestRead).not.toHaveBeenCalled();
    expect(await c.connect()).toBe('connected');
    const request = vi.fn().mockResolvedValue({ status: 'SYNCED', provider: 'healthkit', day: { date: TODAY } });
    await syncToday(request, NOW);
    expect(hk.stepCount).toHaveBeenCalledWith(new Date(2026, 9, 21, 12));
    expect(JSON.parse(String(request.mock.calls[0][1].body))).toEqual({ provider: 'healthkit', date: TODAY, steps: 6120, distanceKm: 4.3 });
  });

  it('a zero or failed read is "nothing read", never a count (HealthKit hides a refusal)', async () => {
    const c = createHealthKitConnector(healthKit({ stepCount: vi.fn(async () => 0), distanceMetres: vi.fn(async () => { throw new Error('no'); }) }));
    await c.connect();
    const request = vi.fn();
    expect((await syncToday(request, NOW)).status).toBe('no_data');
    expect(request).not.toHaveBeenCalled();
  });

  it('not on this device (iPad without Health, simulator): unavailable', async () => {
    const hk = healthKit({ isAvailable: vi.fn(async () => false) });
    const c = createHealthKitConnector(hk);
    expect(await c.connect()).toBe('unavailable');
    expect(hk.requestRead).not.toHaveBeenCalled();
  });
});

function healthConnect(over: Partial<HealthConnectModule> = {}): HealthConnectModule {
  return {
    sdkStatus: vi.fn(async () => 'available' as const),
    initialize: vi.fn(async () => true),
    grantedReads: vi.fn(async () => []),
    requestReads: vi.fn(async (types) => types),
    aggregate: vi.fn(async (type) => (type === 'Steps' ? { value: 7001, hasData: true } : { value: 5.2, hasData: true })),
    openSettings: vi.fn(),
    ...over,
  };
}

describe('Health Connect', () => {
  it('reconnects silently when Steps is already granted; reads de-duplicated totals for the day', async () => {
    const hc = healthConnect({ grantedReads: vi.fn(async () => ['Steps' as const]) });
    const c = createHealthConnectConnector(hc, { now });
    expect(await c.status()).toBe('connected');
    expect(hc.requestReads).not.toHaveBeenCalled();
    const request = vi.fn().mockResolvedValue({ status: 'SYNCED', provider: 'health_connect', day: { date: TODAY } });
    await syncToday(request, NOW);
    expect(hc.aggregate).toHaveBeenCalledWith('Steps', new Date(2026, 9, 21), NOW);
    // Distance was not granted, so it is not read or sent.
    expect(JSON.parse(String(request.mock.calls[0][1].body))).toEqual({ provider: 'health_connect', date: TODAY, steps: 7001 });
  });

  it('asks for read access only (Steps, Distance) and says when it was refused', async () => {
    const hc = healthConnect({ requestReads: vi.fn(async () => []) });
    const c = createHealthConnectConnector(hc, { now });
    expect(await c.connect()).toBe('denied');
    expect(hc.requestReads).toHaveBeenCalledWith(['Steps', 'Distance']);
    expect(connectedProviders()).toEqual([]);
    c.openSettings?.();
    expect(hc.openSettings).toHaveBeenCalled();
  });

  it('not installed or out of date: says so and asks nothing', async () => {
    const missing = healthConnect({ sdkStatus: vi.fn(async () => 'unavailable' as const) });
    expect(await createHealthConnectConnector(missing).connect()).toBe('unavailable');
    const old = healthConnect({ sdkStatus: vi.fn(async () => 'update_required' as const) });
    expect(await createHealthConnectConnector(old).status()).toBe('update_required');
    expect(missing.requestReads).not.toHaveBeenCalled();
    expect(old.requestReads).not.toHaveBeenCalled();
  });

  it('no app recorded steps today: nothing is sent (not zero)', async () => {
    const c = createHealthConnectConnector(healthConnect({ aggregate: vi.fn(async () => ({ value: 0, hasData: false })) }), { now });
    await c.connect();
    const request = vi.fn();
    expect((await syncToday(request, NOW)).status).toBe('no_data');
    expect(request).not.toHaveBeenCalled();
  });
});

describe('dayWindow', () => {
  it('caps today at now and refuses a future day', () => {
    expect(dayWindow(TODAY, NOW)).toEqual({ start: new Date(2026, 9, 21), end: NOW });
    expect(dayWindow('2026-10-20', NOW)).toEqual({ start: new Date(2026, 9, 20), end: new Date(2026, 9, 21) });
    expect(dayWindow('2026-10-22', NOW)).toBeNull();
    expect(dayWindow('nonsense', NOW)).toBeNull();
  });
});
