import { makeAutoObservable } from 'mobx';
import type { ClaimAdjudication } from '@/types';

/** Domain store for claims intelligence (M22–M25 adjudication workflow). */
export class ClaimsStore {
  // Empty until real claims are loaded. This used to ship an invented claim
  // (named patient, real hospital and insurer brands, amounts and a reviewer).
  claimAdjudications: ClaimAdjudication[] = [];

  constructor() {
    makeAutoObservable(this, {}, { autoBind: true });
  }

  setClaimAdjudications(adjudications: ClaimAdjudication[]): void {
    this.claimAdjudications = adjudications;
  }

  signClaimAdjudication(claimId: string, reviewerName: string): void {
    this.claimAdjudications = this.claimAdjudications.map((claim) =>
      claim.id === claimId
        ? {
            ...claim,
            decisionStatus: 'APPROVED' as const,
            assignedReviewerName: reviewerName,
            reviewerSignedAt: new Date().toISOString().replace('T', ' ').substring(0, 16),
          }
        : claim
    );
  }

  dismissClaimAnomaly(claimId: string, anomalyId: string, reason: string): void {
    this.claimAdjudications = this.claimAdjudications.map((claim) =>
      claim.id === claimId
        ? {
            ...claim,
            anomalyFlags: claim.anomalyFlags.map((flag) =>
              flag.id === anomalyId ? { ...flag, dismissed: true, dismissalReason: reason } : flag
            ),
          }
        : claim
    );
  }
}
