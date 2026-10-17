import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { REMINDER_SLOTS, SLOT_TIME } from '@/features/reminders/viewmodel/MedicineRemindersViewModel';
import type { NotificationPermission, ReminderScheduler, ReminderSlot } from '@/features/reminders/viewmodel/MedicineRemindersViewModel';

/**
 * Local notifications for medicine reminders — the only use of the
 * notification permissions declared in app.json. RECEIVE_BOOT_COMPLETED lets
 * Android keep daily reminders after a restart.
 *
 * There is no push: the server has no device-token endpoint, so this app used
 * to ask for permission at launch, before sign-in, for a token it threw away.
 */

Notifications.setNotificationHandler({
  handleNotification: async () => ({ shouldShowAlert: true, shouldPlaySound: true, shouldSetBadge: false }),
});

const CHANNEL = 'medicine-reminders';
const PREFIX = 'medicine-reminder:';

export interface ReminderText {
  title: string;
  body: string;
  channelName: string;
}

const isSlot = (value: unknown): value is ReminderSlot =>
  typeof value === 'string' && (REMINDER_SLOTS as readonly string[]).includes(value);

/**
 * `text` is read at scheduling time, in the student's language. It must not
 * name the medicine: a reminder shows on the lock screen.
 */
export function createReminderScheduler(text: () => ReminderText): ReminderScheduler {
  return {
    async scheduled() {
      if (Platform.OS === 'web') return {};
      const out: Record<string, ReminderSlot> = {};
      for (const request of await Notifications.getAllScheduledNotificationsAsync()) {
        if (!request.identifier.startsWith(PREFIX)) continue;
        const slot = request.content.data?.slot;
        if (isSlot(slot)) out[request.identifier.slice(PREFIX.length)] = slot;
      }
      return out;
    },

    async permission(): Promise<NotificationPermission> {
      if (Platform.OS === 'web') return 'denied';
      const current = await Notifications.getPermissionsAsync();
      if (current.granted) return 'granted';
      return current.canAskAgain ? 'undetermined' : 'denied';
    },

    async request() {
      if (Platform.OS === 'web') return false;
      const answer = await Notifications.requestPermissionsAsync();
      return answer.granted;
    },

    async set(planId, slot) {
      const words = text();
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync(CHANNEL, {
          name: words.channelName,
          importance: Notifications.AndroidImportance.DEFAULT,
        });
      }
      await Notifications.scheduleNotificationAsync({
        identifier: `${PREFIX}${planId}`,
        content: { title: words.title, body: words.body, data: { slot } },
        trigger: { type: Notifications.SchedulableTriggerInputTypes.DAILY, channelId: CHANNEL, ...SLOT_TIME[slot] },
      });
    },

    async clear(planId) {
      await Notifications.cancelScheduledNotificationAsync(`${PREFIX}${planId}`);
    },
  };
}
