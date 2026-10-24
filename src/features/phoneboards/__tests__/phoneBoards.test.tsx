import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import * as http from '@/data/services/http';
import { translate } from '@/i18n';
import type { MessageKey } from '@/i18n';

vi.mock('@/data/services/http', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/data/services/http')>();
  return { ...actual, apiRequest: vi.fn() };
});
vi.mock('@/design-system/motion', async (importOriginal) => ({ ...(await importOriginal<typeof import('@/design-system/motion')>()), useReducedMotion: () => true }));

import { YourCareBoard } from '@/features/yourcare/views/YourCareBoard';
import { AppointmentsBoard } from '@/features/appointments/views/AppointmentsBoard';
import { NotificationNativeView } from '@/features/notifications/views/NotificationNativeView';
import { NotificationViewModel } from '@/features/notifications/viewmodel/NotificationViewModel';
import { MoreHubBoard } from '@/features/account/views/MoreHubBoard';
import { StudentProfileBoard, maskEmail, maskPhone } from '@/features/account/views/StudentProfileBoard';
import { AccountDetailsBoard } from '@/features/account/views/AccountDetailsBoard';
import { DataExportBoard } from '@/features/account/views/DataExportBoard';
import { DigitalIdRoute } from '@/features/digital_id/views/DigitalIdNativeView';
import { ClaimsHubBoard } from '@/features/claims/views/ClaimsHubBoard';
import { HelpCentreBoard } from '@/features/support/views/HelpCentreBoard';
import { PreventiveCareBoard } from '@/features/preventive/views/PreventiveCareBoard';
import { MovementBoard } from '@/features/movement/views/MovementBoard';
import { MyRequestsRoute, NewRequestRoute } from '@/features/requests/views/RequestsViews';
import { LeaveCampusRoute } from '@/features/campus/views/LeaveCampusView';
import { NotificationSettingsRoute } from '@/features/notifications/views/NotificationSettingsView';
import { PhoneHeaderSlotProvider } from '@/design-system/navigation/BoardHeader';
import type { BoardHeaderConfig } from '@/design-system/navigation/BoardHeader';
import { routines } from '@/data/datasets/exerciseLibrary';
import { axeViolations, describeViolations } from '@/test/axe';

const api = vi.mocked(http.apiRequest);
const en = (key: MessageKey, vars?: Record<string, string | number>) => translate('en', key, vars);

/** Path prefix → response (a function may throw to fail that call). Unknown paths never resolve. */
let routes: Record<string, unknown> = {};
function serve(table: Record<string, unknown>) {
  routes = table;
  api.mockImplementation(async (path: string) => {
    const key = Object.keys(routes).sort((a, b) => b.length - a.length).find((prefix) => path.startsWith(prefix));
    if (key === undefined) return new Promise(() => undefined);
    const value = routes[key];
    if (value instanceof Error) throw value;
    return value as never;
  });
}

const inDays = (days: number) => new Date(Date.now() + days * 86_400_000).toISOString();
const secondsAgo = (days: number) => Math.floor(Date.now() / 1000) - days * 86_400;

beforeEach(() => { api.mockReset(); Object.defineProperty(navigator, 'onLine', { configurable: true, value: true }); });
afterEach(cleanup);

describe('Your Care', () => {
  const links = { appointments: vi.fn(), records: vi.fn(), devices: vi.fn(), movement: vi.fn(), refill: vi.fn(), labTests: vi.fn(), emergencyCard: vi.fn(), pass: vi.fn(), crisis: vi.fn(), more: vi.fn() };
  const full = {
    '/profile': { university: 'VNR VJIET', hostelBlock: 'North Dorm, Block B' },
    '/appointments': { items: [{ id: 'a1', slotStart: inDays(1), status: 'CONFIRMED', createdAt: secondsAgo(2) }, { id: 'a0', slotStart: inDays(-20), status: 'COMPLETED', createdAt: secondsAgo(30) }] },
    '/health/documents': { items: [{ id: 'd1', title: 'Vitamin D report', category: 'lab', filename: 'x.pdf', mimeType: 'application/pdf', createdAt: secondsAgo(1) }], total: 11 },
    '/records/shares': { items: [{ id: 's1', active: false }] },
    '/health/exercise-sessions': { items: [{ id: 'e1', finishedAt: new Date().toISOString() }] },
    '/refills/plans': { items: [{ id: 'p1', name: 'Vitamin D3 60K' }] },
    '/lab-orders': { total: 2 },
    '/billing/me': { benefits: { limit: 0, used: 0 } },
  };

  it('shows this week, what needs the student and what they used, from their own data', async () => {
    serve(full);
    render(<YourCareBoard links={links} />);
    expect(await screen.findByTestId('your-care-week')).toBeInTheDocument();
    expect(screen.getByText(en('pb.yc.newRecord', { title: 'Vitamin D report' }))).toBeInTheDocument();
    expect(screen.getByText(en('pb.yc.refill', { name: 'Vitamin D3 60K' }))).toBeInTheDocument();
    expect(screen.getByText(en('pb.yc.consult'))).toBeInTheDocument();
    expect(screen.getByText(en('pb.yc.documentsN', { count: 11 }))).toBeInTheDocument();
    // No plan benefits → no "used of" meter is invented.
    expect(screen.queryByText(en('pb.yc.benefits'))).toBeNull();
    fireEvent.click(screen.getByTestId('your-care-need-consult'));
    expect(links.appointments).toHaveBeenCalled();
    fireEvent.click(screen.getByTestId('your-care-need-refill'));
    expect(links.refill).toHaveBeenCalled();
  });

  it('first time: says nothing needs the student yet, with two ways forward', async () => {
    serve({ ...full, '/appointments': { items: [] }, '/health/documents': { items: [], total: 0 }, '/refills/plans': { items: [] }, '/health/exercise-sessions': { items: [] } });
    render(<YourCareBoard links={links} />);
    expect(await screen.findByTestId('your-care-first')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: en('pb.yc.bookLab') }));
    expect(links.labTests).toHaveBeenCalled();
  });

  it('fails calmly with a retry when its records cannot load', async () => {
    serve({ '/appointments': new Error('down'), '/health/documents': new Error('down') });
    render(<YourCareBoard links={links} />);
    expect(await screen.findByText(en('pb.yc.failedTitle'))).toBeInTheDocument();
    expect(screen.getByRole('button', { name: en('common.tryAgain') })).toBeInTheDocument();
  });

  it('offline: names what still works, help first', async () => {
    Object.defineProperty(navigator, 'onLine', { configurable: true, value: false });
    serve(full);
    render(<YourCareBoard links={links} />);
    expect(screen.getByTestId('your-care-offline')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('link', { name: en('pb.offline.crisis') }));
    expect(links.crisis).toHaveBeenCalled();
  });

  it('inside the web phone frame, hands its header to the frame instead of drawing one', async () => {
    serve(full);
    const set = vi.fn<(c: BoardHeaderConfig | null) => void>();
    render(<PhoneHeaderSlotProvider value={{ set, openMore: vi.fn() }}><YourCareBoard links={links} /></PhoneHeaderSlotProvider>);
    await screen.findByTestId('your-care-week');
    expect(set).toHaveBeenCalledWith(expect.objectContaining({ title: en('tabbar.yourCare'), subtitle: 'North Dorm, Block B • VNR VJIET' }));
    expect(screen.queryByRole('heading', { name: en('tabbar.yourCare') })).toBeNull();
  });
});

describe('Appointments', () => {
  it('shows the next consult, upcoming and past, named from the catalogue, and cancels a request', async () => {
    serve({
      '/appointments': { items: [
        { id: 'a1', catalogItemId: 'c1', slotStart: inDays(1), slotEnd: inDays(1.02), status: 'REQUESTED', createdAt: 1 },
        { id: 'a2', catalogItemId: 'c1', slotStart: inDays(-3), slotEnd: inDays(-2.99), status: 'COMPLETED', createdAt: 1 },
      ] },
      '/catalog': { items: [{ id: 'c1', name: 'Video consult — general physician' }] },
    });
    const links = { book: vi.fn(), notes: vi.fn() };
    render(<AppointmentsBoard links={links} />);
    expect(await screen.findByTestId('appointments-next')).toBeInTheDocument();
    expect(screen.getAllByText('Video consult — general physician').length).toBeGreaterThan(0);
    fireEvent.click(screen.getByRole('button', { name: /Video consult — general physician.*Completed/i }));
    expect(links.notes).toHaveBeenCalled();
    api.mockClear();
    fireEvent.click(screen.getByRole('link', { name: en('care.appts.cancel') }));
    await waitFor(() => expect(api).toHaveBeenCalledWith('/appointments/a1', expect.objectContaining({ method: 'PATCH' })));
  });

  it('first time: no appointments, one way to book; Book is in the header', async () => {
    serve({ '/appointments': { items: [] }, '/catalog': { items: [] } });
    const links = { book: vi.fn() };
    render(<AppointmentsBoard links={links} />);
    expect(await screen.findByTestId('appointments-first')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('appointments-book'));
    expect(links.book).toHaveBeenCalled();
  });
});

describe('Notifications', () => {
  it('groups by today and earlier, filters by tab, and marks one read', async () => {
    serve({ '/notifications': { items: [
      { id: 'n1', eventType: 'ORDER_DISPATCHED', payload: { summary: 'Order is out for delivery' }, status: 'SENT', createdAt: Math.floor(Date.now() / 1000), sentAt: 1, readAt: null },
      { id: 'n2', eventType: 'MEDICATION_REMINDER', payload: { summary: 'Time for your dose' }, status: 'SENT', createdAt: secondsAgo(3), sentAt: 1, readAt: 5 },
    ] } });
    const vm = new NotificationViewModel();
    const settings = vi.fn();
    render(<NotificationNativeView viewModel={vm} links={{ settings }} />);
    expect(await screen.findByText('Order is out for delivery')).toBeInTheDocument();
    expect(screen.getByText(en('pb.today'))).toBeInTheDocument();
    expect(screen.getByText(en('pb.notif.earlier'))).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('notifications-tab-orders'));
    expect(screen.queryByText('Time for your dose')).toBeNull();
    fireEvent.click(screen.getByTestId('notifications-tab-care'));
    expect(screen.getByText('Time for your dose')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('notifications-tab-all'));
    fireEvent.click(screen.getByTestId('notification-n1'));
    await waitFor(() => expect(api).toHaveBeenCalledWith('/notifications/n1/read', expect.objectContaining({ method: 'POST' })));
    fireEvent.click(screen.getByRole('button', { name: en('pb.notif.settings') }));
    expect(settings).toHaveBeenCalled();
  });

  it('empty and error states', async () => {
    serve({ '/notifications': { items: [] } });
    const { unmount } = render(<NotificationNativeView viewModel={new NotificationViewModel()} />);
    expect(await screen.findByText(en('notif.emptyTitle'))).toBeInTheDocument();
    unmount();
    serve({ '/notifications': new Error('down') });
    render(<NotificationNativeView viewModel={new NotificationViewModel()} />);
    expect(await screen.findByText(en('notif.failedTitle'))).toBeInTheDocument();
  });
});

describe('More / account', () => {
  const account = { fullName: 'Krishna C.', university: 'VNR VJIET', role: 'STUDENT' as const, isVerifiedStudent: true };
  it('shows who is signed in, the vault and orders counts, and no workspaces for a student', async () => {
    serve({ '/profile': { hostelBlock: 'Block B' }, '/health/documents': { items: [], total: 11 }, '/orders': { items: [{ lines: [{ status: 'DISPATCHED' }] }, { lines: [{ status: 'COMPLETED' }] }] } });
    const open = { requests: vi.fn(), account: vi.fn(), records: vi.fn(), orders: vi.fn(), joinClinician: vi.fn() };
    const askSignOut = vi.fn();
    render(<MoreHubBoard account={account} links={{ open, askSignOut, workspace: vi.fn() }} />);
    expect(await screen.findByText(en('pb.yc.documentsN', { count: 11 }))).toBeInTheDocument();
    expect(screen.getByText(en('pb.more.inTransit', { count: 1 }))).toBeInTheDocument();
    expect(screen.queryByText(en('pb.more.switch'))).toBeNull();
    // Only rows with a destination are drawn.
    expect(screen.getByTestId('more-hub-requests')).toBeInTheDocument();
    expect(screen.queryByTestId('more-hub-plan')).toBeNull();
    fireEvent.click(screen.getByTestId('more-hub-account'));
    expect(open.account).toHaveBeenCalled();
    fireEvent.click(screen.getByTestId('more-hub-logout'));
    expect(askSignOut).toHaveBeenCalled();
  });

  it('shows the consoles an account holds a role in', () => {
    serve({});
    const workspace = vi.fn();
    render(<MoreHubBoard account={{ ...account, role: 'NMC_DOCTOR' }} links={{ open: {}, workspace }} />);
    fireEvent.click(screen.getByRole('button', { name: en('pb.more.ws.clinician') }));
    expect(workspace).toHaveBeenCalledWith('NMC_DOCTOR');
  });
});

describe('Profile and account details', () => {
  const profile = { id: 'u', fullName: 'Krishna Chintakayala', email: 'krishna@vnrvjiet.in', phone: '+919876543231', university: 'VNR VJIET', rollNumber: '21B81A05', bloodGroup: 'O+', isVerifiedStudent: true, allergies: ['Penicillin'], chronicConditions: [], emergencyContactName: 'Lakshmi', emergencyContactPhone: '+919876500231', emergencyContactRelation: 'Mother', hostelBlock: 'North Dorm, Block B', room: 'B-214' };

  it('masks contact details enough to read over a shoulder', () => {
    expect(maskEmail('krishna@vnrvjiet.in')).toBe('k•••••@vnrvjiet.in');
    expect(maskPhone('+919876543231')).toBe('+91 98••• ••231');
  });

  it('profile: groups the student’s details, and every row opens the edit form', async () => {
    serve({ '/profile': profile });
    const edit = vi.fn();
    render(<StudentProfileBoard links={{ edit, digitalId: vi.fn() }} />);
    expect(await screen.findByText(en('pb.profile.blockRoom', { block: 'North Dorm, Block B', room: 'B-214' }))).toBeInTheDocument();
    expect(screen.getByText('Penicillin')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: `${en('pb.profile.bloodGroup')}: O+` }));
    expect(edit).toHaveBeenCalled();
  });

  it('account: identity, points, contact rows and the two big decisions', async () => {
    serve({ '/profile': profile, '/points/me': { balance: 240 } });
    const links = { verify: vi.fn(), edit: vi.fn(), leaveCampus: vi.fn(), deleteAccount: vi.fn(), exportData: vi.fn() };
    render(<AccountDetailsBoard links={links} />);
    expect(await screen.findByText(en('pb.account.points', { points: 240 }))).toBeInTheDocument();
    expect(screen.getByText(en('pb.account.verified'))).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: `${en('pb.account.delete')}, ${en('pb.account.deleteMeta')}` }));
    expect(links.deleteAccount).toHaveBeenCalled();
    fireEvent.click(screen.getByRole('link', { name: en('pb.account.export') }));
    expect(links.exportData).toHaveBeenCalled();
  });

  it('export: prepares the real export and hands it over; fails calmly', async () => {
    const data = { user: {}, documents: [], readings: [], policies: [] };
    serve({ '/health/documents': { items: [], total: 9 }, '/records/export': data });
    const save = vi.fn();
    const { unmount } = render(<DataExportBoard links={{ save }} />);
    expect(await screen.findByText(en('pb.export.recordsCount', { count: 9 }))).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('data-export-prepare'));
    await waitFor(() => expect(save).toHaveBeenCalledWith(data));
    expect(await screen.findByText(en('pb.export.doneTitle'))).toBeInTheDocument();
    unmount();
    serve({ '/health/documents': { items: [] }, '/records/export': new Error('down') });
    render(<DataExportBoard links={{ save }} />);
    fireEvent.click(screen.getByTestId('data-export-prepare'));
    expect(await screen.findByText(en('pb.export.failed'))).toBeInTheDocument();
  });
});

describe('Digital ID', () => {
  const identity = { memberId: 'SK-VNR-4821', fullName: 'Krishna C.', university: 'VNR VJIET', rollNumber: '21B81A05', campusStatus: 'VERIFIED', issued: true, issuedAt: 1 };
  it('web: the ID card, its QR controls and a row to the check-in pass (one view, Tier 1 parity plan §12)', async () => {
    serve({ '/identity': identity, '/health/policies': { items: [{ id: 'p', insurer: 'Campus group policy', validUntil: '2999-01-01' }] } });
    const pass = vi.fn();
    render(<DigitalIdRoute links={{ pass, abha: vi.fn() }} />);
    expect(await screen.findByTestId('digital-id-card')).toBeInTheDocument();
    expect(screen.getByText('SK-VNR-4821')).toBeInTheDocument();
    // Issued, but no live code in memory: the stale note, never a stale code; replace / revoke stay.
    expect(screen.getByTestId('digital-id-stale')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: translate('en', 'id.replace') })).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('digital-id-pass'));
    expect(pass).toHaveBeenCalled();
    expect(await screen.findByText('Campus group policy')).toBeInTheDocument();
  });

  it('native: the same view; not issued offers Create', async () => {
    serve({ '/identity': { ...identity, issued: false }, '/health/policies': { items: [] } });
    render(<DigitalIdRoute links={{}} />);
    expect(await screen.findByRole('button', { name: translate('en', 'id.create') })).toBeInTheDocument();
  });
});

describe('Cover & claims', () => {
  it('shows the policy as recorded and each claim as prepared, not sent', async () => {
    serve({ '/health/policies': { items: [{ id: 'p', insurer: 'Campus group policy', policyNumber: 'SK-GRP-1', sumInsured: 100000, validUntil: '2999-01-01', verification: 'USER' }] },
      '/insurance/claims': { items: [{ id: 'c', policyId: 'p', providerName: 'Apollo', service: 'Vitamin panel', amountPaise: 129900, status: 'DRAFT', createdAt: secondsAgo(1) }] } });
    render(<ClaimsHubBoard links={{ newClaim: vi.fn() }} />);
    expect(await screen.findByText('₹1,00,000')).toBeInTheDocument();
    expect(await screen.findByText(en('pb.claims.notSent'))).toBeInTheDocument();
    expect(screen.getByText('₹1,299')).toBeInTheDocument();
    // No remaining-cover figure the app cannot know.
    expect(screen.queryByText(/remaining/i)).toBeNull();
  });

  it('no policy: says so, with one way forward', async () => {
    serve({ '/health/policies': { items: [] }, '/insurance/claims': { items: [] } });
    const newClaim = vi.fn();
    render(<ClaimsHubBoard links={{ newClaim }} />);
    fireEvent.click(await screen.findByRole('button', { name: en('pb.claims.addPolicy') }));
    expect(newClaim).toHaveBeenCalled();
  });
});

describe('Help centre', () => {
  it('filters the common questions, sends a message to support, and keeps crisis support in reach', async () => {
    serve({ '/support': { items: [] } });
    const links = { topic: { orders: vi.fn(), delete: vi.fn() }, crisis: vi.fn() };
    render(<HelpCentreBoard links={links} />);
    fireEvent.change(screen.getByTestId('help-search'), { target: { value: 'order' } });
    expect(screen.getByTestId('help-orders')).toBeInTheDocument();
    expect(screen.queryByTestId('help-delete')).toBeNull();
    fireEvent.click(screen.getByTestId('help-crisis'));
    expect(links.crisis).toHaveBeenCalled();
    fireEvent.click(screen.getByTestId('help-message'));
    const form = screen.getByTestId('help-form');
    const [subject, message] = within(form).getAllByRole('textbox');
    fireEvent.change(subject, { target: { value: 'Late order' } });
    fireEvent.change(message, { target: { value: 'My order has not arrived yet.' } });
    fireEvent.click(within(form).getByRole('button', { name: translate('en', 'member.support.send') }));
    await waitFor(() => expect(api).toHaveBeenCalledWith('/support', expect.objectContaining({ method: 'POST' })));
    expect(await screen.findByText(en('pb.help.sent'))).toBeInTheDocument();
  });
});

describe('Preventive care', () => {
  it('lists vaccines as the directory records them, and never says one is due', async () => {
    serve({ '/preventive/vaccines': { items: [{ id: 'v', providerId: 'p', providerName: 'Apollo Gachibowli', vaccineName: 'Hepatitis B', pincode: '500090', region: 'Hyderabad', sourceUrl: 'https://example.org', bookingUrl: null, lastVerifiedAt: null, expiresAt: null, pricePaise: 42000, currency: 'INR', availability: 'UNKNOWN', verificationStatus: 'VERIFIED' }], total: 1, offset: 0, limit: 20 } });
    render(<PreventiveCareBoard links={{ camp: vi.fn() }} />);
    expect(await screen.findByText('Hepatitis B')).toBeInTheDocument();
    expect(screen.getByText(en('pb.prev.checkFirst'))).toBeInTheDocument();
    expect(screen.queryByText(/^DUE$|due within|overdue/i)).toBeNull();
  });
});

describe('Movement (Rule L: no targets, streaks or invented steps)', () => {
  it('counts the week’s real sessions and lists sourced guides', () => {
    const openGuide = vi.fn();
    render(<MovementBoard sessions={[{ id: 's', routineName: 'The desk-side reset', activeSeconds: 180, completedMoves: 4, skippedMoves: 0, finishedAt: new Date().toISOString() }]} loading={false} error="" onRetry={vi.fn()} links={{ openGuide }} />);
    expect(screen.getByText(en('pb.move.sessions', { count: 1 }))).toBeInTheDocument();
    expect(screen.queryByText(/steps|streak of|goal/i)).toBeNull();
    fireEvent.click(screen.getByTestId(`movement-guide-${routines[0].id}`));
    expect(openGuide).toHaveBeenCalledWith(routines[0]);
  });

  it('a quiet week is zero, not an error', () => {
    render(<MovementBoard sessions={[]} loading={false} error="" onRetry={vi.fn()} links={{ openGuide: vi.fn() }} />);
    expect(screen.getByText(en('pb.move.sessions', { count: 0 }))).toBeInTheDocument();
  });
});

describe('My requests and hostel visit', () => {
  it('lists requests with their status, expands one, and offers the three kinds of request', async () => {
    serve({ '/my-requests': { items: [{ kind: 'HOSTEL_VISIT', id: 'h1', title: 'Nurse visit', status: 'REQUESTED', createdAt: secondsAgo(1), detail: { hostelBlock: 'B', room: '214', windowStart: secondsAgo(-1), windowEnd: secondsAgo(-1) + 3600 } }] } });
    const links = { newReturn: vi.fn(), newHostelVisit: vi.fn(), newRefill: vi.fn(), crisis: vi.fn() };
    render(<MyRequestsRoute links={links} />);
    const head = await screen.findByRole('button', { name: /Nurse visit/ });
    expect(head).toHaveAttribute('aria-expanded', 'false');
    fireEvent.click(head);
    expect(head).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('link', { name: translate('en', 'req.cancel') })).toBeInTheDocument();
    fireEvent.click(screen.getByText(en('pb.req.emergency').trim()));
    expect(links.crisis).toHaveBeenCalled();
  });

  it('hostel visit: emergency first, then what and where before when', async () => {
    serve({});
    api.mockImplementation(async () => ({ items: [] }) as never);
    const crisis = vi.fn();
    render(<NewRequestRoute kind="HOSTEL_VISIT" links={{ done: vi.fn(), crisis }} />);
    fireEvent.click(await screen.findByTestId('hostel-visit-crisis'));
    expect(crisis).toHaveBeenCalled();
    const next = screen.getByTestId('hostel-visit-continue');
    expect(next).toHaveAttribute('aria-disabled', 'true');
    fireEvent.click(screen.getByTestId('hostel-visit-NURSE_VISIT'));
    const [block, room] = screen.getAllByRole('textbox');
    fireEvent.change(block, { target: { value: 'Block B' } });
    fireEvent.change(room, { target: { value: '214' } });
    fireEvent.click(screen.getByTestId('hostel-visit-continue'));
    expect(await screen.findByText(en('pb.visit.when'))).toBeInTheDocument();
  });
});

describe('Leaving campus and notification settings (logic unchanged)', () => {
  it('leaving: shows what stays and what changes before anything is confirmed', async () => {
    serve({ '/campus/departure': { departure: null, campus: { university: 'VNR VJIET', status: 'VERIFIED' }, collegePlan: null, signsInWithCollegeEmail: false, today: '2026-10-21' } });
    render(<LeaveCampusRoute links={{ openRecords: vi.fn() }} />);
    expect(await screen.findByTestId('leave-campus-stays')).toBeInTheDocument();
    expect(screen.getByTestId('leave-campus-changes')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('leave-reason-PAUSING'));
    expect(screen.getByTestId('leave-reason-PAUSING')).toHaveAttribute('aria-checked', 'true');
  });

  it('settings: safety is always on and is not a switch; the stored switches are', async () => {
    serve({ '/notifications/preferences': { emailEnabled: true, pushEnabled: false, remindersEnabled: true, pickupLocationEnabled: false, ayushHistoryEnabled: false, timezone: 'Asia/Kolkata', quietStart: '23:00', quietEnd: '07:00' } });
    render(<NotificationSettingsRoute />);
    expect(await screen.findByText(en('pb.nset.quietRange', { from: '23:00', to: '07:00' }))).toBeInTheDocument();
    expect(within(screen.getByTestId('notification-settings-always')).queryByRole('switch')).toBeNull();
    expect(screen.getAllByRole('switch')).toHaveLength(3);
  });
});

describe('accessibility (axe) of the boards with data', () => {
  it.each([
    ['Your Care', () => { serve({ '/profile': { university: 'VNR VJIET' }, '/appointments': { items: [{ id: 'a1', slotStart: inDays(1), status: 'CONFIRMED', createdAt: 1 }] }, '/health/documents': { items: [], total: 3 }, '/records/shares': { items: [] }, '/health/exercise-sessions': { items: [] }, '/refills/plans': { items: [] }, '/lab-orders': { total: 0 }, '/billing/me': { benefits: { limit: 6, used: 3 } } }); return <YourCareBoard links={{ appointments: vi.fn(), records: vi.fn(), devices: vi.fn(), more: vi.fn() }} />; }, 'your-care-week'],
    ['Help centre', () => { serve({ '/support': { items: [{ id: 't', subject: 'Late order', message: 'x', status: 'OPEN', createdAt: 1 }] } }); return <HelpCentreBoard links={{ topic: { orders: vi.fn() }, crisis: vi.fn() }} />; }, 'help-centre'],
    ['Movement', () => <MovementBoard sessions={[]} loading={false} error="" onRetry={vi.fn()} links={{ openGuide: vi.fn(), log: vi.fn() }} />, 'movement-week'],
  ] as [string, () => React.ReactElement, string][])('%s has no axe violations', async (_name, make, ready) => {
    const { container } = render(make());
    await screen.findByTestId(ready);
    const violations = await axeViolations(container);
    expect(violations, describeViolations(violations)).toEqual([]);
  });
});
