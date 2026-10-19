/** Shared test data for the rewards screen (not a test file). */
import { vi } from 'vitest';
import { publicSettingDefaults } from '@/generated/settings';

type Requester = typeof import('@/data/services/http').apiRequest;

/** The registry default (backend/core/settings_registry.py), as the server would send it. */
const POINTS_PER_REFERRAL = publicSettingDefaults['rewards.referral_points'];

export const REFERRAL = {
  code: 'ABCD2345', shareUrl: 'https://studentkare.co/signup?ref=ABCD2345',
  counts: { invited: 3, joined: 2, rewarded: 1 }, pointsPerReferral: POINTS_PER_REFERRAL, monthlyCap: 20, rewardedThisMonth: 1,
  pointsNoteCode: 'POINTS_NO_CASH_VALUE', pointsNote: 'Points have no cash value.',
};
export const POINTS = { balance: POINTS_PER_REFERRAL, redeemable: false, pointsNoteCode: 'POINTS_NO_CASH_VALUE', pointsNote: 'Points have no cash value.', entries: [] };

export function requester(medals: Array<{ id: string; earned: boolean }>, fail = false): Requester {
  return vi.fn(async (path: string) => {
    if (fail) throw new Error('offline');
    if (path === '/referrals/me') return REFERRAL;
    if (path === '/points/me') return POINTS;
    if (path === '/medals/me') return { items: medals };
    throw new Error(`unexpected ${path}`);
  }) as unknown as Requester;
}

