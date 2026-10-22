import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import React from 'react';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { axeViolations, describeViolations } from '@/test/axe';

const navigate = vi.fn();
vi.mock('@/lib/utils/workflowRouting', async (importOriginal) => ({ ...(await importOriginal<typeof import('@/lib/utils/workflowRouting')>()), navigate: (route: string) => navigate(route) }));
const apiRequest = vi.fn<(path: string, init?: RequestInit) => Promise<unknown>>();
vi.mock('@/data/services/http', async (importOriginal) => ({ ...(await importOriginal<typeof import('@/data/services/http')>()), apiRequest: (path: string, init?: RequestInit) => apiRequest(path, init) }));
vi.mock('@/data/contexts/AuthContext', () => ({ useAuth: () => ({ user: { role: 'CAMPUS_ADMIN' } }) }));

import { CONTACTS_PATH, CampusIncidentsScreen, INCIDENTS_PATH, INCIDENTS_POLL_MS } from '../CampusIncidentsScreen';
import type { IncidentAlert } from '../CampusIncidentsScreen';
import { ApiError } from '@/data/services/http';

const NOW = new Date('2026-10-21T10:00:00Z').getTime();
const ago = (minutes: number) => (NOW - minutes * 60000) / 1000;
const alert = (overrides: Partial<IncidentAlert> = {}): IncidentAlert => ({
  id: 's1', status: 'ACTIVE', locationNote: 'Block C · room 214', createdAt: ago(6), acknowledgedAt: null, resolvedAt: null, cancelledAt: null,
  student: { name: 'Asha Rao', hostel: 'C 214' }, ...overrides,
});
const flush = async () => { await act(async () => { for (let i = 0; i < 6; i += 1) await Promise.resolve(); }); };
function serve(items: IncidentAlert[], contacts: { id: string; name: string }[] = [{ id: 'c1', name: 'Main gate' }]) {
  apiRequest.mockImplementation(async (path: string) => (path === INCIDENTS_PATH ? { items } : path === CONTACTS_PATH ? { items: contacts } : {}));
}

beforeEach(() => { vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval', 'Date'] }); vi.setSystemTime(NOW); });
afterEach(() => { vi.useRealTimers(); apiRequest.mockReset(); navigate.mockReset(); });

describe('CampusIncidentsScreen', () => {
  it('shows 108 while loading, before anything arrives', () => {
    apiRequest.mockReturnValue(new Promise(() => undefined));
    render(<CampusIncidentsScreen />);
    expect(screen.getByRole('status', { name: 'Loading incidents' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Call 108 ambulance', description: 'Call 108, the ambulance service' })).toHaveAttribute('href', 'tel:108');
  });

  it('sorts SOS alerts into New, Acknowledged and Resolved; Dispatched says it is not tracked', async () => {
    serve([alert(), alert({ id: 's2', status: 'ACKNOWLEDGED', acknowledgedAt: ago(2), createdAt: ago(18), locationNote: null }), alert({ id: 's3', status: 'RESOLVED', resolvedAt: ago(60), createdAt: ago(190) }), alert({ id: 's4', status: 'CANCELLED', cancelledAt: ago(30), createdAt: ago(40) })]);
    const { container } = render(<CampusIncidentsScreen />);
    await flush();
    const column = (name: string) => screen.getByRole('region', { name: new RegExp(`^${name}`) });
    expect(within(column('New')).getAllByRole('button')).toHaveLength(1);
    expect(within(column('Acknowledged')).getAllByRole('button')).toHaveLength(1);
    expect(within(column('Resolved')).getAllByRole('button')).toHaveLength(2);
    expect(column('Dispatched')).toHaveTextContent('Dispatch isn’t tracked yet.');
    // Cards never carry the student's name or a condition.
    expect(within(screen.getByRole('region', { name: 'Incident board' })).queryByText(/Asha Rao/)).toBeNull();
    expect(within(column('New')).getByRole('button')).toHaveTextContent('SOS from a student');
    expect(within(column('New')).getByRole('button')).toHaveTextContent('6 min');
    expect(within(column('Acknowledged')).getByRole('button')).toHaveTextContent('C 214');
    expect(within(column('Resolved')).getAllByRole('button')[0]).toHaveTextContent('3 h');
    expect(screen.getByText('Security contacts: Main gate')).toBeInTheDocument();
    const violations = await axeViolations(container);
    expect(violations, describeViolations(violations)).toEqual([]);
  });

  it('opens an incident panel with the responder detail and sends acknowledge/close to the SOS desk', async () => {
    serve([alert()]);
    render(<CampusIncidentsScreen />);
    await flush();
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: /Open incident: SOS from a student, Block C · room 214, 6 min/ })); });
    const panel = screen.getByRole('dialog', { name: 'SOS from Asha Rao' });
    expect(panel).toHaveAttribute('aria-modal', 'true');
    expect(within(panel).getByRole('link', { name: 'Call 108 ambulance', description: 'Call 108, the ambulance service' })).toHaveAttribute('href', 'tel:108');
    expect(within(panel).getByRole('button', { name: /Send medical officer/ })).toBeDisabled();
    expect(within(panel).getByRole('button', { name: /Hostel visit/ })).toBeDisabled();
    fireEvent.click(within(panel).getByRole('button', { name: 'Emergency card' }));
    expect(navigate).toHaveBeenCalledWith('campus-break-glass');
    fireEvent.click(within(panel).getByRole('button', { name: 'Acknowledge or close in SOS alerts' }));
    expect(navigate).toHaveBeenCalledWith('campus/sos');
    // This board never acknowledges or resolves on its own.
    expect(apiRequest.mock.calls.some(([, init]) => init?.method === 'POST')).toBe(false);
  });

  it('shows an honest empty state that covers SOS only', async () => {
    serve([], []);
    render(<CampusIncidentsScreen />);
    await flush();
    expect(screen.getByRole('heading', { name: 'No open SOS alerts.' })).toBeInTheDocument();
    expect(document.body.textContent).toMatch(/covers students’ SOS only/);
    expect(screen.getByText('No security contacts set up')).toBeInTheDocument();
  });

  it('fails calmly with a reference and retry, and 108 stays on the page', async () => {
    apiRequest.mockImplementation(async (path: string) => { if (path === INCIDENTS_PATH) throw new ApiError('down', 503); return { items: [] }; });
    render(<CampusIncidentsScreen />);
    await flush();
    expect(screen.getByRole('alert')).toHaveTextContent('Couldn’t load incidents');
    expect(screen.getByRole('alert')).toHaveTextContent('Ref ERR-503 · CampusIncidents');
    expect(screen.getByRole('link', { name: 'Call 108 ambulance', description: 'Call 108, the ambulance service' })).toBeInTheDocument();
    serve([alert()]);
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Try again' })); });
    await flush();
    expect(screen.getByRole('region', { name: 'Incident board' })).toBeInTheDocument();
  });

  it('keeps the board when a refresh fails, and says so', async () => {
    serve([alert()]);
    render(<CampusIncidentsScreen />);
    await flush();
    apiRequest.mockImplementation(async (path: string) => { if (path === INCIDENTS_PATH) throw new Error('offline'); return { items: [] }; });
    await act(async () => { vi.advanceTimersByTime(INCIDENTS_POLL_MS); });
    await flush();
    expect(screen.getByRole('region', { name: 'Incident board' })).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent(/Could not refresh incidents/);
  });

  it('cannot log an incident by hand, and says why', async () => {
    serve([]);
    render(<CampusIncidentsScreen />);
    await flush();
    const log = screen.getByRole('button', { name: /Log incident/ });
    expect(log).toBeDisabled();
    expect(log).toHaveTextContent(/isn’t available yet/);
  });
});
