import { describe, expect, it, vi } from 'vitest';
import { ACTIVITY_LEVELS, PRIMARY_GOALS, SetupQuestionViewModel } from '../SetupQuestionViewModel';
import type { WellnessGoals } from '../SetupQuestionViewModel';

type Requester = typeof import('@/data/services/http').apiRequest;

const EMPTY: WellnessGoals = { primaryGoal: '', activityLevel: '', updatedAt: null };

function server(stored: Partial<WellnessGoals> = {}, { failGet = false, failPatch = false } = {}) {
  const calls: Array<{ path: string; init?: RequestInit }> = [];
  const request = vi.fn(async (path: string, init?: RequestInit) => {
    calls.push({ path, init });
    if (!init?.method) {
      if (failGet) throw new Error('offline');
      return { ...EMPTY, ...stored };
    }
    if (failPatch) throw new Error('offline');
    return { ...EMPTY, ...stored, ...JSON.parse(String(init.body)) };
  }) as unknown as Requester;
  return { request, calls };
}

describe('SetupQuestionViewModel', () => {
  it('offers only neutral goals — no weight, BMI or body target', () => {
    const words = [...PRIMARY_GOALS, ...ACTIVITY_LEVELS].join(' ');
    expect(words).not.toMatch(/WEIGHT|BMI|DIET|CALORIE|FAT|SLIM/);
    expect(PRIMARY_GOALS).toEqual(['STAY_ACTIVE', 'SLEEP_BETTER', 'MANAGE_STRESS', 'BUILD_ROUTINE', 'RECORDS_IN_ONE_PLACE']);
  });

  it('pre-selects nothing the student has not chosen', async () => {
    const { request } = server();
    const vm = new SetupQuestionViewModel('primaryGoal', request);
    expect(vm.loading).toBe(true);
    await vm.load();
    expect(vm.loaded).toBe(true);
    expect(vm.choice).toBeNull();
    expect(vm.canContinue).toBe(false);
  });

  it('shows an answer the student saved before', async () => {
    const { request } = server({ activityLevel: 'SOME_WALKING' });
    const vm = new SetupQuestionViewModel('activityLevel', request);
    await vm.load();
    expect(vm.choice).toBe('SOME_WALKING');
  });

  it('ignores a stored value it does not recognise rather than guessing', async () => {
    const { request } = server({ primaryGoal: 'SOMETHING_NEW' as WellnessGoals['primaryGoal'] });
    const vm = new SetupQuestionViewModel('primaryGoal', request);
    await vm.load();
    expect(vm.choice).toBeNull();
  });

  it('sends only this screen’s answer, so the other answer is never reset', async () => {
    const { request, calls } = server({ primaryGoal: 'MANAGE_STRESS' });
    const vm = new SetupQuestionViewModel('activityLevel', request);
    await vm.load();
    vm.choose('ACTIVE_MOST_DAYS');
    const onDone = vi.fn();
    await vm.save(onDone);
    const patch = calls.find((call) => call.init?.method === 'PATCH');
    expect(patch?.path).toBe('/profile/wellness');
    expect(JSON.parse(String(patch?.init?.body))).toEqual({ activityLevel: 'ACTIVE_MOST_DAYS' });
    expect(onDone).toHaveBeenCalledTimes(1);
  });

  it('does not save without a choice', async () => {
    const { request, calls } = server();
    const vm = new SetupQuestionViewModel('primaryGoal', request);
    await vm.load();
    const onDone = vi.fn();
    await vm.save(onDone);
    expect(calls.some((call) => call.init?.method === 'PATCH')).toBe(false);
    expect(onDone).not.toHaveBeenCalled();
  });

  it('stays on the screen and says so when saving fails', async () => {
    const { request } = server({}, { failPatch: true });
    const vm = new SetupQuestionViewModel('primaryGoal', request);
    await vm.load();
    vm.choose('SLEEP_BETTER');
    const onDone = vi.fn();
    await vm.save(onDone);
    expect(vm.saveFailed).toBe(true);
    expect(vm.saving).toBe(false);
    expect(onDone).not.toHaveBeenCalled();
    vm.choose('STAY_ACTIVE');
    expect(vm.saveFailed).toBe(false);
  });

  it('skip moves on without any request, in every state', async () => {
    const { request, calls } = server({}, { failGet: true });
    const vm = new SetupQuestionViewModel('primaryGoal', request);
    await vm.load();
    expect(vm.loadFailed).toBe(true);
    const before = calls.length;
    const onDone = vi.fn();
    vm.skip(onDone);
    expect(onDone).toHaveBeenCalledTimes(1);
    expect(calls.length).toBe(before);
  });

  it('a failed load can be retried', async () => {
    let fail = true;
    const request = vi.fn(async () => {
      if (fail) throw new Error('offline');
      return EMPTY;
    }) as unknown as Requester;
    const vm = new SetupQuestionViewModel('primaryGoal', request);
    await vm.load();
    expect(vm.loadFailed).toBe(true);
    expect(vm.canContinue).toBe(false);
    fail = false;
    await vm.load();
    expect(vm.loadFailed).toBe(false);
    expect(vm.loaded).toBe(true);
  });

  it('a save that lands after Skip does not move the student twice', async () => {
    let finish: (value: WellnessGoals) => void = () => undefined;
    const request = vi.fn((_path: string, init?: RequestInit) =>
      init?.method ? new Promise<WellnessGoals>((resolve) => { finish = resolve; }) : Promise.resolve(EMPTY),
    ) as unknown as Requester;
    const vm = new SetupQuestionViewModel('primaryGoal', request);
    await vm.load();
    vm.choose('BUILD_ROUTINE');
    const onDone = vi.fn();
    const saving = vm.save(onDone);
    vm.skip(onDone);
    finish(EMPTY);
    await saving;
    expect(onDone).toHaveBeenCalledTimes(1);
  });
});
