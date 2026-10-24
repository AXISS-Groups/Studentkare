import { beforeEach, describe, expect, it, vi } from 'vitest';
import React from 'react';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { apiRequest } from '@/data/services/http';
import { navigate } from '@/lib/utils/workflowRouting';
import { BrowserRouter } from '@/core/navigation';
import { axeViolations, describeViolations } from '@/test/axe';
import { WebMyLabTestsView, splitLabTests } from '../WebMyLabTestsView';
import type { StudentLabTest } from '../WebMyLabTestsView';
import type { LiveDocument } from '@/data/types/workflowTypes';
import { WebEmergencyCardRoute, readiness } from '../WebEmergencyCardView';
import { WebRequestsRoute } from '../WebRequestsRoute';
import { WebLeaveCampusRoute } from '../WebLeaveCampusView';
import { WebDeleteAccountRoute } from '../WebDeleteAccountView';

vi.mock('@/data/services/http', async (importOriginal) => ({ ...(await importOriginal<typeof import('@/data/services/http')>()), apiRequest: vi.fn() }));
vi.mock('@/lib/utils/workflowRouting', async (importOriginal) => ({ ...(await importOriginal<typeof import('@/lib/utils/workflowRouting')>()), navigate: vi.fn() }));
const auth = { user: { id: 'u1', fullName: 'Krishna Chintakayala', role: 'STUDENT', university: 'VNR VJIET', isVerifiedStudent: true } };
vi.mock('@/data/contexts/AuthContext', () => ({ useAuth: () => ({ ...auth, status: 'ready', updateUser: vi.fn() }) }));

const api = vi.mocked(apiRequest);
const go = vi.mocked(navigate);
type Routes = Record<string, unknown | ((path: string, init?: RequestInit) => unknown)>;
function serve(routes: Routes) {
  api.mockImplementation((path: string, init?: RequestInit) => {
    const key = Object.keys(routes).sort((a, b) => b.length - a.length).find((prefix) => path.startsWith(prefix));
    if (!key) return Promise.reject(new Error(`unexpected ${path}`));
    const value = routes[key];
    const result = typeof value === 'function' ? (value as (p: string, i?: RequestInit) => unknown)(path, init) : value;
    return result instanceof Error ? Promise.reject(result) : Promise.resolve(result);
  });
}
const calls = () => api.mock.calls.map(([path, init]) => `${(init as RequestInit | undefined)?.method ?? 'GET'} ${String(path)}`);
const settle = async () => { await act(async () => { for (let i = 0; i < 8; i += 1) await Promise.resolve(); }); };
const withRouter = (ui: React.ReactElement) => <BrowserRouter>{ui}</BrowserRouter>;
const axeClean = async (container: Element) => { const v = await axeViolations(container); expect(v, describeViolations(v)).toEqual([]); };

const doc = (id: string, category: string, createdAt = 1_760_000_000): LiveDocument => ({ id, title: `Doc ${id}`, category, filename: `${id}.pdf`, mimeType: 'application/pdf', createdAt });
const lab = (id: string, status: string, extra: Partial<StudentLabTest> = {}): StudentLabTest => ({ id, status, testPanel: ['CBC'], collectionMode: 'HOME', slotStart: null, collectedAt: null, reportDocumentId: '', reviewedAt: null, reviewNote: '', reviewedByDoctor: '', orderedByDoctor: '', createdAt: 1_760_000_000, ...extra });

beforeEach(() => { api.mockReset(); go.mockReset(); window.history.pushState({}, '', '/'); auth.user.isVerifiedStudent = true; });

describe('WebMyLabTests', () => {
  const released = lab('l1', 'REPORT_RELEASED', { reportDocumentId: 'd1', reviewedAt: 1_760_000_000, reviewNote: 'Fine.', reviewedByDoctor: 'Dr Rao' });
  const waiting = lab('l2', 'IN_ANALYSIS');

  it('splits released, awaiting and outside reports; an unreleased test shows no result', async () => {
    expect(splitLabTests([released, waiting, lab('l3', 'CANCELLED')], [doc('d1', 'LAB'), doc('d9', 'LAB'), doc('d8', 'PRESCRIPTION')]))
      .toMatchObject({ released: [{ id: 'l1' }], awaiting: [{ id: 'l2' }], outside: [{ id: 'd9' }] });
    serve({ '/lab-orders': { items: [released, waiting] }, '/health/documents': { items: [doc('d1', 'LAB')] }, '/config': {} });
    const { container } = render(withRouter(<WebMyLabTestsView />));
    await settle();
    expect(screen.getByText('Reviewed by Dr Rao before release')).toBeTruthy();
    expect(screen.queryByText(/parameters|outside range|Explain it/i)).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: /Awaiting collection/ }));
    expect(screen.getByText('No result yet')).toBeTruthy();
    expect(screen.queryByRole('link', { name: 'View report' })).toBeNull();
    await axeClean(container);
  });

  it('nothing on the page links to the shop (Rule L)', async () => {
    serve({ '/lab-orders': { items: [released] }, '/health/documents': { items: [] }, '/config': {} });
    render(withRouter(<WebMyLabTestsView />));
    await settle();
    fireEvent.click(screen.getByRole('button', { name: 'Book again' }));
    expect(go).toHaveBeenCalledWith('lab-tests');
    expect(go).not.toHaveBeenCalledWith('shop');
    expect(go).not.toHaveBeenCalledWith('checkout');
  });

  it('no store listing published: no app promo, no scan code', async () => {
    serve({ '/lab-orders': { items: [] }, '/health/documents': { items: [] }, '/config': {} });
    const { container } = render(withRouter(<WebMyLabTestsView />));
    await settle();
    expect(screen.getByText('No lab tests yet')).toBeTruthy();
    expect(container.querySelector('[data-icon^="glyph:qr-sample"]')).toBeNull();
  });
});

describe('WebEmergencyCard', () => {
  const profile = { bloodGroup: '', allergies: ['Penicillin'], chronicConditions: [], emergencyContactName: '', emergencyContactPhone: '', emergencyContactRelation: '' };

  it('previews the draft live, computes readiness, and saves only the profile fields', async () => {
    expect(readiness({ bloodGroup: '', allergies: '', conditions: '', contactName: '', contactPhone: '', contactRelation: '' }).percent).toBe(0);
    expect(readiness({ bloodGroup: 'O+', allergies: '', conditions: '', contactName: 'A', contactPhone: '9876543210', contactRelation: '' }).percent).toBe(100);
    serve({ '/profile': (_p: string, init?: RequestInit) => (init?.method === 'PATCH' ? { ...profile, bloodGroup: 'O+' } : profile) });
    const { container } = render(<WebEmergencyCardRoute />);
    await settle();
    const preview = screen.getByTestId('ice-preview');
    expect(within(preview).getByText('Penicillin')).toBeTruthy();
    expect(within(preview).getAllByText('Not set').length).toBe(1);
    expect(screen.queryByText(/QR shows|Works offline|anyone who scans/i)).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'O+' }));
    expect(within(preview).getByText('O+')).toBeTruthy();
    expect(screen.getByText('Card is 50% ready')).toBeTruthy();
    expect(screen.getByRole('region', { name: 'Unsaved changes' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Save card' }));
    await settle();
    const patch = api.mock.calls.find(([, init]) => (init as RequestInit | undefined)?.method === 'PATCH');
    expect(Object.keys(JSON.parse(String((patch?.[1] as RequestInit).body))).sort()).toEqual(['allergies', 'bloodGroup', 'chronicConditions', 'emergencyContactName', 'emergencyContactPhone', 'emergencyContactRelation']);
    await axeClean(container);
  });

  it('fails closed: a failed save says so, and crisis lines stay reachable while loading and on error', async () => {
    serve({ '/profile': (_p: string, init?: RequestInit) => (init?.method === 'PATCH' ? new Error('down') : profile) });
    render(<WebEmergencyCardRoute />);
    expect(screen.getByRole('link', { name: 'Call 112, emergency services' })).toBeTruthy();
    await settle();
    fireEvent.click(screen.getByRole('button', { name: 'A+' }));
    fireEvent.click(screen.getByRole('button', { name: 'Save card' }));
    await settle();
    expect(screen.getByRole('alert').textContent).toMatch(/Not saved/);
    expect(screen.getByRole('region', { name: 'Unsaved changes' })).toBeTruthy();

    api.mockReset();
    serve({ '/profile': new Error('down') });
    render(<WebEmergencyCardRoute />);
    await settle();
    expect(screen.getAllByRole('link', { name: 'Call Tele-MANAS 14416' }).length).toBeGreaterThan(0);
  });
});

describe('WebRequests', () => {
  it('lists requests with status, and New request sends "something else" to support with the crisis lines shown', async () => {
    serve({
      '/my-requests': { items: [{ kind: 'SUPPORT', id: 't1', title: 'ID photo', status: 'OPEN', createdAt: 1_760_000_000 }] },
      '/support': { id: 't2' },
    });
    const { container } = render(<WebRequestsRoute />);
    await settle();
    expect(screen.getByText('ID photo')).toBeTruthy();
    await axeClean(container);
    fireEvent.click(screen.getByRole('button', { name: 'New request' }));
    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByRole('link', { name: 'Call 112, emergency services' })).toBeTruthy();
    expect(within(dialog).queryByText(/4 working hours/)).toBeNull();
    fireEvent.click(within(dialog).getByRole('button', { name: 'Something else' }));
    fireEvent.change(within(dialog).getByLabelText('In a few words'), { target: { value: 'Help please' } });
    fireEvent.change(within(dialog).getByLabelText('Tell us what happened'), { target: { value: 'My order never arrived at the block.' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Send request' }));
    await settle();
    expect(calls()).toContain('POST /support');
  });

  it('a request form topic opens that form', async () => {
    serve({ '/my-requests': { items: [] } });
    render(<WebRequestsRoute />);
    await settle();
    fireEvent.click(screen.getAllByRole('button', { name: 'New request' })[0]);
    fireEvent.click(screen.getByRole('button', { name: 'Return or refund' }));
    expect(go).toHaveBeenCalledWith('return-request');
  });
});

describe('WebLeaveCampus', () => {
  it('lists only what the backend changes, and undo cancels a scheduled departure', async () => {
    serve({ '/campus/departure': { departure: null, campus: { university: 'VNR VJIET', status: 'VERIFIED' }, collegePlan: null, signsInWithCollegeEmail: false, today: '2026-10-21' } });
    const { container, unmount } = render(<WebLeaveCampusRoute />);
    await settle();
    expect(screen.getByText('Leaving VNR VJIET?')).toBeTruthy();
    expect(screen.queryByText(/Care Circle|Edu ID prices|personal email/i)).toBeNull();
    expect(within(screen.getByTestId('leave-campus-changes')).getByText(/check-in pass stops working/)).toBeTruthy();
    await axeClean(container);
    unmount();

    api.mockReset();
    serve({
      '/campus/departure/cancel': { departure: null, campus: { university: 'VNR VJIET', status: 'VERIFIED' }, collegePlan: null, signsInWithCollegeEmail: false, today: '2026-10-21' },
      '/campus/departure': { departure: { id: 'x', university: 'VNR VJIET', reason: 'GRADUATING', destination: null, effectiveOn: '2027-05-31', status: 'SCHEDULED' }, campus: { university: 'VNR VJIET', status: 'VERIFIED' }, collegePlan: null, signsInWithCollegeEmail: false, today: '2026-10-21' },
    });
    render(<WebLeaveCampusRoute />);
    await settle();
    fireEvent.click(screen.getByRole('button', { name: 'Undo — I’m not leaving' }));
    await settle();
    expect(calls()).toContain('POST /campus/departure/cancel');
  });
});

describe('WebDeleteAccount', () => {
  it('needs the typed word before it schedules, offers export first, and makes no legal claims', async () => {
    serve({ '/records/deletion-request': (_p: string, init?: RequestInit) => (init?.method === 'POST' ? { status: 'PENDING', requestedAt: 1, scheduledFor: 2, archiveRetentionDays: 30 } : { status: 'NONE', requestedAt: null, scheduledFor: null, archiveRetentionDays: 30 }) });
    const { container } = render(<WebDeleteAccountRoute />);
    await settle();
    expect(screen.queryByText(/8 years|tax law|ABHA|grievance@/)).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: /Download my data first/ }));
    expect(go).toHaveBeenCalledWith('data-export');
    fireEvent.click(screen.getByRole('button', { name: 'Continue to delete' }));
    const confirm = screen.getByRole('button', { name: 'Delete my account in 7 days' });
    expect((confirm as HTMLButtonElement).disabled).toBe(true);
    expect(screen.getByRole('link', { name: 'Call Tele-MANAS 14416' })).toBeTruthy();
    fireEvent.change(screen.getByLabelText('Type DELETE to confirm'), { target: { value: 'delete' } });
    expect((confirm as HTMLButtonElement).disabled).toBe(false);
    await axeClean(container);
    fireEvent.click(confirm);
    await settle();
    expect(screen.getByTestId('delete-scheduled')).toBeTruthy();
    expect(calls()).toContain('POST /records/deletion-request');
  });
});
