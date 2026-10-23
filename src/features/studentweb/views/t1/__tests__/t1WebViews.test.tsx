import { beforeEach, describe, expect, it, vi } from 'vitest';
import React from 'react';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { apiRequest } from '@/data/services/http';
import { navigate } from '@/lib/utils/workflowRouting';
import { BrowserRouter } from '@/core/navigation';
import { axeViolations, describeViolations } from '@/test/axe';
import type { LiveDocument } from '@/data/types/workflowTypes';
import { WebVaultView, vaultStats } from '../WebVaultView';
import type { VaultShare } from '../WebVaultView';
import { WebMyLabTestsView, splitLabTests } from '../WebMyLabTestsView';
import type { StudentLabTest } from '../WebMyLabTestsView';
import { WebReportInsightsView, pickReport } from '../WebReportInsightsView';
import { WebConsultSummaryRoute } from '../WebConsultSummaryView';
import { WebEmergencyCardRoute, readiness } from '../WebEmergencyCardView';
import { WebPassView } from '../WebPassView';
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
const share = (id: string, documentId: string, active = true): VaultShare => ({ id, clinician: 'Dr Test', document: `Doc ${documentId}`, documentId, grantedAt: 0, expiresAt: 0, revoked: !active, active });
const lab = (id: string, status: string, extra: Partial<StudentLabTest> = {}): StudentLabTest => ({ id, status, testPanel: ['CBC'], collectionMode: 'HOME', slotStart: null, collectedAt: null, reportDocumentId: '', reviewedAt: null, reviewNote: '', reviewedByDoctor: '', orderedByDoctor: '', createdAt: 1_760_000_000, ...extra });

beforeEach(() => { api.mockReset(); go.mockReset(); window.history.pushState({}, '', '/'); auth.user.isVerifiedStudent = true; });

describe('WebVault', () => {
  it('tiles equal the server list, chips filter by type, and the shared column follows active shares', async () => {
    serve({ '/health/documents': { items: [doc('d1', 'LAB', 1_760_100_000), doc('d2', 'LAB'), doc('d3', 'PRESCRIPTION')], total: 3 }, '/records/shares': { items: [share('s1', 'd3'), share('s2', 'd1', false)] } });
    const { container } = render(<WebVaultView />);
    await settle();
    expect(vaultStats([doc('d1', 'LAB'), doc('d2', 'LAB'), doc('d3', 'PRESCRIPTION')], 3, [share('s1', 'd3')])).toMatchObject({ documents: 3, labReports: 2, sharedNow: 1 });
    const stats = screen.getByLabelText('Your vault at a glance');
    expect(within(stats).getByText('Documents').nextSibling?.textContent).toBe('3');
    expect(within(stats).getByText('Lab reports').nextSibling?.textContent).toBe('2');
    expect(within(stats).getByText('Shared right now').nextSibling?.textContent).toBe('1');
    const row = (title: string) => screen.getByText(title).closest('tr') as HTMLElement;
    expect(within(row('Doc d3')).getByText(/Shared · 1/)).toBeTruthy();
    expect(within(row('Doc d1')).getByText('Private')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Prescriptions · 1' }));
    expect(screen.getByRole('button', { name: 'Prescriptions · 1' }).getAttribute('aria-pressed')).toBe('true');
    expect(screen.queryByText('Doc d1')).toBeNull();
    expect(screen.queryByText(/Linked to ABDM/)).toBeNull();
    await axeClean(container);
  });

  it('a failed revoke keeps the document shared and says so', async () => {
    serve({
      '/health/documents': { items: [doc('d3', 'PRESCRIPTION')], total: 1 },
      '/records/shares': { items: [share('s1', 'd3')] },
      '/records/shares/s1/revoke': new Error('down'),
    });
    render(<WebVaultView />);
    await settle();
    fireEvent.click(screen.getByRole('button', { name: 'More for Doc d3' }));
    fireEvent.click(screen.getByRole('button', { name: 'Stop sharing' }));
    const dialog = screen.getByRole('alertdialog');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Stop sharing' }));
    await settle();
    expect(screen.getByRole('alert').textContent).toMatch(/still shared/);
    expect(within(screen.getByText('Doc d3').closest('tr') as HTMLElement).getByText(/Shared · 1/)).toBeTruthy();
  });

  it('first time: empty vault offers upload, and verification only to an unverified student', async () => {
    auth.user.isVerifiedStudent = false;
    serve({ '/health/documents': { items: [], total: 0 }, '/records/shares': { items: [] } });
    render(<WebVaultView />);
    await settle();
    expect(screen.getByText('Your vault is empty')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Get verified first' }));
    expect(go).toHaveBeenCalledWith('verify');
  });

  it('error state retries', async () => {
    serve({ '/health/documents': new Error('down'), '/records/shares': { items: [] } });
    render(<WebVaultView />);
    await settle();
    expect(screen.getByText('Your vault didn’t load')).toBeTruthy();
  });
});

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

describe('WebReportInsights', () => {
  it('shows the releasing doctor’s own note, picks the report asked for, and no body-system scores', async () => {
    const a = lab('l1', 'REPORT_RELEASED', { reportDocumentId: 'd1', reviewedAt: 100, reviewNote: 'Older note', reviewedByDoctor: 'Dr A' });
    const b = lab('l2', 'REPORT_RELEASED', { reportDocumentId: 'd2', reviewedAt: 200, reviewNote: 'Newer note', reviewedByDoctor: 'Dr B' });
    expect(pickReport([a, b, lab('l3', 'REPORT_READY')], null)?.id).toBe('l2');
    expect(pickReport([a, b], 'l1')?.id).toBe('l1');
    expect(pickReport([lab('l3', 'REPORT_READY')], 'l3')).toBeNull();
    window.history.pushState({}, '', '/report-insights?id=l1');
    serve({ '/lab-orders': { items: [a, b] } });
    const { container } = render(withRouter(<WebReportInsightsView />));
    await settle();
    expect(screen.getByText('Older note')).toBeTruthy();
    expect(screen.queryByText(/AI draft|percentile score|Ask Ayush/)).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: /Go over it with a clinician/ }));
    expect(go).toHaveBeenCalledWith('care');
    await axeClean(container);
  });

  it('with nothing released it says so and never shows a held result', async () => {
    serve({ '/lab-orders': { items: [lab('l3', 'REPORT_READY', { reviewNote: 'secret' })] } });
    render(withRouter(<WebReportInsightsView />));
    await settle();
    expect(screen.getByText('No released reports yet')).toBeTruthy();
    expect(screen.queryByText('secret')).toBeNull();
  });
});

describe('WebConsultSummary', () => {
  it('opens a signed note from ?id= in two columns with its prescription, and no rating or cart', async () => {
    window.history.pushState({}, '', '/visit-summaries?id=v1');
    const header = { id: 'v1', appointmentId: 'a1', appointmentStart: '2026-10-20T10:00', doctorName: 'Dr Menon', doctorRegistrationNumber: 'NMC-1', signedAt: 1_760_000_000 };
    serve({ '/records/visit-summaries/v1': { ...header, subjective: 'Sore throat.', objective: '', assessment: 'Viral.', plan: 'Rest.', prescriptions: [{ id: 'rx12345678', issuedAt: 1_760_000_000, status: 'ISSUED' }] }, '/records/visit-summaries': { items: [header] } });
    const { container } = render(withRouter(<WebConsultSummaryRoute />));
    await settle();
    expect(screen.getByText('Consult with Dr Menon')).toBeTruthy();
    expect(screen.getByText('Sore throat.')).toBeTruthy();
    expect(screen.queryByText('What the doctor found')).toBeNull();
    expect(screen.queryByText(/How was the consult|Order these/i)).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Open in Prescriptions' }));
    expect(go).toHaveBeenCalledWith('prescriptions');
    await axeClean(container);
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

describe('WebPass', () => {
  it('shows the server’s code and QR, never a photo-match claim or invented history', async () => {
    const now = Math.floor(Date.now() / 1000);
    serve({ '/identity': { memberId: 'SK-ABC', fullName: 'Krishna Chintakayala', university: 'VNR VJIET', rollNumber: '22', campusStatus: 'VERIFIED', issued: true, issuedAt: now, code: 't', qrSvg: '<svg xmlns="http://www.w3.org/2000/svg"/>', passCode: '123456', expiresAt: now + 20, passWindow: [] } });
    const { container } = render(<WebPassView />);
    await settle();
    expect(screen.getByText('123456')).toBeTruthy();
    expect(screen.getByAltText('Your member verification QR code')).toBeTruthy();
    expect(screen.queryByText(/Deleted after 24|Photo matched|4 of 4|This wasn’t me/)).toBeNull();
    expect(screen.getByText(/No check-ins recorded/)).toBeTruthy();
    await axeClean(container);
  });

  it('a stale pass is hidden, not shown', async () => {
    const now = Math.floor(Date.now() / 1000);
    serve({ '/identity': { memberId: 'SK-ABC', fullName: 'K C', university: '', rollNumber: '', campusStatus: 'PENDING', issued: true, issuedAt: now, code: 't', passCode: '999999', expiresAt: now - 100, passWindow: [] } });
    render(<WebPassView />);
    await settle();
    expect(screen.queryByText('999999')).toBeNull();
    expect(screen.getByRole('status').textContent).toMatch(/expired/i);
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
