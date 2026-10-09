import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { IdentityVerifyPanel } from '../IdentityVerifyPanel';
import { IdentityVerifyViewModel } from '../../viewmodel/IdentityVerifyViewModel';
import type { MemberIdentity } from '@/data/types/workflowTypes';

type Requester = typeof import('@/data/http').apiRequest;
const identity = (campusStatus: MemberIdentity['campusStatus']): MemberIdentity => ({
  memberId: 'SK-1', fullName: 'Test Student', university: 'U', rollNumber: 'R1', campusStatus, issued: false, issuedAt: null,
});
const requesting = (body: MemberIdentity) => (async () => body) as unknown as Requester;
const failing = (async () => { throw new Error('offline'); }) as unknown as Requester;

async function renderWith(request: Requester, openCampusVerification?: () => void) {
  const vm = new IdentityVerifyViewModel(request);
  await vm.load();
  render(<IdentityVerifyPanel viewModel={vm} links={{ back: vi.fn(), openCampusVerification }} />);
  return vm;
}

describe('Verify it’s you', () => {
  it('shows campus verified only when the server says so', async () => {
    await renderWith(requesting(identity('VERIFIED')));
    expect(screen.getByText('Campus verified')).toBeInTheDocument();
  });

  it('has no control that can mark a check verified on the client', async () => {
    const open = vi.fn();
    await renderWith(requesting(identity('NOT_SUBMITTED')), open);
    for (const name of ['Take photo', 'Verify email', 'Upload ID', 'Link ID']) {
      expect(screen.queryByRole('button', { name })).toBeNull();
    }
    fireEvent.click(screen.getByRole('button', { name: 'Verify my campus' }));
    expect(open).toHaveBeenCalledTimes(1);
    expect(screen.queryByText(/^Verified$/)).toBeNull();
    expect(screen.getAllByText('Not connected')).toHaveLength(3);
  });

  it('fails closed when status cannot be read', async () => {
    const vm = await renderWith(failing);
    expect(vm.campusVerified).toBe(false);
    expect(screen.getByText("Couldn’t load your status")).toBeInTheDocument();
    expect(screen.queryByText('Campus verified')).toBeNull();
  });

  it('makes no claim about encryption at rest', async () => {
    await renderWith(requesting(identity('PENDING')));
    expect(screen.queryByText(/encrypted at rest/i)).toBeNull();
  });
});
