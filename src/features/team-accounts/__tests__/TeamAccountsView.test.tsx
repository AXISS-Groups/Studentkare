import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { ApiError } from '@/data/services/http';
import { axeViolations, describeViolations } from '@/test/axe';
import { TeamAccountsView } from '../TeamAccountsView';
import type { TeamAccount, TeamAccountList, TeamAccountsRepository } from '../teamAccountsRepository';

// The named super admins section has its own tests (NamedSuperAdminsSection.test.tsx): a quiet stub here.
vi.mock('../teamAccountsRepository', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../teamAccountsRepository')>()),
  namedSuperAdminsRepository: {
    state: async () => ({ items: [], shared: null, readyToRetire: false, viewerIsNamed: false }),
    create: vi.fn(), retireShared: vi.fn(),
  },
}));

// Super admin → Team accounts: every state (loading, error, empty, data, switch
// off), Rotate PIN showing the new PIN once, your own PIN needing the current
// one, Set password (never shown back, your own needing the current PIN or
// password), Unlock and Disable, and axe.

const row = (over: Partial<TeamAccount>): TeamAccount => ({
  id: 'team-campus', identifier: 'campus@studentkare.co', fullName: 'StudentKare Team · Campus admin', role: 'CAMPUS_ADMIN',
  partnerKind: '', active: true, scope: 'StudentKare Team Campus', hasPin: true, locked: false, lockedUntil: null,
  failedAttempts: 0, hasPassword: false, passwordLocked: false, lastSignInAt: null, rotatedAt: null, isSelf: false, ...over,
});

const ACCOUNTS: TeamAccount[] = [
  row({ id: 'team-superadmin', identifier: 'superadmin@studentkare.co', fullName: 'StudentKare Team · Super admin', role: 'SUPER_ADMIN', scope: '', isSelf: true, lastSignInAt: 1_760_000_000 }),
  row({}),
  row({ id: 'team-lab', identifier: 'lab@studentkare.co', fullName: 'StudentKare Team · Lab', role: 'VENDOR', partnerKind: 'LAB', scope: 'StudentKare Team Partners', locked: true, lockedUntil: 1_760_000_900, failedAttempts: 5 }),
  row({ id: 'team-wellness', identifier: 'wellness@studentkare.co', fullName: 'StudentKare Team · Wellness centre', role: 'VENDOR', partnerKind: 'WELLNESS', scope: 'StudentKare Team Partners', active: false }),
];

function repo(over: Partial<TeamAccountsRepository> = {}, list: TeamAccountList = { items: ACCOUNTS, pinSignInEnabled: true, passwordSignInEnabled: true }): TeamAccountsRepository {
  return {
    list: vi.fn(async () => list),
    rotate: vi.fn(async (id: string) => ({ id, identifier: `${id}@x`, pin: '493817' })),
    unlock: vi.fn(async (id: string) => ({ ...ACCOUNTS.find(a => a.id === id)!, locked: false, lockedUntil: null })),
    disable: vi.fn(async (id: string) => ({ ...ACCOUNTS.find(a => a.id === id)!, active: false })),
    setPassword: vi.fn(async (id: string) => ({ ...ACCOUNTS.find(a => a.id === id)!, hasPassword: true })),
    ...over,
  };
}

const rowFor = (name: string) => screen.getByText(name).closest('tr') as HTMLElement;

beforeEach(() => { vi.restoreAllMocks(); });

describe('Team accounts', { timeout: 20_000 }, () => {
  it('lists every account with what it sees, its state and last sign-in', async () => {
    render(<TeamAccountsView repository={repo()} />);
    expect(await screen.findByText('StudentKare Team · Lab')).toBeInTheDocument();
    expect(screen.getByRole('table', { name: 'Team accounts, their state and last sign-in' })).toBeInTheDocument();
    expect(within(rowFor('StudentKare Team · Super admin')).getByText('Whole platform')).toBeInTheDocument();
    expect(within(rowFor('StudentKare Team · Super admin')).getByText('You')).toBeInTheDocument();
    expect(within(rowFor('StudentKare Team · Campus admin')).getByText('StudentKare Team Campus')).toBeInTheDocument();
    expect(within(rowFor('StudentKare Team · Campus admin')).getByText('Never')).toBeInTheDocument();
    expect(within(rowFor('StudentKare Team · Lab')).getByText('Locked')).toBeInTheDocument();
    expect(within(rowFor('StudentKare Team · Wellness centre')).getByText('Disabled')).toBeInTheDocument();
    expect(within(rowFor('StudentKare Team · Wellness centre')).getByText('Vendor / Partner · Wellness centre')).toBeInTheDocument();
    expect(screen.getByText('PIN sign-in is on.')).toBeInTheDocument();
    expect(screen.getByText(/real super admin/)).toBeInTheDocument();
    // Only a locked account offers Unlock; you can't disable yourself; a disabled one can't be disabled again.
    expect(screen.getAllByRole('button', { name: /^Unlock / })).toHaveLength(1);
    expect(screen.queryByRole('button', { name: 'Disable StudentKare Team · Super admin' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Disable StudentKare Team · Wellness centre' })).toBeNull();
  });

  it('says when PIN sign-in is off', async () => {
    render(<TeamAccountsView repository={repo({}, { items: ACCOUNTS, pinSignInEnabled: false, passwordSignInEnabled: true })} />);
    expect(await screen.findByText(/PIN sign-in is off/)).toBeInTheDocument();
  });

  it('shows loading, then an error with retry', async () => {
    let fail = true;
    const repository = repo({ list: vi.fn(async () => { if (fail) throw new ApiError('Server unavailable', 503); return { items: ACCOUNTS, pinSignInEnabled: true, passwordSignInEnabled: true }; }) });
    render(<TeamAccountsView repository={repository} />);
    expect(screen.getByText('Loading team accounts…')).toBeInTheDocument();
    expect(await screen.findByText('Team accounts couldn’t load')).toBeInTheDocument();
    fail = false;
    fireEvent.click(screen.getByRole('button', { name: /try again|retry/i }));
    expect(await screen.findByText('StudentKare Team · Lab')).toBeInTheDocument();
  });

  it('says how to create them when there are none', async () => {
    render(<TeamAccountsView repository={repo({}, { items: [], pinSignInEnabled: true, passwordSignInEnabled: true })} />);
    expect(await screen.findByText('No team accounts yet')).toBeInTheDocument();
    expect(screen.getByText(/scripts.team_accounts create/)).toBeInTheDocument();
  });

  it('rotates a PIN after confirming and shows the new PIN once', async () => {
    const repository = repo();
    render(<TeamAccountsView repository={repository} />);
    fireEvent.click(await screen.findByRole('button', { name: 'Rotate PIN for StudentKare Team · Campus admin' }));
    const dialog = await screen.findByRole('alertdialog');
    expect(within(dialog).getByText(/signed out/)).toBeInTheDocument();
    expect(within(dialog).queryByLabelText('Current PIN')).toBeNull();
    fireEvent.click(within(dialog).getByRole('button', { name: 'Rotate PIN' }));
    await waitFor(() => expect(repository.rotate).toHaveBeenCalledWith('team-campus', undefined));
    const done = await screen.findByRole('dialog');
    expect(within(done).getByText('493817')).toBeInTheDocument();
    expect(within(done).getByText(/Shown once/)).toBeInTheDocument();
    const violations = await axeViolations(done);
    expect(violations, describeViolations(violations)).toEqual([]);
    fireEvent.click(within(done).getByRole('button', { name: 'I’ve saved it' }));
    await waitFor(() => expect(screen.queryByText('493817')).toBeNull());
  });

  it('asks for your current PIN before rotating your own, and says when it is wrong', async () => {
    const repository = repo({
      rotate: vi.fn(async () => { throw new ApiError('Enter your current PIN to change it.', 403, { code: 'ROTATE_SELF_NEEDS_CURRENT_PIN' }); }),
    });
    render(<TeamAccountsView repository={repository} />);
    fireEvent.click(await screen.findByRole('button', { name: 'Rotate PIN for StudentKare Team · Super admin' }));
    const dialog = await screen.findByRole('alertdialog');
    const current = within(dialog).getByLabelText('Current PIN');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Rotate PIN' }));
    expect(repository.rotate).not.toHaveBeenCalled();       // nothing sent without six digits
    fireEvent.change(current, { target: { value: '111222' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Rotate PIN' }));
    await waitFor(() => expect(repository.rotate).toHaveBeenCalledWith('team-superadmin', '111222'));
    expect(await within(dialog).findByText('That isn’t the current PIN.')).toBeInTheDocument();
    expect(within(dialog).getByLabelText('Current PIN')).toHaveValue('');
  });

  it('unlocks a locked account', async () => {
    const repository = repo();
    render(<TeamAccountsView repository={repository} />);
    fireEvent.click(await screen.findByRole('button', { name: 'Unlock StudentKare Team · Lab' }));
    await waitFor(() => expect(repository.unlock).toHaveBeenCalledWith('team-lab'));
    expect(await screen.findByText('StudentKare Team · Lab is unlocked.')).toBeInTheDocument();
    expect(within(rowFor('StudentKare Team · Lab')).getByText('Active')).toBeInTheDocument();
  });

  it('disables an account only after confirming', async () => {
    const repository = repo();
    render(<TeamAccountsView repository={repository} />);
    fireEvent.click(await screen.findByRole('button', { name: 'Disable StudentKare Team · Campus admin' }));
    const dialog = await screen.findByRole('alertdialog');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Cancel' }));
    expect(repository.disable).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Disable StudentKare Team · Campus admin' }));
    fireEvent.click(within(await screen.findByRole('alertdialog')).getByRole('button', { name: 'Disable' }));
    await waitFor(() => expect(repository.disable).toHaveBeenCalledWith('team-campus'));
    expect(await screen.findByText(/is disabled and signed out everywhere/)).toBeInTheDocument();
  });

  it('sets a password for another account and never shows it back', async () => {
    const repository = repo();
    render(<TeamAccountsView repository={repository} />);
    await screen.findByText('StudentKare Team · Campus admin');
    expect(within(rowFor('StudentKare Team · Campus admin')).getByText('No password')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Set password for StudentKare Team · Campus admin' }));
    const dialog = await screen.findByRole('alertdialog');
    expect(within(dialog).queryByLabelText('Current PIN or password')).toBeNull();
    expect(within(dialog).getByText(/At least 10 characters/)).toBeInTheDocument();
    fireEvent.change(within(dialog).getByLabelText('New password'), { target: { value: 'Tamarind-river 42' } });
    fireEvent.change(within(dialog).getByLabelText('Type it again'), { target: { value: 'Tamarind-river 42' } });
    const violations = await axeViolations(dialog);
    expect(violations, describeViolations(violations)).toEqual([]);
    fireEvent.click(within(dialog).getByRole('button', { name: 'Set password' }));
    await waitFor(() => expect(repository.setPassword).toHaveBeenCalledWith('team-campus', 'Tamarind-river 42', undefined));
    expect(await screen.findByText(/has a new password and is signed out everywhere/)).toBeInTheDocument();
    expect(within(rowFor('StudentKare Team · Campus admin')).getByText('Password set')).toBeInTheDocument();
    expect(screen.queryByDisplayValue('Tamarind-river 42')).toBeNull();
  });

  it('refuses two passwords that differ without sending, and shows a weak one the server refused', async () => {
    const repository = repo({
      setPassword: vi.fn(async () => { throw new ApiError('That password is too easy to guess.', 422, { code: 'PASSWORD_WEAK' }); }),
    });
    render(<TeamAccountsView repository={repository} />);
    fireEvent.click(await screen.findByRole('button', { name: 'Set password for StudentKare Team · Campus admin' }));
    const dialog = await screen.findByRole('alertdialog');
    const save = within(dialog).getByRole('button', { name: 'Set password' });
    fireEvent.change(within(dialog).getByLabelText('New password'), { target: { value: 'short' } });
    fireEvent.change(within(dialog).getByLabelText('Type it again'), { target: { value: 'short' } });
    fireEvent.click(save);
    expect(repository.setPassword).not.toHaveBeenCalled();     // shorter than the minimum: nothing sent
    fireEvent.change(within(dialog).getByLabelText('New password'), { target: { value: 'Tamarind-river 42' } });
    fireEvent.change(within(dialog).getByLabelText('Type it again'), { target: { value: 'Tamarind-river 43' } });
    fireEvent.click(save);
    expect(await within(dialog).findByText('The two passwords don’t match.')).toBeInTheDocument();
    expect(repository.setPassword).not.toHaveBeenCalled();
    fireEvent.change(within(dialog).getByLabelText('Type it again'), { target: { value: 'Tamarind-river 42' } });
    fireEvent.click(save);
    expect(await within(dialog).findByText(/too short or too easy to guess/)).toBeInTheDocument();
    expect(within(dialog).getByLabelText('New password')).toHaveValue('');
  });

  it('asks for your current PIN or password before setting your own', async () => {
    const repository = repo({
      setPassword: vi.fn(async () => { throw new ApiError('Enter your current PIN or password to change it.', 403, { code: 'PASSWORD_SELF_NEEDS_CURRENT' }); }),
    });
    render(<TeamAccountsView repository={repository} />);
    fireEvent.click(await screen.findByRole('button', { name: 'Set password for StudentKare Team · Super admin' }));
    const dialog = await screen.findByRole('alertdialog');
    const fill = (current: string) => {
      fireEvent.change(within(dialog).getByLabelText('Current PIN or password'), { target: { value: current } });
      fireEvent.change(within(dialog).getByLabelText('New password'), { target: { value: 'Tamarind-river 42' } });
      fireEvent.change(within(dialog).getByLabelText('Type it again'), { target: { value: 'Tamarind-river 42' } });
      fireEvent.click(within(dialog).getByRole('button', { name: 'Set password' }));
    };
    fill('111222');
    await waitFor(() => expect(repository.setPassword).toHaveBeenCalledWith('team-superadmin', 'Tamarind-river 42', { currentPin: '111222' }));
    expect(await within(dialog).findByText('That isn’t the current PIN or password.')).toBeInTheDocument();
    fill('Monsoon kettle 7!');
    await waitFor(() => expect(repository.setPassword).toHaveBeenLastCalledWith('team-superadmin', 'Tamarind-river 42', { currentPassword: 'Monsoon kettle 7!' }));
  });

  it('offers Unlock for a password lock and says when password sign-in is off', async () => {
    const locked = ACCOUNTS.map(a => a.id === 'team-campus' ? { ...a, passwordLocked: true, hasPassword: true } : a);
    render(<TeamAccountsView repository={repo({}, { items: locked, pinSignInEnabled: true, passwordSignInEnabled: false })} />);
    expect(await screen.findByText(/Password sign-in is off/)).toBeInTheDocument();
    expect(within(rowFor('StudentKare Team · Campus admin')).getByText('Locked')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Unlock StudentKare Team · Campus admin' })).toBeInTheDocument();
  });

  it('is axe-clean with data', async () => {
    const { container } = render(<TeamAccountsView repository={repo()} />);
    await screen.findByText('StudentKare Team · Lab');
    const violations = await axeViolations(container);
    expect(violations, describeViolations(violations)).toEqual([]);
  });
});
