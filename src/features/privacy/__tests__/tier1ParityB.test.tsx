import React from 'react';
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/design-system/motion', async (importOriginal) => ({ ...(await importOriginal<typeof import('@/design-system/motion')>()), useReducedMotion: () => true }));
vi.mock('@/data/services/http', async (importOriginal) => ({ ...(await importOriginal<typeof import('@/data/services/http')>()), apiRequest: vi.fn() }));
vi.mock('@/lib/utils/workflowRouting', async (importOriginal) => ({ ...(await importOriginal<typeof import('@/lib/utils/workflowRouting')>()), navigate: vi.fn() }));
vi.mock('@/data/contexts/AuthContext', () => ({ useAuth: () => ({ user: { fullName: 'Asha Rao', role: 'STUDENT', isVerifiedStudent: true, twoFactorSetupRequired: false }, updateUser: vi.fn(), logout: vi.fn(), status: 'authenticated' }) }));

import { apiRequest } from '@/data/services/http';
import { LanguageProvider, translate } from '@/i18n';
import type { Lang, MessageKey } from '@/i18n';
import { M2SosProvider } from '@/design-system/m2';
import { axeViolations, describeViolations } from '@/test/axe';
import type { MemberIdentity, MemberProfile } from '@/data/types/workflowTypes';
import { PrivacyConsentView } from '../PrivacyConsentView';
import { DataRightsView } from '../DataRightsView';
import type { ConsentOverview, LegalDocument } from '../privacyRepository';
import { ConsentInboxBoard } from '@/features/vault/views/ConsentInboxBoard';
import { FamilyCircleBoard } from '@/features/vault/views/FamilyCircleBoard';
import { DeleteAccountView } from '@/features/account/views/DeleteAccountView';
import { DeleteAccountViewModel } from '@/features/account/viewmodel/DeleteAccountViewModel';
import { LeaveCampusView } from '@/features/campus/views/LeaveCampusView';
import { LeaveCampusViewModel } from '@/features/campus/viewmodel/LeaveCampusViewModel';
import { EmergencyCardBoard } from '@/features/emergency/views/EmergencyCardBoard';
import { EmergencyCardViewModel } from '@/features/emergency/viewmodel/EmergencyCardViewModel';
import { SignInSecurityView } from '@/features/account/views/SignInSecurityView';
import { TwoFactorViewModel } from '@/features/account/viewmodel/TwoFactorViewModel';
import { IdentityVerifyPanel } from '@/features/auth/views/IdentityVerifyPanel';
import { IdentityVerifyViewModel } from '@/features/auth/viewmodel/IdentityVerifyViewModel';

/**
 * Tier 1 parity, package B (docs/plans/tier1-parity-2026-10-24.md §13–21,
 * Tier 1 boards approved by Krishna Chintakayala 2026-10-24): every screen
 * renders at phone and desktop widths, draws exactly one SOS on the phone
 * (the shell's) and none of its own on the desktop (the top bar has it), and
 * keeps the states and wording the plan says do not change.
 */
type Requester = typeof apiRequest;
const api = vi.mocked(apiRequest);
const en = (key: MessageKey, vars?: Record<string, string | number>) => translate('en', key, vars);
const SIGNED_UP = 1_760_000_000;

function serve(table: Record<string, unknown>) {
  api.mockImplementation(async (path: string, init?: RequestInit) => {
    const key = Object.keys(table).sort((a, b) => b.length - a.length).find((prefix) => path.startsWith(prefix));
    if (key === undefined) return new Promise(() => undefined);
    const value = table[key];
    const result = typeof value === 'function' ? (value as (p: string, i?: RequestInit) => unknown)(path, init) : value;
    if (result instanceof Error) throw result;
    return result as never;
  });
}

const profile = (over: Partial<MemberProfile> = {}): MemberProfile => ({
  id: 'u1', fullName: 'Asha Rao', role: 'STUDENT', email: '', phone: '', dob: '', university: 'VNR VJIET', rollNumber: 'R1',
  bloodGroup: '', ageVerified: true, isVerifiedStudent: true, emergencyContactName: '', emergencyContactPhone: '',
  emergencyContactRelation: '', allergies: [], chronicConditions: [], updatedAt: null, hostelBlock: 'Block B', room: '214', ...over,
});

function overview(ayushOn: boolean): ConsentOverview {
  return {
    required: { purposes: ['RECORDS_STORAGE', 'CAMPUS_ENROLMENT', 'ADULT_18_PLUS'], version: 'signup-2026-10-16b', language: 'en', givenAt: SIGNED_UP, noticeVersion: '2', termsVersion: '2' },
    optional: [
      { purpose: 'AYUSH_HISTORY', on: ayushOn, canGiveHere: true, version: ayushOn ? 'optional-1' : null, givenAt: ayushOn ? SIGNED_UP : null, withdrawnAt: null },
      { purpose: 'BLOOD_DONOR_CONTACT', on: false, canGiveHere: false, version: null, givenAt: null, withdrawnAt: null },
      { purpose: 'SEASONAL_EDUCATION', on: false, canGiveHere: true, version: null, givenAt: null, withdrawnAt: SIGNED_UP + 86400 },
    ],
    history: [
      { purposes: ['RECORDS_STORAGE', 'CAMPUS_ENROLMENT', 'ADULT_18_PLUS'], version: 'signup-2026-10-16b', givenAt: SIGNED_UP, withdrawnAt: null },
      { purposes: ['SEASONAL_EDUCATION'], version: 'optional-1', givenAt: SIGNED_UP, withdrawnAt: SIGNED_UP + 86400 },
    ],
  };
}

const sosCount = () => screen.queryAllByRole('button', { name: en('m2.sosSpoken') }).length;
const axeClean = async (container: Element) => { const v = await axeViolations(container); expect(v, describeViolations(v)).toEqual([]); };
const withLang = (ui: React.ReactElement, lang: Lang = 'en') => <LanguageProvider initial={lang}>{ui}</LanguageProvider>;
const onPhone = (ui: React.ReactElement, sos = vi.fn()) => withLang(<M2SosProvider value={sos}>{ui}</M2SosProvider>);

beforeEach(() => { api.mockReset(); });
afterEach(() => cleanup());

describe('Privacy & consent (§13)', () => {
  const repo = (data: ConsentOverview) => ({ consents: vi.fn().mockResolvedValue(data), change: vi.fn().mockResolvedValue(data) });

  it('desktop: required beside optional, the full record as a timeline with still-on and withdrawn rows, no SOS of its own', async () => {
    const { container } = render(withLang(<PrivacyConsentView repository={repo(overview(true))} wide />));
    expect(await screen.findByTestId('privacy-required')).toBeInTheDocument();
    expect(screen.getByTestId('privacy-optional')).toBeInTheDocument();
    const timeline = screen.getByTestId('privacy-timeline');
    expect(within(timeline).getAllByRole('listitem')).toHaveLength(2);
    expect(within(timeline).getAllByText(en('privacy.history.stillOn'))).toHaveLength(1);
    expect(within(timeline).getByText('optional-1')).toBeInTheDocument();
    expect(sosCount()).toBe(0);
    // Wording stays the catalogue's, byte for byte.
    for (const key of ['member.consent.store.title', 'member.consent.campus.title', 'member.consent.adult.title', 'privacy.required.withdrawBody'] as const) {
      expect(screen.getAllByText(en(key)).length).toBeGreaterThan(0);
    }
    await axeClean(container);
  });

  it('phone: one SOS from the shell; the switch reflects only the server reply', async () => {
    const sos = vi.fn();
    render(onPhone(<PrivacyConsentView repository={repo(overview(true))} />, sos));
    const ayush = await screen.findByRole('switch', { name: /Keep my Ayush chats On/ });
    expect(ayush).toHaveAttribute('aria-checked', 'true');
    expect(sosCount()).toBe(1);
    fireEvent.click(screen.getByTestId('privacy-header-sos'));
    expect(sos).toHaveBeenCalledTimes(1);
  });

  it.each(['te', 'hi'] as const)('%s: the required consent titles are the catalogue values', async (lang) => {
    render(withLang(<PrivacyConsentView repository={repo(overview(false))} />, lang));
    expect(await screen.findByText(translate(lang, 'member.consent.store.title'))).toBeInTheDocument();
    expect(screen.getByText(translate(lang, 'privacy.required.withdrawBody'))).toBeInTheDocument();
  });
});

describe('Data rights (§14)', () => {
  const unpublished: LegalDocument = { kind: 'GRIEVANCE_OFFICER', published: false, version: null, title: null, body: null, publishedAt: null };

  it('desktop: four rights in a row and the grievance card, unpublished; no SOS', async () => {
    const { container } = render(withLang(<DataRightsView loadLegal={vi.fn().mockResolvedValue(unpublished)} wide />));
    expect(await screen.findByTestId('grievance-unpublished')).toBeInTheDocument();
    for (const id of ['access', 'correct', 'erase', 'consent']) expect(screen.getByTestId(`right-${id}`)).toBeInTheDocument();
    expect(sosCount()).toBe(0);
    await axeClean(container);
  });

  it('grievance error offers a retry; phone has one SOS', async () => {
    const load = vi.fn().mockRejectedValueOnce(new Error('down')).mockResolvedValue(unpublished);
    render(onPhone(<DataRightsView loadLegal={load} />));
    expect(await screen.findByRole('alert')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: en('common.tryAgain') }));
    expect(await screen.findByTestId('grievance-unpublished')).toBeInTheDocument();
    expect(sosCount()).toBe(1);
  });
});

describe('Consent inbox (§15)', () => {
  const share = { id: 's1', clinician: 'Dr. A. Reddy', document: 'Vitamin D result', grantedAt: 0, expiresAt: Date.now() / 1000 + 6 * 86400 + 60, revoked: false, active: true };

  it('desktop: active shares left, awaiting right; the revoke confirm names the clinician and the document', async () => {
    serve({ '/records/shares': { items: [share] } });
    const { container } = render(withLang(<ConsentInboxBoard links={{ records: vi.fn() }} wide />));
    expect(await screen.findByTestId('consent-share-s1')).toHaveTextContent('6 days left');
    expect(screen.getByTestId('consent-awaiting-empty')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('consent-revoke-s1'));
    const sheet = await screen.findByTestId('consent-sheet');
    expect(sheet).toHaveTextContent(en('sf.consent.confirmTitle', { name: 'Dr. A. Reddy' }));
    expect(sheet).toHaveTextContent('Vitamin D result');
    expect(sosCount()).toBe(0);
    await axeClean(container);
  });

  it('phone: none shared offers the records, with one SOS', async () => {
    serve({ '/records/shares': { items: [] } });
    render(onPhone(<ConsentInboxBoard links={{ records: vi.fn() }} />));
    expect(await screen.findByTestId('consent-none')).toBeInTheDocument();
    expect(sosCount()).toBe(1);
  });
});

describe('Care circle (§16)', () => {
  it.each([false, true])('wide %s: no switch, both links go where they did', (wide) => {
    const emergencyCard = vi.fn(); const consent = vi.fn();
    render(wide ? withLang(<FamilyCircleBoard links={{ emergencyCard, consent }} wide />) : onPhone(<FamilyCircleBoard links={{ emergencyCard, consent }} />));
    expect(screen.queryAllByRole('switch')).toHaveLength(0);
    fireEvent.click(screen.getByTestId('family-open-card'));
    fireEvent.click(screen.getByTestId('family-open-consent'));
    expect(emergencyCard).toHaveBeenCalledTimes(1);
    expect(consent).toHaveBeenCalledTimes(1);
    expect(sosCount()).toBe(wide ? 0 : 1);
  });
});

describe('Sign-in & security (§17)', () => {
  const status = { enabled: false, required: false, setupRequired: false };

  it('desktop grid renders the two-step card, the lost-phone callout and the two "not available yet" cards; no SOS', async () => {
    const vm = new TwoFactorViewModel((async () => status) as unknown as Requester);
    await vm.load();
    const { container } = render(withLang(<SignInSecurityView viewModel={vm} wide />));
    expect(screen.getByTestId('two-step-card')).toBeInTheDocument();
    expect(screen.getByTestId('security-lost')).toHaveTextContent(en('sec.lost.title'));
    expect(screen.getByTestId('sessions-card')).toHaveTextContent(en('sec.sessions.unavailable'));
    expect(screen.getByTestId('history-card')).toHaveTextContent(en('sec.history.unavailable'));
    expect(sosCount()).toBe(0);
    await axeClean(container);
  });

  it('phone: one SOS; a failed load is an error card with a retry', async () => {
    const vm = new TwoFactorViewModel((async () => { throw new Error('down'); }) as unknown as Requester);
    await vm.load();
    render(onPhone(<SignInSecurityView viewModel={vm} />));
    expect(screen.getByText(en('sec.failedTitle'))).toBeInTheDocument();
    expect(sosCount()).toBe(1);
  });
});

describe('Verify identity (§18)', () => {
  const identity = (campusStatus: MemberIdentity['campusStatus']): MemberIdentity => ({ memberId: 'SK-1', fullName: 'Asha Rao', university: 'U', rollNumber: 'R1', campusStatus, issued: false, issuedAt: null });

  it.each([false, true])('wide %s: four checks, the ring, Get help now outside every state, one SOS on the phone only', async (wide) => {
    const vm = new IdentityVerifyViewModel((async () => identity('VERIFIED')) as unknown as Requester);
    await vm.load();
    const links = { back: vi.fn(), openCrisis: vi.fn() };
    const { container } = render(wide ? withLang(<IdentityVerifyPanel viewModel={vm} links={links} wide />) : onPhone(<IdentityVerifyPanel viewModel={vm} links={links} />));
    expect(screen.getByTestId('check-campus-done')).toBeInTheDocument();
    expect(screen.getByRole('img', { name: en('ident.verify.ring', { done: 1, total: 1 }) })).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('verify-get-help'));
    expect(links.openCrisis).toHaveBeenCalledTimes(1);
    expect(sosCount()).toBe(wide ? 0 : 1);
    await axeClean(container);
  });
});

describe('Delete account (§19)', () => {
  const status = (over = {}) => ({ status: 'NONE', requestedAt: null, scheduledFor: null, archiveRetentionDays: 30, ...over });

  it('desktop: the request needs the typed word; pending shows day n of N with the countdown; cancel is one tap', async () => {
    const calls: string[] = [];
    const request = vi.fn(async (_p: string, init?: RequestInit) => {
      calls.push(init?.method ?? 'GET');
      if (init?.method === 'POST') return status({ status: 'PENDING', requestedAt: Date.now() / 1000 - 86400 * 2.5, scheduledFor: Date.now() / 1000 + 86400 * 4.5 });
      if (init?.method === 'DELETE') return status({ status: 'CANCELLED' });
      return status();
    }) as unknown as Requester;
    const vm = new DeleteAccountViewModel(request);
    await vm.load();
    const links = { exportData: vi.fn(), crisis: vi.fn(), leaveCampus: vi.fn(), security: vi.fn(), shares: vi.fn(), support: vi.fn() };
    const { container } = render(withLang(<DeleteAccountView viewModel={vm} links={links} wide />));
    expect(screen.getByTestId('delete-info')).toBeInTheDocument();
    expect(screen.getByTestId('delete-not-ready')).toBeInTheDocument();
    expect(sosCount()).toBe(0);
    fireEvent.click(screen.getByTestId('delete-continue'));
    fireEvent.click(screen.getByTestId('delete-confirm-button'));
    expect(calls).not.toContain('POST');
    fireEvent.change(screen.getByLabelText(en('del.typeToConfirm', { word: 'DELETE' })), { target: { value: 'DELETE' } });
    fireEvent.click(screen.getByTestId('delete-confirm-button'));
    expect(await screen.findByTestId('delete-scheduled')).toBeInTheDocument();
    expect(screen.getByTestId('delete-countdown')).toHaveTextContent(en('sf.del.dayOf', { day: 3, of: 7 }));
    await axeClean(container);
    fireEvent.click(screen.getByTestId('delete-keep'));
    expect(await screen.findByTestId('delete-cancelled')).toBeInTheDocument();
    expect(calls).toContain('DELETE');
  });

  it('phone: the hard-time answer adds Tele-MANAS from the constant and never blocks; one SOS', async () => {
    const vm = new DeleteAccountViewModel((async () => status()) as unknown as Requester);
    await vm.load();
    render(onPhone(<DeleteAccountView viewModel={vm} links={{ crisis: vi.fn() }} />));
    fireEvent.click(screen.getByTestId('delete-reason-hard'));
    expect(screen.getByTestId('delete-crisis')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: en('crisis.callTeleManasSpoken') })).toBeInTheDocument();
    expect(screen.getByTestId('delete-continue')).toBeInTheDocument();
    expect(sosCount()).toBe(1);
  });
});

describe('Leave campus (§20)', () => {
  const state = (over = {}) => ({ departure: null, campus: { university: 'VNR VJIET', status: 'VERIFIED' }, collegePlan: { organization: 'VNR VJIET', planId: 'p' }, signsInWithCollegeEmail: true, today: '2026-10-24', ...over });

  it('desktop: what stays, what changes and good to know in a row; the email warning; submit needs a reason', async () => {
    const vm = new LeaveCampusViewModel((async () => state()) as unknown as Requester);
    await vm.load();
    const { container } = render(withLang(<LeaveCampusView viewModel={vm} links={{ openRecords: vi.fn(), openExport: vi.fn() }} wide />));
    expect(screen.getByTestId('leave-campus-stays')).toBeInTheDocument();
    expect(screen.getByTestId('leave-campus-changes')).toHaveTextContent(en('leave.c3', { org: 'VNR VJIET' }));
    expect(screen.getByTestId('leave-campus-know')).toBeInTheDocument();
    expect(screen.getByTestId('leave-campus-email')).toHaveTextContent(en('leave.emailWarnTitle'));
    expect(screen.getByTestId('leave-submit')).toHaveAttribute('aria-disabled', 'true');
    expect(sosCount()).toBe(0);
    await axeClean(container);
  });

  it('phone: scheduled shows the server date and undo; one SOS', async () => {
    const undone = vi.fn();
    const request = vi.fn(async (path: string, init?: RequestInit) => {
      if (String(path).endsWith('/cancel')) { undone(); return state(); }
      return init?.method ? state() : state({ departure: { effectiveOn: '2027-05-31', reason: 'GRADUATING', status: 'SCHEDULED' } });
    }) as unknown as Requester;
    const vm = new LeaveCampusViewModel(request);
    await vm.load();
    render(onPhone(<LeaveCampusView viewModel={vm} links={{ openRecords: vi.fn() }} />));
    expect(screen.getByTestId('leave-campus-scheduled')).toHaveTextContent('2027-05-31');
    expect(sosCount()).toBe(1);
    await act(async () => { fireEvent.click(screen.getByTestId('leave-undo')); });
    await waitFor(() => expect(undone).toHaveBeenCalled());
  });
});

describe('Emergency card (§21)', () => {
  const walletOff = { available: { apple: false, google: false }, fields: [], defaultFields: [], passes: [], googleConsentVersion: 'v', googleConsent: null };
  function cardApi(initial: MemberProfile, onPatch: (body: Record<string, unknown>) => MemberProfile | Error) {
    return vi.fn(async (path: string, init?: RequestInit) => {
      if (path.startsWith('/wallet')) return walletOff;
      if (init?.method === 'PATCH') { const out = onPatch(JSON.parse(String(init.body))); if (out instanceof Error) throw out; return out; }
      return initial;
    }) as unknown as Requester;
  }

  it('desktop: the editor beside the live card from the draft, readiness, and a save that sends only the profile fields', async () => {
    serve({ '/wallet': walletOff });
    const patches: Record<string, unknown>[] = [];
    const vm = new EmergencyCardViewModel(cardApi(profile({ allergies: ['Penicillin'] }), (b) => { patches.push(b); return profile({ bloodGroup: String(b.bloodGroup), allergies: ['Penicillin'] }); }));
    await vm.load();
    const { container } = render(withLang(<EmergencyCardBoard vm={vm} links={{ contacts: vi.fn(), nearestHospitals: vi.fn() }} wide />));
    const preview = screen.getByTestId('card-preview');
    expect(within(preview).getByText('Penicillin')).toBeInTheDocument();
    expect(within(preview).getByText(en('sf.card.notSet'))).toBeInTheDocument();
    expect(screen.getByTestId('card-readiness')).toHaveTextContent(en('swt.ice.ready', { percent: 0 }));
    expect(screen.getAllByRole('button', { name: en('crisis.call112Spoken') })).toHaveLength(1);
    expect(screen.queryByText(/stored on this phone|Works offline|QR code shows/i)).toBeNull();
    expect(sosCount()).toBe(0);
    fireEvent.click(screen.getByTestId('card-blood-O+'));
    expect(within(preview).getByText(en('sf.blood.oPos'))).toBeInTheDocument();
    expect(screen.getByTestId('card-readiness')).toHaveTextContent(en('swt.ice.ready', { percent: 50 }));
    expect(screen.getByTestId('card-unsaved')).toHaveTextContent(en('swt.ice.unsaved'));
    fireEvent.click(screen.getByTestId('card-save'));
    await waitFor(() => expect(patches).toHaveLength(1));
    expect(Object.keys(patches[0]).sort()).toEqual(['allergies', 'bloodGroup', 'chronicConditions', 'emergencyContactName', 'emergencyContactPhone', 'emergencyContactRelation']);
    expect(await screen.findByText(en('ice.saved'))).toBeInTheDocument();
    await axeClean(container);
  });

  it('desktop: a failed save never reads as saved, keeps the draft, and Call 112 stays through loading and error', async () => {
    const vm = new EmergencyCardViewModel(cardApi(profile(), () => new Error('down')));
    render(withLang(<EmergencyCardBoard vm={vm} links={{ contacts: vi.fn() }} wide />));
    expect(screen.getByRole('button', { name: en('crisis.call112Spoken') })).toBeInTheDocument();
    await act(async () => { await vm.load(); });
    fireEvent.click(screen.getByTestId('card-blood-A+'));
    fireEvent.click(screen.getByTestId('card-save'));
    expect(await screen.findByText(en('ice.saveFailed'))).toBeInTheDocument();
    expect(screen.queryByText(en('ice.saved'))).toBeNull();
    expect(vm.draft?.bloodGroup).toBe('A+');
    expect(vm.saved?.bloodGroup).toBe('');
    expect(screen.getByRole('button', { name: en('crisis.call112Spoken') })).toBeInTheDocument();

    cleanup();
    const failing = new EmergencyCardViewModel((async () => { throw new Error('down'); }) as unknown as Requester);
    await failing.load();
    render(withLang(<EmergencyCardBoard vm={failing} links={{ contacts: vi.fn() }} wide />));
    expect(screen.getByText(en('ice.failedTitle'))).toBeInTheDocument();
    expect(screen.getByRole('button', { name: en('crisis.call112Spoken') })).toBeInTheDocument();
  });

  it('phone: one SOS, Call 112 first, and Nearest hospitals as a row on a card (no navy-on-navy link)', async () => {
    const vm = new EmergencyCardViewModel(cardApi(profile(), () => profile()));
    await vm.load();
    const nearestHospitals = vi.fn();
    render(onPhone(<EmergencyCardBoard vm={vm} links={{ contacts: vi.fn(), nearestHospitals }} />));
    expect(sosCount()).toBe(1);
    expect(screen.getByTestId('card-call-112')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('card-find-care'));
    expect(nearestHospitals).toHaveBeenCalledTimes(1);
  });
});
