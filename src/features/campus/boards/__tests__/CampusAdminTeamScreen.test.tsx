import { afterEach, describe, expect, it, vi } from 'vitest';
import React from 'react';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { axeViolations, describeViolations } from '@/test/axe';

const navigate = vi.fn();
vi.mock('@/lib/utils/workflowRouting', async (importOriginal) => ({ ...(await importOriginal<typeof import('@/lib/utils/workflowRouting')>()), navigate: (route: string) => navigate(route) }));
const auth: { user: null | { fullName: string; role: string; university: string } } = { user: null };
vi.mock('@/data/contexts/AuthContext', () => ({ useAuth: () => auth }));

const apiRequest = vi.fn();
vi.mock('@/data/services/http', async (importOriginal) => ({ ...(await importOriginal<typeof import('@/data/services/http')>()), apiRequest: (...args: unknown[]) => apiRequest(...args) }));

import { ApiError } from '@/data/services/http';
import { CampusAdminTeamScreen, liveTeamSource } from '../CampusAdminTeamScreen';
import type { CampusStaff, TeamSource } from '../CampusAdminTeamScreen';

const flush = () => act(async () => { for (let i = 0; i < 4; i += 1) await Promise.resolve(); });
const source = (result: CampusStaff[] | Error): TeamSource => ({ load: () => (result instanceof Error ? Promise.reject(result) : Promise.resolve(result)) });

afterEach(() => { navigate.mockReset(); apiRequest.mockReset(); auth.user = null; });

describe('CampusAdminTeamScreen', () => {
  it('reads the campus-scoped team route, never the super-admin account list (it 403s for a campus admin)', async () => {
    apiRequest.mockResolvedValue({ items: [
      { id: 'a1', fullName: 'Priya Rao', identifier: 'priya@vnr.test', role: 'CAMPUS_ADMIN', active: true, twoFactorEnabled: true, campus: 'VNR VJIET' },
      { id: 'c1', fullName: 'Ravi Kumar', identifier: 'ravi@vnr.test', role: 'COUNSELLOR', active: true, twoFactorEnabled: false, campus: 'VNR VJIET' },
    ] });
    const staff = await liveTeamSource.load();
    expect(apiRequest).toHaveBeenCalledTimes(1);
    expect(apiRequest).toHaveBeenCalledWith('/ops/campus/team');
    expect(apiRequest.mock.calls.flat().join(' ')).not.toContain('/ops/accounts');
    expect(staff.map((member) => [member.id, member.role, member.campus])).toEqual([['a1', 'CAMPUS_ADMIN', 'VNR VJIET'], ['c1', 'COUNSELLOR', 'VNR VJIET']]);
  });

  it('lists campus staff for a super admin, with 2FA from the server and no invented activity', async () => {
    auth.user = { fullName: 'Ops', role: 'SUPER_ADMIN', university: '' };
    const { container } = render(<CampusAdminTeamScreen source={source([
      { id: '1', fullName: 'Priya Rao', identifier: 'priya@vnrvjiet.in', role: 'CAMPUS_ADMIN', active: true, twoFactorEnabled: true, campus: 'VNR VJIET' },
      { id: '2', fullName: 'Neha Kulkarni', identifier: 'neha@vnrvjiet.in', role: 'COUNSELLOR', active: true, twoFactorEnabled: false, campus: 'VNR VJIET' },
    ])} />);
    await flush();
    const rows = within(screen.getByRole('table', { name: 'Admin team' })).getAllByRole('row').slice(1);
    expect(rows[0]).toHaveTextContent('Priya Rao');
    expect(rows[0]).toHaveTextContent('Campus admin');
    expect(rows[0]).toHaveTextContent('On');
    expect(rows[1]).toHaveTextContent('Counsellor');
    expect(rows[1]).toHaveTextContent('Not set');
    expect(rows[1]).toHaveTextContent('Not reported');
    fireEvent.click(screen.getByRole('button', { name: 'Invite admin' }));
    expect(navigate).toHaveBeenCalledWith('admin/accounts');
    const violations = await axeViolations(container);
    expect(violations, describeViolations(violations)).toEqual([]);
  });

  it('tells a campus admin with no campus assigned why the list is closed (403), and keeps invite disabled with the reason', async () => {
    auth.user = { fullName: 'Priya Rao', role: 'CAMPUS_ADMIN', university: 'VNR VJIET' };
    render(<CampusAdminTeamScreen source={source(new ApiError('forbidden', 403))} />);
    await flush();
    expect(screen.getByText('Your account isn’t assigned to a campus yet')).toBeInTheDocument();
    expect(screen.queryByRole('table', { name: 'Admin team' })).toBeNull();
    const invite = screen.getByRole('button', { name: /Invite admin/ });
    expect(invite).toBeDisabled();
    expect(invite).toHaveTextContent('Only a super admin can invite campus staff today.');
  });

  it('reads the role matrix from the app’s own route gate', async () => {
    auth.user = { fullName: 'Priya Rao', role: 'CAMPUS_ADMIN', university: 'VNR VJIET' };
    render(<CampusAdminTeamScreen source={source([])} />);
    await flush();
    const matrix = screen.getByRole('table', { name: 'What each role can do' });
    const cells = (label: string) => Array.from(within(matrix).getByRole('rowheader', { name: label }).closest('tr')?.querySelectorAll('td') ?? [])
      .map((cell) => (cell.classList.contains('is-yes') ? 'yes' : 'no'));
    // Columns: campus admin, counsellor.
    expect(cells('See roster (non-health)')).toEqual(['yes', 'no']);
    expect(cells('Counsellor queue')).toEqual(['no', 'yes']);
    expect(cells('Break-glass emergency card')).toEqual(['yes', 'no']);
    expect(cells('Invite admins')).toEqual(['no', 'no']);
    expect(screen.getByText('No campus staff yet.')).toBeInTheDocument();
    expect(screen.getByText('Team changes aren’t shown here yet')).toBeInTheDocument();
  });

  it('shows the error state with a reference', async () => {
    auth.user = { fullName: 'Ops', role: 'SUPER_ADMIN', university: '' };
    render(<CampusAdminTeamScreen source={source(new ApiError('down', 502))} />);
    await flush();
    expect(screen.getByRole('alert')).toHaveTextContent('Ref ERR-502 · CampusAdminTeam');
  });
});
