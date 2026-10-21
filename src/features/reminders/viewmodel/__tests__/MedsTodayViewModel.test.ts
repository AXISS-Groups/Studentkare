import { describe, expect, it } from 'vitest';
import { ApiError } from '@/data/services/http';
import { fakeRequest } from '@/features/phoneKit/__tests__/fixtures';
import { MedsTodayViewModel, dayDone, openUndo } from '../MedsTodayViewModel';
import type { MedsToday, MedsTodayPlan } from '../MedsTodayViewModel';

const NOW = Date.parse('2026-10-21T06:00:00Z');
const plan = (over: Partial<MedsTodayPlan> = {}): MedsTodayPlan => ({
  planId: 'med_1', name: 'Iron', dosage: '1 tablet', dosesPlanned: 2, dosesTaken: 0, dosesSkipped: 0, nextSlot: 1, undo: null, ...over,
});
const day = (plans: MedsTodayPlan[]): MedsToday => ({ date: '2026-10-21', timezone: 'Asia/Kolkata', plans });
const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

/** A small server: one plan, logs and undo as /meds/* does. */
function server(start: MedsTodayPlan) {
  let current = { ...start };
  const { request, calls } = fakeRequest({
    '/meds/today': () => day([current]),
    'POST /meds/log-dose': () => {
      current = { ...current, dosesTaken: current.dosesTaken + 1, undo: { doseId: 'dose_t', undoUntil: new Date(NOW + 30 * 60_000).toISOString(), outcome: 'TAKEN' } };
      return { status: 'SUCCESS', already_logged: false, code: 'DOSE_RECORDED', doseId: 'dose_t' };
    },
    'POST /meds/skip-dose': () => {
      current = { ...current, dosesSkipped: (current.dosesSkipped ?? 0) + 1, undo: { doseId: 'dose_s', undoUntil: new Date(NOW + 30 * 60_000).toISOString(), outcome: 'SKIPPED' } };
      return { status: 'SUCCESS', already_logged: false, code: 'DOSE_SKIPPED', doseId: 'dose_s' };
    },
    'DELETE /meds/doses/': (path: string) => {
      const skipped = path.endsWith('dose_s');
      current = { ...current, dosesTaken: current.dosesTaken - (skipped ? 0 : 1), dosesSkipped: (current.dosesSkipped ?? 0) - (skipped ? 1 : 0), undo: null };
      return { success: true };
    },
  });
  return { request, calls, plan: () => current };
}

describe('MedsTodayViewModel', () => {
  it('names and doses come from the server; taken posts the plan id only', async () => {
    const s = server(plan());
    const vm = new MedsTodayViewModel(s.request);
    vm.load();
    await flush();
    expect(vm.plans.map((p) => [p.name, p.dosage])).toEqual([['Iron', '1 tablet']]);
    vm.tick(NOW);
    await vm.take('med_1');
    const post = s.calls.find((c) => c.path === '/meds/log-dose');
    expect(JSON.parse(String(post?.init?.body))).toEqual({ medId: 'med_1' });
    expect(vm.plans[0].dosesTaken).toBe(1);
    expect(vm.status).toEqual({ key: 'm2r.meds.takenStatus', vars: { name: 'Iron' } });
  });

  it('skip is recorded as skipped, never as taken, and can be undone', async () => {
    const s = server(plan({ dosesPlanned: 1 }));
    const vm = new MedsTodayViewModel(s.request);
    vm.load();
    await flush();
    await vm.skip('med_1');
    expect(s.calls.some((c) => c.path === '/meds/skip-dose')).toBe(true);
    expect(vm.plans[0]).toMatchObject({ dosesTaken: 0, dosesSkipped: 1 });
    expect(dayDone(vm.plans[0])).toBe(true);
    vm.tick(NOW);
    expect(vm.undoFor(vm.plans[0])?.outcome).toBe('SKIPPED');
    await vm.undo('med_1');
    expect(s.calls.some((c) => c.path === '/meds/doses/dose_s' && c.init?.method === 'DELETE')).toBe(true);
    expect(vm.plans[0]).toMatchObject({ dosesTaken: 0, dosesSkipped: 0 });
  });

  it('undo is offered only until the server’s undoUntil (the meds.dose_undo_minutes window)', () => {
    const p = plan({ undo: { doseId: 'd', undoUntil: new Date(NOW + 60_000).toISOString(), outcome: 'TAKEN' } });
    expect(openUndo(p, NOW)).not.toBeNull();
    expect(openUndo(p, NOW + 61_000)).toBeNull();
    const vm = new MedsTodayViewModel(fakeRequest({}).request);
    vm.tick(NOW + 61_000);
    expect(vm.undoFor(p)).toBeNull();
  });

  it('a plan without a count is one log a day; nothing is invented', () => {
    const free = plan({ dosesPlanned: null, nextSlot: null });
    expect(dayDone(free)).toBe(false);
    expect(dayDone({ ...free, dosesTaken: 1 })).toBe(true);
    const vm = new MedsTodayViewModel(fakeRequest({}).request);
    vm.today.set(day([free]));
    expect(vm.left).toBeNull();
    vm.today.set(day([plan({ dosesPlanned: 3, dosesTaken: 1, dosesSkipped: 1 }), free]));
    expect(vm.left).toBe(1);
  });

  it('offline: refuses with a reason and queues nothing', async () => {
    const s = server(plan());
    const vm = new MedsTodayViewModel(s.request);
    vm.load();
    await flush();
    vm.setOnline(false);
    expect(vm.canAct(vm.plans[0])).toBe(false);
    await vm.take('med_1');
    await vm.skip('med_1');
    expect(s.calls.filter((c) => c.init?.method === 'POST')).toEqual([]);
    expect(vm.error).toEqual({ planId: 'med_1', said: { key: 'm2r.meds.offlineAction' } });
  });

  it('a refused undo shows the server’s coded message and re-reads what the server has', async () => {
    const { request, calls } = fakeRequest({
      '/meds/today': day([plan({ dosesTaken: 1, undo: { doseId: 'd1', undoUntil: new Date(Date.now() + 60_000).toISOString(), outcome: 'TAKEN' } })]),
      'DELETE /meds/doses/': () => { throw new ApiError('late', 409, { code: 'DOSE_UNDO_TOO_LATE', message: 'late', values: { minutes: 30 } }); },
    });
    const vm = new MedsTodayViewModel(request);
    vm.load();
    await flush();
    await vm.undo('med_1');
    expect(vm.error).toEqual({ planId: 'med_1', said: { key: 'wellness.msg.DOSE_UNDO_TOO_LATE', vars: { minutes: 30 } } });
    expect(calls.filter((c) => c.path === '/meds/today').length).toBe(2);
  });
});
