import type { TrendChartPoint } from '@/design-system/charts';
import type { GuidanceStep, GuidanceStepKind, ReportReview } from '@/features/preventive/models';
import type { LabValue, RangeState } from '../data/LabResultsRepository';
import { toneOf } from './labValueModels';
import type { TrendPoint, ValueTone } from './labValueModels';

/**
 * Pure helpers for the M2Trends and M2ReportUpload views (web and Expo).
 * Nothing here compares a value with a threshold: tones come from the server's
 * `rangeState`, and the range bar only places the latest value against the
 * range its own lab printed. No direction words (WP-07 D7-8).
 */

// ── Dates (the server sends collection dates as YYYY-MM-DD) ──────────────────

/** The app language as a date locale (Indian English writes "20 Jun 2026"). */
export function dateLocale(lang: string): string {
  return `${lang}-IN`;
}

/** A YYYY-MM-DD date at local midnight (never shifted a day by a time zone). */
export function localDate(iso: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) return null;
  const at = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return Number.isNaN(at.getTime()) ? null : at;
}

/** "Jun 26" (the board's chart and table dates). */
export function monthYear(iso: string, locale?: string): string {
  const at = localDate(iso);
  return at ? at.toLocaleDateString(locale, { month: 'short', year: '2-digit' }) : iso;
}

/** "20 Jun 2026". */
export function fullDate(iso: string, locale?: string): string {
  const at = localDate(iso);
  return at ? at.toLocaleDateString(locale, { day: 'numeric', month: 'short', year: 'numeric' }) : iso;
}

/** "20 Jun 2026" from an epoch-seconds server time. */
export function fullDateFromEpoch(seconds: number | null, locale?: string): string {
  if (seconds === null || !Number.isFinite(seconds) || seconds <= 0) return '';
  return new Date(seconds < 1e12 ? seconds * 1000 : seconds).toLocaleDateString(locale, { day: 'numeric', month: 'short', year: 'numeric' });
}

function yearOf(iso: string): string {
  return /^(\d{4})-/.exec(iso)?.[1] ?? '';
}

// ── Values ───────────────────────────────────────────────────────────────────

/** A value as printed: the number as the server returned it, or the printed result ("Negative"). */
export function valueText(v: Pick<LabValue, 'valueNumeric' | 'valueText'>): string {
  return v.valueNumeric !== null ? String(v.valueNumeric) : v.valueText;
}

export function valueWithUnit(v: Pick<LabValue, 'valueNumeric' | 'valueText' | 'unit'>): string {
  const text = valueText(v);
  return v.unit ? `${text} ${v.unit}` : text;
}

/** The i18n key of a value's state badge. */
export function stateKey(state: RangeState): 'm2v.state.in' | 'm2v.state.above' | 'm2v.state.below' | 'm2v.state.none' {
  if (state === 'IN_RANGE') return 'm2v.state.in';
  if (state === 'ABOVE') return 'm2v.state.above';
  if (state === 'BELOW') return 'm2v.state.below';
  return 'm2v.state.none';
}

/** Where a value came from, as the server records it. */
export function sourceKey(v: Pick<LabValue, 'source'>): 'm2v.source.typed' | 'm2v.source.lab' {
  return v.source === 'LAB_RELEASED' ? 'm2v.source.lab' : 'm2v.source.typed';
}

/** The reports a test's values come from: "3 reports · 2023 to 2026". */
export function reportSpan(items: readonly LabValue[]): { count: number; from: string; to: string } {
  const reports = new Set(items.map((v) => v.documentId ?? v.labOrderId ?? `${v.collectedOn}|${v.labName}`));
  const years = items.map((v) => yearOf(v.collectedOn)).filter(Boolean).sort();
  return { count: reports.size, from: years[0] ?? '', to: years[years.length - 1] ?? '' };
}

export function chartPoints(points: readonly TrendPoint[], locale?: string): TrendChartPoint[] {
  return points.map((p) => ({ key: p.id, value: p.value, tone: p.tone, dateLabel: monthYear(p.collectedOn, locale), valueLabel: String(p.value) }));
}

/** The chart's text alternative: "HbA1c over time: Dec 23 6.1 %, Mar 25 6.9 %." (plan: chart text alternative). */
export function chartSummary(testName: string, points: readonly TrendPoint[], overTime: (vars: { test: string; values: string }) => string, locale?: string): string {
  const values = points.map((p) => `${monthYear(p.collectedOn, locale)} ${p.value}${p.unit ? ` ${p.unit}` : ''}`).join(', ');
  return overTime({ test: testName, values });
}

// ── The range bar (Low · Range · High) under the latest value ────────────────

export interface RangeBar {
  /** Which zones are drawn: a one-sided range ("< 200") has two. */
  zones: ('low' | 'range' | 'high')[];
  /** 0 … 100, or null when the value cannot be placed (printed result, no range). */
  marker: number | null;
}

const clampPct = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));

/**
 * The latest row against its own lab's printed range. Both limits: the range
 * is the middle half (the board's 25 % … 75 %); one limit: the range takes
 * three quarters. Null when the row has no printed range.
 */
export function rangeBar(v: Pick<LabValue, 'valueNumeric' | 'refLow' | 'refHigh'>): RangeBar | null {
  const { refLow: lo, refHigh: hi, valueNumeric: value } = v;
  if (lo === null && hi === null) return null;
  if (lo !== null && hi !== null) {
    const marker = value === null || hi <= lo ? null : clampPct(25 + ((value - lo) / (hi - lo)) * 50, 2, 98);
    return { zones: ['low', 'range', 'high'], marker };
  }
  if (hi !== null) {
    // "< hi": the range runs from nothing up to the limit.
    const marker = value === null ? null : value <= hi
      ? clampPct(hi > 0 ? (value / hi) * 75 : 37, 2, 74)
      : clampPct(75 + (hi > 0 ? ((value - hi) / hi) * 25 : 12), 76, 98);
    return { zones: ['range', 'high'], marker };
  }
  // "> lo".
  const low = lo ?? 0;
  const marker = value === null ? null : value >= low
    ? clampPct(25 + (low > 0 ? ((value - low) / low) * 75 : 37), 26, 98)
    : clampPct(low > 0 ? (value / low) * 25 : 12, 2, 24);
  return { zones: ['low', 'range'], marker };
}

export const toneOfState = (state: RangeState): ValueTone => toneOf(state);

// ── The doctor's steps (D-M2-11) ─────────────────────────────────────────────

/** The student's own report reviews, one read (the server's page limit). */
export const REVIEWS_PATH = '/preventive/report-reviews?offset=0&limit=100';

export interface DoctorSteps {
  reviewId: string;
  steps: GuidanceStep[];
  reviewedAt: number | null;
  /** The reviewing doctor's display name, once the review payload carries it (package A adds `reviewedByName`). */
  doctorName: string;
}

type ReviewWithName = ReportReview & { reviewedByName?: string | null };

/**
 * The newest APPROVED review of a report this test's values come from, if its
 * doctor wrote steps. The steps are the doctor's words, shown verbatim.
 */
export function stepsForTest(reviews: readonly ReviewWithName[], items: readonly LabValue[]): DoctorSteps | null {
  const documents = new Set(items.map((v) => v.documentId).filter((id): id is string => id !== null));
  const matching = reviews
    .filter((r) => r.status === 'APPROVED' && documents.has(r.documentId) && (r.guidance?.steps.length ?? 0) > 0)
    .sort((a, b) => (b.reviewedAt ?? 0) - (a.reviewedAt ?? 0));
  const review = matching[0];
  if (!review?.guidance) return null;
  return { reviewId: review.id, steps: review.guidance.steps, reviewedAt: review.reviewedAt, doctorName: review.reviewedByName?.trim() ?? '' };
}

/** The icon a step kind draws (none for OTHER: a plain-text step has no icon). */
export function stepIcon(kind: GuidanceStepKind): 'walk' | 'bowl' | 'flask' | null {
  if (kind === 'ACTIVITY') return 'walk';
  if (kind === 'FOOD') return 'bowl';
  if (kind === 'TEST') return 'flask';
  return null;
}
