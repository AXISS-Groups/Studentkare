import { makeAutoObservable, runInAction } from 'mobx';
import { apiRequest } from '@/data/services/http';
import type { ViewModel } from '@/core/store/ViewModel';
import type { InviteShare, ShareOutcome } from '../shareTypes';

/** GET /api/referrals/me (backend/services/rewards_api.py). Counts only, never who. */
export interface ReferralSummary {
  code: string;
  shareUrl: string;
  counts: { invited: number; joined: number; rewarded: number };
  pointsPerReferral: number;
  monthlyCap: number;
  rewardedThisMonth: number;
  pointsNote: string;
}

/** GET /api/points/me. */
export interface PointsSummary {
  balance: number;
  redeemable: false;
  pointsNote: string;
}

/** The fixed medal catalogue from backend/services/medals.py, in display order. */
export const MEDAL_IDS = [
  'PROFILE_VERIFIED',
  'EMERGENCY_CARD_COMPLETE',
  'FIRST_HEALTH_CAMP',
  'FRIEND_JOINED',
] as const;
export type MedalId = (typeof MEDAL_IDS)[number];

const isMedalId = (value: string): value is MedalId => (MEDAL_IDS as readonly string[]).includes(value);

interface MedalsResponse {
  items: Array<{ id: string; earned: boolean }>;
}

export type RewardsPhase = 'loading' | 'ready' | 'failed';

type Sharer = (invite: InviteShare) => Promise<ShareOutcome>;

/**
 * Invite friends + Points & medals (Tier 3, settings). Reads the student's own
 * referral summary, points balance and medals; nothing here takes another
 * account's id. All three load together: a partial screen (a balance without
 * the code, say) would be a confusing half-truth, so any failure shows the
 * error state with a retry.
 */
export class RewardsViewModel implements ViewModel {
  phase: RewardsPhase = 'loading';
  referral: ReferralSummary | null = null;
  points: PointsSummary | null = null;
  earnedMedals: MedalId[] = [];
  sharing = false;
  lastShare: ShareOutcome | null = null;

  private disposed = false;

  constructor(private readonly request: typeof apiRequest = apiRequest) {
    makeAutoObservable<RewardsViewModel, 'disposed' | 'request'>(this, { disposed: false, request: false }, { autoBind: true });
  }

  async load(): Promise<void> {
    this.disposed = false;
    this.phase = 'loading';
    try {
      const [referral, points, medals] = await Promise.all([
        this.request<ReferralSummary>('/referrals/me'),
        this.request<PointsSummary>('/points/me'),
        this.request<MedalsResponse>('/medals/me'),
      ]);
      if (this.disposed) return;
      runInAction(() => {
        this.referral = referral;
        this.points = points;
        // Unknown ids are dropped rather than shown with a made-up name.
        this.earnedMedals = medals.items.filter((m) => m.earned).map((m) => m.id).filter(isMedalId);
        this.phase = 'ready';
      });
    } catch {
      if (this.disposed) return;
      runInAction(() => {
        this.referral = null;
        this.points = null;
        this.earnedMedals = [];
        this.phase = 'failed';
      });
    }
  }

  /** Opens the share sheet (or copies). `compose` builds the localised message. */
  async share(sharer: Sharer, compose: (code: string, link: string) => InviteShare): Promise<void> {
    if (!this.referral || this.sharing) return;
    this.sharing = true;
    this.lastShare = null;
    let outcome: ShareOutcome;
    try {
      outcome = await sharer(compose(this.referral.code, this.referral.shareUrl));
    } catch {
      outcome = 'failed';
    }
    runInAction(() => {
      this.sharing = false;
      this.lastShare = outcome;
    });
  }

  async copy(copier: (text: string) => Promise<ShareOutcome>, message: string): Promise<void> {
    let outcome: ShareOutcome;
    try {
      outcome = await copier(message);
    } catch {
      outcome = 'failed';
    }
    runInAction(() => {
      this.lastShare = outcome;
    });
  }

  clearShareNotice(): void {
    this.lastShare = null;
  }

  dispose(): void {
    this.disposed = true;
  }

  reset(): void {
    this.phase = 'loading';
    this.referral = null;
    this.points = null;
    this.earnedMedals = [];
    this.sharing = false;
    this.lastShare = null;
  }
}
