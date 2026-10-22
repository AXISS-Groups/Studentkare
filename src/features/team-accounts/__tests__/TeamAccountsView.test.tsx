import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { ApiError } from '@/data/services/http';
import { axeViolations, describeViolations } from '@/test/axe';
import { TeamAccountsView } from '../TeamAccountsView';
import type { TeamAccount, TeamAccountList, TeamAccountsRepository } from '../teamAccountsRepository';

// Super admin → Team accounts: every state (loading, error, empty, data, switch
// off), Rotate PIN showing the new PIN once, your own PIN needing the current
// one, Unlock and Disable, and axe.

const row = (over: Partial<TeamAccount>): TeamAccount => ({
  id: 'team-campus', identifier: 'campus@studentkare.co', fullName: 'StudentKare Team · Campus admin', role: 'CAMPUS_ADMIN',
  partnerKind: '', active: true, scope: 'StudentKare Team Campus', hasPin: true, locked: false, lockedUntil: null,
  failedAttempts: 0, lastSignInAt: null, rotatedAt: null, isSelf: false, ...over,
});

const ACCOUNTS: TeamAccount[] = [
  row({ id: 'team-superadmin', identifier: 'superadmin@studentkare.co', fullName: 'StudentKare Team · Super admin', role: 'SUPER_ADMIN', scope: '', isSelf: true, lastSignInAt: 1_760_000_000 }),
  row({}),
  row({ id: 'team-lab', identifier: 'lab@studentkare.co', fullName: 'StudentKare Team · Lab', role: 'VENDOR', partnerKind: 'LAB', scope: 'StudentKare Team Partners', locked: true, lockedUntil: 1_760_000_900, failedAttempts: 5 }),
  row({ id: 'team-wellness', identifier: 'wellness@studentkare.co', fullName: 'StudentKare Team · Wellness centre', role: 'VENDOR', partnerKind: 'WELLNESS', scope: 'StudentKare Team Partners', active: false }),
];

function repo(over: Partial<TeamAccountsRepository> = {}, list: TeamAccountList = { items: ACCOUNTS, pinSignInEnabled: true }): TeamAccountsRepository {
  return {
    list: vi.fn(async () => list),
    rotate: vi.fn(async (id: string) => ({ id, identifier: `${id}@x`, pin: '493817' })),
    unlock: vi.fn(async (id: string) => ({ ...ACCOUNTS.find(a => a.id === id)!, locked: false, lockedUntil: null })),
    disable: vi.fn(async (id: string) => ({ ...ACCOUNTS.find(a => a.id === id)!, active: false })),
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
    render(<TeamAccountsView repository={repo({}, { items: ACCOUNTS, pinSignInEnabled: false })} />);
    expect(await screen.findByText(/PIN sign-in is off/)).toBeInTheDocument();
  });

  it('shows loading, then an error with retry', async () => {
    let fail = true;
    const repository = repo({ list: vi.fn(async () => { if (fail) throw new ApiError('Server unavailable', 503); return { items: ACCOUNTS, pinSignInEnabled: true }; }) });
    render(<TeamAccountsView repository={repository} />);
    expect(screen.getByText('Loading team accounts…')).toBeInTheDocument();
    expect(await screen.findByText('Team accounts couldn’t load')).toBeInTheDocument();
    fail = false;
    fireEvent.click(screen.getByRole('button', { name: /try again|retry/i }));
    expect(await screen.findByText('StudentKare Team · Lab')).toBeInTheDocument();
  });

  it('says how to create them when there are none', async () => {
    render(<TeamAccountsView repository={repo({}, { items: [], pinSignInEnabled: true })} />);
    expect(await screen.findByText('No team accounts yet')).toBeInTheDocument();
    expect(screen.getByText(/scripts.team_accounts create/)).toBeInTheDocument();
  });

  it('rotates a PIN after confirming and shows the new PIN once', async () => {
    const repository = repo();
    render(<TeamAccountsView repository={repository} />);
    fireEvent.click(await screen.findByRole('button', { name: 'Rotate the PIN for StudentKare Team · Campus admin' }));
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
    fireEvent.click(await screen.findByRole('button', { name: 'Rotate the PIN for StudentKare Team · Super admin' }));
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

  it('is axe-clean with data', async () => {
    const { container } = render(<TeamAccountsView repository={repo()} />);
    await screen.findByText('StudentKare Team · Lab');
    const violations = await axeViolations(container);
    expect(violations, describeViolations(violations)).toEqual([]);
  });
});
