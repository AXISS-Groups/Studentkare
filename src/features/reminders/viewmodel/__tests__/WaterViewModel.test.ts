import { afterEach, describe, expect, it } from 'vitest';
import { ApiError } from '@/data/services/http';
import { applyPublicConfig, getSetting, resetPublicConfig } from '@/data/services/config';
import { fakeRequest } from '@/features/phoneKit/__tests__/fixtures';
import { WaterViewModel, waterFill, weekBars } from '../WaterViewModel';
import type { WaterToday } from '../WaterViewModel';

const today = (over: Partial<WaterToday> = {}): WaterToday => ({
  date: '2026-10-21', timezone: 'Asia/Kolkata', consumedMl: 500, goalMl: 2000, goalSource: 'OWNER', percent: 25,
  entries: [{ id: 'w1', amountMl: 250, recordedAt: '2026-10-21T04:00:00+00:00', source: 'MANUAL' }, { id: 'w2', amountMl: 250, recordedAt: '2026-10-21T05:00:00+00:00', source: 'MANUAL' }],
  ...over,
});
const GOAL = { goalMl: 2000, goalSource: 'OWNER', minMl: 500, maxMl: 6000 };
const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

afterEach(() => resetPublicConfig());

describe('WaterViewModel', () => {
  it('logs one glass of the size the settings registry gives, and shows the server’s new total', async () => {
    applyPublicConfig({ settings: { 'wellness.water_glass_ml': 300 } });
    const posted: unknown[] = [];
    const { request } = fakeRequest({
      '/wellness/water/today': today(),
      '/wellness/water/goal': GOAL,
      'POST /wellness/water': (_: string, init?: RequestInit) => { posted.push(JSON.parse(String(init?.body))); return { id: 'w3', ...today({ consumedMl: 800 }) }; },
    });
    const vm = new WaterViewModel(request);
    vm.load();
    await flush();
    await vm.addGlass();
    expect(posted).toEqual([{ amountMl: 300 }]);
    expect(vm.today.data?.consumedMl).toBe(800);
    expect(vm.error).toBeNull();
  });

  it('undo removes the latest glass on the server (never a negative entry)', async () => {
    const { request, calls } = fakeRequest({
      '/wellness/water/today': today(),
      '/wellness/water/goal': GOAL,
      'DELETE /wellness/water/latest': { removedId: 'w2', ...today({ consumedMl: 250, entries: [today().entries[0]] }) },
    });
    const vm = new WaterViewModel(request);
    vm.load();
    await flush();
    expect(vm.canUndo).toBe(true);
    await vm.undo();
    expect(calls.some((c) => c.path === '/wellness/water/latest' && c.init?.method === 'DELETE')).toBe(true);
    expect(calls.some((c) => c.init?.method === 'POST')).toBe(false);
    expect(vm.today.data?.consumedMl).toBe(250);
  });

  it('cannot undo when nothing is logged today', async () => {
    const { request, calls } = fakeRequest({ '/wellness/water/today': today({ consumedMl: 0, entries: [] }), '/wellness/water/goal': GOAL });
    const vm = new WaterViewModel(request);
    vm.load();
    await flush();
    expect(vm.canUndo).toBe(false);
    await vm.undo();
    expect(calls.filter((c) => c.init?.method === 'DELETE')).toEqual([]);
  });

  it('offline: refuses and says why, and queues nothing for later', async () => {
    const { request, calls } = fakeRequest({ '/wellness/water/today': today(), '/wellness/water/goal': GOAL });
    const vm = new WaterViewModel(request);
    vm.load();
    await flush();
    vm.setOnline(false);
    await vm.addGlass();
    await vm.undo();
    vm.startGoalEdit();
    await vm.saveGoal();
    expect(calls.filter((c) => c.init?.method && c.init.method !== 'GET')).toEqual([]);
    expect(vm.error).toEqual({ key: 'm2r.water.offlineAction' });
    vm.setOnline(true);
    // Coming back online does not replay anything.
    await flush();
    expect(calls.filter((c) => c.init?.method && c.init.method !== 'GET')).toEqual([]);
  });

  it('the goal steps by one glass inside the server’s bounds and saves what the student chose', async () => {
    const sent: unknown[] = [];
    const { request } = fakeRequest({
      '/wellness/water/today': today(),
      '/wellness/water/goal': { goalMl: 750, goalSource: 'OWNER', minMl: 500, maxMl: 1000 },
      'PUT /wellness/water/goal': (_: string, init?: RequestInit) => { sent.push(JSON.parse(String(init?.body))); return { goalMl: 1000, goalSource: 'OWNER', minMl: 500, maxMl: 1000 }; },
    });
    const vm = new WaterViewModel(request);
    vm.load();
    await flush();
    vm.startGoalEdit();
    const glass = getSetting('wellness.water_glass_ml');
    vm.stepGoal(-1);
    expect(vm.goalDraft).toBe(750 - glass);
    expect(vm.canGoalDown).toBe(false);
    vm.stepGoal(-1);
    expect(vm.goalDraft).toBe(750 - glass);
    vm.stepGoal(1);
    vm.stepGoal(1);
    expect(vm.goalDraft).toBe(1000);
    expect(vm.canGoalUp).toBe(false);
    await vm.saveGoal();
    expect(sent).toEqual([{ goalMl: 1000 }]);
    expect(vm.goal.data?.goalMl).toBe(1000);
    expect(vm.goalDraft).toBeNull();
  });

  it('a refusal shows the server’s coded message with its limits, in the student’s words', async () => {
    const { request } = fakeRequest({
      '/wellness/water/today': today(),
      '/wellness/water/goal': GOAL,
      'PUT /wellness/water/goal': () => { throw new ApiError('Choose a daily goal between 500 and 6000 ml.', 422, { code: 'WATER_GOAL_OUT_OF_RANGE', message: 'x', values: { min: 500, max: 6000 } }); },
    });
    const vm = new WaterViewModel(request);
    vm.load();
    await flush();
    vm.startGoalEdit();
    await vm.saveGoal();
    expect(vm.error).toEqual({ key: 'wellness.msg.WATER_GOAL_OUT_OF_RANGE', vars: { min: 500, max: 6000 } });
  });

  it('draws the glass capped at full and leaves unknown days unknown', () => {
    expect(waterFill({ consumedMl: 2400, goalMl: 2000 })).toBe(1);
    expect(waterFill({ consumedMl: 500, goalMl: 2000 })).toBe(0.25);
    expect(weekBars([{ consumedMl: 1000 }, { consumedMl: null }, { consumedMl: 3000 }], 2000)).toEqual([1000 / 3000, null, 1]);
  });
});
