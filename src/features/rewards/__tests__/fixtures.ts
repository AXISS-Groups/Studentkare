/** Shared test data for the rewards screen (not a test file). */
import { vi } from 'vitest';

type Requester = typeof import('@/data/services/http').apiRequest;

export const REFERRAL = {
  code: 'ABCD2345', shareUrl: 'https://studentkare.co/signup?ref=ABCD2345',
  counts: { invited: 3, joined: 2, rewarded: 1 }, pointsPerReferral: 50, monthlyCap: 20, rewardedThisMonth: 1,
  pointsNote: 'Points have no cash value.',
};
export const POINTS = { balance: 50, redeemable: false, pointsNote: 'Points have no cash value.', entries: [] };

export function requester(medals: Array<{ id: string; earned: boolean }>, fail = false): Requester {
  return vi.fn(async (path: string) => {
    if (fail) throw new Error('offline');
    if (path === '/referrals/me') return REFERRAL;
    if (path === '/points/me') return POINTS;
    if (path === '/medals/me') return { items: medals };
    throw new Error(`unexpected ${path}`);
  }) as unknown as Requester;
}

