import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { Linking } from 'react-native';
import * as http from '@/data/services/http';
import { translate } from '@/i18n';
import type { MessageKey } from '@/i18n';
import type { MemberIdentity, MemberProfile } from '@/data/types/workflowTypes';
import { axeViolations, describeViolations } from '@/test/axe';

vi.mock('@/data/services/http', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/data/services/http')>();
  return { ...actual, apiRequest: vi.fn() };
});
vi.mock('@/design-system/motion', async (importOriginal) => ({ ...(await importOriginal<typeof import('@/design-system/motion')>()), useReducedMotion: () => true }));
vi.mock('@/data/contexts/AuthContext', () => ({ useAuth: () => ({ user: { fullName: 'Asha R', email: '', phone: '' }, status: 'authenticated' }) }));

import { EmergencyCardBoard, maskMobile } from '../EmergencyCardBoard';
import { IceContactsBoard } from '../IceContactsBoard';
import { EmergencyCardViewModel } from '../../viewmodel/EmergencyCardViewModel';
import { SosView, elapsedClock } from '@/modules/m04-emergency/view/SosView';
import { emergencyStore } from '@/modules/m04-emergency/state/EmergencyStore';
import type { SosAlert } from '@/modules/m04-emergency/domain/Emergency';
import { CrisisSupportBoard } from '@/features/crisis/views/CrisisSupportBoard';
import { MyPassBoard, offlineMinutes, spokenCode } from '@/features/digital_id/views/MyPassBoard';
import { DeleteAccountView, graceDay } from '@/features/account/views/DeleteAccountView';
import { DeleteAccountViewModel } from '@/features/account/viewmodel/DeleteAccountViewModel';
import { publicSettingDefaults } from '@/generated/settings';
import { LegalBoard } from '@/features/legal/views/LegalBoard';
import { PlanBillingBoard } from '@/features/billing/views/PlanBillingBoard';
import { FamilyCircleBoard } from '@/features/vault/views/FamilyCircleBoard';
import { ConsentInboxBoard, daysLeft } from '@/features/vault/views/ConsentInboxBoard';

const api = vi.mocked(http.apiRequest);
const en = (key: MessageKey, vars?: Record<string, string | number>) => translate('en', key, vars);
type Requester = typeof http.apiRequest;

/** Path prefix → response; an Error rejects; unknown paths never resolve. */
function serve(table: Record<string, unknown>) {
  api.mockImplementation(async (path: string) => {
    const key = Object.keys(table).sort((a, b) => b.length - a.length).find((prefix) => path.startsWith(prefix));
    if (key === undefined) return new Promise(() => undefined);
    const value = table[key];
    if (value instanceof Error) throw value;
    return value as never;
  });
}

const profile = (over: Partial<MemberProfile> = {}): MemberProfile => ({
  id: 'u1', fullName: 'Asha Rao', role: 'STUDENT', email: '', phone: '', dob: '', university: 'VNR VJIET', rollNumber: '',
  bloodGroup: '', ageVerified: true, isVerifiedStudent: true, emergencyContactName: '', emergencyContactPhone: '',
  emergencyContactRelation: '', allergies: [], chronicConditions: [], updatedAt: null, hostelBlock: 'Block B', room: '214', ...over,
});

function profileApi(initial: MemberProfile, onPatch: (body: Record<string, unknown>) => MemberProfile) {
  return vi.fn(async (_path: string, init?: RequestInit) => {
    if (init?.method === 'PATCH') return onPatch(JSON.parse(String(init.body)));
    return initial;
  }) as unknown as Requester;
}

let openURL: ReturnType<typeof vi.spyOn>;
beforeEach(() => {
  api.mockReset();
  openURL = vi.spyOn(Linking, 'openURL').mockResolvedValue(undefined);
  Object.defineProperty(navigator, 'onLine', { configurable: true, value: true });
});
afterEach(() => { cleanup(); openURL.mockRestore(); vi.useRealTimers(); });

describe('EmergencyCard (Tier 1)', () => {
  const links = { contacts: vi.fn() };

  it('shows only the student’s own profile, with nothing invented, and no offline promise', async () => {
    const vm = new EmergencyCardViewModel(profileApi(profile(), (b) => profile(b as Partial<MemberProfile>)));
    await vm.load();
    render(<EmergencyCardBoard vm={vm} links={links} />);
    expect(screen.getByText('Asha Rao')).toBeInTheDocument();
    expect(screen.getByTestId('card-missing-blood')).toBeInTheDocument();
    expect(within(screen.getByTestId('card-blood')).getByText(en('sf.card.notSet'))).toBeInTheDocument();
    expect(screen.getByTestId('card-no-contact')).toBeInTheDocument();
    // D6-2: the card is not stored on the phone, so it never claims to work offline.
    expect(screen.queryByText(/stored on this phone/i)).toBeNull();
    expect(screen.queryByText(/penicillin/i)).toBeNull();
  });

  it('reads blood group as words and allergies as a clinical alert', async () => {
    const vm = new EmergencyCardViewModel(profileApi(profile({ bloodGroup: 'O+', allergies: ['Penicillin'], emergencyContactName: 'Amma', emergencyContactPhone: '9876543210', emergencyContactRelation: 'Parent' }), (b) => profile(b as Partial<MemberProfile>)));
    await vm.load();
    render(<EmergencyCardBoard vm={vm} links={links} />);
    expect(screen.getByText(en('sf.blood.oPos'))).toBeInTheDocument();
    expect(screen.getByText('Penicillin')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: en('sf.card.callContact', { name: 'Amma' }) }));
    expect(openURL).toHaveBeenCalledWith('tel:+919876543210');
    expect(maskMobile('9876543210')).toBe('+91 98••• ••210');
  });

  it('Call 112 renders, is a labelled button reachable by keyboard, and needs no data at all', () => {
    const vm = new EmergencyCardViewModel((() => Promise.reject(new Error('offline'))) as unknown as Requester);
    render(<EmergencyCardBoard vm={vm} links={links} />);
    const call = screen.getByRole('button', { name: en('crisis.call112Spoken') });
    expect(call).toHaveAttribute('tabindex', '0');
    fireEvent.click(call);
    expect(openURL).toHaveBeenCalledWith('tel:112');
  });

  it('offline: says the card can’t load here and Call 112 still works', async () => {
    Object.defineProperty(navigator, 'onLine', { configurable: true, value: false });
    const vm = new EmergencyCardViewModel((() => Promise.reject(new Error('offline'))) as unknown as Requester);
    await vm.load();
    render(<EmergencyCardBoard vm={vm} links={links} />);
    expect(screen.getByTestId('card-offline')).toBeInTheDocument();
    expect(screen.getByTestId('card-call-112')).toBeInTheDocument();
  });

  it('fails closed: a failed save keeps the sheet open with the error and the old card', async () => {
    const vm = new EmergencyCardViewModel(profileApi(profile(), () => { throw new Error('down'); }));
    await vm.load();
    render(<EmergencyCardBoard vm={vm} links={links} />);
    fireEvent.click(screen.getByTestId('card-edit'));
    fireEvent.click(await screen.findByTestId('card-blood-A+'));
    fireEvent.click(screen.getByTestId('card-save'));
    expect(await screen.findByText(en('ice.saveFailed'))).toBeInTheDocument();
    expect(vm.saved?.bloodGroup).toBe('');
  });
});

describe('IceContacts (Tier 1)', () => {
  it('one real contact, what they see from what SOS sends, and the number check', async () => {
    const patches: Record<string, unknown>[] = [];
    const vm = new EmergencyCardViewModel(profileApi(profile({ emergencyContactName: 'Amma', emergencyContactPhone: '9876544417', emergencyContactRelation: 'Parent' }), (b) => { patches.push(b); return profile(b as Partial<MemberProfile>); }));
    await vm.load();
    render(<IceContactsBoard vm={vm} links={{}} />);
    expect(screen.getByTestId('ice-contact-row')).toHaveTextContent('Amma');
    expect(screen.getByLabelText(`${en('sf.ice.see.blood')}: ${en('sf.ice.never')}`)).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('ice-add'));
    const phone = await screen.findByLabelText(en('ice.contactPhone'));
    fireEvent.change(phone, { target: { value: '12345' } });
    expect(await screen.findByText(en('ice.contactPhoneError'))).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('ice-save'));
    expect(patches).toHaveLength(0);
  });
});

const alert = (over: Partial<SosAlert> = {}): SosAlert => ({
  id: 'a1', status: 'ACTIVE', campus: 'VNR VJIET', locationNote: 'Library, 2nd floor', createdAt: Date.now() / 1000 - 41,
  acknowledgedAt: null, resolvedAt: null, cancelledAt: null, resolutionNote: null,
  deliveries: [
    { recipientKind: 'CAMPUS_CONSOLE', channel: 'CONSOLE', recipient: 'VNR VJIET', status: 'SENT', detail: '' },
    { recipientKind: 'EMERGENCY_CONTACT', channel: 'WHATSAPP', recipient: 'Amma', status: 'FAILED', detail: 'WhatsApp delivery failed.' },
  ],
  ...over,
});

describe('SosBeacon / SosDebrief (Tier 1)', () => {
  beforeEach(() => emergencyStore.reset());

  it('beacon: live timer from the server start, the typed location, and only the server’s deliveries', async () => {
    serve({ '/emergency/sos/current': { alert: alert() } });
    render(<SosView signedIn links={{}} />);
    expect(await screen.findByTestId('sos-beacon')).toBeInTheDocument();
    expect(screen.getByText(/LIVE · 00:4[0-9]/)).toBeInTheDocument();
    expect(screen.getByTestId('sos-location')).toHaveTextContent('Library, 2nd floor');
    const rows = within(screen.getByTestId('sos-deliveries'));
    expect(rows.getByText(/Campus console/)).toBeInTheDocument();
    expect(rows.getByText(en('sos.status.FAILED'))).toBeInTheDocument();
    expect(screen.queryByText(/accurate to/i)).toBeNull();
    expect(screen.getByTestId('sos-call-112')).toBeInTheDocument();
    expect(elapsedClock(252)).toBe('04:12');
  });

  it('ending needs one confirm; a failed cancel keeps the SOS shown active with the error', async () => {
    serve({ '/emergency/sos/current': { alert: alert() }, '/emergency/sos/a1/cancel': new Error('down') });
    render(<SosView signedIn links={{}} />);
    fireEvent.click(await screen.findByTestId('sos-end'));
    expect(api.mock.calls.some(([path]) => String(path).includes('/cancel'))).toBe(false);
    fireEvent.click(await screen.findByTestId('sos-end-confirm'));
    await waitFor(() => expect(screen.getAllByText(en('sos.cancelFailed')).length).toBeGreaterThan(0));
    expect(screen.getByTestId('sos-beacon')).toBeInTheDocument();
  });

  it('debrief: who was alerted, crisis support, Call 112, and no invented counsellor or note', async () => {
    const closed = alert({ status: 'CANCELLED', cancelledAt: Date.now() / 1000 });
    serve({ '/emergency/sos/current': { alert: closed } });
    const crisis = vi.fn();
    render(<SosView signedIn links={{ crisis, home: vi.fn() }} />);
    expect(await screen.findByTestId('sos-debrief')).toBeInTheDocument();
    expect(screen.getByText(en('sf.sos.markedSafe'))).toBeInTheDocument();
    expect(screen.getByText(en('sf.sos.consoleTold'))).toBeInTheDocument();
    expect(screen.queryByText(/counsellor check-in/i)).toBeNull();
    fireEvent.click(screen.getByTestId('sos-crisis'));
    expect(crisis).toHaveBeenCalled();
    expect(screen.getByTestId('sos-call-112')).toBeInTheDocument();
  });

  it('signed out: Call 112 with no request at all', () => {
    render(<SosView signedIn={false} links={{ signIn: vi.fn() }} />);
    expect(screen.getByRole('button', { name: en('crisis.call112Spoken') })).toBeInTheDocument();
    expect(api).not.toHaveBeenCalled();
  });
});

describe('CrisisSupport (Tier 1)', () => {
  it('renders with no request and no session, both numbers callable by keyboard', () => {
    const sos = vi.fn();
    render(<CrisisSupportBoard links={{ sos }} />);
    expect(api).not.toHaveBeenCalled();
    const tele = screen.getByRole('button', { name: en('crisis.callTeleManasSpoken') });
    const e112 = screen.getByRole('button', { name: en('crisis.call112Spoken') });
    expect(tele).toHaveAttribute('tabindex', '0');
    fireEvent.click(tele);
    fireEvent.click(e112);
    expect(openURL).toHaveBeenCalledWith('tel:14416');
    expect(openURL).toHaveBeenCalledWith('tel:112');
    expect(screen.getByTestId('crisis-privacy')).toHaveTextContent(en('sf.crisis.privacy'));
    // D6-3: no counsellor line or booking that goes nowhere.
    expect(screen.queryByText(/campus counsellor/i)).toBeNull();
    fireEvent.click(screen.getByTestId('crisis-sos-link'));
    expect(sos).toHaveBeenCalled();
  });

  it('has no axe violations', async () => {
    const { container } = render(<CrisisSupportBoard links={{ sos: vi.fn() }} />);
    const violations = await axeViolations(container);
    expect(violations, describeViolations(violations)).toEqual([]);
  });
});

describe('MyPass (Tier 1)', () => {
  const now = Math.floor(Date.now() / 1000);
  const identity = (over: Partial<MemberIdentity> = {}): MemberIdentity => ({
    memberId: 'm1', fullName: 'Asha Rao', university: 'VNR VJIET', rollNumber: '22071A05', campusStatus: 'VERIFIED',
    issued: true, issuedAt: now - 100, code: 'tok', passCode: '155433', expiresAt: now + 20, rotateSeconds: 30, qrMatrix: ['101', '010', '101'],
    passWindow: [], ...over,
  });

  it('shows the server’s code and QR, and never writes to storage', () => {
    const setItem = vi.spyOn(Storage.prototype, 'setItem');
    render(<MyPassBoard identity={identity()} links={{ digitalId: vi.fn() }} onRefresh={() => new Promise(() => undefined)} />);
    expect(screen.getByTestId('pass-code')).toHaveTextContent('155 433');
    expect(screen.getByTestId('pass-qr')).toBeInTheDocument();
    expect(screen.getByTestId('pass-history-empty')).toBeInTheDocument();
    expect(screen.queryByText(/this wasn’t me/i)).toBeNull();
    expect(setItem).not.toHaveBeenCalled();
    setItem.mockRestore();
    expect(spokenCode('123456')).toBe('123 456');
  });

  it('hides a stale code instead of leaving it up', () => {
    render(<MyPassBoard identity={identity({ expiresAt: now - 5, passWindow: [] })} links={{ digitalId: vi.fn() }} onRefresh={() => new Promise(() => undefined)} />);
    expect(screen.getByTestId('pass-stale')).toBeInTheDocument();
    expect(screen.queryByTestId('pass-code')).toBeNull();
  });

  it('counts offline minutes only from codes held in memory', () => {
    const window = Array.from({ length: 20 }, (_, i) => ({ step: i, token: `t${i}`, passCode: '000000', startsAt: now + i * 30, expiresAt: now + (i + 1) * 30, qrMatrix: ['1'] }));
    expect(offlineMinutes(identity({ passWindow: window }), now * 1000)).toBe(10);
    expect(offlineMinutes(identity({ passWindow: [], expiresAt: now - 1 }), now * 1000)).toBe(0);
  });
});

describe('DeleteAccount (Tier 1)', () => {
  const status = (over = {}) => ({ status: 'NONE', requestedAt: null, scheduledFor: null, archiveRetentionDays: 30, ...over });

  it('cannot submit without typing the word; the hard-time answer adds crisis lines but never blocks', async () => {
    const calls: string[] = [];
    const request = vi.fn(async (_p: string, init?: RequestInit) => {
      calls.push(init?.method ?? 'GET');
      return init?.method === 'POST' ? status({ status: 'PENDING', requestedAt: 1, scheduledFor: 1 + 7 * 86400 }) : status();
    }) as unknown as Requester;
    const vm = new DeleteAccountViewModel(request);
    await vm.load();
    render(<DeleteAccountView viewModel={vm} links={{ crisis: vi.fn(), exportData: vi.fn() }} />);
    expect(screen.getByTestId('delete-info')).toBeInTheDocument();
    expect(screen.getByText(en('del.p3days', { days: 30 }))).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('delete-continue'));
    fireEvent.click(screen.getByTestId('delete-confirm-button'));
    expect(calls).not.toContain('POST');
    fireEvent.click(screen.getByTestId('delete-reason-hard'));
    expect(screen.getByTestId('delete-crisis')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText(en('del.typeToConfirm', { word: 'DELETE' })), { target: { value: 'delete' } });
    fireEvent.click(screen.getByTestId('delete-confirm-button'));
    expect(await screen.findByTestId('delete-scheduled')).toBeInTheDocument();
    expect(calls).toContain('POST');
  });

  it('scheduled: day n of the server’s grace period; cancelling restores the account', async () => {
    const t0 = Date.now() / 1000 - 86400 * 1.5;
    const request = vi.fn(async (_p: string, init?: RequestInit) => (init?.method === 'DELETE' ? status({ status: 'CANCELLED' }) : status({ status: 'PENDING', requestedAt: t0, scheduledFor: t0 + 7 * 86400 }))) as unknown as Requester;
    const vm = new DeleteAccountViewModel(request);
    await vm.load();
    render(<DeleteAccountView viewModel={vm} links={{}} />);
    expect(screen.getByText(en('sf.del.dayOf', { day: 2, of: 7 }))).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('delete-keep'));
    expect(await screen.findByTestId('delete-cancelled')).toBeInTheDocument();
    expect(graceDay({ status: 'PENDING', requestedAt: null, scheduledFor: null, archiveRetentionDays: null }, 0)).toBeNull();
  });

  it('N in "day n of N" and the intro both read the grace-period setting, never a constant 7', async () => {
    const t0 = Date.now() / 1000 - 86400 * 1.5;
    expect(graceDay({ status: 'PENDING', requestedAt: t0, scheduledFor: t0 + 14 * 86400, archiveRetentionDays: 30, graceDays: 14 }, Date.now() / 1000)).toEqual({ day: 2, of: 14 });
    // Without the server's value, the registry default (privacy.deletion_grace_days) applies.
    expect(graceDay({ status: 'PENDING', requestedAt: t0, scheduledFor: t0 + 7 * 86400, archiveRetentionDays: 30 }, Date.now() / 1000)).toEqual({ day: 2, of: publicSettingDefaults['privacy.deletion_grace_days'] });
    const vm = new DeleteAccountViewModel(vi.fn(async () => status({ graceDays: 10 })) as unknown as Requester);
    await vm.load();
    render(<DeleteAccountView viewModel={vm} links={{}} />);
    expect(screen.getByText(en('sf.del.intro', { graceDays: 10 }))).toBeInTheDocument();
    expect(en('sf.del.intro', { graceDays: 10 })).toContain('10');
  });
});

describe('Legal (Tier 1)', () => {
  const unpublished = (kind: string) => ({ kind, published: false, version: null, title: null, body: null, publishedAt: null });

  it('each tab says plainly what is not published, and the 112 line ships now', async () => {
    serve({ '/legal/PRIVACY_NOTICE': unpublished('PRIVACY_NOTICE'), '/legal/TERMS': unpublished('TERMS'), '/legal/GRIEVANCE_OFFICER': unpublished('GRIEVANCE_OFFICER') });
    render(<LegalBoard links={{ help: vi.fn() }} />);
    expect(screen.getByTestId('legal-emergency')).toHaveTextContent(en('sf.legal.notEmergency'));
    expect(await screen.findByText(en('member.legal.privacyNotPublished'))).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('legal-tab-grievance'));
    expect(await screen.findByText(en('sf.legal.officerNotAppointed'))).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('legal-tab-terms'));
    expect(await screen.findByText(en('member.legal.termsNotPublished'))).toBeInTheDocument();
  });

  it('shows the published text with its version once a super admin publishes it', async () => {
    serve({ '/legal/PRIVACY_NOTICE': { kind: 'PRIVACY_NOTICE', published: true, version: '2026-11-01', title: 'Privacy notice', body: 'First.\n\nSecond.', publishedAt: 1_760_000_000 } });
    render(<LegalBoard links={{ help: vi.fn() }} />);
    expect(await screen.findByText('First.')).toBeInTheDocument();
    expect(screen.getByText('Second.')).toBeInTheDocument();
    expect(screen.getByText(/Version 2026-11-01/)).toBeInTheDocument();
    expect(screen.queryByText(en('member.legal.privacyNotPublished'))).toBeNull();
  });
});

describe('PlanBilling (Tier 1)', () => {
  const me = {
    effectivePlanId: 'FREE', status: 'ACTIVE', periodStart: 0, periodEnd: 0, cancelAtPeriodEnd: false, checkoutAvailable: false,
    organizationPlan: null, benefits: { limit: 0, used: 0 },
    plan: { id: 'FREE', name: 'Free Student Account', price: 0, period: 'month', audience: '', benefits: ['Personal health records'], description: 'Server description' },
    receipts: [{ invoiceId: 'inv_1', amountPaise: 9900, currency: 'INR', paidAt: 1_700_000_000, refundedPaise: 0, periodStart: 0, periodEnd: 0 }],
  };

  it('not-connected card when checkout is off; plan, benefits and amounts only from the server', async () => {
    serve({ '/billing/me': me });
    const support = vi.fn();
    render(<PlanBillingBoard links={{ support }} />);
    expect(await screen.findByTestId('plan-name')).toHaveTextContent('Free Student Account');
    expect(screen.getByText('Personal health records')).toBeInTheDocument();
    expect(screen.getByTestId('plan-not-connected')).toBeInTheDocument();
    expect(screen.queryByTestId('plan-upgrade')).toBeNull();
    expect(screen.getByText('₹99')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('plan-support'));
    expect(support).toHaveBeenCalled();
  });

  it('load failure is an error state, not an empty plan', async () => {
    serve({ '/billing/me': new Error('down') });
    render(<PlanBillingBoard links={{ support: vi.fn() }} />);
    expect(await screen.findByText(en('sf.plan.failedTitle'))).toBeInTheDocument();
  });
});

describe('FamilyCircle (Tier 1)', () => {
  it('draws no switches that change nothing, and says nothing is shared', () => {
    render(<FamilyCircleBoard links={{ emergencyCard: vi.fn(), consent: vi.fn() }} />);
    expect(screen.queryAllByRole('switch')).toHaveLength(0);
    expect(screen.getByText(en('fam.unavailable'))).toBeInTheDocument();
    expect(screen.getByTestId('family-pays')).toBeInTheDocument();
  });
});

describe('ConsentInbox (Tier 1)', () => {
  const share = { id: 's1', clinician: 'Dr. A. Reddy', document: 'Vitamin D result', grantedAt: 0, expiresAt: Date.now() / 1000 + 14 * 86400 + 60, revoked: false, active: true };

  it('active shares from the server; a failed revoke leaves the share active and says so', async () => {
    serve({ '/records/shares/s1/revoke': new Error('down'), '/records/shares': { items: [share, { ...share, id: 's2', active: false }] } });
    render(<ConsentInboxBoard links={{ records: vi.fn() }} />);
    expect(await screen.findByTestId('consent-share-s1')).toHaveTextContent('Dr. A. Reddy');
    expect(screen.queryByTestId('consent-share-s2')).toBeNull();
    expect(screen.getByTestId('consent-share-s1')).toHaveTextContent('14 days left');
    fireEvent.click(screen.getByTestId('consent-revoke-s1'));
    fireEvent.click(await screen.findByTestId('consent-revoke-confirm'));
    await waitFor(() => expect(screen.getAllByText(en('sf.consent.revokeFailed')).length).toBeGreaterThan(0));
    expect(screen.getByTestId('consent-share-s1')).toBeInTheDocument();
    expect(daysLeft(100 + 3 * 86400, 100)).toBe(3);
  });

  it('revoking needs no reason and reloads from the server', async () => {
    let revoked = false;
    api.mockImplementation(async (path: string, init?: RequestInit) => {
      if (String(path).endsWith('/revoke') && init?.method === 'POST') { revoked = true; return { success: true } as never; }
      return { items: revoked ? [] : [share] } as never;
    });
    render(<ConsentInboxBoard links={{ records: vi.fn() }} />);
    fireEvent.click(await screen.findByTestId('consent-revoke-s1'));
    await act(async () => { fireEvent.click(await screen.findByTestId('consent-revoke-confirm')); });
    expect(await screen.findByText(en('sf.consent.revoked'))).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByTestId('consent-share-s1')).toBeNull());
  });
});

describe('Nearest hospitals on the SOS surfaces (plan tier1-care-directory-2026-10-21 §3)', () => {
  beforeEach(() => emergencyStore.reset());

  it('signed out: after Call 112, and only when the screen is given the link', () => {
    const nearestHospitals = vi.fn();
    render(<SosView signedIn={false} links={{ signIn: vi.fn(), nearestHospitals }} />);
    fireEvent.click(screen.getByTestId('sos-find-care'));
    expect(nearestHospitals).toHaveBeenCalledTimes(1);
    cleanup();
    render(<SosView signedIn={false} links={{ signIn: vi.fn() }} />);
    expect(screen.queryByTestId('sos-find-care')).toBeNull();
  });

  it('never on an active alert, where the student should stay', async () => {
    serve({ '/emergency/sos/current': { alert: alert() } });
    render(<SosView signedIn links={{ nearestHospitals: vi.fn() }} />);
    expect(await screen.findByTestId('sos-beacon')).toBeInTheDocument();
    expect(screen.queryByTestId('sos-find-care')).toBeNull();
  });

  it('after an SOS ends, beside Call 112', async () => {
    serve({ '/emergency/sos/current': { alert: alert({ status: 'CANCELLED', cancelledAt: Date.now() / 1000 }) } });
    render(<SosView signedIn links={{ nearestHospitals: vi.fn() }} />);
    expect(await screen.findByTestId('sos-debrief')).toBeInTheDocument();
    expect(screen.getByTestId('sos-find-care')).toHaveTextContent(en('fc.nearestHospitals'));
  });

  it('the emergency card links to it under Call 112', async () => {
    const vm = new EmergencyCardViewModel(profileApi(profile(), (b) => profile(b as Partial<MemberProfile>)));
    await vm.load();
    const nearestHospitals = vi.fn();
    render(<EmergencyCardBoard vm={vm} links={{ contacts: vi.fn(), nearestHospitals }} />);
    fireEvent.click(screen.getByTestId('card-find-care'));
    expect(nearestHospitals).toHaveBeenCalledTimes(1);
  });
});
