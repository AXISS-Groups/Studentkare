import { beforeEach, describe, expect, it, vi } from 'vitest';
import { agentApi } from '@/data/api';
import { ClinicianViewModel } from '../viewmodel/ClinicianViewModel';
import { ClinicianStore } from '../store/ClinicianStore';

vi.mock('@/data/api', () => ({ agentApi: { clinicalAssist: vi.fn() } }));
const assist = vi.mocked(agentApi.clinicalAssist);

/** Replace the method outright: a throw recorded by a vi.fn is re-reported by
 *  the runner as a test failure even once refreshCdss has caught it. */
function goOffline(): void {
  (agentApi as { clinicalAssist: unknown }).clinicalAssist = () => {
    throw new Error('offline');
  };
}

/**
 * A clinician acts on these suggestions. The console labels them "M18", but
 * when that service cannot be reached a local rules evaluation stands in. The
 * fallback is right; presenting it as the service's output is not.
 */
function viewModel(): ClinicianViewModel {
  return new ClinicianViewModel(new ClinicianStore());
}

beforeEach(() => {
  (agentApi as { clinicalAssist: unknown }).clinicalAssist = assist;
  assist.mockReset();
});

describe('where the suggestions came from', () => {
  it('starts as local, because nothing has been fetched yet', () => {
    assist.mockResolvedValue(null as never);
    expect(viewModel().cdssSource).toBe('local');
  });

  it('is the service once the service answers', async () => {
    const vm = viewModel();
    assist.mockResolvedValue({ differentialDiagnoses: [], redFlags: [] } as never);
    await vm.refreshCdss();
    expect(vm.cdssSource).toBe('service');
  });

  it('stays local when the service cannot be reached', async () => {
    // The old catch kept the local evaluation silently, so the screen went on
    // calling it M18.
    const vm = viewModel();
    goOffline();
    await vm.refreshCdss();
    expect(vm.cdssSource).toBe('local');
  });

  it('stays local when the service answers with nothing', async () => {
    const vm = viewModel();
    assist.mockResolvedValue(null as never);
    await vm.refreshCdss();
    expect(vm.cdssSource).toBe('local');
  });

  it('never leaves a stale service label on a local evaluation', async () => {
    const vm = viewModel();
    assist.mockResolvedValue({ differentialDiagnoses: [], redFlags: [] } as never);
    await vm.refreshCdss();
    expect(vm.cdssSource).toBe('service');

    goOffline();
    await vm.refreshCdss();
    expect(vm.cdssSource).toBe('local');
  });

  it('keeps showing an evaluation rather than nothing when the service fails', async () => {
    // Failing closed here would blank a clinician's screen mid-consult. The
    // local rules still run; they are just named honestly.
    const vm = viewModel();
    goOffline();
    await vm.refreshCdss();
    expect(vm.cdssData).toBeDefined();
  });
});
