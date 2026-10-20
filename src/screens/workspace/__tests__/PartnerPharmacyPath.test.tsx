import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import type { AccountRole } from '../../../data/types/workflowTypes';

const auth: { user: { fullName: string; role: AccountRole; partnerKind?: string } | null } = { user: null };
const routerNavigate = vi.fn();

vi.mock('../../../theme/tokens/theme', () => ({ useTheme: () => ({ mode: 'light', setTheme: vi.fn() }) }));
vi.mock('../../../data/contexts/AuthContext', () => ({ useAuth: () => ({ user: auth.user, logout: vi.fn() }) }));
vi.mock('@/data/contexts/AuthContext', () => ({ useAuth: () => ({ user: auth.user, logout: vi.fn() }) }));
vi.mock('@/core/navigation', async (importOriginal) => ({ ...(await importOriginal<typeof import('@/core/navigation')>()), useNavigate: () => routerNavigate }));
vi.mock('@/core/storage/CrossPlatformStorage', () => ({ CrossPlatformStorage: { get: async () => '', set: async () => undefined } }));

const DISPENSE = {
  id: 'd1a2b3c4-0000', prescriptionId: 'p1', status: 'RX_ISSUED', verifiedBy: '', rejectionReason: '',
  substitutionNote: '', createdAt: 1_760_000_000, nextStates: ['RX_VERIFIED', 'REJECTED'],
  prescription: { id: 'p1', prescriberRegNo: 'NMC-12345', items: [{ id: 'i1', genericName: 'Amoxicillin', strength: '500mg', dose: '1 cap', frequency: 'TDS', quantity: 15, scheduleClass: 'H', registerRequired: false, substitutionAllowed: true }] },
};
const RETURN = { id: 'r1', orderLineId: 'line-0000ab12', item: 'ORS sachets', student: 'A. Student', reason: 'DAMAGED', note: null, hasPhoto: false, status: 'REQUESTED', refundPaise: null, decisionNote: null, createdAt: 1_760_000_000 };

vi.mock('../../../data/services/http', () => ({
  apiRequest: (path: string) => {
    if (path.startsWith('/work/dispenses')) return Promise.resolve({ items: [DISPENSE], total: 1 });
    if (path === '/work/returns') return Promise.resolve({ items: [RETURN] });
    if (path === '/work/hostel-visits' || path === '/work/refills') return Promise.resolve({ items: [] });
    return new Promise(() => undefined);
  },
}));

import { WorkspaceScreen } from '../WorkspaceScreen';
import { LanguageProvider } from '../../../i18n';
import { VendorReturnsScreen } from '../../vendor/VendorReturnsScreen';
import { VendorConsoleScreen } from '../../vendor/VendorConsoleScreen';
import { VendorCampIntakeScreen } from '../../vendor/VendorCampIntakeScreen';
import { VendorHandoverScreen } from '../../vendor/VendorHandoverScreen';
import { LabQueueScreen } from '../../vendor/LabQueueScreen';
import { VendorHomeScreen } from '../../vendor/VendorHomeScreen';

// VendorHomeScreen also calls the global navigator, which scrolls; jsdom has no scrollTo.
beforeEach(() => { auth.user = { fullName: 'Campus Pharmacy', role: 'VENDOR', partnerKind: 'PHARMACY' }; routerNavigate.mockReset(); window.scrollTo = vi.fn() as unknown as typeof window.scrollTo; });

describe('pharmacy path', () => {
  it('/dispensing shows a vendor the live dispense queue, with the register one tap away', async () => {
    render(<WorkspaceScreen route="dispensing" />);
    // First test in the file: it pays for the cold lazy import of the workspace
    // screens, which can exceed the 1 s default when the whole suite runs in parallel.
    expect(await screen.findByRole('heading', { name: 'Dispensing queue.' }, { timeout: 5000 })).toBeInTheDocument();
    expect(await screen.findByText(/Amoxicillin 500mg/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Rx verified for dispense d1a2b3c4/i })).toBeInTheDocument();
    // The shared sidebar also has a "Dispense register" item; this is the page's own shortcut.
    const pageButton = screen.getAllByRole('button', { name: 'Dispense register' }).find(button => !button.closest('aside'));
    fireEvent.click(pageButton as HTMLElement);
    expect(routerNavigate).toHaveBeenCalledWith('/dispense-register');
  });

  it('/dispense-register still opens the dispense register', async () => {
    render(<WorkspaceScreen route="dispense-register" />);
    expect(await screen.findByRole('heading', { level: 1, name: 'Dispensing register' })).toBeInTheDocument();
  });

  it('/returns shows the live returns table, then hostel visits and refills', async () => {
    render(<WorkspaceScreen route="returns" />);
    expect(await screen.findByRole('heading', { level: 1, name: 'Returns' })).toBeInTheDocument();
    expect(await screen.findByText('ORS sachets')).toBeInTheDocument();
    expect(screen.getByText('Damaged on arrival')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Approve the return of ORS sachets' })).toBeInTheDocument();
    // The student's name comes back from the server; the partner's table doesn't need it.
    expect(screen.queryByText('A. Student')).toBeNull();
    expect(await screen.findByRole('heading', { name: 'Hostel visits & refills.' })).toBeInTheDocument();
  });
});

describe('partner "Lab reports" link', () => {
  // The per-page sidebars are gone: one shared partner shell draws the navigation now.
  const screens: [string, React.ComponentType<{ onNavigate?: (target: string) => void }>][] = [
    ['VendorReturnsScreen', VendorReturnsScreen],
    ['VendorConsoleScreen', VendorConsoleScreen],
    ['VendorCampIntakeScreen', VendorCampIntakeScreen],
    ['VendorHandoverScreen', VendorHandoverScreen],
    ['LabQueueScreen', LabQueueScreen],
    ['VendorHomeScreen', VendorHomeScreen as React.ComponentType<{ onNavigate?: (target: string) => void }>],
  ];

  it.each(screens)('%s no longer offers "Release results"', (_name, Screen) => {
    render(<Screen onNavigate={vi.fn()} />);
    expect(screen.queryByText(/release results/i)).toBeNull();
  });

  it('the shared partner sidebar has no "Release results" either', async () => {
    auth.user = { fullName: 'City Lab', role: 'VENDOR', partnerKind: 'LAB' };
    render(<WorkspaceScreen route="cold-chain" />);
    expect(await screen.findByRole('navigation', { name: 'Partner links' })).toBeInTheDocument();
    expect(screen.queryByText(/release results/i)).toBeNull();
  });

  it('a lab partner\'s "Lab reports" tool opens the live lab desk', async () => {
    auth.user = { fullName: 'City Lab', role: 'VENDOR', partnerKind: 'LAB' };
    const onNavigate = vi.fn();
    const source = async () => ({ recent: [], total: 1, counts: { REQUESTED: 0, ACCEPTED: 0, DISPATCHED: 0 }, newest: null, rxWaiting: null });
    render(<VendorHomeScreen onNavigate={onNavigate} source={source} />);
    fireEvent.click((await screen.findAllByRole('button', { name: /lab reports/i }))[0]);
    expect(onNavigate).toHaveBeenCalledWith('lab-queue');
  });
});

describe('staff home intro', () => {
  it('speaks to a campus admin on /campus, not to a vendor', () => {
    auth.user = { fullName: 'Campus Admin', role: 'CAMPUS_ADMIN' };
    render(<WorkspaceScreen route="campus" />);
    expect(screen.getByRole('heading', { level: 1, name: 'Your campus, looked after together.' })).toBeInTheDocument();
    expect(screen.queryByText(/keep customers informed/i)).toBeNull();
  });

  it('speaks to a doctor on /clinician', () => {
    auth.user = { fullName: 'Dr Rao', role: 'NMC_DOCTOR' };
    render(<WorkspaceScreen route="clinician" />);
    expect(screen.getByRole('heading', { level: 1, name: 'Your patients, today.' })).toBeInTheDocument();
    expect(screen.queryByText(/keep customers informed/i)).toBeNull();
  });

  it.each([['te', 'ఈరోజు మీ రోగులు.'], ['hi', 'आज के आपके मरीज़।']] as const)('is translated (%s)', (lang, title) => {
    auth.user = { fullName: 'Dr Rao', role: 'NMC_DOCTOR' };
    render(<LanguageProvider initial={lang}><WorkspaceScreen route="clinician" /></LanguageProvider>);
    expect(screen.getByRole('heading', { level: 1, name: title })).toBeInTheDocument();
  });
  it('the partner "Lab reports" tool and the shared sidebar are translated', async () => {
    auth.user = { fullName: 'City Lab', role: 'VENDOR', partnerKind: 'LAB' };
    const source = async () => ({ recent: [], total: 1, counts: { REQUESTED: 0, ACCEPTED: 0, DISPATCHED: 0 }, newest: null, rxWaiting: null });
    render(<LanguageProvider initial="te"><VendorHomeScreen onNavigate={vi.fn()} source={source} /></LanguageProvider>);
    expect((await screen.findAllByRole('button', { name: /ల్యాబ్ రిపోర్టులు/ })).length).toBeGreaterThan(0);
  });

  it('the shared partner sidebar is translated', async () => {
    auth.user = { fullName: 'City Lab', role: 'VENDOR', partnerKind: 'LAB' };
    render(<LanguageProvider initial="te"><WorkspaceScreen route="cold-chain" /></LanguageProvider>);
    expect(await screen.findByText('శాంపిల్ క్యూ')).toBeInTheDocument();
  });
});
