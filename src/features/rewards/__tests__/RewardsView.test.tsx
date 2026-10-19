import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { skIcons } from '@/design-system/icons/generated/skIconData';
import { axeViolations, describeViolations } from '@/test/axe';
import { RewardsViewModel } from '../viewmodel/RewardsViewModel';
import { RewardsView } from '../views/RewardsView';
import type { RewardsActions } from '../views/RewardsView';
import { POINTS, REFERRAL, requester } from './fixtures';

function actions(overrides: Partial<RewardsActions> = {}): RewardsActions {
  return { share: vi.fn(async () => 'shared' as const), copy: vi.fn(async () => 'copied' as const), canCopy: true, ...overrides };
}

async function ready(medals: Array<{ id: string; earned: boolean }>, a = actions()) {
  const vm = new RewardsViewModel(requester(medals));
  await vm.load();
  render(<RewardsView viewModel={vm} actions={a} />);
  return { vm, a };
}

describe('RewardsView', () => {
  it('shows a skeleton while loading', () => {
    render(<RewardsView viewModel={new RewardsViewModel(requester([]))} actions={actions()} />);
    expect(screen.getByRole('progressbar', { name: 'Loading your invites and points' })).toBeInTheDocument();
  });

  it('shows a calm error with a retry', async () => {
    const vm = new RewardsViewModel(requester([], true));
    await vm.load();
    render(<RewardsView viewModel={vm} actions={actions()} />);
    expect(screen.getByRole('alert')).toHaveTextContent('We couldn’t load your invites');
    expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument();
  });

  it('opens the share sheet with the exact prefilled message', async () => {
    const { a } = await ready([]);
    fireEvent.click(screen.getByRole('button', { name: 'Invite friends. Opens your phone’s share options with your invite link.' }));
    await waitFor(() => expect(a.share).toHaveBeenCalledTimes(1));
    expect(a.share).toHaveBeenCalledWith({
      message: `Hey! I use StudentKare to keep my health records in one place. Join with my code ABCD2345: ${REFERRAL.shareUrl}`,
      url: REFERRAL.shareUrl,
      title: 'Join me on StudentKare',
    });
  });

  it('copies the link as a fallback and says so; a failure shows the link to copy by hand', async () => {
    const { a } = await ready([], actions({ copy: vi.fn(async () => 'failed' as const) }));
    fireEvent.click(screen.getByRole('button', { name: 'Copy your invite link' }));
    expect(await screen.findByText('Sharing didn’t work on this device. Copy the link below instead.')).toBeInTheDocument();
    expect(screen.getByText(REFERRAL.shareUrl)).toBeInTheDocument();
    expect(a.copy).toHaveBeenCalled();
  });

  it('shows the balance, counts only, the no-cash-value note and earned medals', async () => {
    await ready([{ id: 'PROFILE_VERIFIED', earned: true }, { id: 'FIRST_HEALTH_CAMP', earned: true }, { id: 'FRIEND_JOINED', earned: false }]);
    expect(screen.getByText('ABCD2345')).toBeInTheDocument();
    expect(screen.getByLabelText(`Points: ${POINTS.balance}`)).toBeInTheDocument();
    expect(screen.getByText(/no cash value/)).toBeInTheDocument();
    expect(screen.getByText('Signed up with your code')).toBeInTheDocument();
    expect(screen.getByText('Profile verified')).toBeInTheDocument();
    expect(screen.getByText('First health camp attended')).toBeInTheDocument();
    expect(screen.queryByText('Invited a friend who joined')).not.toBeInTheDocument();
    expect(screen.queryByText(/streak|rank|leaderboard/i)).not.toBeInTheDocument();
  });

  it('shows an empty state when there are no medals yet', async () => {
    await ready([{ id: 'PROFILE_VERIFIED', earned: false }]);
    expect(screen.getByText('No medals yet')).toBeInTheDocument();
  });

  it('hides copy where the platform cannot copy', async () => {
    await ready([], actions({ canCopy: false }));
    expect(screen.queryByRole('button', { name: 'Copy your invite link' })).not.toBeInTheDocument();
  });

  it('draws only icons that exist in the design-system manifest', () => {
    for (const name of ['share', 'copy', 'star', 'shield-check', 'id-card', 'syringe', 'first-aid-kit', 'users']) {
      expect(skIcons[name as keyof typeof skIcons], name).toBeDefined();
    }
  });

  it('has no axe violations with medals shown', async () => {
    const vm = new RewardsViewModel(requester([{ id: 'PROFILE_VERIFIED', earned: true }]));
    await vm.load();
    const { container } = render(<main><RewardsView viewModel={vm} actions={actions()} /></main>);
    const violations = await axeViolations(container);
    expect(violations, describeViolations(violations)).toEqual([]);
  });
});
