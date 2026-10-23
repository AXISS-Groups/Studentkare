import { ApiError, apiRequest } from '@/data/services/http';
import type { MessageKey, Said } from '@/i18n';
import type { SyncedDay } from '../sources/healthSources';
import { isStepSource, type StepSource } from '../model/stepSources';

/**
 * The step reads and writes the Steps screen and its cards use (backend/services/wellness_api.py):
 * GET /activity/trends (this week, one day per date with the source of each value) and
 * POST /activity/entries (a typed total for a day, kept apart from synced ones).
 */

export const WEEK_PATH = '/activity/trends?period=this_week';

export type ActivityDay = SyncedDay;

interface MetricSummary { unit: string; total: number | null; dailyAverage: number | null; daysWithData: number }

export interface ActivityTrends {
  period: string;
  timezone: string;
  /** First and last local dates of the period; for this week, `to` is the student's today. */
  from: string;
  to: string;
  daysInPeriod: number;
  metrics: { steps: MetricSummary } & Record<string, MetricSummary>;
  days: ActivityDay[];
}

export function readWeek(request: typeof apiRequest = apiRequest): Promise<ActivityTrends> {
  return request<ActivityTrends>(WEEK_PATH);
}

export function saveTypedSteps(date: string, steps: number, request: typeof apiRequest = apiRequest): Promise<ActivityDay> {
  return request<ActivityDay>('/activity/entries', { method: 'POST', body: JSON.stringify({ date, steps }) });
}

/** Today's steps and where the number came from; nulls when the server has none (never 0 by default). */
export interface StepsToday { date: string; steps: number | null; source: StepSource | null }

export function todayFrom(week: ActivityTrends): StepsToday {
  const day = week.days.find((d) => d.date === week.to);
  const steps = day && typeof day.steps === 'number' ? day.steps : null;
  const source = steps !== null && isStepSource(day?.sources?.steps) ? day?.sources?.steps ?? null : null;
  return { date: week.to, steps, source };
}

/** One bar of the week chart. `steps` is null for a day with no number (unknown, not zero). */
export interface WeekBar { date: string; steps: number | null; source: StepSource | null; isToday: boolean }

/** Every day from the week's first day to today, in order, with or without a number. */
export function weekBars(week: ActivityTrends): WeekBar[] {
  const byDate = new Map(week.days.map((d) => [d.date, d]));
  const out: WeekBar[] = [];
  const [y, m, d] = week.from.split('-').map(Number);
  for (let i = 0; i < week.daysInPeriod; i += 1) {
    const at = new Date(Date.UTC(y, m - 1, d + i));
    const date = at.toISOString().slice(0, 10);
    const day = byDate.get(date);
    const steps = day && typeof day.steps === 'number' ? day.steps : null;
    const source = steps !== null && isStepSource(day?.sources?.steps) ? day?.sources?.steps ?? null : null;
    out.push({ date, steps, source, isToday: date === week.to });
  }
  return out;
}

/** A step count as written in India: 12,480. */
export function stepsText(steps: number): string {
  return Math.round(steps).toLocaleString('en-IN');
}

/** "Mon" for a YYYY-MM-DD day, in the device's language. */
export function weekdayShort(date: string): string {
  const [y, m, d] = date.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(undefined, { weekday: 'short' });
}

/** Copy for each source, so every number says where it came from. */
export const SOURCE_LABEL: Readonly<Record<StepSource, MessageKey>> = {
  HEALTHKIT: 'steps.source.HEALTHKIT',
  HEALTH_CONNECT: 'steps.source.HEALTH_CONNECT',
  PHONE_MOTION: 'steps.source.PHONE_MOTION',
  MANUAL: 'steps.source.MANUAL',
};

/** The server's codes a step write can fail with (services/wellness_messages.py), and their copy. */
const CODE_COPY: Readonly<Record<string, MessageKey>> = {
  ACTIVITY_EMPTY: 'wellness.msg.ACTIVITY_EMPTY',
  ACTIVITY_DAY_IN_FUTURE: 'wellness.msg.ACTIVITY_DAY_IN_FUTURE',
  ACTIVITY_DAY_TOO_OLD: 'wellness.msg.ACTIVITY_DAY_TOO_OLD',
  ACTIVITY_VALUE_OUT_OF_RANGE: 'wellness.msg.ACTIVITY_VALUE_OUT_OF_RANGE',
};

/** A failed write, as words: the server's coded message from the catalogue, else its text, else ours. */
export function failureSaid(error: unknown): Said {
  if (error instanceof ApiError) {
    const detail = error.detail as { code?: unknown; values?: Record<string, string | number> } | null;
    const key = detail && typeof detail.code === 'string' ? CODE_COPY[detail.code] : undefined;
    if (key) return { key, vars: detail?.values };
    if (error.message) return { raw: error.message };
  }
  return { key: 'steps.saveFailed' };
}
