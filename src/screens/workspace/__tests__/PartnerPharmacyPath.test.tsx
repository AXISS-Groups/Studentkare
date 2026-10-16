import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import type { AccountRole } from '../../../data/workflowTypes';

const auth: { user: { fullName: string; role: AccountRole } | null } = { user: null };
const routerNavigate = vi.fn();

vi.mock('../../../theme/theme', () => ({ useTheme: () => ({ mode: 'light', setTheme: vi.fn() }) }));
vi.mock('../../../data/AuthContext', () => ({ useAuth: () => ({ user: auth.user, logout: vi.fn() }) }));
vi.mock('@/data/contexts/AuthContext', () => ({ useAuth: () => ({ user: auth.user, logout: vi.fn() }) }));
vi.mock('@/core/navigation', () => ({ useNavigate: () => routerNavigate }));
vi.mock('@/core/storage/CrossPlatformStorage', () => ({ CrossPlatformStorage: { get: async () => '', set: async () => undefined } }));

const DISPENSE = {
  id: 'd1a2b3c4-0000', prescriptionId: 'p1', status: 'RX_ISSUED', verifiedBy: '', rejectionReason: '',
  substitutionNote: '', createdAt: 1_760_000_000, nextStates: ['RX_VERIFIED', 'REJECTED'],
  prescription: { id: 'p1', prescriberRegNo: 'NMC-12345', items: [{ id: 'i1', genericName: 'Amoxicillin', strength: '500mg', dose: '1 cap', frequency: 'TDS', quantity: 15, scheduleClass: 'H', registerRequired: false, substitutionAllowed: true }] },
};
const RETURN = { id: 'r1', item: 'ORS sachets', student: 'A. Student', reason: 'DAMAGED', note: null, hasPhoto: false, status: 'REQUESTED', refundPaise: null, decisionNote: null, createdAt: 1_760_000_000 };

vi.mock('../../../data/http', () => ({
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
beforeEach(() => { auth.user = { fullName: 'Campus Pharmacy', role: 'VENDOR' }; routerNavigate.mockReset(); window.scrollTo = vi.fn() as unknown as typeof window.scrollTo; });

describe('pharmacy path', () => {
  it('/dispensing shows a vendor the live dispense queue, with the register one tap away', async () => {
    render(<WorkspaceScreen route="dispensing" />);
    expect(await screen.findByRole('heading', { name: 'Dispensing queue.' })).toBeInTheDocument();
    expect(await screen.findByText(/Amoxicillin 500mg/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Rx verified for dispense d1a2b3c4/i })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Dispense register' }));
    expect(routerNavigate).toHaveBeenCalledWith('/dispense-register');
  });

  it('/dispense-register still opens the dispense register', async () => {
    render(<WorkspaceScreen route="dispense-register" />);
    expect(await screen.findByRole('heading', { level: 1, name: 'Dispensing register' })).toBeInTheDocument();
  });

  it('/returns shows the live returns, visits and refills above the counter log', async () => {
    render(<WorkspaceScreen route="returns" />);
    expect(await screen.findByRole('heading', { name: 'Returns, hostel visits & refills.' })).toBeInTheDocument();
    expect(await screen.findByText(/ORS sachets · Damaged/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Approve' })).toBeInTheDocument();
    expect(screen.getByText(/counter log below is kept on this screen only/)).toBeInTheDocument();
  });
});

describe('partner "Lab reports" link', () => {
  const screens: [string, React.ComponentType<{ onNavigate?: (target: string) => void }>][] = [
    ['VendorReturnsScreen', VendorReturnsScreen],
    ['VendorConsoleScreen', VendorConsoleScreen],
    ['VendorCampIntakeScreen', VendorCampIntakeScreen],
    ['VendorHandoverScreen', VendorHandoverScreen],
    ['LabQueueScreen', LabQueueScreen],
    ['VendorHomeScreen', VendorHomeScreen as React.ComponentType<{ onNavigate?: (target: string) => void }>],
  ];

  it.each(screens)('%s opens the lab queue, and no longer offers "Release results"', (_name, Screen) => {
    const onNavigate = vi.fn();
    render(<Screen onNavigate={onNavigate} />);
    expect(screen.queryByText(/release results/i)).toBeNull();
    fireEvent.click(screen.getAllByRole('button', { name: /^lab reports$/i })[0]);
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
  it('the partner "Lab reports" link is translated', () => {
    render(<LanguageProvider initial="te"><VendorConsoleScreen onNavigate={vi.fn()} /></LanguageProvider>);
    expect(screen.getAllByRole('button', { name: 'ల్యాబ్ రిపోర్టులు' }).length).toBeGreaterThan(0);
  });
});
