/**
 * The three automatic step sources, each written against a small interface so
 * the logic is the same on every phone and testable without one. The real
 * modules (expo-sensors Pedometer, react-native-health, react-native-health-connect)
 * are adapted to these interfaces in src/native/stepConnectors.ts, the only
 * file that imports them; the web never does.
 *
 * Rules every connector keeps:
 * - It never shows a platform prompt by itself. `status()` only looks; the
 *   prompt appears from `connect()`, which the Steps screen calls after its
 *   plain explainer and the student's "Continue".
 * - It registers a source (healthSources.registerHealthSource) only when the
 *   platform allows reading, and reads only steps (and distance where the
 *   platform has it). Nothing is ever written to Apple Health or Health Connect.
 * - A value the platform did not return is left out. Zero from Apple Health is
 *   treated as "nothing read" because HealthKit hides a refused read behind an
 *   empty result: a 0 could be a refusal, so it is not shown as a count.
 */
import type { StepProvider } from '../model/stepSources';
import { registerHealthSource, unregisterHealthSource, type DayTotals } from './healthSources';

export type ConnectorStatus =
  /** This phone has no such source (no step sensor, no HealthKit, Health Connect not installed). */
  | 'unavailable'
  /** Health Connect is installed but must be updated first. */
  | 'update_required'
  /** Available; the student has not connected it. */
  | 'not_connected'
  /** The student said no; asking again is allowed. */
  | 'denied'
  /** The student said no and the platform will not ask again: only its settings can turn it on. */
  | 'blocked'
  | 'connected';

export interface StepConnector {
  provider: StepProvider;
  /** False when the source can only count live while the screen is open (Android's motion sensor). */
  readsDayTotal: boolean;
  /** The state now, without any prompt. Re-registers a source the platform still allows. */
  status(): Promise<ConnectorStatus>;
  /** Ask the platform (its prompt shows here) and register on success. */
  connect(): Promise<ConnectorStatus>;
  /** Stop reading it in this app session. */
  disconnect(): void;
  /** Steps counted since the call, while the screen is open. Returns the stop function. */
  watchLive?: (onSteps: (steps: number) => void) => () => void;
  /** Open the platform's own settings, where a refused permission is turned back on. */
  openSettings?: () => void;
}

/** Start and end (exclusive) of a local calendar day, the end capped at now. */
export function dayWindow(date: string, now: Date = new Date()): { start: Date; end: Date } | null {
  const [y, m, d] = date.split('-').map(Number);
  if (!y || !m || !d) return null;
  const start = new Date(y, m - 1, d);
  const next = new Date(y, m - 1, d + 1);
  const end = next.getTime() < now.getTime() ? next : now;
  return end.getTime() > start.getTime() ? { start, end } : null;
}

const positive = (value: number | null | undefined): value is number =>
  typeof value === 'number' && Number.isFinite(value) && value > 0;

// --- Phone motion sensor (expo-sensors Pedometer: iOS Core Motion, Android step counter) ---------

export interface MotionPermission { granted: boolean; canAskAgain: boolean }
export interface PedometerModule {
  isAvailableAsync(): Promise<boolean>;
  getPermissionsAsync(): Promise<MotionPermission>;
  requestPermissionsAsync(): Promise<MotionPermission>;
  /** Steps between two times. iOS only (Core Motion keeps 7 days); absent on Android. */
  getStepCountAsync?: (start: Date, end: Date) => Promise<{ steps: number }>;
  watchStepCount(callback: (result: { steps: number }) => void): { remove(): void };
}

function permissionStatus(p: MotionPermission): ConnectorStatus {
  if (p.granted) return 'connected';
  return p.canAskAgain ? 'not_connected' : 'blocked';
}

export function createPhoneMotionConnector(pedometer: PedometerModule, options: { openSettings?: () => void; now?: () => Date } = {}): StepConnector {
  const now = options.now ?? (() => new Date());
  const readsDayTotal = typeof pedometer.getStepCountAsync === 'function';
  let off = false;
  let asked = false;

  const register = () => registerHealthSource({
    provider: 'phone_motion',
    readDay: async (date): Promise<DayTotals | null> => {
      const window = dayWindow(date, now());
      if (!pedometer.getStepCountAsync || !window) return null;
      const { steps } = await pedometer.getStepCountAsync(window.start, window.end);
      return Number.isFinite(steps) && steps >= 0 ? { steps } : null;
    },
  });

  const settle = (p: MotionPermission): ConnectorStatus => {
    const status = permissionStatus(p);
    if (status === 'connected' && !off) { register(); return 'connected'; }
    unregisterHealthSource('phone_motion');
    if (status === 'connected') return 'not_connected';
    return status === 'not_connected' && asked ? 'denied' : status;
  };

  return {
    provider: 'phone_motion',
    readsDayTotal,
    openSettings: options.openSettings,
    async status() {
      if (!(await pedometer.isAvailableAsync())) { unregisterHealthSource('phone_motion'); return 'unavailable'; }
      return settle(await pedometer.getPermissionsAsync());
    },
    async connect() {
      if (!(await pedometer.isAvailableAsync())) return 'unavailable';
      off = false;
      asked = true;
      return settle(await pedometer.requestPermissionsAsync());
    },
    disconnect() {
      off = true;
      unregisterHealthSource('phone_motion');
    },
    watchLive(onSteps) {
      const sub = pedometer.watchStepCount(({ steps }) => { if (Number.isFinite(steps) && steps >= 0) onSteps(Math.round(steps)); });
      return () => sub.remove();
    },
  };
}

// --- Apple Health (HealthKit, read only) ---------------------------------------------------------

export interface HealthKitModule {
  isAvailable(): Promise<boolean>;
  /** Ask to read steps and walking distance (no write types). Resolves once the sheet is answered. */
  requestRead(): Promise<void>;
  /** The day's step total (the Health app's own de-duplicated sum), or null. */
  stepCount(day: Date): Promise<number | null>;
  /** The day's walking and running distance in metres, or null. */
  distanceMetres(day: Date): Promise<number | null>;
}

const METRES_PER_KM = 1000;

/** Local noon of a YYYY-MM-DD day: a moment inside that day in any timezone the phone is in. */
export function middayOf(date: string): Date | null {
  const [y, m, d] = date.split('-').map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d, 12);
}

export function createHealthKitConnector(health: HealthKitModule, options: { openSettings?: () => void } = {}): StepConnector {
  // HealthKit never says whether reading was allowed, so "connected" means the
  // student connected it in this app session and the sheet was answered.
  let connected = false;
  const register = () => registerHealthSource({
    provider: 'healthkit',
    readDay: async (date): Promise<DayTotals | null> => {
      const day = middayOf(date);
      if (!day) return null;
      const [steps, metres] = await Promise.all([health.stepCount(day), health.distanceMetres(day).catch(() => null)]);
      const out: DayTotals = {};
      if (positive(steps)) out.steps = steps;
      if (positive(metres)) out.distanceKm = metres / METRES_PER_KM;
      return Object.keys(out).length ? out : null;
    },
  });
  return {
    provider: 'healthkit',
    readsDayTotal: true,
    openSettings: options.openSettings,
    async status() {
      if (!(await health.isAvailable())) return 'unavailable';
      return connected ? 'connected' : 'not_connected';
    },
    async connect() {
      if (!(await health.isAvailable())) return 'unavailable';
      await health.requestRead();
      connected = true;
      register();
      return 'connected';
    },
    disconnect() {
      connected = false;
      unregisterHealthSource('healthkit');
    },
  };
}

// --- Google Health Connect (read only) -------------------------------------------------------------

export type HealthConnectSdk = 'available' | 'unavailable' | 'update_required';
export type HealthConnectRecord = 'Steps' | 'Distance';
export interface HealthConnectModule {
  sdkStatus(): Promise<HealthConnectSdk>;
  initialize(): Promise<boolean>;
  /** Record types the app may read. */
  grantedReads(): Promise<HealthConnectRecord[]>;
  /** Ask to read these types (Health Connect's own screen); resolves with what was granted. */
  requestReads(types: HealthConnectRecord[]): Promise<HealthConnectRecord[]>;
  /** Health Connect's de-duplicated total between two times; `hasData` false when no app recorded any. */
  aggregate(type: HealthConnectRecord, start: Date, end: Date): Promise<{ value: number; hasData: boolean }>;
  openSettings(): void;
}

const READS: HealthConnectRecord[] = ['Steps', 'Distance'];

export function createHealthConnectConnector(hc: HealthConnectModule, options: { now?: () => Date } = {}): StepConnector {
  const now = options.now ?? (() => new Date());
  let off = false;
  let asked = false;
  let granted: HealthConnectRecord[] = [];

  const register = () => registerHealthSource({
    provider: 'health_connect',
    readDay: async (date): Promise<DayTotals | null> => {
      const window = dayWindow(date, now());
      if (!window) return null;
      const out: DayTotals = {};
      const steps = await hc.aggregate('Steps', window.start, window.end);
      if (steps.hasData && Number.isFinite(steps.value) && steps.value >= 0) out.steps = steps.value;
      if (granted.includes('Distance')) {
        const distance = await hc.aggregate('Distance', window.start, window.end).catch(() => null);
        if (distance?.hasData && positive(distance.value)) out.distanceKm = distance.value;
      }
      return Object.keys(out).length ? out : null;
    },
  });

  const ready = async (): Promise<ConnectorStatus | null> => {
    const sdk = await hc.sdkStatus();
    if (sdk !== 'available') { unregisterHealthSource('health_connect'); return sdk; }
    if (!(await hc.initialize())) { unregisterHealthSource('health_connect'); return 'unavailable'; }
    return null;
  };

  const settle = (types: HealthConnectRecord[]): ConnectorStatus => {
    granted = types;
    if (types.includes('Steps') && !off) { register(); return 'connected'; }
    unregisterHealthSource('health_connect');
    return asked && !types.includes('Steps') ? 'denied' : 'not_connected';
  };

  return {
    provider: 'health_connect',
    readsDayTotal: true,
    openSettings: () => hc.openSettings(),
    async status() {
      return (await ready()) ?? settle(await hc.grantedReads());
    },
    async connect() {
      const blocked = await ready();
      if (blocked) return blocked;
      off = false;
      asked = true;
      return settle(await hc.requestReads(READS));
    },
    disconnect() {
      off = true;
      unregisterHealthSource('health_connect');
    },
  };
}

