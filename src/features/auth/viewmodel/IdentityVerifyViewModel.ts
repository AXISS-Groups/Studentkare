import { makeAutoObservable, runInAction } from 'mobx';
import { apiRequest } from '@/data/services/http';
import type { ViewModel } from '@/core/store/ViewModel';
import type { MemberIdentity } from '@/data/types/workflowTypes';

export type CampusCheck = MemberIdentity['campusStatus'];

/** The four checks the boards draw (VerifyIdentity, VerifyGate, WebVerify, WebVerifyGate), in board order. */
export type IdentityCheckId = 'photo' | 'email' | 'campus' | 'gov';
export const IDENTITY_CHECKS: readonly IdentityCheckId[] = ['photo', 'email', 'campus', 'gov'];

/**
 * What a check row may say. Only `verified` is ever drawn as done, and only the
 * server can produce it. `unknown` is "we couldn't ask" (loading or failed):
 * never verified. `unavailable` is a check with no backend at all yet.
 */
export type CheckState = 'verified' | 'review' | 'todo' | 'rejected' | 'unavailable' | 'unknown';

export interface IdentityCheck {
  id: IdentityCheckId;
  state: CheckState;
}

const FROM_CAMPUS: Record<CampusCheck, CheckState> = {
  VERIFIED: 'verified', PENDING: 'review', NOT_SUBMITTED: 'todo', REJECTED: 'rejected',
};

/**
 * Verify it's you (design pages 1/3: VerifyIdentity, VerifyGate, Tier 1).
 *
 * The only identity check the backend can prove today is campus verification
 * (campusStatus from GET /api/identity). Selfie liveness, email for identity and
 * government ID have no server-side check, so they are `unavailable` and can
 * never count as verified — fail closed. Nothing is derived on the client.
 */
export class IdentityVerifyViewModel implements ViewModel {
  campusStatus: CampusCheck | null = null;
  loadFailed = false;
  private disposed = false;

  constructor(private readonly request: typeof apiRequest = apiRequest) {
    makeAutoObservable<IdentityVerifyViewModel, 'disposed' | 'request'>(this, { disposed: false, request: false }, { autoBind: true });
  }

  get loading(): boolean {
    return this.campusStatus === null && !this.loadFailed;
  }

  get campusVerified(): boolean {
    return this.campusStatus === 'VERIFIED';
  }

  /** The four rows, each from the server or honestly not available. */
  get checks(): IdentityCheck[] {
    return IDENTITY_CHECKS.map((id) => {
      if (id !== 'campus') return { id, state: 'unavailable' };
      const state: CheckState = this.campusStatus === null ? 'unknown' : (FROM_CAMPUS[this.campusStatus] ?? 'unknown');
      return { id, state };
    });
  }

  /** Checks that exist on the server today: the ones that count towards progress. */
  get availableCount(): number {
    return this.checks.filter((check) => check.state !== 'unavailable').length;
  }

  get verifiedCount(): number {
    return this.checks.filter((check) => check.state === 'verified').length;
  }

  /** Available checks still to do (a check in review is still to do: it isn't verified). */
  get remaining(): number {
    return this.availableCount - this.verifiedCount;
  }

  async load(): Promise<void> {
    this.disposed = false;
    this.loadFailed = false;
    try {
      const identity = await this.request<MemberIdentity>('/identity');
      if (!this.disposed) runInAction(() => { this.campusStatus = identity.campusStatus; });
    } catch {
      if (!this.disposed) runInAction(() => { this.campusStatus = null; this.loadFailed = true; });
    }
  }

  dispose(): void {
    this.disposed = true;
  }

  reset(): void {
    this.campusStatus = null;
    this.loadFailed = false;
  }
}
