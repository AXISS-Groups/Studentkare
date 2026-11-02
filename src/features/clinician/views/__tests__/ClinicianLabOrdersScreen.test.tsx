import React, { StrictMode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { DoctorLabOrderViewModel } from '../../viewmodel/DoctorLabOrderViewModel';
import { ClinicianLabOrdersScreen } from '../ClinicianLabOrdersScreen';

vi.mock('@/data/contexts/AuthContext', () => ({ useAuth: () => ({ user: { id: 'doc', fullName: 'Dr Rao', role: 'NMC_DOCTOR' }, logout: vi.fn() }) }));
vi.mock('@/data/services/http', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/data/services/http')>()),
  apiRequest: vi.fn(() => Promise.reject(new Error('not in this test'))),
}));
vi.mock('@/lib/utils/workflowRouting', () => ({ navigate: vi.fn() }));

const answers: Record<string, unknown> = {
  '/work/appointments': { items: [{ id: 'a1', patientId: 'pt-1', customer: 'Priya S.', status: 'CONFIRMED', slotStart: '2026-10-22T10:00:00+05:30' }] },
  '/work/lab-tests': { items: [{ id: 'cbc', name: 'Complete Blood Count', labName: 'Demo Lab', preparation: '', homeCollection: false }] },
  '/work/doctor-lab-orders': { items: [] },
};
const request = vi.fn(async (path: string) => answers[path]) as unknown as ConstructorParameters<typeof DoctorLabOrderViewModel>[0];

describe('ClinicianLabOrdersScreen under StrictMode (live-run audit #5)', () => {
  it('fills the patient and test lists after the double effect run', async () => {
    const source = { load: async () => ({ stats: [], rows: [] }) };
    render(<StrictMode><ClinicianLabOrdersScreen source={source as never} orderViewModel={new DoctorLabOrderViewModel(request)} /></StrictMode>);
    fireEvent.click((await screen.findAllByRole('button', { name: 'Order test' }))[0]);
    const dialog = await screen.findByRole('dialog');
    expect(await within(dialog).findByRole('option', { name: 'Priya S.' })).toBeInTheDocument();
    expect(within(dialog).getByRole('option', { name: 'Complete Blood Count' })).toBeInTheDocument();
  });
});
