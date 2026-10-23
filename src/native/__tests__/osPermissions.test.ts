import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { en } from '@/i18n/en';
import { te } from '@/i18n/te';
import { hi } from '@/i18n/hi';

const read = (file: string) => readFileSync(resolve(process.cwd(), file), 'utf8');
const appJson = JSON.parse(read('app.json')) as {
  expo: { ios: { infoPlist: Record<string, unknown> }; android: { permissions: string[]; blockedPermissions: string[] }; plugins: (string | [string, Record<string, string | boolean>])[] };
};

describe('every OS permission the app declares has a screen that uses it', () => {
  it('nothing is requested at launch', () => {
    const app = read('src/native/App.tsx');
    expect(app).not.toMatch(/registerForPushNotificationsAsync|requestPermissionsAsync|requestCameraPermissions/);
  });

  it('the camera is used by record capture, report upload and medicine info, as the permission text says', () => {
    expect(read('src/native/App.tsx')).toMatch(/name="CaptureRecord"/);
    expect(read('src/native/RecordCaptureScreen.tsx')).toMatch(/useCameraPermissions/);
    expect(read('src/native/M2HealthScreens.tsx')).toMatch(/useCameraPermissions/);
    expect(read('src/native/MedicineInfoScreens.tsx')).toMatch(/useCameraPermissions/);
    const text = String(appJson.expo.ios.infoPlist.NSCameraUsageDescription);
    expect(text).toMatch(/prescription, lab report or health document/);
    expect(text).toMatch(/medicine strip/);
    const plugin = appJson.expo.plugins.find((p) => Array.isArray(p) && p[0] === 'expo-camera');
    expect(Array.isArray(plugin) ? plugin[1].cameraPermission : '').toBe(text);
  });

  it('declares no microphone: the phone has no calls or recording', () => {
    expect(appJson.expo.ios.infoPlist).not.toHaveProperty('NSMicrophoneUsageDescription');
    expect(appJson.expo.android.permissions.join(' ')).not.toMatch(/RECORD_AUDIO|MODIFY_AUDIO_SETTINGS/);
    expect(appJson.expo.android.blockedPermissions).toEqual(expect.arrayContaining(['android.permission.RECORD_AUDIO', 'android.permission.MODIFY_AUDIO_SETTINGS']));
    const plugin = appJson.expo.plugins.find((p) => Array.isArray(p) && p[0] === 'expo-camera');
    expect(Array.isArray(plugin) ? plugin[1].microphonePermission : true).toBe(false);
    expect(Array.isArray(plugin) ? plugin[1].recordAudioAndroid : true).toBe(false);
  });

  it('location is approximate only (Find care sorts by distance)', () => {
    expect(appJson.expo.android.permissions).toContain('android.permission.ACCESS_COARSE_LOCATION');
    expect(appJson.expo.android.permissions).not.toContain('android.permission.ACCESS_FINE_LOCATION');
    expect(appJson.expo.android.blockedPermissions).toEqual(expect.arrayContaining(['android.permission.ACCESS_FINE_LOCATION', 'android.permission.ACCESS_BACKGROUND_LOCATION']));
    expect(appJson.expo.ios.infoPlist.NSLocationDefaultAccuracyReduced).toBe(true);
    expect(read('src/native/deviceLocation.ts')).not.toMatch(/Accuracy\.(High|Highest|BestForNavigation)/);
  });

  it('notifications are used by medicine reminders', () => {
    expect(read('src/native/App.tsx')).toMatch(/name="MedicineReminders"/);
    expect(appJson.expo.android.permissions).toEqual(expect.arrayContaining(['android.permission.POST_NOTIFICATIONS', 'android.permission.RECEIVE_BOOT_COMPLETED']));
  });

  it('location is foreground only, asked for by Find care, with the same purpose text', () => {
    expect(read('src/native/App.tsx')).toMatch(/name="FindCare"/);
    expect(read('src/native/deviceLocation.ts')).toMatch(/requestForegroundPermissionsAsync/);
    expect(read('src/native/deviceLocation.ts')).not.toMatch(/Background/);
    const text = String(appJson.expo.ios.infoPlist.NSLocationWhenInUseUsageDescription);
    expect(text).toMatch(/never sent or stored/);
    expect(appJson.expo.ios.infoPlist).not.toHaveProperty('NSLocationAlwaysUsageDescription');
    const plugin = appJson.expo.plugins.find((p) => Array.isArray(p) && p[0] === 'expo-location');
    expect(Array.isArray(plugin) ? plugin[1].locationWhenInUsePermission : '').toBe(text);
    expect(Array.isArray(plugin) ? plugin[1].isAndroidBackgroundLocationEnabled : true).toBe(false);
    expect(appJson.expo.android.permissions.join(' ')).not.toMatch(/BACKGROUND_LOCATION|FOREGROUND_SERVICE/);
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

describe('step counting permissions (Steps screen)', () => {
  const plugin = (name: string) => appJson.expo.plugins.find((p) => (Array.isArray(p) ? p[0] : p) === name);
  const pluginOptions = (name: string): Record<string, string> => {
    const found = plugin(name);
    return Array.isArray(found) ? found[1] : {};
  };

  it('motion and health access are used by the Steps screen, asked only from it', () => {
    expect(read('src/native/App.tsx')).toMatch(/name="Steps"/);
    const connectors = read('src/features/steps/sources/connectors.ts');
    // Only connect() asks; status() only looks.
    expect(connectors.match(/(pedometer\.requestPermissionsAsync|health\.requestRead|hc\.requestReads)\(/g)?.length).toBe(3);
    expect(read('src/native/M2HealthScreens.tsx')).not.toMatch(/\.connect\(\)/);
  });

  it('the iOS usage strings say what is read and match the config plugins', () => {
    const plist = appJson.expo.ios.infoPlist;
    expect(String(plist.NSMotionUsageDescription)).toMatch(/steps/);
    expect(pluginOptions('expo-sensors').motionPermission).toBe(plist.NSMotionUsageDescription);
    expect(String(plist.NSHealthShareUsageDescription)).toMatch(/steps and walking distance/);
    expect(pluginOptions('react-native-health').healthSharePermission).toBe(plist.NSHealthShareUsageDescription);
    expect(String(plist.NSHealthUpdateUsageDescription)).toMatch(/does not write/);
    expect(plist).not.toHaveProperty('NSHealthClinicalHealthRecordsShareUsageDescription');
  });

  it('reads only: no write permission for Apple Health or Health Connect', () => {
    const perms = appJson.expo.android.permissions;
    expect(perms).toEqual(expect.arrayContaining([
      'android.permission.ACTIVITY_RECOGNITION', 'android.permission.health.READ_STEPS', 'android.permission.health.READ_DISTANCE',
    ]));
    expect(perms.filter((p) => p.startsWith('android.permission.health.'))).toEqual(['android.permission.health.READ_STEPS', 'android.permission.health.READ_DISTANCE']);
    const native = read('src/native/stepConnectors.ts');
    expect(native).toMatch(/write: \[\]/);
    expect(native).not.toMatch(/insertRecords|saveSteps|saveWalkingRunningDistance|accessType: 'write'/);
    expect(plugin('expo-health-connect')).toBeTruthy();
  });

  it('only src/native/stepConnectors.ts loads the native step modules (the web never does)', async () => {
    const { readdirSync, statSync } = await import('node:fs');
    const { join } = await import('node:path');
    const files: string[] = [];
    const walk = (dir: string) => readdirSync(dir).forEach((name) => {
      const path = join(dir, name);
      if (statSync(path).isDirectory()) { if (name !== '__tests__') walk(path); } else if (/\.(ts|tsx)$/.test(name)) files.push(path);
    });
    walk(resolve(process.cwd(), 'src'));
    const importers = files.filter((f) => /from '(expo-sensors|react-native-health|react-native-health-connect)'/.test(readFileSync(f, 'utf8')))
      .map((f) => f.slice(process.cwd().length + 1));
    expect(importers).toEqual(['src/native/stepConnectors.ts']);
  });
});
