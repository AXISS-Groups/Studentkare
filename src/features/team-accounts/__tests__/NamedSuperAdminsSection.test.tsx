import { describe, expect, it, vi } from 'vitest';
import React from 'react';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { axeViolations, describeViolations } from '@/test/axe';
import { NamedSuperAdminsSection } from '../NamedSuperAdminsSection';
import type { NamedSuperAdminState, NamedSuperAdminsRepository } from '../teamAccountsRepository';

const PERSON = { id: 'a1', fullName: 'Asha Rao', identifier: 'asha@example.test', active: true, twoFactorEnabled: true, createdAt: 1, totpSignedInAt: 1_760_000_000, isSelf: true };
const SHARED = { id: 'team-superadmin', identifier: 'superadmin@studentkare.co', active: true, retired: false };

function repo(state: NamedSuperAdminState, after?: NamedSuperAdminState): NamedSuperAdminsRepository {
  return { state: vi.fn().mockResolvedValue(state), create: vi.fn().mockResolvedValue(after ?? state), retireShared: vi.fn().mockResolvedValue(after ?? state) };
}

describe('Named super admins (audit H3)', () => {
  it('keeps retirement off until a named super admin signed in with TOTP', async () => {
    const { container } = render(<NamedSuperAdminsSection repository={repo({ items: [], shared: SHARED, readyToRetire: false, viewerIsNamed: false })} />);
    expect(await screen.findByText('No named super admins yet')).toBeTruthy();
    expect(screen.getByText(/Waiting for step 3/)).toBeTruthy();
    expect((screen.getByRole('button', { name: 'Retire the shared super admin' }) as HTMLButtonElement).disabled).toBe(true);
    const v = await axeViolations(container);
    expect(v, describeViolations(v)).toEqual([]);
  });

  it('creates a named super admin with an email and a name', async () => {
    const r = repo({ items: [], shared: SHARED, readyToRetire: false, viewerIsNamed: false }, { items: [{ ...PERSON, twoFactorEnabled: false, totpSignedInAt: null }], shared: SHARED, readyToRetire: false, viewerIsNamed: false });
    render(<NamedSuperAdminsSection repository={r} />);
    fireEvent.click(await screen.findByRole('button', { name: 'Create named super admin' }));
    const dialog = await screen.findByRole('alertdialog');
    fireEvent.change(within(dialog).getByLabelText('Work email'), { target: { value: 'asha@example.test' } });
    fireEvent.change(within(dialog).getByLabelText('Full name'), { target: { value: 'Asha Rao' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Create named super admin' }));
    await waitFor(() => expect(r.create).toHaveBeenCalledWith('asha@example.test', 'Asha Rao'));
    expect(await screen.findByText('Not set up yet')).toBeTruthy();
  });

  it('retires the shared one from a named account only with the typed word', async () => {
    const onChanged = vi.fn();
    const r = repo({ items: [PERSON], shared: SHARED, readyToRetire: true, viewerIsNamed: true },
      { items: [PERSON], shared: { ...SHARED, active: false, retired: true }, readyToRetire: true, viewerIsNamed: true });
    render(<NamedSuperAdminsSection repository={r} onChanged={onChanged} />);
    fireEvent.click(await screen.findByRole('button', { name: 'Retire the shared super admin' }));
    const dialog = await screen.findByRole('alertdialog');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Retire it' }));
    expect(r.retireShared).not.toHaveBeenCalled();
    fireEvent.change(within(dialog).getByLabelText('Type RETIRE'), { target: { value: 'RETIRE' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Retire it' }));
    await waitFor(() => expect(r.retireShared).toHaveBeenCalledWith('RETIRE'));
    expect(onChanged).toHaveBeenCalled();
    expect((await screen.findAllByText('The shared super admin is retired.')).length).toBeGreaterThan(0);
  });
});
