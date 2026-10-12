import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { en } from '@/i18n/en';
import { te } from '@/i18n/te';
import { hi } from '@/i18n/hi';

const read = (file: string) => readFileSync(resolve(process.cwd(), file), 'utf8');
const appJson = JSON.parse(read('app.json')) as {
  expo: { ios: { infoPlist: Record<string, unknown> }; android: { permissions: string[] }; plugins: (string | [string, Record<string, string>])[] };
};

describe('every OS permission the app declares has a screen that uses it', () => {
  it('nothing is requested at launch', () => {
    const app = read('src/native/App.tsx');
    expect(app).not.toMatch(/registerForPushNotificationsAsync|requestPermissionsAsync|requestCameraPermissions/);
  });

  it('the camera is used by the record-capture screen, as the permission text says', () => {
    expect(read('src/native/App.tsx')).toMatch(/name="CaptureRecord"/);
    expect(read('src/native/RecordCaptureScreen.tsx')).toMatch(/useCameraPermissions/);
    const text = String(appJson.expo.ios.infoPlist.NSCameraUsageDescription);
    expect(text).toMatch(/prescription or health document/);
    const plugin = appJson.expo.plugins.find((p) => Array.isArray(p) && p[0] === 'expo-camera');
    expect(Array.isArray(plugin) ? plugin[1].cameraPermission : '').toBe(text);
  });

  it('notifications are used by medicine reminders', () => {
    expect(read('src/native/App.tsx')).toMatch(/name="MedicineReminders"/);
    expect(appJson.expo.android.permissions).toEqual(expect.arrayContaining(['android.permission.POST_NOTIFICATIONS', 'android.permission.RECEIVE_BOOT_COMPLETED']));
  });

  it('declares no Face ID or biometric permission (there is no biometric lock)', () => {
    expect(appJson.expo.ios.infoPlist).not.toHaveProperty('NSFaceIDUsageDescription');
    expect(appJson.expo.android.permissions.join(' ')).not.toMatch(/BIOMETRIC|FINGERPRINT/);
  });

  it.each([['en', en], ['te', te], ['hi', hi]] as const)('%s: a reminder never names the medicine on the lock screen', (_lang, catalog) => {
    expect(catalog['reminders.notifyTitle']).not.toMatch(/\{/);
    expect(catalog['reminders.notifyBody']).not.toMatch(/\{/);
  });
});
