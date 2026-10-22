import React from 'react';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * Care directory listings (AdminCareDirectory). Only the HTTP layer is mocked, by
 * "METHOD path". What these prove: the table shows the server's rows and status,
 * a campus administrator never sends a campus and sees no partner or registry
 * controls, removal asks first, and the registry card never claims a connection.
 */
const answers: Record<string, (init?: RequestInit) => Promise<unknown>> = {};
const apiRequest = vi.fn((path: string, init?: RequestInit) => answers[`${init?.method ?? 'GET'} ${path}`]?.(init) ?? new Promise(() => undefined));
vi.mock('@/data/services/http', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/data/services/http')>()),
  apiRequest: (path: string, init?: RequestInit) => apiRequest(path, init),
}));
vi.mock('@/lib/utils/workflowRouting', async (importOriginal) => ({ ...(await importOriginal<typeof import('@/lib/utils/workflowRouting')>()), navigate: vi.fn() }));

import { LanguageProvider } from '@/i18n';
import { ApiError } from '@/data/services/http';
import { axeViolations, describeViolations } from '@/test/axe';
import { CareDirectoryAdminView } from '../admin/CareDirectoryAdminView';
import { BLANK_FORM, payloadFrom } from '../viewmodel/CareDirectoryAdminViewModel';
import type { AdminFacility } from '../viewmodel/CareDirectoryAdminViewModel';

const answer = (key: string, value: unknown) => { answers[key] = () => Promise.resolve(value); };
const wrap = (ui: React.ReactElement) => render(<LanguageProvider>{ui}</LanguageProvider>);

const row = (over: Partial<AdminFacility>): AdminFacility => ({
  id: 'f1', kind: 'HOSPITAL', name: 'Area Hospital', departments: ['Emergency'], address: 'Road 1', area: 'Kandi', pincode: '502285',
  latitude: 17.59, longitude: 78.12, phone: '040 2301 6000', emergency24x7: true, hoursText: '', source: 'Called the front desk', sourceUrl: '',
  verifiedOn: '2026-10-12', campus: '', active: true, status: 'VERIFIED', updatedAt: 1_760_000_000, ...over,
});

beforeEach(() => {
  Object.keys(answers).forEach((key) => delete answers[key]);
  apiRequest.mockClear();
  // jsdom has no <dialog>.showModal(); opening it is enough for its content to be reachable.
  Object.assign(HTMLDialogElement.prototype, { showModal(this: HTMLDialogElement) { this.setAttribute('open', ''); }, close(this: HTMLDialogElement) { this.removeAttribute('open'); } });
});
afterEach(cleanup);

describe('payloadFrom', () => {
  it('splits departments, reads coordinates, and leaves the campus to the server for a campus admin', () => {
    const form = { ...BLANK_FORM, name: 'X', departments: 'Emergency, , Paediatrics', latitude: '17.5', longitude: '', verifiedOn: '', campus: 'Other' };
    expect(payloadFrom(form, false)).toMatchObject({ departments: ['Emergency', 'Paediatrics'], latitude: 17.5, longitude: null, verifiedOn: null });
    expect(payloadFrom(form, false)).not.toHaveProperty('campus');
    expect(payloadFrom(form, true)).toHaveProperty('campus', 'Other');
  });
});

describe('super admin', () => {
  beforeEach(() => {
    answer('GET /ops/care-facilities', { items: [
      row({}),
      row({ id: 'f2', name: 'Old Clinic', kind: 'CLINIC', status: 'STALE', campus: 'IIT Hyderabad', emergency24x7: false }),
      row({ id: 'f3', name: 'Draft Pharmacy', kind: 'PHARMACY', status: 'UNVERIFIED', verifiedOn: null, phone: '' }),
    ], campus: null, maxAgeDays: 365 });
    answer('GET /ops/care-directory/partners', { items: [
      { id: 'p1', kind: 'PHARMACY', name: 'MedPlus', pincode: '502285', hasCoordinates: true, verifiedOn: null, shown: false, hiddenBecause: 'UNVERIFIED' },
      { id: 'p2', kind: 'CLINIC', name: 'Lapsed Clinic', pincode: '502285', hasCoordinates: false, verifiedOn: null, shown: false, hiddenBecause: 'LICENCE' },
    ] });
    answer('GET /care-directory/registry', { provider: 'abdm_hfr', configured: false, state: 'NOT_CONFIGURED', message: '' });
  });

  it('shows each row with its real status, partners with why, and the registry as not configured', async () => {
    const { container } = wrap(<CareDirectoryAdminView superAdmin />);
    await screen.findByText('Area Hospital');
    expect(screen.getByText('Shown')).toBeTruthy();
    expect(screen.getAllByText('Check is old').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Not checked').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Every campus')).toHaveLength(2);
    expect(await screen.findByText('Licence not current')).toBeTruthy();
    expect(screen.getByTestId('fca-registry').textContent).toMatch(/Not configured/);
    // One "Mark verified" for the unverified partner, none for the lapsed licence.
    expect(screen.getAllByRole('button', { name: /Mark .* verified today/ })).toHaveLength(1);
    const violations = await axeViolations(container);
    expect(violations, describeViolations(violations)).toEqual([]);
  });

  it('adds a place and shows the server\'s validation message as given', async () => {
    answers['POST /ops/care-facilities'] = () => Promise.reject(new ApiError('Give both latitude and longitude, or neither.', 422));
    wrap(<CareDirectoryAdminView superAdmin />);
    fireEvent.click(await screen.findByTestId('fca-add'));
    const form = within(await screen.findByTestId('fca-form'));
    fireEvent.change(form.getByLabelText('Name'), { target: { value: 'New Hospital' } });
    fireEvent.change(form.getByLabelText('How you checked it'), { target: { value: 'Visited' } });
    fireEvent.change(form.getByLabelText('Latitude'), { target: { value: '17.4' } });
    fireEvent.submit(screen.getByTestId('fca-form'));
    expect(await screen.findByText('Give both latitude and longitude, or neither.')).toBeTruthy();
    const body = JSON.parse(String(apiRequest.mock.calls.find(([path, init]) => path === '/ops/care-facilities' && init?.method === 'POST')?.[1]?.body));
    expect(body).toMatchObject({ name: 'New Hospital', source: 'Visited', latitude: 17.4, longitude: null, campus: '' });

    answers['POST /ops/care-facilities'] = () => Promise.resolve(row({ id: 'f9', name: 'New Hospital', status: 'UNVERIFIED', verifiedOn: null }));
    fireEvent.change(within(screen.getByTestId('fca-form')).getByLabelText('Latitude'), { target: { value: '' } });
    fireEvent.submit(screen.getByTestId('fca-form'));
    await waitFor(() => expect(screen.queryByTestId('fca-form')).toBeNull());
    expect(screen.getByText('New Hospital')).toBeTruthy();
  });

  it('removes only after confirming', async () => {
    answer('DELETE /ops/care-facilities/f1', { success: true });
    wrap(<CareDirectoryAdminView superAdmin />);
    fireEvent.click(await screen.findByRole('button', { name: 'Remove Area Hospital' }));
    expect(apiRequest.mock.calls.some(([, init]) => init?.method === 'DELETE')).toBe(false);
    fireEvent.click(await screen.findByRole('button', { name: 'Remove' }));
    await waitFor(() => expect(screen.queryByText('Area Hospital')).toBeNull());
    expect(apiRequest).toHaveBeenCalledWith('/ops/care-facilities/f1', expect.objectContaining({ method: 'DELETE' }));
  });

  it('marks a partner verified through the provider endpoint', async () => {
    answer('PATCH /ops/service-providers/p1', {});
    wrap(<CareDirectoryAdminView superAdmin />);
    fireEvent.click(await screen.findByRole('button', { name: 'Mark MedPlus verified today' }));
    await waitFor(() => expect(apiRequest).toHaveBeenCalledWith('/ops/service-providers/p1', expect.objectContaining({ method: 'PATCH', body: JSON.stringify({ verified: true }) })));
  });
});

describe('campus administrator', () => {
  it('sees only their campus, no partners or registry, and never sends a campus', async () => {
    answer('GET /ops/care-facilities', { items: [row({ campus: 'IIT Hyderabad', name: 'Campus Clinic', kind: 'CLINIC' })], campus: 'IIT Hyderabad', maxAgeDays: 365 });
    answers['POST /ops/care-facilities'] = () => Promise.resolve(row({ id: 'f5', campus: 'IIT Hyderabad', name: 'Campus 108' }));
    wrap(<CareDirectoryAdminView superAdmin={false} />);
    await screen.findByText('Campus Clinic');
    expect(screen.queryByText('StudentKare partners')).toBeNull();
    expect(screen.queryByTestId('fca-registry')).toBeNull();
    expect(apiRequest.mock.calls.some(([path]) => path.startsWith('/ops/care-directory/partners'))).toBe(false);
    fireEvent.click(screen.getByTestId('fca-add'));
    expect(within(await screen.findByTestId('fca-form')).queryByLabelText('Campus')).toBeNull();
    fireEvent.change(within(screen.getByTestId('fca-form')).getByLabelText('Name'), { target: { value: 'Campus 108' } });
    fireEvent.change(within(screen.getByTestId('fca-form')).getByLabelText('How you checked it'), { target: { value: 'Security office' } });
    fireEvent.submit(screen.getByTestId('fca-form'));
    await waitFor(() => expect(screen.queryByTestId('fca-form')).toBeNull());
    const body = JSON.parse(String(apiRequest.mock.calls.find(([, init]) => init?.method === 'POST')?.[1]?.body));
    expect(body).not.toHaveProperty('campus');
  });

  it('a failed load is an error with retry, never an empty table', async () => {
    answers['GET /ops/care-facilities'] = () => Promise.reject(new Error('down'));
    wrap(<CareDirectoryAdminView superAdmin={false} />);
    expect(await screen.findByRole('button', { name: /try again/i })).toBeTruthy();
    expect(screen.queryByText('No places yet')).toBeNull();
  });
});
