import React from 'react';
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/design-system/motion', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/design-system/motion')>()),
  useReducedMotion: () => true,
}));
vi.mock('@/data/services/http', async (importOriginal) => ({ ...(await importOriginal<typeof import('@/data/services/http')>()), apiRequest: vi.fn() }));
vi.mock('@/data/contexts/AuthContext', () => ({ useAuth: () => ({ user: { fullName: 'Asha Rao', isVerifiedStudent: true }, updateUser: vi.fn(), logout: vi.fn() }) }));

import { apiRequest } from '@/data/services/http';
import { LanguageProvider, translate } from '@/i18n';
import { ThemeProvider } from '@/theme/tokens/theme';
import { M2SosProvider } from '@/design-system/m2';
import { fakeRequest } from '@/features/phoneKit/__tests__/fixtures';
import type { MemberProfile } from '@/data/types/workflowTypes';
import { axeViolations, describeViolations } from '@/test/axe';
import { ProfileViewModel } from '../viewmodel/ProfileViewModel';
import { M2ProfileView } from '../views/M2ProfileView';
import type { M2ProfileLinks } from '../views/M2ProfileView';
import { AccountDetailsCard } from '../views/AccountDetailsCard';
import type { AccountDetailsLinks } from '../views/AccountDetailsCard';

/** Profile laid out wide with "Account details" (Tier 1 parity plan 2026-10-24 §1, §11). */
const en = (key: Parameters<typeof translate>[1], vars?: Parameters<typeof translate>[2]) => translate('en', key, vars);
const settle = async () => { await act(async () => { for (let i = 0; i < 8; i += 1) await Promise.resolve(); }); };
afterEach(() => { cleanup(); vi.mocked(apiRequest).mockReset(); });

const PROFILE: MemberProfile = {
  id: 'u1', fullName: 'Asha Rao', role: 'STUDENT', email: 'asha@vnr.in', phone: '+91 98765 43210', dob: '2004-01-02', university: 'VNR VJIET',
  rollNumber: '21B01', bloodGroup: 'B+', ageVerified: true, isVerifiedStudent: true, emergencyContactName: '', emergencyContactPhone: '',
  emergencyContactRelation: '', allergies: [], chronicConditions: [], updatedAt: null, hostelBlock: 'Block C', room: '',
};
const ROUTES = {
  '/profile': PROFILE,
  '/body/measurements': { height: null, weight: null },
  '/health/documents': { items: [], total: 3, categoryCounts: { LAB: 2, PRESCRIPTION: 1 } },
  '/billing/plans': { plans: [] },
  '/identity': { campusStatus: 'VERIFIED' },
  '/points/me': { balance: 240, redeemable: false },
  '/notifications/preferences': { pushEnabled: true, emailEnabled: false, remindersEnabled: true },
};

function links(): M2ProfileLinks {
  return { settings: vi.fn(), account: vi.fn(), emergencyCard: vi.fn(), pass: vi.fn(), documents: vi.fn(), orders: vi.fn(), privacy: vi.fn(), signOut: vi.fn() };
}
function accountLinks(): AccountDetailsLinks {
  return { verify: vi.fn(), rewards: vi.fn(), notifications: vi.fn(), privacy: vi.fn(), leaveCampus: vi.fn(), deleteAccount: vi.fn(), digitalId: vi.fn() };
}

async function desktop(routes: Record<string, unknown> = ROUTES) {
  const { request } = fakeRequest(routes);
  vi.mocked(apiRequest).mockImplementation(request);
  const vm = new ProfileViewModel(request);
  vm.load();
  const l = links();
  const a = accountLinks();
  const utils = render(
    <ThemeProvider><LanguageProvider>
      <M2ProfileView vm={vm} links={l} wide accountDetails={
        <AccountDetailsCard profile={vm.profile.data ?? null} profileFailed={vm.profile.phase === 'error'} onRetryProfile={vi.fn()} onEdited={vi.fn()} links={a} />
      } />
    </LanguageProvider></ThemeProvider>,
  );
  await settle();
  return { vm, links: l, account: a, ...utils };
}

describe('Profile wide (§11)', () => {
  it('desktop: the same view with the hero, vitals beside On campus, documents as cards, settings beside Account details; no SOS of its own', async () => {
    const { container } = await desktop();
    expect(await screen.findByTestId('m2-prof-row-vitals')).toContainElement(screen.getByTestId('m2-prof-blood'));
    expect(screen.getByTestId('m2-prof-row-vitals')).toContainElement(screen.getByTestId('m2-prof-emergency'));
    expect(screen.getByTestId('m2-prof-docs')).toContainElement(screen.getByTestId('m2-prof-doc-lab'));
    expect(screen.getByTestId('m2-prof-row-settings')).toContainElement(screen.getByTestId('m2-prof-account'));
    expect(screen.queryByTestId('m2-prof-sos')).toBeNull();
    const v = await axeViolations(container);
    expect(v, describeViolations(v)).toEqual([]);
  }, 20_000);

  it('Account details carries the web Account page’s rows as stored, with no edit on the sign-in contact and ABHA as not available', async () => {
    const { rerender, vm } = await desktop();
    // The card reads /profile through the view-model; re-render once it is in.
    rerender(
      <ThemeProvider><LanguageProvider>
        <M2ProfileView vm={vm} links={links()} wide accountDetails={
          <AccountDetailsCard profile={vm.profile.data ?? null} profileFailed={false} onRetryProfile={vi.fn()} onEdited={vi.fn()} links={accountLinks()} />
        } />
      </LanguageProvider></ThemeProvider>,
    );
    await settle();
    const card = screen.getByTestId('m2-prof-account-contact');
    expect(within(card).getByText('+91 98765 43210')).toBeInTheDocument();
    expect(within(card).getByText('asha@vnr.in')).toBeInTheDocument();
    expect(within(card).getByText(en('sw.account.campusVerified', { campus: 'VNR VJIET' }))).toBeInTheDocument();
    expect(within(card).getByText(en('shell.unavailable'))).toBeInTheDocument();
    expect(within(card).getByText(en('sw.account.checksDone', { done: 2, total: 2 }))).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: new RegExp(`: ${en('sw.account.mobile')}`) })).toBeNull();
    expect(screen.getByText(en('sw.account.points', { count: 240 }))).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: `${en('sw.account.add')}: ${en('sw.account.emergency')}` }));
    expect(screen.getByRole('dialog', { name: en('sw.account.editTitle') })).toBeInTheDocument();
  });

  it('no clinician banner, and one Sign out', async () => {
    const { links: l } = await desktop();
    expect(screen.queryByText(en('sw.account.clinTitle'))).toBeNull();
    const out = screen.getAllByRole('button', { name: en('home.signOut') });
    expect(out).toHaveLength(1);
    fireEvent.click(out[0] as HTMLElement);
    expect(l.signOut).toHaveBeenCalledTimes(1);
  });

  it('profile and points failing: each card says so on its own, Privacy, Leave campus and Delete stay reachable', async () => {
    const { account } = await desktop({ ...ROUTES, '/profile': new Error('down'), '/points/me': new Error('down') });
    expect(screen.getByTestId('m2-prof-identity-retry')).toBeInTheDocument();
    expect(screen.getByText(en('sw.account.pointsError'))).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('m2-prof-account-delete'));
    fireEvent.click(screen.getByTestId('m2-prof-account-leave-campus'));
    expect(account.deleteAccount).toHaveBeenCalled();
    expect(account.leaveCampus).toHaveBeenCalled();
  });

  it('phone: one SOS, the shell’s', async () => {
    const { request } = fakeRequest(ROUTES);
    const vm = new ProfileViewModel(request);
    vm.load();
    const sos = vi.fn();
    render(<LanguageProvider><M2SosProvider value={sos}><M2ProfileView vm={vm} links={links()} /></M2SosProvider></LanguageProvider>);
    await settle();
    const buttons = screen.getAllByTestId('m2-prof-sos');
    expect(buttons).toHaveLength(1);
    fireEvent.click(buttons[0] as HTMLElement);
    expect(sos).toHaveBeenCalledTimes(1);
    expect(screen.queryByTestId('m2-prof-account')).toBeNull();
  });
});
