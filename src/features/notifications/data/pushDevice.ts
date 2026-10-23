import { apiRequest } from '@/data/services/http';

/**
 * Whether this phone or browser gets pushes, as the settings screens show it.
 *
 * - `on` / `off`: permission allowed; registered with the server or not.
 * - `denied`: the device blocks notifications for the app (only its settings can change that).
 * - `unsupported`: this browser has no Web Push (or no service worker).
 * - `unavailable`: push is not set up on the server (no Expo token / VAPID key).
 */
export type PushDeviceState = 'on' | 'off' | 'denied' | 'unsupported' | 'unavailable';

/** One per platform: src/native/hardware/push.ts (Expo) and src/lib/webPush.ts (Web Push). */
export interface PushDeviceController {
  readonly kind: 'phone' | 'browser';
  state(): Promise<PushDeviceState>;
  /** Asks the OS / browser if it has not been asked yet, then registers. */
  enable(): Promise<PushDeviceState>;
  disable(): Promise<PushDeviceState>;
}

/** What POST /notifications/devices takes (backend/services/push_api.py DeviceInput). */
export interface DeviceRegistration {
  kind: 'EXPO' | 'WEB';
  token: string;
  platform: 'ios' | 'android' | 'web';
  locale: string;
  keys?: { p256dh: string; auth: string };
}

export interface RegisteredDevice {
  id: string;
  kind: 'EXPO' | 'WEB';
  platform: string;
  createdAt: number;
  lastSeenAt: number | null;
}

export const pushDevicesApi = {
  register: (body: DeviceRegistration) =>
    apiRequest<RegisteredDevice>('/notifications/devices', { method: 'POST', body: JSON.stringify(body) }),
  revoke: (id: string) => apiRequest<{ success: boolean }>(`/notifications/devices/${encodeURIComponent(id)}`, { method: 'DELETE' }),
  webPushKey: () => apiRequest<{ publicKey: string | null }>('/notifications/web-push-key'),
};
