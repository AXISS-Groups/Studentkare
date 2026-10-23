import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

const answers: Record<string, unknown> = {
  '/appointments': { items: [
    { id: 'apt_cefa1234', catalogItemId: 'demo-general-consult', providerId: 'doc', slotStart: '2099-01-05T10:00:00+05:30', slotEnd: '2099-01-05T10:30:00+05:30', status: 'REQUESTED', createdAt: 1, serviceName: 'General Physician Teleconsultation' },
    { id: 'apt_dead5678', catalogItemId: 'gone', providerId: 'doc', slotStart: '2099-01-06T10:00:00+05:30', slotEnd: '2099-01-06T10:30:00+05:30', status: 'REQUESTED', createdAt: 1, serviceName: '' },
  ] },
  '/notifications/preferences': {},
};
vi.mock('@/data/services/http', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/data/services/http')>()),
  apiRequest: vi.fn(async (path: string) => answers[path]),
}));
vi.mock('@/data/contexts/AuthContext', () => ({ useAuth: () => ({ user: { id: 's1', fullName: 'Asha', role: 'STUDENT' } }) }));

import { AppointmentsPanel } from '../AppointmentsPanel';

describe('AppointmentsPanel (live-run audit #13)', () => {
  it('names the booked service on the card, and falls back to the reference only when unknown', async () => {
    render(<AppointmentsPanel />);
    expect(await screen.findByText('General Physician Teleconsultation')).toBeInTheDocument();
    expect(screen.queryByText(/APT_CEFA/)).toBeNull();
    expect(screen.getByText(/APT_DEAD/)).toBeInTheDocument();
  });
});
