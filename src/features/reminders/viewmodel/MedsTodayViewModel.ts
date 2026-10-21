import { makeAutoObservable, runInAction } from 'mobx';
import { apiRequest } from '@/data/services/http';
import type { ViewModel } from '@/core/store/ViewModel';
import type { Said } from '@/i18n';
import { Resource } from '@/features/m2health/resource';
import { codedSaid, serverSaid } from './serverMessage';

/**
 * Medicines today for Mobile 2.0 My health (the card on M2Insights and the
 * M2Reminders screen, web and Expo). WP-07 Medications (Tier 1, approved
 * 2026-10-21) carries over unchanged:
 *
 * - Names, doses and how many a day come only from the server
 *   (GET /meds/today: the student's own entries and prescriptions). Nothing is
 *   generated, no schedule is invented, and free-text frequency ("twice
 *   daily") is never turned into a count: such a plan has one log a day.
 * - Taken (POST /meds/log-dose) or skipped (POST /meds/skip-dose); the latest
 *   log of the day can be taken back (DELETE /meds/doses/{id}) until the
 *   server's `undoUntil`, which it computes from `meds.dose_undo_minutes`.
 * - No adherence score or streak; nobody is told about a missed or skipped dose.
 * - Nothing is kept on the device and nothing is queued offline (D7-1): the
 *   actions are refused offline and the screen says why.
 *
 * Rule L: this is clinical data. M2Home reads only the counts
 * (`useM2Home.medsSummary`), never a name.
 */

export type DoseOutcome = 'TAKEN' | 'SKIPPED';
export interface DoseUndo { doseId: string; undoUntil: string; outcome: DoseOutcome }
export interface MedsTodayPlan {
  planId: string;
  name: string;
  dosage: string;
  dosesPlanned: number | null;
  dosesTaken: number;
  /** Older servers do not send it. */
  dosesSkipped?: number;
  nextSlot: number | null;
  undo: DoseUndo | null;
}
export interface MedsToday { date: string; timezone: string; plans: MedsTodayPlan[] }

/** Doses logged today (taken or skipped). */
export function logged(plan: MedsTodayPlan): number {
  return plan.dosesTaken + (plan.dosesSkipped ?? 0);
}

/** Every dose of the day is logged: the planned count, or one a day when the plan gives no count. */
export function dayDone(plan: MedsTodayPlan): boolean {
  return logged(plan) >= (plan.dosesPlanned ?? 1);
}

/** The undo the server offers, while its window is still open at `now`. */
export function openUndo(plan: MedsTodayPlan, now: number): DoseUndo | null {
  if (!plan.undo) return null;
  const until = Date.parse(plan.undo.undoUntil);
  return Number.isFinite(until) && until > now ? plan.undo : null;
}

export type DoseAction = 'take' | 'skip' | 'undo';

export class MedsTodayViewModel implements ViewModel {
  readonly today: Resource<MedsToday>;
  /** The plan with a request on its way (one at a time). */
  busyPlan: string | null = null;
  busyAction: DoseAction | null = null;
  error: { planId: string; said: Said } | null = null;
  /** The last thing that happened, for the polite live region. */
  status: Said | null = null;
  online = true;
  now = Date.now();

  constructor(private readonly request: typeof apiRequest = apiRequest) {
    this.today = new Resource(() => request<MedsToday>('/meds/today'));
    makeAutoObservable<MedsTodayViewModel, 'request'>(this, { request: false, today: false }, { autoBind: true });
  }

  get plans(): MedsTodayPlan[] {
    return this.today.data?.plans ?? [];
  }

  /** Doses still to log today, over plans that say how many a day (the same count M2Home shows). */
  get left(): number | null {
    const counted = this.plans.filter((p) => p.dosesPlanned !== null && p.dosesPlanned > 0);
    if (!counted.length) return null;
    return counted.reduce((sum, p) => sum + Math.max(0, (p.dosesPlanned ?? 0) - logged(p)), 0);
  }

  undoFor(plan: MedsTodayPlan): DoseUndo | null {
    return openUndo(plan, this.now);
  }

  canAct(plan: MedsTodayPlan): boolean {
    return this.online && this.busyPlan === null && !dayDone(plan);
  }

  setOnline(online: boolean): void {
    this.online = online;
  }

  /** Re-read the clock so an undo whose window has closed disappears. */
  tick(now = Date.now()): void {
    this.now = now;
  }

  load(): void {
    this.now = Date.now();
    void this.today.load();
  }

  take(planId: string): Promise<void> {
    return this.log(planId, 'take');
  }

  skip(planId: string): Promise<void> {
    return this.log(planId, 'skip');
  }

  async undo(planId: string): Promise<void> {
    const plan = this.plans.find((p) => p.planId === planId);
    const undo = plan ? this.undoFor(plan) : null;
    if (!plan || !undo || this.busyPlan !== null) return;
    if (!this.online) {
      this.error = { planId, said: { key: 'm2r.meds.offlineAction' } };
      return;
    }
    await this.run(planId, 'undo', async () => {
      await this.request(`/meds/doses/${encodeURIComponent(undo.doseId)}`, { method: 'DELETE' });
      return { key: undo.outcome === 'SKIPPED' ? 'm2r.meds.skipUndone' : 'm2r.meds.takenUndone', vars: { name: plan.name } };
    });
  }

  private async log(planId: string, action: 'take' | 'skip'): Promise<void> {
    const plan = this.plans.find((p) => p.planId === planId);
    if (!plan || this.busyPlan !== null || dayDone(plan)) return;
    if (!this.online) {
      this.error = { planId, said: { key: 'm2r.meds.offlineAction' } };
      return;
    }
    await this.run(planId, action, async () => {
      const body = await this.request<{ status: string; already_logged?: boolean; code?: string }>(
        action === 'take' ? '/meds/log-dose' : '/meds/skip-dose',
        { method: 'POST', body: JSON.stringify({ medId: planId }) },
      );
      if (body.status === 'NOT_FOUND') throw new Error('not found');
      if (body.already_logged) return codedSaid(body) ?? { key: 'm2r.meds.alreadyLogged' };
      return { key: action === 'take' ? 'm2r.meds.takenStatus' : 'm2r.meds.skippedStatus', vars: { name: plan.name } };
    });
  }

  private async run(planId: string, action: DoseAction, send: () => Promise<Said>): Promise<void> {
    this.busyPlan = planId;
    this.busyAction = action;
    this.error = null;
    try {
      const status = await send();
      runInAction(() => { this.status = status; });
    } catch (error) {
      runInAction(() => { this.error = { planId, said: serverSaid(error, action === 'undo' ? 'm2r.meds.undoFailed' : 'm2r.meds.logFailed') }; });
    } finally {
      // Whatever happened, show what the server now has.
      await this.today.load();
      runInAction(() => {
        this.now = Date.now();
        this.busyPlan = null;
        this.busyAction = null;
      });
    }
  }

  dispose(): void {
    this.today.cancel();
  }

  reset(): void {
    this.dispose();
    this.busyPlan = null;
    this.busyAction = null;
    this.error = null;
    this.status = null;
  }
}
