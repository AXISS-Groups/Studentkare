import React from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { IdentityVerifyPanel } from '../IdentityVerifyPanel';
import { IdentityVerifyViewModel } from '../../viewmodel/IdentityVerifyViewModel';
import type { MemberIdentity } from '@/data/types/workflowTypes';

// Verify it's you (VerifyIdentity / WebVerify, Tier 1). Only the server turns a row
// green; photo, email and government ID have no backend and must say so.

type Requester = typeof import('@/data/services/http').apiRequest;
const identity = (campusStatus: MemberIdentity['campusStatus']): MemberIdentity => ({
  memberId: 'SK-1', fullName: 'Test Student', university: 'U', rollNumber: 'R1', campusStatus, issued: false, issuedAt: null,
});
const requesting = (body: MemberIdentity) => (async () => body) as unknown as Requester;
const failing = (async () => { throw new Error('offline'); }) as unknown as Requester;
const pending = (() => new Promise(() => undefined)) as unknown as Requester;

async function renderWith(request: Requester, opts: { wide?: boolean; openCampusVerification?: () => void; load?: boolean } = {}) {
  const vm = new IdentityVerifyViewModel(request);
  if (opts.load !== false) await vm.load();
  const links = { back: vi.fn(), openCrisis: vi.fn(), openCampusVerification: opts.openCampusVerification };
  const view = render(<IdentityVerifyPanel viewModel={vm} links={links} wide={opts.wide} />);
  return { vm, links, ...view };
}

describe.each([false, true])('Verify it’s you (wide: %s)', (wide) => {
  it('draws the four checks with the brief’s icons and the progress ring', async () => {
    const { container } = await renderWith(requesting(identity('NOT_SUBMITTED')), { wide });
    for (const icon of ['user-2', 'mail', 'id-card', 'shield']) {
      expect(container.querySelector(`[data-icon="${icon}"]`)).not.toBeNull();
    }
    expect(screen.getByRole('img', { name: '0 of 1 checks verified' })).toBeInTheDocument();
  });

  it('marks the campus check done only when the server says VERIFIED', async () => {
    const { container } = await renderWith(requesting(identity('VERIFIED')), { wide });
    expect(screen.getByTestId('check-campus-done')).toBeInTheDocument();
    expect(container.querySelectorAll('[data-testid$="-done"]')).toHaveLength(1);
    expect(screen.getByRole('img', { name: '1 of 1 checks verified' })).toBeInTheDocument();
  });

  it('never marks photo, email or government ID done: they are not available yet', async () => {
    await renderWith(requesting(identity('VERIFIED')), { wide });
    for (const id of ['photo', 'email', 'gov']) {
      const row = screen.getByTestId(`check-${id}`);
      expect(within(row).getByText('Not available yet')).toBeInTheDocument();
      expect(screen.queryByTestId(`check-${id}-done`)).toBeNull();
    }
  });

  it('shows a rejected campus check as needing a fix', async () => {
    await renderWith(requesting(identity('REJECTED')), { wide });
    const row = screen.getByTestId('check-campus');
    expect(within(row).getByText('Your college couldn’t confirm this')).toBeInTheDocument();
    expect(within(row).getByText('Fix')).toBeInTheDocument();
  });

  it('fails closed when the status cannot be read, and crisis help stays', async () => {
    const { vm, links } = await renderWith(failing, { wide });
    expect(vm.verifiedCount).toBe(0);
    expect(screen.getByText('Couldn’t load your status')).toBeInTheDocument();
    expect(screen.queryByTestId('check-campus-done')).toBeNull();
    fireEvent.click(screen.getAllByText('Get help now')[0]);
    expect(links.openCrisis).toHaveBeenCalledTimes(1);
  });

  it('keeps crisis help on screen while the status is still loading', async () => {
    await renderWith(pending, { wide, load: false });
    expect(screen.getAllByText('Get help now').length).toBeGreaterThan(0);
  });
});

describe('Verify it’s you, rows', () => {
  it('opens the real campus verification from the College ID row', async () => {
    const open = vi.fn();
    await renderWith(requesting(identity('NOT_SUBMITTED')), { openCampusVerification: open });
    fireEvent.click(screen.getByRole('button', { name: /College ID card/ }));
    expect(open).toHaveBeenCalledTimes(1);
  });

  it('explains an unavailable check instead of pretending to run it', async () => {
    await renderWith(requesting(identity('NOT_SUBMITTED')));
    fireEvent.click(screen.getByRole('button', { name: /Government ID/ }));
    expect(await screen.findByText(/We will never ask you to type your full Aadhaar number/)).toBeInTheDocument();
    expect(document.querySelector('[data-icon="illustration:illustration-gov-id-verify"]')).not.toBeNull();
    for (const name of ['Take photo', 'Send code', 'Upload ID', 'Continue with DigiLocker']) {
      expect(screen.queryByRole('button', { name })).toBeNull();
    }
  });

  it('keeps the next step off until the available checks are verified', async () => {
    await renderWith(requesting(identity('PENDING')));
    expect(screen.getByTestId('verify-next')).toHaveAttribute('aria-disabled', 'true');
    expect(screen.getByText('1 more to go')).toBeInTheDocument();
  });

  it('makes no claim about encryption', async () => {
    await renderWith(requesting(identity('PENDING')));
    expect(screen.queryByText(/encrypt/i)).toBeNull();
  });
});
