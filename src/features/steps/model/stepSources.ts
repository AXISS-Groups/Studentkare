/**
 * Where a step count comes from, and which one is shown (Steps ticket, 2026-10-21).
 *
 * The server keeps one total per day per source and shows the most trusted one
 * (backend/services/wellness_api.py SOURCE_PRIORITY): the phone's health store
 * (Apple Health / Health Connect) first, because it already merges the phone
 * and a watch without double counting; then the phone's own motion sensor;
 * then what the student typed. Numbers from two sources are never added and
 * the larger one does not win. This file mirrors that order for the app, so
 * it syncs the right source and can say where a number came from; a test
 * keeps the two lists equal.
 */

/** A source the phone app reads by itself (the `provider` sent to the sync endpoint). */
export type StepProvider = 'healthkit' | 'health_connect' | 'phone_motion';

/** A source as the server stores and reports it (`care_readings.source`). */
export type StepSource = 'HEALTHKIT' | 'HEALTH_CONNECT' | 'PHONE_MOTION' | 'MANUAL';

/** Most trusted first. Equal to the server's SOURCE_PRIORITY. */
export const STEP_SOURCE_PRIORITY: readonly StepSource[] = ['HEALTHKIT', 'HEALTH_CONNECT', 'PHONE_MOTION', 'MANUAL'];

export const PROVIDER_SOURCE: Readonly<Record<StepProvider, StepSource>> = {
  healthkit: 'HEALTHKIT',
  health_connect: 'HEALTH_CONNECT',
  phone_motion: 'PHONE_MOTION',
};

export function isStepSource(value: unknown): value is StepSource {
  return typeof value === 'string' && (STEP_SOURCE_PRIORITY as readonly string[]).includes(value);
}

/** Lower is more trusted; a source the app does not know ranks last. */
export function sourceRank(source: string): number {
  const at = (STEP_SOURCE_PRIORITY as readonly string[]).indexOf(source);
  return at < 0 ? STEP_SOURCE_PRIORITY.length : at;
}

/** Providers, most trusted first. */
export function byPriority(providers: Iterable<StepProvider>): StepProvider[] {
  return [...new Set(providers)].sort((a, b) => sourceRank(PROVIDER_SOURCE[a]) - sourceRank(PROVIDER_SOURCE[b]));
}

/**
 * Which connected provider's number the server will show for a day, if it has
 * one: the most trusted connected provider. Null when nothing is connected
 * (then only a typed number can be shown).
 */
export function preferredProvider(connected: Iterable<StepProvider>): StepProvider | null {
  return byPriority(connected)[0] ?? null;
}
