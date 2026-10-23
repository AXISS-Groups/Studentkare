/**
 * Step sources on the phone (Apple Health, Health Connect, the motion sensor)
 * and the sync of today's total to POST /api/v1/movement/background-sync.
 *
 * Nothing here invents a number. An earlier version returned a fixed 8,420
 * steps, 6,240 m, 420 kcal and a "98.5" quality score on every device. Now a
 * source exists only once the student connected it on a phone and the platform
 * granted permission (each connector registers itself with
 * `registerHealthSource`); only the values it returns are sent, and a metric
 * it cannot read is left out, never filled in. With nothing registered (always
 * on the web) the result is `not_connected`: nothing is read, nothing is sent.
 *
 * Several sources can be connected at once (an iPhone with Apple Health and
 * its motion sensor). Today's total is read from the most trusted one first
 * (model/stepSources.ts) and only one is sent, so a phone never sends the same
 * walk twice; the server applies the same order and never adds sources.
 */
import { apiRequest } from '@/data/services/http';
import { byPriority, type StepProvider, type StepSource } from '../model/stepSources';

export type HealthProvider = StepProvider;

/** One local day's totals as the platform returned them. Absent = not read. */
export interface DayTotals {
  steps?: number;
  distanceKm?: number;
  floors?: number;
  activeEnergyKcal?: number;
  standingMinutes?: number;
}

/** What a connected source provides once permission is granted. */
export interface HealthPlatformSource {
  provider: HealthProvider;
  /** Totals for a local calendar day (YYYY-MM-DD), or null if the platform has none. */
  readDay(date: string): Promise<DayTotals | null>;
}

/** The day the server returns: the most trusted source's value per metric, and which source that was. */
export interface SyncedDay {
  date: string;
  steps: number | null;
  distanceKm: number | null;
  floors: number | null;
  activeEnergyKcal: number | null;
  standingMinutes: number | null;
  sources?: Partial<Record<'steps' | 'distanceKm' | 'floors' | 'activeEnergyKcal' | 'standingMinutes', StepSource>>;
}

export type HealthSyncOutcome =
  | { status: 'not_connected' }
  | { status: 'no_data'; provider: HealthProvider; date: string }
  | { status: 'synced'; provider: HealthProvider; date: string; day: SyncedDay }
  | { status: 'failed'; provider: HealthProvider; date: string };

interface SyncResponse {
  status: 'SYNCED';
  provider: HealthProvider;
  day: SyncedDay;
}

const sources = new Map<HealthProvider, HealthPlatformSource>();
const listeners = new Set<() => void>();

function changed(): void {
  listeners.forEach((listener) => listener());
}

/**
 * Called by a connector after the platform granted permission. A source for the
 * same provider replaces the earlier one; `null` disconnects every source.
 */
export function registerHealthSource(next: HealthPlatformSource | null): void {
  if (next) sources.set(next.provider, next);
  else sources.clear();
  changed();
}

/** Disconnect one source (the student turned it off, or the platform took permission away). */
export function unregisterHealthSource(provider: HealthProvider): void {
  if (sources.delete(provider)) changed();
}

/** Connected providers, most trusted first. */
export function connectedProviders(): HealthProvider[] {
  return byPriority(sources.keys());
}

export function isHealthSourceConnected(provider?: HealthProvider): boolean {
  return provider ? sources.has(provider) : sources.size > 0;
}

/** Be told when a source connects or disconnects. Returns the unsubscribe. */
export function onHealthSourcesChanged(listener: () => void): () => void {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

/** The device's local calendar date, YYYY-MM-DD. */
export function localDate(now: Date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

/** Counts are whole numbers on the server. */
const WHOLE: ReadonlySet<keyof DayTotals> = new Set<keyof DayTotals>(['steps', 'floors', 'standingMinutes']);

/** Only finite, non-negative numbers the platform returned; counts rounded to whole. */
export function readValues(totals: DayTotals): DayTotals {
  const out: DayTotals = {};
  (Object.keys(totals) as Array<keyof DayTotals>).forEach((key) => {
    const value = totals[key];
    if (typeof value === 'number' && Number.isFinite(value) && value >= 0) out[key] = WHOLE.has(key) ? Math.round(value) : value;
  });
  return out;
}

/**
 * Read today's totals from the most trusted connected source that has any, and
 * store them. Sends nothing without a source, and never sends two sources.
 */
export async function syncToday(
  request: typeof apiRequest = apiRequest,
  now: Date = new Date(),
): Promise<HealthSyncOutcome> {
  const order = connectedProviders();
  if (order.length === 0) return { status: 'not_connected' };
  const date = localDate(now);
  let failedProvider: HealthProvider | null = null;
  for (const provider of order) {
    const current = sources.get(provider);
    if (!current) continue;
    let totals: DayTotals | null;
    try {
      totals = await current.readDay(date);
    } catch {
      failedProvider = failedProvider ?? provider;
      continue;
    }
    const values = totals ? readValues(totals) : {};
    if (Object.keys(values).length === 0) continue;
    try {
      const res = await request<SyncResponse>('/v1/movement/background-sync', {
        method: 'POST',
        body: JSON.stringify({ provider, date, ...values }),
      });
      return { status: 'synced', provider, date, day: res.day };
    } catch {
      return { status: 'failed', provider, date };
    }
  }
  if (failedProvider) return { status: 'failed', provider: failedProvider, date };
  return { status: 'no_data', provider: order[0], date };
}
