import { makeAutoObservable, runInAction } from 'mobx';
import { apiRequest } from '@/data/services/http';
import type { ViewModel } from '@/core/store/ViewModel';
import type { ClaimRequest, LivePolicy } from '@/data/types/workflowTypes';
import type { MessageKey } from '@/i18n';

/**
 * Mobile 2.0 Insurance (M2Insurance): the student's own policy record (GET
 * /health/policies: what the student entered, never checked with an insurer)
 * and the claims they prepared (GET /insurance/claims). No insurer is
 * connected, so a claim is saved as prepared (DRAFT) and nothing is sent; the
 * stage bar shows how far the server says a claim has got, no further.
 * Commerce/platform data only: no health record is read here.
 */
export type InsurancePhase = 'loading' | 'ready' | 'error';

export interface ClaimStage {
  /** 1 prepared · 2 sent · 3 decided · 4 paid. */
  step: 1 | 2 | 3 | 4;
  label: MessageKey;
}

const STAGES: readonly ClaimStage['label'][] = ['m2.ins.stage.prepared', 'm2.ins.stage.sent', 'm2.ins.stage.decided', 'm2.ins.stage.paid'];

/** Where a claim is, from its server status (only DRAFT exists until an insurer is connected). */
export function claimStage(status: string): ClaimStage {
  const s = status.toUpperCase();
  const step: ClaimStage['step'] = s === 'PAID' || s === 'SETTLED' ? 4
    : s === 'APPROVED' || s === 'REJECTED' || s === 'DECIDED' ? 3
      : s === 'SUBMITTED' || s === 'SENT' ? 2 : 1;
  return { step, label: STAGES[step - 1] ?? 'm2.ins.stage.prepared' };
}

/** A YYYY-MM-DD date as a local calendar day (null when it isn't one). */
export function parseDay(value: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
  if (!m) return null;
  const at = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return at.getFullYear() === Number(m[1]) && at.getMonth() === Number(m[2]) - 1 && at.getDate() === Number(m[3]) ? at : null;
}

/** Today as YYYY-MM-DD on the device's calendar. */
export function todayIso(now: Date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

/** The policy number with only its last four shown ("••••4417"). */
export function maskPolicy(number: string): string {
  const clean = number.trim();
  return clean.length <= 4 ? clean : `••••${clean.slice(-4)}`;
}

export interface PolicyDraft { insurer: string; policyNumber: string; sumInsured: string; validUntil: string }
export interface ClaimDraft { policyId: string; providerName: string; service: string; amount: string }
export type DraftErrors<T> = Partial<Record<keyof T, MessageKey>>;

/** Rupees as typed ("1,200.50") to paise, or null. */
export function rupeesToPaise(value: string): number | null {
  const n = Number(value.replace(/,/g, '').trim());
  return Number.isFinite(n) && n > 0 ? Math.round(n * 100) : null;
}

/** The checks the server makes (PolicyInput), said in the student's words before sending. */
export function checkPolicy(d: PolicyDraft): DraftErrors<PolicyDraft> {
  const errors: DraftErrors<PolicyDraft> = {};
  if (d.insurer.trim().length < 2) errors.insurer = 'm2.ins.required';
  if (d.policyNumber.trim().length < 2) errors.policyNumber = 'm2.ins.required';
  const sum = Number(d.sumInsured.replace(/,/g, '').trim());
  if (!Number.isInteger(sum) || sum < 1 || sum > 100_000_000) errors.sumInsured = 'm2.ins.amountError';
  if (!parseDay(d.validUntil)) errors.validUntil = 'm2.ins.dateError';
  return errors;
}

export function checkClaim(d: ClaimDraft): DraftErrors<ClaimDraft> {
  const errors: DraftErrors<ClaimDraft> = {};
  if (!d.policyId) errors.policyId = 'm2.ins.required';
  if (rupeesToPaise(d.amount) === null) errors.amount = 'm2.ins.amountError';
  return errors;
}

export class InsuranceViewModel implements ViewModel {
  phase: InsurancePhase = 'loading';
  policies: LivePolicy[] = [];
  claims: ClaimRequest[] = [];
  claimsFailed = false;
  saving = false;
  saveFailed = false;
  private disposed = false;

  constructor(private readonly request: typeof apiRequest = apiRequest) {
    makeAutoObservable<InsuranceViewModel, 'disposed' | 'request'>(this, { disposed: false, request: false }, { autoBind: true });
  }

  /** The policy on the card: the newest one still valid, else the newest. */
  get policy(): LivePolicy | null {
    const today = todayIso();
    return this.policies.find((p) => p.validUntil >= today) ?? this.policies[0] ?? null;
  }

  get policyActive(): boolean {
    return this.policy !== null && this.policy.validUntil >= todayIso();
  }

  async load(): Promise<void> {
    this.disposed = false;
    this.phase = 'loading';
    const [policies, claims] = await Promise.allSettled([
      this.request<{ items: LivePolicy[] }>('/health/policies'),
      this.request<{ items: ClaimRequest[] }>('/insurance/claims'),
    ]);
    if (this.disposed) return;
    runInAction(() => {
      if (policies.status === 'rejected') {
        this.phase = 'error';
        return;
      }
      this.policies = policies.value.items;
      this.claims = claims.status === 'fulfilled' ? claims.value.items : [];
      this.claimsFailed = claims.status === 'rejected';
      this.phase = 'ready';
    });
  }

  async reloadClaims(): Promise<void> {
    try {
      const res = await this.request<{ items: ClaimRequest[] }>('/insurance/claims');
      if (this.disposed) return;
      runInAction(() => { this.claims = res.items; this.claimsFailed = false; });
    } catch {
      if (!this.disposed) runInAction(() => { this.claimsFailed = true; });
    }
  }

  /** POST /health/policies. True when saved. */
  async addPolicy(d: PolicyDraft): Promise<boolean> {
    if (Object.keys(checkPolicy(d)).length) return false;
    return this.save(async () => {
      await this.request('/health/policies', { method: 'POST', body: JSON.stringify({
        insurer: d.insurer.trim(), policyNumber: d.policyNumber.trim(), sumInsured: Number(d.sumInsured.replace(/,/g, '').trim()), validUntil: d.validUntil.trim(),
      }) });
      await this.load();
    });
  }

  /** POST /insurance/claims: saved as prepared; nothing goes to an insurer. True when saved. */
  async prepareClaim(d: ClaimDraft): Promise<boolean> {
    const amountPaise = rupeesToPaise(d.amount);
    if (Object.keys(checkClaim(d)).length || amountPaise === null) return false;
    return this.save(async () => {
      await this.request('/insurance/claims', { method: 'POST', body: JSON.stringify({
        policyId: d.policyId, providerName: d.providerName.trim(), service: d.service.trim(), amountPaise,
      }) });
      await this.reloadClaims();
    });
  }

  private async save(run: () => Promise<void>): Promise<boolean> {
    if (this.saving) return false;
    this.saving = true;
    this.saveFailed = false;
    try {
      await run();
      return true;
    } catch {
      if (!this.disposed) runInAction(() => { this.saveFailed = true; });
      return false;
    } finally {
      if (!this.disposed) runInAction(() => { this.saving = false; });
    }
  }

  clearSaveError(): void {
    this.saveFailed = false;
  }

  reset(): void {
    this.phase = 'loading';
    this.policies = [];
    this.claims = [];
  }

  dispose(): void {
    this.disposed = true;
  }
}
