import { beforeEach, describe, expect, it, vi } from 'vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';
import type { AccountRole } from '../../../data/workflowTypes';

const auth: { user: { fullName: string; role: AccountRole; university?: string; isVerifiedStudent?: boolean } | null } = { user: null };

vi.mock('../../../theme/theme', () => ({ useTheme: () => ({ mode: 'light', setTheme: vi.fn() }) }));
vi.mock('../../../data/AuthContext',() => ({ useAuth: () => ({ user: auth.user, logout: vi.fn() }) }));
// Panels fetch on mount; the shell is what is under test, so requests never settle.
vi.mock('../../../data/http', () => ({ apiRequest: () => new Promise(() => undefined) }));

import { WorkspaceScreen } from '../WorkspaceScreen';

beforeEach(() => { auth.user = null; });

describe('which shell a route gets', () => {
  it.each(['admin/erasure', 'admin/break-glass-log'] as const)('%s opens its new screen inside the Super Admin shell', route => {
    auth.user = { fullName: 'Demo Administrator', role: 'SUPER_ADMIN' };
    render(<WorkspaceScreen route={route} />);
    expect(screen.getByRole('navigation', { name: 'Super admin navigation' })).toBeInTheDocument();
    expect(screen.getByRole('main')).toHaveTextContent(route === 'admin/erasure' ? 'Erasure queue' : 'Break-glass log');
  });

  it.each(['admin', 'admin/accounts', 'admin/support'] as const)('%s uses the new Super Admin shell', route => {
    auth.user = { fullName: 'Demo Administrator', role: 'SUPER_ADMIN' };
    render(<WorkspaceScreen route={route} />);
    expect(screen.getByRole('navigation', { name: 'Super admin navigation' })).toBeInTheDocument();
    expect(screen.queryByRole('navigation', { name: 'Workspace navigation' })).toBeNull();
    expect(screen.queryByText(/good to see you/i)).toBeNull();
    expect(screen.queryByText('A clearer view of your care platform.')).toBeNull();
  });

  it('keeps the old workspace for a super admin’s personal pages', () => {
    auth.user = { fullName: 'Demo Administrator', role: 'SUPER_ADMIN' };
    render(<WorkspaceScreen route="profile" />);
    expect(screen.getByRole('navigation', { name: 'Workspace navigation' })).toBeInTheDocument();
    expect(screen.queryByRole('navigation', { name: 'Super admin navigation' })).toBeNull();
    expect(screen.getByText(/good to see you, demo/i)).toBeInTheDocument();
  });

  it('keeps the old workspace for students', () => {
    auth.user = { fullName: 'Asha Rao', role: 'STUDENT', isVerifiedStudent: true };
    render(<WorkspaceScreen route="health" />);
    expect(screen.getByRole('navigation', { name: 'Workspace navigation' })).toBeInTheDocument();
    expect(screen.queryByRole('navigation', { name: 'Super admin navigation' })).toBeNull();
    expect(screen.getByText(/good to see you, asha/i)).toBeInTheDocument();
  });

  it('keeps the staff banner for partner workspaces', () => {
    auth.user = { fullName: 'Lab Partner', role: 'VENDOR' };
    render(<WorkspaceScreen route="vendor" />);
    expect(screen.getByRole('navigation', { name: 'Workspace navigation' })).toBeInTheDocument();
    expect(screen.getByText('Good care, delivered together.')).toBeInTheDocument();
  });
});
