import { makeAutoObservable, runInAction } from 'mobx';
import { generateAdjudicationDecisionPackage } from '@/ai/claimsReviewer';
import type { DecisionPackageSummary } from '@/ai/claimsReviewer';
import { agentApi } from '@/data/api';
import type { ClaimAdjudication } from '@/types';
import type { ClaimsStore } from '../store/ClaimsStore';

/**
 * MVVM ViewModel for the claims decision workflow (M22–M25).
 *
 * Wraps the ClaimsStore, selects the active claim, owns the adjudication
 * decision package (loaded synchronously then enriched by the agent API), and
 * exposes the human sign-off actions the view binds to.
 */
export class ClaimsViewModel {
  activeClaimId: string;
  decisionPackage: DecisionPackageSummary;
  reviewerName: string;
  signedStatus: boolean;

  constructor(private readonly claimsStore: ClaimsStore) {
    const claim = this.claimsStore.claimAdjudications[0];
    this.activeClaimId = claim?.id ?? '';
    this.decisionPackage = generateAdjudicationDecisionPackage(claim);
    this.reviewerName = claim?.assignedReviewerName || 'Sanjay Nair (Senior Adjudicator)';
    this.signedStatus = claim?.decisionStatus === 'APPROVED';
    makeAutoObservable(this, {}, { autoBind: true });
  }

  get claim(): ClaimAdjudication | undefined {
    return this.claimsStore.claimAdjudications.find((claim) => claim.id === this.activeClaimId)
      ?? this.claimsStore.claimAdjudications[0];
  }

  get anomalyFlags() {
    return this.claim?.anomalyFlags ?? [];
  }

  setReviewerName(value: string): void {
    this.reviewerName = value;
  }

  dismissFlag(flagId: string): void {
    if (!this.claim) return;
    this.claimsStore.dismissClaimAnomaly(this.claim.id, flagId, 'Verified on hospital chart');
  }

  signOff(): void {
    if (!this.claim) return;
    this.claimsStore.signClaimAdjudication(this.claim.id, this.reviewerName);
    this.signedStatus = true;
  }

  /** Enrich the decision package from the adjudication agent (best-effort). */
  async refreshFromAgent(): Promise<void> {
    if (!this.claim) return;
    try {
      const remote = await agentApi.adjudicateClaim(this.claim as unknown as Record<string, unknown>);
      if (remote) {
        runInAction(() => {
          this.decisionPackage = remote as unknown as DecisionPackageSummary;
        });
      }
    } catch {
      /* offline/optional — keep the local package */
    }
  }
}
