import { describe, expect, it, vi } from 'vitest';
import { RewardsViewModel } from '../viewmodel/RewardsViewModel';
import type { InviteShare } from '../shareTypes';

import { requester, REFERRAL } from './fixtures';

const compose = (code: string, link: string): InviteShare => ({ message: `${code} ${link}`, url: link, title: 't' });

describe('RewardsViewModel', () => {
  it('loads the student’s own summary, points and earned medals', async () => {
    const request = requester([{ id: 'PROFILE_VERIFIED', earned: true }, { id: 'FRIEND_JOINED', earned: false }, { id: 'SOMETHING_NEW', earned: true }]);
    const vm = new RewardsViewModel(request);
    await vm.load();
    expect(vm.phase).toBe('ready');
    expect(vm.referral?.code).toBe('ABCD2345');
    expect(vm.points?.balance).toBe(50);
    // Only known medals, only earned ones; an id the app has no name for is dropped.
    expect(vm.earnedMedals).toEqual(['PROFILE_VERIFIED']);
    expect(vi.mocked(request).mock.calls.map((c) => c[0]).sort()).toEqual(['/medals/me', '/points/me', '/referrals/me']);
  });

  it('fails as a whole rather than showing half the screen', async () => {
    const vm = new RewardsViewModel(requester([], true));
    await vm.load();
    expect(vm.phase).toBe('failed');
    expect(vm.referral).toBeNull();
    expect(vm.points).toBeNull();
  });

  it('shares the composed invite and records the honest outcome', async () => {
    const vm = new RewardsViewModel(requester([]));
    await vm.load();
    const sharer = vi.fn(async () => 'dismissed' as const);
    await vm.share(sharer, compose);
    expect(sharer).toHaveBeenCalledWith({ message: 'ABCD2345 https://studentkare.co/signup?ref=ABCD2345', url: REFERRAL.shareUrl, title: 't' });
    expect(vm.lastShare).toBe('dismissed');
    expect(vm.sharing).toBe(false);
    await vm.share(async () => { throw new Error('boom'); }, compose);
    expect(vm.lastShare).toBe('failed');
  });

  it('does nothing before the code is loaded', async () => {
    const vm = new RewardsViewModel(requester([]));
    const sharer = vi.fn(async () => 'shared' as const);
    await vm.share(sharer, compose);
    expect(sharer).not.toHaveBeenCalled();
  });
});
