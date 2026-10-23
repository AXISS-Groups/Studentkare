import { pushDevicesApi } from '@/features/notifications/data/pushDevice';
import type { PushDeviceController, PushDeviceState } from '@/features/notifications/data/pushDevice';

/**
 * Web Push for the student web app (public/sw.js shows the push and opens the
 * app on a tap). Nothing is asked at load: the browser prompt appears only
 * when the student taps "Turn on" on the notification settings page.
 *
 * The device id the server returned is kept in this browser's storage so
 * "Turn off" and sign-out can retire it; signing out also revokes it on the
 * server, so a lost id costs nothing. No push content is stored here.
 */
const DEVICE_KEY = 'sk.push.webDevice';
const READY_TIMEOUT_MS = 4000;

function readId(): string {
  try {
    return window.localStorage.getItem(DEVICE_KEY) ?? '';
  } catch {
    return '';
  }
}

function writeId(id: string): void {
  try {
    if (id) window.localStorage.setItem(DEVICE_KEY, id);
    else window.localStorage.removeItem(DEVICE_KEY);
  } catch {
    // Storage blocked: the server still revokes on sign-out.
  }
}

export function webPushSupported(): boolean {
  return typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
}

/** The service worker, or null when none is active (the dev server unregisters it). */
async function registration(): Promise<ServiceWorkerRegistration | null> {
  const timeout = new Promise<null>((resolve) => { window.setTimeout(() => resolve(null), READY_TIMEOUT_MS); });
  return Promise.race([navigator.serviceWorker.ready, timeout]);
}

function keyBytes(base64url: string): ArrayBuffer {
  const padded = `${base64url}${'='.repeat((4 - (base64url.length % 4)) % 4)}`.replace(/-/g, '+').replace(/_/g, '/');
  const raw = window.atob(padded);
  const bytes = new Uint8Array(new ArrayBuffer(raw.length));
  for (let index = 0; index < raw.length; index += 1) bytes[index] = raw.charCodeAt(index);
  return bytes.buffer;
}

function currentLocale(): string {
  return (document.documentElement.lang || navigator.language || 'en').slice(0, 2);
}

async function state(): Promise<PushDeviceState> {
  if (!webPushSupported()) return 'unsupported';
  if (Notification.permission === 'denied') return 'denied';
  const { publicKey } = await pushDevicesApi.webPushKey();
  if (!publicKey) return 'unavailable';
  const reg = await registration();
  if (!reg) return 'unsupported';
  const subscription = await reg.pushManager.getSubscription();
  return subscription && readId() && Notification.permission === 'granted' ? 'on' : 'off';
}

async function enable(): Promise<PushDeviceState> {
  if (!webPushSupported()) return 'unsupported';
  const { publicKey } = await pushDevicesApi.webPushKey();
  if (!publicKey) return 'unavailable';
  const permission = Notification.permission === 'default' ? await Notification.requestPermission() : Notification.permission;
  if (permission !== 'granted') return permission === 'denied' ? 'denied' : 'off';
  const reg = await registration();
  if (!reg) return 'unsupported';
  const subscription = (await reg.pushManager.getSubscription())
    ?? (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes(publicKey) }));
  const json = subscription.toJSON();
  const p256dh = json.keys?.p256dh ?? '';
  const auth = json.keys?.auth ?? '';
  if (!subscription.endpoint || !p256dh || !auth) return 'off';
  const device = await pushDevicesApi.register({ kind: 'WEB', token: subscription.endpoint, platform: 'web', locale: currentLocale(), keys: { p256dh, auth } });
  writeId(device.id);
  return 'on';
}

async function disable(): Promise<PushDeviceState> {
  const id = readId();
  if (id) {
    try {
      await pushDevicesApi.revoke(id);
    } catch {
      // Already gone on the server (signed out, or pruned): the browser side still unsubscribes.
    }
  }
  writeId('');
  if (webPushSupported()) {
    const reg = await registration();
    const subscription = reg ? await reg.pushManager.getSubscription() : null;
    if (subscription) await subscription.unsubscribe();
  }
  return webPushSupported() ? 'off' : 'unsupported';
}

export const webPushController: PushDeviceController = { kind: 'browser', state, enable, disable };

/** Before signing out: stop this browser's pushes. Never throws; the server revokes too. */
export async function stopWebPushOnSignOut(): Promise<void> {
  try {
    if (readId()) await disable();
  } catch {
    // Sign-out must not wait on push.
  }
}
