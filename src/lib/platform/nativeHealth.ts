/**
 * Native health-data adapter layer.
 *
 * Detects platform capability and provides a typed interface for reading
 * permission-scoped health data (Apple HealthKit on iOS, Health Connect on
 * Android). These adapters return an explicit "unsupported" state when running
 * in a browser without a native bridge — they never fabricate device readings.
 *
 * A real native app target (React Native / Expo / native modules) would provide
 * the bridge that `navigator`/`window` cannot. Until then, capability detection
 * reports the honest state so the UI can offer manual entry instead.
 */

export type HealthPlatform = 'ios' | 'android' | 'web' | 'unknown';

export interface HealthMetricReading {
  metric: string;
  value: number;
  unit: string;
  recordedAt: string;
  source: 'healthkit' | 'health_connect' | 'manual';
}

export interface NativeHealthState {
  platform: HealthPlatform;
  supported: boolean;
  bridgeAvailable: boolean;
  detail: string;
}

export interface NativeHealthAdapter {
  detect(): NativeHealthState;
  /** Request permission for a scoped set of health data types. */
  requestPermission(types?: string[]): Promise<'granted' | 'denied' | 'unsupported'>;
  /** Read recent readings for a metric. Returns an empty list when unsupported. */
  readRecent(metric: string, limit?: number): Promise<HealthMetricReading[]>;
}

/**
 * Detect the running platform. In a browser there is no native health bridge,
 * so we report unsupported and let the UI fall back to manual entry.
 */
export function detectPlatform(): HealthPlatform {
  if (typeof navigator === 'undefined') return 'unknown';
  const ua = navigator.userAgent || '';
  const platform = (navigator as any).platform || '';
  if (/iPhone|iPad|iPod/i.test(ua) || /Mac/.test(platform)) return 'ios';
  if (/Android/i.test(ua)) return 'android';
  return 'web';
}

function bridgeAvailable(): boolean {
  // No standard web API exposes HealthKit/Health Connect. A native bridge
  // (e.g. injected by a React Native wrapper) would be detected here.
  if (typeof window === 'undefined') return false;
  const w = window as any;
  return Boolean(w?.ReactNativeWebView || w?.nativeHealthBridge);
}

export class WebNativeHealthAdapter implements NativeHealthAdapter {
  private platform: HealthPlatform;

  constructor() {
    this.platform = detectPlatform();
  }

  detect(): NativeHealthState {
    const available = bridgeAvailable();
    return {
      platform: this.platform,
      supported: available,
      bridgeAvailable: available,
      detail: available
        ? 'A native health-data bridge is available.'
        : 'No native health bridge detected. Health data can be entered manually in this browser.',
    };
  }

  async requestPermission(_types?: string[]): Promise<'granted' | 'denied' | 'unsupported'> {
    return bridgeAvailable() ? 'granted' : 'unsupported';
  }

  async readRecent(_metric: string, _limit?: number): Promise<HealthMetricReading[]> {
    if (!bridgeAvailable()) return [];
    // A real adapter would query the native bridge here. Until then, return empty.
    return [];
  }
}

export const nativeHealthAdapter = new WebNativeHealthAdapter();

export function describeNativeSupport(): { platform: HealthPlatform; supported: boolean; detail: string } {
  const state = nativeHealthAdapter.detect();
  return { platform: state.platform, supported: state.supported, detail: state.detail };
}
