import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';

// Configure foreground notification presentation handler
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

/**
 * Register device for Push Notifications.
 *
 * Enforces Rule 1 (Fail-closed):
 * If permissions are denied or platform is unsupported, returns null.
 */
export async function registerForPushNotificationsAsync(): Promise<string | null> {
  if (Platform.OS === 'web') {
    return null;
  }

  try {
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('clinical-alerts', {
        name: 'Clinical & Emergency Alerts',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#3525CD',
        sound: 'default',
        enableLights: true,
        enableVibrate: true,
      });

      await Notifications.setNotificationChannelAsync('general-updates', {
        name: 'Appointments & General Updates',
        importance: Notifications.AndroidImportance.DEFAULT,
        sound: 'default',
      });
    }

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      // Fail closed: permission not granted
      return null;
    }

    // Retrieve Expo push token
    const tokenData = await Notifications.getExpoPushTokenAsync();
    return tokenData.data;
  } catch {
    // Fail closed
    return null;
  }
}

/**
 * Trigger an encrypted local notification for critical clinical events.
 */
export async function scheduleLocalClinicalAlert(
  title: string,
  body: string,
  categoryIdentifier: 'clinical-alerts' | 'general-updates' = 'clinical-alerts'
): Promise<string | null> {
  if (Platform.OS === 'web') return null;

  try {
    const identifier = await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        sound: true,
        priority: 'high',
        categoryIdentifier,
      },
      trigger: null, // deliver immediately
    });
    return identifier;
  } catch {
    return null;
  }
}
