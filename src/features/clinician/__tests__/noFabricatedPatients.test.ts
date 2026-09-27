import { describe, expect, it, vi } from 'vitest';

/**
 * The clinician console is reachable in a production build, and it opened on
 * `initialClinicianPatients` — a fabricated patient with a name, a blood
 * group, vitals, lab values in a timeline, current medications and drug
 * interactions, none of it marked as invented.
 *
 * DESIGN.md section 6: no invented numbers, no demo content in production
 * builds. These pin both halves of the fix.
 */

async function storeWith(dev: boolean) {
  vi.resetModules();
  vi.doMock('@/core/env', () => ({
    isDev: () => dev,
    apiBaseUrl: () => '/api',
    allowOfflineAuth: () => false,
  }));
  const { ClinicianStore } = await import('../store/ClinicianStore');
  return new ClinicianStore();
}

describe('a production build shows no sample patients', () => {
  it('opens with an empty patient list', async () => {
    const store = await storeWith(false);
    expect(store.clinicianPatients).toEqual([]);
    expect(store.isSample).toBe(false);
  });

  it('selects nobody, so no fabricated record can be opened', async () => {
    const store = await storeWith(false);
    expect(store.selectedPatientId).toBe('');
  });
});

describe('development keeps the sample, and says so', () => {
  it('loads the sample list', async () => {
    const store = await storeWith(true);
    expect(store.clinicianPatients.length).toBeGreaterThan(0);
  });

  it('flags it as a sample rather than passing it off as records', async () => {
    const store = await storeWith(true);
    expect(store.isSample).toBe(true);
  });
});

describe('real records replace the sample', () => {
  it('clears the sample flag once real patients arrive', async () => {
    const store = await storeWith(true);
    store.setClinicianPatients([
      { id: 'REAL-1', name: 'A Patient' } as never,
    ]);
    expect(store.isSample).toBe(false);
    expect(store.selectedPatientId).toBe('REAL-1');
  });

  it('does not leave a selection pointing at a patient that is gone', async () => {
    // Selecting a stale id would render the previous patient's chart under the
    // new list's heading.
    const store = await storeWith(true);
    store.setClinicianPatients([{ id: 'REAL-1', name: 'A' } as never]);
    store.setClinicianPatients([{ id: 'REAL-2', name: 'B' } as never]);
    expect(store.selectedPatientId).toBe('REAL-2');
  });

  it('keeps a still-valid selection', async () => {
    const store = await storeWith(true);
    store.setClinicianPatients([
      { id: 'REAL-1', name: 'A' } as never,
      { id: 'REAL-2', name: 'B' } as never,
    ]);
    store.setSelectedPatientId('REAL-2');
    store.setClinicianPatients([
      { id: 'REAL-1', name: 'A' } as never,
      { id: 'REAL-2', name: 'B' } as never,
    ]);
    expect(store.selectedPatientId).toBe('REAL-2');
  });
});
