import { useMemo } from 'react';
import { useApiResource } from '@/hooks/api/useApiResource';
import type { LiveOrder } from '@/data/types/workflowTypes';
import { toDate } from '@/features/phoneboards/format';
import { BUY_AGAIN_ORDER_LIMIT, buyAgainEntries } from '@/features/studentweb/data/studentWebData';

/**
 * What Mobile 2.0 Home reads, each from its own endpoint, each shown or left
 * out on its own (a part that fails to load never blocks the rest):
 *
 * - Medicines today: GET /meds/today — the student's own schedule (clinical
 *   plane). Founder decision 2026-10-21 (Rule L): shown here, read only, and
 *   never passed into any catalogue or commerce request.
 * - Next consult: GET /appointments.
 * - Buy again: GET /orders (commerce).
 * - Health camp: GET /camps.
 */

/**
 * GET /meds/today to plans[] (structured doses only; free-text frequency is never counted).
 * Rule L: only the counts are read here. The response also carries each plan's
 * name and dose; they are never kept, drawn or passed on from Home.
 */
interface MedsTodayPlan { planId: string; dosesPlanned: number | null; dosesTaken: number; dosesSkipped?: number }
interface MedsToday { plans: MedsTodayPlan[] }
interface Appointment { id: string; slotStart: string; status: string }
interface Camp { id: string; name: string; date: string }

export interface MedsSummary {
  taken: number;
  planned: number;
  /** Doses the student skipped today (they are not left to take, and not taken). */
  skipped: number;
}

const UPCOMING = new Set(['REQUESTED', 'CONFIRMED']);

/** Doses taken of doses planned today, over the plans that say how many a day. Null when none do. */
export function medsSummary(today: MedsToday | null): MedsSummary | null {
  if (!today) return null;
  let planned = 0;
  let taken = 0;
  let skipped = 0;
  for (const plan of today.plans) {
    if (plan.dosesPlanned === null || plan.dosesPlanned <= 0) continue;
    planned += plan.dosesPlanned;
    const took = Math.min(plan.dosesTaken, plan.dosesPlanned);
    taken += took;
    skipped += Math.min(plan.dosesSkipped ?? 0, plan.dosesPlanned - took);
  }
  return planned > 0 ? { taken, planned, skipped } : null;
}

/** The soonest requested or confirmed appointment still ahead. */
export function nextAppointment(items: readonly Appointment[], now = Date.now()): Appointment | null {
  return items
    .filter((a) => UPCOMING.has(a.status) && (toDate(a.slotStart)?.getTime() ?? 0) > now)
    .sort((a, b) => (toDate(a.slotStart)?.getTime() ?? 0) - (toDate(b.slotStart)?.getTime() ?? 0))[0] ?? null;
}

/** The next camp from today on (camps carry a date, YYYY-MM-DD). */
export function nextCamp(items: readonly Camp[], now = new Date()): Camp | null {
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  return items
    .filter((c) => (toDate(c.date)?.getTime() ?? 0) >= today)
    .sort((a, b) => (toDate(a.date)?.getTime() ?? 0) - (toDate(b.date)?.getTime() ?? 0))[0] ?? null;
}

export interface M2HomeData {
  meds: { loading: boolean; failed: boolean; summary: MedsSummary | null };
  consult: { loading: boolean; next: Appointment | null };
  buyAgainCount: number | null;
  camp: Camp | null;
}

export function useM2HomeData(): M2HomeData {
  const meds = useApiResource<MedsToday>('/meds/today');
  const appts = useApiResource<{ items: Appointment[] }>('/appointments');
  const orders = useApiResource<{ items: LiveOrder[] }>(`/orders?limit=${BUY_AGAIN_ORDER_LIMIT}&offset=0`);
  const camps = useApiResource<{ items: Camp[] }>('/camps');
  return useMemo(() => ({
    meds: { loading: meds.loading, failed: Boolean(meds.error), summary: medsSummary(meds.data) },
    consult: { loading: appts.loading, next: appts.data ? nextAppointment(appts.data.items) : null },
    buyAgainCount: orders.data ? buyAgainEntries(orders.data.items).length : null,
    camp: camps.data ? nextCamp(camps.data.items) : null,
  }), [meds.loading, meds.error, meds.data, appts.loading, appts.data, orders.data, camps.data]);
}
