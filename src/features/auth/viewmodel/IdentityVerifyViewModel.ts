import { makeAutoObservable, runInAction } from 'mobx';
import { apiRequest } from '@/data/http';
import type { ViewModel } from '@/core/store/ViewModel';
import type { MemberIdentity } from '@/data/types/workflowTypes';

export type CampusCheck = MemberIdentity['campusStatus'];

/**
 * Verify it's you (design pages 1/3: VerifyIdentity, Tier 1).
 *
 * The only identity check the backend can prove today is campus verification
 * (GET /api/identity → campusStatus). Selfie liveness, campus email and
 * government ID have no server-side check, so this ViewModel has no way to
 * mark them verified — fail closed. It never derives "verified" on the client.
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
