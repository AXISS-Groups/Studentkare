import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { ApiError } from '@/data/services/http';
import { axeViolations, describeViolations } from '@/test/axe';
import { StudentInvitesPanel } from '../StudentInvitesPanel';
import type { IssuedInvite, StudentInvite, StudentInvitesRepository } from '../studentInvitesRepository';

// Campus, Students, Invite students (plan tier1-auth-password-2026-10-22, amendment b):
// loading, error, empty, the list with each status, the form (own campus or, for a
// super admin, a named one), the temporary password shown once, resend, cancel, axe.

const row = (over: Partial<StudentInvite>): StudentInvite => ({
  id: 'i1', fullName: 'Ravi Kumar', rollNumber: 'PC-101', university: 'Partner College', email: 'ravi@partner.test',
  phone: '', sentBy: 'EMAIL', status: 'PENDING', linkSent: true, createdAt: 1_760_000_000, expiresAt: 1_760_259_200,
  claimedAt: null, locked: false, ...over,
});
const ISSUED: IssuedInvite = { ...row({}), tempPassword: 'Kp7sQx2mNa9r' };

function repo(over: Partial<StudentInvitesRepository> = {}, items: StudentInvite[] = [row({}), row({ id: 'i2', fullName: 'Meena', status: 'CLAIMED', claimedAt: 1_760_100_000 })], chooseCampus = false): StudentInvitesRepository {
  return {
    list: vi.fn(async () => ({ items, chooseCampus })),
    create: vi.fn(async () => ISSUED),
    resend: vi.fn(async () => ({ ...ISSUED, tempPassword: 'Zq8wRt4yUe6p' })),
    cancel: vi.fn(async () => undefined),
    ...over,
  };
}

const rowFor = (name: string) => screen.getByText(name).closest('tr') as HTMLElement;

beforeEach(() => vi.restoreAllMocks());

describe('Invite students', { timeout: 20_000 }, () => {
  it('lists invites with where each stands; a claimed one has no actions', async () => {
    render(<StudentInvitesPanel repository={repo()} />);
    expect(await screen.findByText('Ravi Kumar')).toBeInTheDocument();
    expect(within(rowFor('Ravi Kumar')).getByText('Waiting to claim')).toBeInTheDocument();
    expect(within(rowFor('Ravi Kumar')).getByText('ravi@partner.test')).toBeInTheDocument();
    expect(within(rowFor('Meena')).getByText('Claimed')).toBeInTheDocument();
    expect(within(rowFor('Meena')).queryByRole('button')).toBeNull();
  });

  it('invites a student and shows the temporary password once', async () => {
    const repository = repo();
    render(<StudentInvitesPanel repository={repository} />);
    fireEvent.click(await screen.findByRole('button', { name: 'Invite a student' }));
    const drawer = await screen.findByRole('dialog');
    expect(within(drawer).queryByLabelText('Campus')).toBeNull();          // a campus admin: their own campus
    fireEvent.change(within(drawer).getByLabelText('Full name'), { target: { value: 'Ravi Kumar' } });
    fireEvent.change(within(drawer).getByLabelText('Roll number'), { target: { value: 'PC-101' } });
    fireEvent.change(within(drawer).getByLabelText('Email address'), { target: { value: 'ravi@partner.test' } });
    fireEvent.click(within(drawer).getByRole('button', { name: 'Create and send link' }));
    await waitFor(() => expect(repository.create).toHaveBeenCalledWith({ fullName: 'Ravi Kumar', rollNumber: 'PC-101', sendBy: 'EMAIL', email: 'ravi@partner.test' }));
    expect(await screen.findByText('Kp7sQx2mNa9r')).toBeInTheDocument();
    expect(screen.getByText(/not in the same message as the link/)).toBeInTheDocument();
    expect(screen.getByText('The link was sent by Email.')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'I’ve noted it' }));
    await waitFor(() => expect(screen.queryByText('Kp7sQx2mNa9r')).toBeNull());
  });

  it('needs the contact the link goes to, and says when the student already has an account', async () => {
    const repository = repo({ create: vi.fn(async () => { throw new ApiError('in use', 409, { code: 'INVITE_CONTACT_IN_USE' }); }) });
    render(<StudentInvitesPanel repository={repository} />);
    fireEvent.click(await screen.findByRole('button', { name: 'Invite a student' }));
    const drawer = await screen.findByRole('dialog');
    fireEvent.change(within(drawer).getByLabelText('Full name'), { target: { value: 'Ravi Kumar' } });
    fireEvent.change(within(drawer).getByLabelText('Roll number'), { target: { value: 'PC-101' } });
    fireEvent.click(within(drawer).getByLabelText('WhatsApp'));
    fireEvent.change(within(drawer).getByLabelText('Email address'), { target: { value: 'ravi@partner.test' } });
    expect(within(drawer).getByRole('button', { name: 'Create and send link' })).toBeDisabled();   // no WhatsApp number yet
    fireEvent.change(within(drawer).getByLabelText('WhatsApp number'), { target: { value: '9988776655' } });
    fireEvent.click(within(drawer).getByRole('button', { name: 'Create and send link' }));
    expect(await within(drawer).findByText('This student already has an account.')).toBeInTheDocument();
  });

  it('asks a super admin for the campus', async () => {
    const repository = repo({}, [], true);
    render(<StudentInvitesPanel repository={repository} />);
    expect(await screen.findByText('No invites yet')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Invite a student' }));
    expect(within(await screen.findByRole('dialog')).getByLabelText('Campus')).toBeInTheDocument();
  });

  it('resends with a new temporary password, and cancels only after confirming', async () => {
    const repository = repo();
    render(<StudentInvitesPanel repository={repository} />);
    fireEvent.click(await screen.findByRole('button', { name: 'Resend the invite to Ravi Kumar' }));
    expect(await screen.findByText('Zq8wRt4yUe6p')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'I’ve noted it' }));
    fireEvent.click(screen.getByRole('button', { name: 'Cancel the invite to Ravi Kumar' }));
    const dialog = await screen.findByRole('alertdialog');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Cancel invite' }));
    await waitFor(() => expect(repository.cancel).toHaveBeenCalledWith('i1'));
    expect(await screen.findByText('Invite cancelled.')).toBeInTheDocument();
  });

  it('shows an error with retry', async () => {
    let fail = true;
    render(<StudentInvitesPanel repository={repo({ list: vi.fn(async () => { if (fail) throw new ApiError('down', 503); return { items: [row({})], chooseCampus: false }; }) })} />);
    expect(await screen.findByText('Invites couldn’t load')).toBeInTheDocument();
    fail = false;
    fireEvent.click(screen.getByRole('button', { name: /try again/i }));
    expect(await screen.findByText('Ravi Kumar')).toBeInTheDocument();
  });

  it('is axe-clean', async () => {
    const { container } = render(<StudentInvitesPanel repository={repo()} />);
    await screen.findByText('Ravi Kumar');
    const violations = await axeViolations(container);
    expect(violations, describeViolations(violations)).toEqual([]);
  });
});
