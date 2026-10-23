import type { MessageKey } from '@/i18n';
import type { RoutePath } from '@/lib/utils/workflowRouting';
import type { SkIconName } from '@/design-system/icons';

/**
 * The campus Overview board (design page 4, CampusOverview) built from what the
 * server really reports. Two campus-scoped sources exist today: campus
 * verification requests and open SOS alerts. Everything else on the board
 * (seats, screening, vaccination, the counsellor queue, coverage by year) has no
 * source yet and is shown as "not connected", never as a number.
 *
 * Counts only: no student's name, contact or health detail reaches this board.
 */

export type Part<T> = { ok: true; value: T } | { ok: false; status: number };

export interface PendingVerification { accountId: string }
export interface OpenSosAlert {
  status: 'ACTIVE' | 'ACKNOWLEDGED' | 'RESOLVED' | 'CANCELLED';
  /** Unix seconds. */
  createdAt: number;
}

export interface CampusOverviewInput {
  pending: Part<PendingVerification[]>;
  sos: Part<OpenSosAlert[]>;
}

export type OverviewTone = 'positive' | 'attention' | 'danger' | 'action' | 'neutral';

export interface Phrase { key: MessageKey; vars?: Record<string, string | number> }

export interface OverviewKpi {
  id: 'seats' | 'to-verify' | 'screened' | 'vaccinated' | 'sos' | 'counsellor';
  label: MessageKey;
  /** null = no value to show (not connected, or it couldn't be loaded). */
  value: number | null;
  chip: { label: MessageKey; tone: OverviewTone };
  meta: Phrase;
  route: RoutePath;
}

export interface AttentionItem {
  id: string;
  title: Phrase;
  meta: Phrase;
  tag: MessageKey;
  tone: OverviewTone;
  icon: SkIconName;
  route: RoutePath;
}

export type OverviewView =
  | { kind: 'error'; code: string }
  | { kind: 'no-campus' }
  | { kind: 'empty' }
  | { kind: 'data'; kpis: OverviewKpi[]; attention: AttentionItem[]; partial: boolean };

const SECONDS_PER_MINUTE = 60;
const SECONDS_PER_HOUR = 60 * SECONDS_PER_MINUTE;
const SECONDS_PER_DAY = 24 * SECONDS_PER_HOUR;
/** The server's "your account isn't assigned to a campus" answer (campus_scope). */
const HTTP_FORBIDDEN = 403;

/** "18 min", "3 h", "2 d" — how long ago `then` was, at `now` (both Unix seconds). */
export function ageOf(then: number, now: number): Phrase {
  const seconds = Math.max(0, now - then);
  if (seconds < SECONDS_PER_MINUTE) return { key: 'campusOverview.age.justNow' };
  if (seconds < SECONDS_PER_HOUR) return { key: 'campusOverview.age.minutes', vars: { count: Math.floor(seconds / SECONDS_PER_MINUTE) } };
  if (seconds < SECONDS_PER_DAY) return { key: 'campusOverview.age.hours', vars: { count: Math.floor(seconds / SECONDS_PER_HOUR) } };
  return { key: 'campusOverview.age.days', vars: { count: Math.floor(seconds / SECONDS_PER_DAY) } };
}

const notConnected = { label: 'campusOverview.chip.notConnected', tone: 'neutral' } as const;
const unavailable = { label: 'campusOverview.chip.unavailable', tone: 'neutral' } as const;

/**
 * Builds the board. `now` is Unix seconds. `age` turns a Phrase into text for
 * the KPI and attention metas, so the caller decides the language.
 */
export function buildCampusOverview(input: CampusOverviewInput, now: number, age: (phrase: Phrase) => string): OverviewView {
  const { pending, sos } = input;
  if (!pending.ok && !sos.ok) {
    // Both sources check the admin's campus first; a 403 from both means no campus is set.
    if (pending.status === HTTP_FORBIDDEN && sos.status === HTTP_FORBIDDEN) return { kind: 'no-campus' };
    const status = pending.status || sos.status;
    return { kind: 'error', code: status ? String(status) : 'NET' };
  }

  const open = sos.ok ? sos.value.filter((alert) => alert.status === 'ACTIVE' || alert.status === 'ACKNOWLEDGED') : [];
  const waiting = open.filter((alert) => alert.status === 'ACTIVE').sort((a, b) => a.createdAt - b.createdAt);
  const acknowledged = open.filter((alert) => alert.status === 'ACKNOWLEDGED');
  const pendingCount = pending.ok ? pending.value.length : 0;

  if (pending.ok && sos.ok && pendingCount === 0 && open.length === 0) return { kind: 'empty' };

  const oldestOpen = open.reduce<number | null>((oldest, alert) => (oldest === null || alert.createdAt < oldest ? alert.createdAt : oldest), null);

  const kpis: OverviewKpi[] = [
    { id: 'seats', label: 'campusOverview.kpi.seats', value: null, chip: notConnected, meta: { key: 'campusOverview.kpi.seatsMeta' }, route: 'campus/students' },
    pending.ok
      ? { id: 'to-verify', label: 'campusOverview.kpi.toVerify', value: pendingCount, chip: pendingCount > 0 ? { label: 'campusOverview.chip.pending', tone: 'attention' } : { label: 'campusOverview.chip.clear', tone: 'positive' }, meta: { key: 'campusOverview.kpi.toVerifyMeta' }, route: 'campus/verification' }
      : { id: 'to-verify', label: 'campusOverview.kpi.toVerify', value: null, chip: unavailable, meta: { key: 'campusOverview.kpi.toVerifyMeta' }, route: 'campus/verification' },
    { id: 'screened', label: 'campusOverview.kpi.screened', value: null, chip: notConnected, meta: { key: 'campusOverview.kpi.screenedMeta' }, route: 'campus/insights' },
    { id: 'vaccinated', label: 'campusOverview.kpi.vaccinated', value: null, chip: notConnected, meta: { key: 'campusOverview.kpi.vaccinatedMeta' }, route: 'campus/insights' },
    sos.ok
      ? {
        id: 'sos', label: 'campusOverview.kpi.sos', value: open.length,
        chip: open.length > 0 ? { label: 'campusOverview.chip.live', tone: 'danger' } : { label: 'campusOverview.chip.none', tone: 'positive' },
        meta: oldestOpen === null ? { key: 'campusOverview.kpi.sosMetaNone' } : { key: 'campusOverview.kpi.sosMetaOldest', vars: { age: age(ageOf(oldestOpen, now)) } },
        route: 'campus/sos',
      }
      : { id: 'sos', label: 'campusOverview.kpi.sos', value: null, chip: unavailable, meta: { key: 'campusOverview.kpi.sosMetaNone' }, route: 'campus/sos' },
    { id: 'counsellor', label: 'campusOverview.kpi.counsellor', value: null, chip: notConnected, meta: { key: 'campusOverview.kpi.counsellorMeta' }, route: 'campus/counsellor' },
  ];
  // A failed SOS load must not read as "no SOS open".
  if (!sos.ok) kpis[4] = { ...kpis[4], meta: { key: 'campusOverview.attention.partial' } };

  // Oldest first: unacknowledged SOS, then acknowledged SOS still open, then verification.
  const attention: AttentionItem[] = [];
  if (waiting.length > 0) {
    attention.push({
      id: 'sos-waiting',
      title: waiting.length === 1 ? { key: 'campusOverview.attention.sosActiveOne' } : { key: 'campusOverview.attention.sosActiveOther', vars: { count: waiting.length } },
      meta: { key: 'campusOverview.attention.sosActiveMeta', vars: { age: age(ageOf(waiting[0].createdAt, now)) } },
      tag: 'campusOverview.attention.sosActiveTag', tone: 'danger', icon: 'alert-circle', route: 'campus/sos',
    });
  }
  if (acknowledged.length > 0) {
    attention.push({
      id: 'sos-open',
      title: acknowledged.length === 1 ? { key: 'campusOverview.attention.sosAckOne' } : { key: 'campusOverview.attention.sosAckOther', vars: { count: acknowledged.length } },
      meta: { key: 'campusOverview.attention.sosAckMeta' },
      tag: 'campusOverview.attention.sosAckTag', tone: 'attention', icon: 'alert-circle', route: 'campus/sos',
    });
  }
  if (pendingCount > 0) {
    attention.push({
      id: 'verify',
      title: pendingCount === 1 ? { key: 'campusOverview.attention.verifyOne' } : { key: 'campusOverview.attention.verifyOther', vars: { count: pendingCount } },
      meta: { key: 'campusOverview.attention.verifyMeta' },
      tag: 'campusOverview.attention.verifyTag', tone: 'action', icon: 'alert-circle', route: 'campus/verification',
    });
  }

  return { kind: 'data', kpis, attention, partial: !pending.ok || !sos.ok };
}
