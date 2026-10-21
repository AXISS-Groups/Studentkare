/**
 * src/native/healthSync.ts — device activity sync (Apple Health / Health Connect).
 *
 * Reads one day's activity totals from the phone's health store and sends them
 * to POST /api/v1/movement/background-sync, which stores them in care_readings
 * beside manual entries (backend/services/wellness_api.py).
 *
 * Nothing here invents a number. This file used to return a fixed 8,420 steps,
 * 6,240 m, 420 kcal, 7.5 h sleep and a "98.5" quality score on every device and
 * post them as if they had been read. There is no HealthKit or Health Connect
 * module in this app yet, so no source is registered and the result is
 * `not_connected`: nothing is read and nothing is sent. When a native module is
 * added it registers itself with `registerHealthSource`, and only the values it
 * returns are sent; a metric it cannot read is left out, never filled in.
 */
import { apiRequest } from '@/data/services/http';

export type HealthProvider = 'healthkit' | 'health_connect';

/** One local day's totals as the platform returned them. Absent = not read. */
export interface DayTotals {
  steps?: number;
  distanceKm?: number;
  floors?: number;
  activeEnergyKcal?: number;
  standingMinutes?: number;
}

/** What a native health module provides once permission is granted. */
export interface HealthPlatformSource {
  provider: HealthProvider;
  /** Totals for a local calendar day (YYYY-MM-DD), or null if the platform has none. */
  readDay(date: string): Promise<DayTotals | null>;
}

export type HealthSyncOutcome =
  | { status: 'not_connected' }
  | { status: 'no_data'; provider: HealthProvider; date: string }
  | { status: 'synced'; provider: HealthProvider; date: string; day: SyncedDay }
  | { status: 'failed'; provider: HealthProvider; date: string };

/** The merged day the server returns (manual and synced sources, larger wins). */
export interface SyncedDay {
  date: string;
  steps: number | null;
  distanceKm: number | null;
  floors: number | null;
  activeEnergyKcal: number | null;
  standingMinutes: number | null;
}

interface SyncResponse {
  status: 'SYNCED';
  provider: HealthProvider;
  day: SyncedDay;
}

let source: HealthPlatformSource | null = null;

/** Called by a native health module after the student grants permission; null disconnects. */
export function registerHealthSource(next: HealthPlatformSource | null): void {
  source = next;
}

export function isHealthSourceConnected(): boolean {
  return source !== null;
}

/** The device's local calendar date, YYYY-MM-DD. */
export function localDate(now: Date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

function readValues(totals: DayTotals): DayTotals {
  const out: DayTotals = {};
  (Object.keys(totals) as Array<keyof DayTotals>).forEach((key) => {
    const value = totals[key];
    if (typeof value === 'number' && Number.isFinite(value) && value >= 0) out[key] = value;
  });
  return out;
}

/** Read today's totals from the registered source and store them. Sends nothing without a source. */
export async function syncToday(
  request: typeof apiRequest = apiRequest,
  now: Date = new Date(),
): Promise<HealthSyncOutcome> {
  const current = source;
  if (!current) return { status: 'not_connected' };
  const date = localDate(now);
  let totals: DayTotals | null;
  try {
    totals = await current.readDay(date);
  } catch {
    return { status: 'failed', provider: current.provider, date };
  }
  const values = totals ? readValues(totals) : {};
  if (Object.keys(values).length === 0) return { status: 'no_data', provider: current.provider, date };
  try {
    const res = await request<SyncResponse>('/v1/movement/background-sync', {
      method: 'POST',
      body: JSON.stringify({ provider: current.provider, date, ...values }),
    });
    return { status: 'synced', provider: current.provider, date, day: res.day };
  } catch {
    return { status: 'failed', provider: current.provider, date };
  }
}
