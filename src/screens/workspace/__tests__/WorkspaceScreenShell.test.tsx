import { beforeEach, describe, expect, it, vi } from 'vitest';
import React from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import type { AccountRole } from '../../../data/types/workflowTypes';

const auth: { user: { fullName: string; role: AccountRole; university?: string; isVerifiedStudent?: boolean; partnerKind?: string } | null } = { user: null };

vi.mock('../../../theme/tokens/theme', () => ({ useTheme: () => ({ mode: 'light', setTheme: vi.fn() }) }));
vi.mock('../../../data/contexts/AuthContext',() => ({ useAuth: () => ({ user: auth.user, logout: vi.fn() }) }));
// Panels fetch on mount; the shell is what is under test, so requests never settle.
vi.mock('../../../data/services/http', () => ({ apiRequest: () => new Promise(() => undefined) }));
// The screen reads the router's navigate; the route under test is passed in as a prop.
vi.mock('@/core/navigation', async (importOriginal) => ({ ...(await importOriginal<typeof import('@/core/navigation')>()), useNavigate: () => vi.fn() }));

import { WorkspaceScreen } from '../WorkspaceScreen';

beforeEach(() => { auth.user = null; });

describe('which shell a route gets', () => {
  it.each(['admin/erasure', 'admin/break-glass-log'] as const)('%s opens its new screen inside the Super Admin shell', route => {
    auth.user = { fullName: 'Demo Administrator', role: 'SUPER_ADMIN' };
    render(<WorkspaceScreen route={route} />);
    expect(screen.getByRole('navigation', { name: 'Super admin navigation' })).toBeInTheDocument();
    // Erasure requests load from the server first (the request never settles here), so the main area holds its skeleton.
    if (route === 'admin/erasure') expect(within(screen.getByRole('main')).getByRole('status', { name: 'Loading erasure requests…' })).toBeInTheDocument();
    else expect(screen.getByRole('main')).toHaveTextContent('Break-glass log');
  });

  it.each(['admin', 'admin/accounts', 'admin/support'] as const)('%s uses the new Super Admin shell', route => {
    auth.user = { fullName: 'Demo Administrator', role: 'SUPER_ADMIN' };
    render(<WorkspaceScreen route={route} />);
    expect(screen.getByRole('navigation', { name: 'Super admin navigation' })).toBeInTheDocument();
    expect(screen.queryByRole('navigation', { name: 'Main menu' })).toBeNull();
    expect(screen.queryByText(/good to see you/i)).toBeNull();
    expect(screen.queryByText('A clearer view of your care platform.')).toBeNull();
  });

  // Live-run audit #8: staff pages opened inside the student layout (its nav, "Plan · My profile ·
  // Digital ID", and student-only data). Each staff role keeps its own shell on every page.
  it.each(['security', 'profile', 'notifications', 'counsellor'] as const)('a super admin’s %s page stays in the Super Admin shell', route => {
    auth.user = { fullName: 'Demo Administrator', role: 'SUPER_ADMIN' };
    render(<WorkspaceScreen route={route} />);
    expect(screen.getByRole('navigation', { name: 'Super admin navigation' })).toBeInTheDocument();
    expect(screen.queryByRole('navigation', { name: 'Main menu' })).toBeNull();
    expect(screen.queryByRole('button', { name: /Digital ID/ })).toBeNull();
  });

  it.each(['counsellor', 'security', 'support'] as const)('a counsellor’s %s page opens in the counsellor console, with no student links', route => {
    auth.user = { fullName: 'Team Counsellor', role: 'COUNSELLOR', university: 'Demo University' };
    render(<WorkspaceScreen route={route} />);
    const nav = screen.getByRole('navigation', { name: 'Counsellor navigation' });
    expect(within(nav).getByRole('button', { name: 'Crisis follow-up' })).toBeInTheDocument();
    expect(screen.queryByRole('navigation', { name: 'Main menu' })).toBeNull();
    for (const label of [/Digital ID/, /^Plan$/, /Prescriptions|Medicines and lab tests/, /Health records/]) expect(screen.queryByRole('button', { name: label })).toBeNull();
  });

  it.each(['wellness-training', 'security'] as const)('a wellness partner’s %s page opens in the partner console shell', async route => {
    auth.user = { fullName: 'Team Wellness', role: 'VENDOR', partnerKind: 'WELLNESS' };
    render(<WorkspaceScreen route={route} />);
    expect(await screen.findByRole('navigation', { name: 'Partner links' })).toBeInTheDocument();
    expect(screen.queryByRole('navigation', { name: 'Main menu' })).toBeNull();
  });

  it('opens student pages inside the student web shell', () => {
    auth.user = { fullName: 'Asha Rao', role: 'STUDENT', isVerifiedStudent: true, university: 'VNR VJIET' };
    render(<WorkspaceScreen route="health" />);
    expect(screen.getAllByRole('navigation', { name: 'My Student Kare' }).length).toBeGreaterThan(0);
    expect(screen.getByRole('navigation', { name: 'Main' })).toBeInTheDocument();
    expect(screen.queryByRole('navigation', { name: 'Main menu' })).toBeNull();
    expect(screen.queryByRole('navigation', { name: 'Super admin navigation' })).toBeNull();
    expect(screen.getByRole('button', { name: 'Home' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByText('VNR VJIET · Edu ID verified')).toBeInTheDocument();
  });

  it('log out in the student shell opens the one confirm dialog with the WebSignOut board wording', () => {
    auth.user = { fullName: 'Asha Rao', role: 'STUDENT', isVerifiedStudent: true };
    render(<WorkspaceScreen route="records" />);
    fireEvent.click(screen.getByRole('button', { name: 'Log out' }));
    const dialog = screen.getByRole('alertdialog', { name: 'Sign out of this browser?' });
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(within(dialog).getByText('Signed in as Asha Rao')).toBeInTheDocument();
    expect(within(dialog).getByText('What signing out does')).toBeInTheDocument();
    expect(within(dialog).getByRole('button', { name: 'Sign out here' })).toBeInTheDocument();
    fireEvent.click(within(dialog).getByRole('button', { name: 'Stay signed in' }));
    expect(screen.queryByRole('alertdialog')).toBeNull();
  });

  it.each([['vendor', 'PHARMACY'], ['lab-queue', 'LAB'], ['orders', 'CLINIC']] as const)('%s opens inside the partner console shell for a %s partner', async (route, partnerKind) => {
    auth.user = { fullName: 'Lab Partner', role: 'VENDOR', partnerKind };
    render(<WorkspaceScreen route={route} />);
    expect(await screen.findByRole('navigation', { name: 'Partner links' })).toBeInTheDocument();
    expect(screen.queryByRole('navigation', { name: 'Main menu' })).toBeNull();
    expect(screen.queryByRole('navigation', { name: 'Super admin navigation' })).toBeNull();
  });

  it.each(['CAMPUS_ADMIN', 'NMC_DOCTOR'] as const)('lists no My requests link for a %s, who cannot open it', role => {
    auth.user = { fullName: 'Staff Member', role };
    render(<WorkspaceScreen route="profile" />);
    const menu = screen.getByRole('navigation', { name: 'Main menu' });
    expect(within(menu).getByRole('button', { name: /orders/i })).toBeInTheDocument();
    expect(within(menu).queryByRole('button', { name: /my requests/i })).toBeNull();
  });

  it('lists My requests for a student', () => {
    auth.user = { fullName: 'Asha Rao', role: 'STUDENT', isVerifiedStudent: true };
    render(<WorkspaceScreen route="health" />);
    expect(screen.getAllByRole('button', { name: /my requests/i }).length).toBeGreaterThan(0);
  });

  it('keeps the member orders page for students', () => {
    auth.user = { fullName: 'Asha Rao', role: 'STUDENT', isVerifiedStudent: true };
    render(<WorkspaceScreen route="orders" />);
    expect(screen.getAllByRole('navigation', { name: 'My Student Kare' }).length).toBeGreaterThan(0);
    expect(screen.queryByRole('navigation', { name: 'Partner links' })).toBeNull();
  });
});
