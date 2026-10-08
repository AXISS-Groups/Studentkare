import { describe, expect, it, vi } from 'vitest';
import { LeaveCampusViewModel, isRealDate } from '../LeaveCampusViewModel';
import type { DepartureState } from '../LeaveCampusViewModel';
import { ApiError } from '@/data/http';

type Requester = typeof import('@/data/http').apiRequest;

const linked: DepartureState = {
  departure: null, campus: { university: 'IIT Hyderabad', status: 'VERIFIED' },
  collegePlan: null, signsInWithCollegeEmail: false, today: '2026-10-08',
};

function vmWith(get: () => Promise<unknown>, post?: (path: string, body: unknown) => Promise<unknown>) {
  const calls: Array<{ path: string; body: unknown }> = [];
  const request = vi.fn(async (path: string, init?: RequestInit) => {
    if (init?.method === 'POST') {
      const body = init.body ? JSON.parse(String(init.body)) : null;
      calls.push({ path, body });
      return post ? post(path, body) : {};
    }
    return get();
  }) as unknown as Requester;
  return { vm: new LeaveCampusViewModel(request), calls };
}

describe('LeaveCampusViewModel', () => {
  it('shows the right stage for each server state', async () => {
    const cases: Array<[DepartureState, string]> = [
      [linked, 'form'],
      [{ ...linked, campus: null }, 'notLinked'],
      [{ ...linked, departure: { id: 'd', university: 'X', reason: 'GRADUATING', destination: null, effectiveOn: '2027-05-31', status: 'SCHEDULED' } }, 'scheduled'],
      [{ ...linked, campus: null, departure: { id: 'd', university: 'X', reason: 'PAUSING', destination: null, effectiveOn: '2026-10-08', status: 'COMPLETED' } }, 'completed'],
    ];
    for (const [state, stage] of cases) {
      const { vm } = vmWith(() => Promise.resolve(state));
      await vm.load();
      expect(vm.stage).toBe(stage);
    }
  });

  it('fails visibly when the state cannot be read', async () => {
    const { vm } = vmWith(() => Promise.reject(new Error('offline')));
    await vm.load();
    expect(vm.stage).toBe('failed');
  });

  it('needs a real, non-past date to graduate or transfer, and none for a break', async () => {
    const { vm } = vmWith(() => Promise.resolve(linked));
    await vm.load();
    vm.setReason('PAUSING');
    expect(vm.canSubmit).toBe(true);
    vm.setReason('GRADUATING');
    expect(vm.canSubmit).toBe(false);
    vm.setEffectiveOn('2026-02-30');
    expect(vm.dateError).not.toBe('');
    vm.setEffectiveOn('2026-10-01');
    expect(vm.dateError).toMatch(/passed/);
    vm.setEffectiveOn('2027-05-31');
    expect(vm.canSubmit).toBe(true);
  });

  it('sends only what the server needs, and shows the server reason on refusal', async () => {
    const { vm, calls } = vmWith(
      () => Promise.resolve(linked),
      () => Promise.reject(new ApiError("You've already told us you're leaving.", 409)),
    );
    await vm.load();
    vm.setReason('PAUSING');
    vm.setEffectiveOn('2027-01-01');
    vm.setDestination('CBIT');
    await vm.submit();
    expect(calls[0].body).toEqual({ reason: 'PAUSING' });
    expect(vm.error).toMatch(/already told us/);
  });

  it('checks dates for real', () => {
    expect(isRealDate('2028-02-29')).toBe(true);
    expect(isRealDate('2027-02-29')).toBe(false);
    expect(isRealDate('27-05-31')).toBe(false);
  });
});
