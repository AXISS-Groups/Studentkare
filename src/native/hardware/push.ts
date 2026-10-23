import { Platform } from 'react-native';
import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';
import { skTokens } from '@/theme/tokens/generated/skTokens';
import { pushDevicesApi } from '@/features/notifications/data/pushDevice';
import type { PushDeviceController, PushDeviceState } from '@/features/notifications/data/pushDevice';
import type { MessageKey } from '@/i18n';

/**
 * Server push on the phone, through the Expo push service (backend
 * services/push_providers.py; APNs and FCM credentials live with EAS).
 *
 * Nothing is asked at launch. The OS prompt appears when the student turns on
 * their first reminder (src/native/hardware/notifications.ts calls
 * `pushPermissionGranted`), or taps "Turn on" in Notification settings. When
 * permission was already given, signing in quietly registers this phone again.
 *
 * Android channels and iOS categories are set up here; their names are read
 * in the student's language. The accent colour is the brand navy token. Each
 * iOS category hides the body behind "Student Kare notification" when previews
 * are off. The text itself is the server's fixed line, never a detail.
 */

type Translate = (key: MessageKey) => string;

/** Android channel ids; keep in step with backend/core/push_copy.CATEGORIES android_channel. */
export const ANDROID_CHANNELS = ['safety', 'reminders', 'orders', 'camps', 'announcements'] as const;
const CHANNEL_NAME: Record<(typeof ANDROID_CHANNELS)[number], MessageKey> = {
  safety: 'push.android.safety',
  reminders: 'push.android.reminders',
  orders: 'push.android.orders',
  camps: 'push.android.camps',
  announcements: 'push.android.announcements',
};
/** iOS category ids; keep in step with push_copy ios_category. */
export const IOS_CATEGORIES = ['safety', 'reminder', 'update', 'announcement'] as const;

let deviceId = '';
let channelsReady = false;

function projectId(): string {
  const extra = Constants.expoConfig?.extra as { eas?: { projectId?: unknown } } | undefined;
  const id = extra?.eas?.projectId;
  return typeof id === 'string' ? id : '';
}

/** Channels (Android) and categories (iOS). Safe to call more than once. */
export async function configurePushChannels(t: Translate): Promise<void> {
  if (Platform.OS === 'web') return;
  const accent = skTokens.color.light.brandNavy;
  if (Platform.OS === 'android') {
    for (const id of ANDROID_CHANNELS) {
      await Notifications.setNotificationChannelAsync(id, {
        name: t(CHANNEL_NAME[id]),
        importance: id === 'safety' ? Notifications.AndroidImportance.HIGH : Notifications.AndroidImportance.DEFAULT,
        lightColor: accent,
        // The server text is already generic; private also hides it on a secure lock screen.
        lockscreenVisibility: Notifications.AndroidNotificationVisibility.PRIVATE,
      });
    }
  } else {
    for (const id of IOS_CATEGORIES) {
      await Notifications.setNotificationCategoryAsync(id, [
        { identifier: 'open', buttonTitle: t('push.ios.open'), options: { opensAppToForeground: true } },
      ], { previewPlaceholder: t('push.ios.hidden') });
    }
  }
  channelsReady = true;
}

async function permission(): Promise<'granted' | 'undetermined' | 'denied'> {
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return 'granted';
  return current.canAskAgain ? 'undetermined' : 'denied';
}

async function register(locale: string): Promise<PushDeviceState> {
  const id = projectId();
  if (!id) return 'unavailable';
  const token = (await Notifications.getExpoPushTokenAsync({ projectId: id })).data;
  const platform = Platform.OS === 'ios' ? 'ios' : 'android';
  const device = await pushDevicesApi.register({ kind: 'EXPO', token, platform, locale });
  deviceId = device.id;
  return 'on';
}

export function createPushController(t: Translate, locale: () => string): PushDeviceController {
  return {
    kind: 'phone',
    async state() {
      if (Platform.OS === 'web') return 'unsupported';
      if (!projectId()) return 'unavailable';
      const allowed = await permission();
      if (allowed === 'denied') return 'denied';
      return allowed === 'granted' && deviceId ? 'on' : 'off';
    },
    async enable() {
      if (Platform.OS === 'web') return 'unsupported';
      const allowed = await permission();
      if (allowed === 'denied') return 'denied';
      if (allowed === 'undetermined' && !(await Notifications.requestPermissionsAsync()).granted) return 'off';
      if (!channelsReady) await configurePushChannels(t);
      return register(locale());
    },
    async disable() {
      if (deviceId) {
        await pushDevicesApi.revoke(deviceId);
        deviceId = '';
      }
      return 'off';
    },
  };
}

/**
 * The student just allowed notifications for a reminder: register this phone
 * for server pushes too. Never throws; a reminder must not fail over push.
 */
export async function pushPermissionGranted(t: Translate, locale: string): Promise<void> {
  try {
    if (!channelsReady) await configurePushChannels(t);
    await register(locale);
  } catch {
    // Push is extra here: the local reminder is already set.
  }
}

/** Signed in with permission already given (no prompt): refresh this phone's registration. */
export async function refreshPushRegistration(t: Translate, locale: string): Promise<void> {
  try {
    if (Platform.OS === 'web' || (await permission()) !== 'granted') return;
    await pushPermissionGranted(t, locale);
  } catch {
    // Nothing to tell the student: settings shows the real state when opened.
  }
}

/** Before sign-out: stop this phone's pushes. The server also revokes them on sign-out. */
export async function stopPushOnSignOut(): Promise<void> {
  try {
    if (deviceId) await pushDevicesApi.revoke(deviceId);
  } catch {
    // Sign-out must not wait on push.
  } finally {
    deviceId = '';
  }
}

/** The path a tapped push asks to open, or null. Only a path on our site: never another origin. */
export function pathFromResponse(response: Notifications.NotificationResponse | null | undefined): string | null {
  const path = response?.notification.request.content.data?.path;
  return typeof path === 'string' && path.startsWith('/') && !path.startsWith('//') ? path : null;
}
