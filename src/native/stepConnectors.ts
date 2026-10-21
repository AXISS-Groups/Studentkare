/**
 * The phone's step sources, adapted to the connector interfaces in
 * src/features/steps/sources/connectors.ts. This is the only file that imports
 * the native step modules; the web never loads it.
 *
 * - iOS: Apple Health (react-native-health, read only: StepCount and
 *   DistanceWalkingRunning, no write types) and the motion coprocessor
 *   (expo-sensors Pedometer, backed by Core Motion, which keeps 7 days of totals).
 * - Android: Health Connect (react-native-health-connect, read Steps and
 *   Distance) and the step-counter sensor (expo-sensors Pedometer). Android's
 *   sensor counts only while the app is open (expo-sensors has no day total on
 *   Android), so it gives the live count and is never sent as a day's total.
 *
 * All of these need a development build (not Expo Go): see src/native/README.md.
 */
import { Linking, Platform } from 'react-native';
import { Pedometer } from 'expo-sensors';
import AppleHealthKit from 'react-native-health';
import type { HealthKitPermissions, HealthValue } from 'react-native-health';
import {
  SdkAvailabilityStatus,
  aggregateRecord,
  getGrantedPermissions,
  getSdkStatus,
  initialize,
  openHealthConnectSettings,
  requestPermission,
} from 'react-native-health-connect';
import type { Permission } from 'react-native-health-connect';
import {
  createHealthConnectConnector,
  createHealthKitConnector,
  createPhoneMotionConnector,
} from '@/features/steps/sources/connectors';
import type {
  HealthConnectModule,
  HealthConnectRecord,
  HealthKitModule,
  PedometerModule,
  StepConnector,
} from '@/features/steps/sources/connectors';

const openAppSettings = () => { void Linking.openSettings(); };

function pedometer(): PedometerModule {
  return {
    isAvailableAsync: () => Pedometer.isAvailableAsync(),
    getPermissionsAsync: () => Pedometer.getPermissionsAsync(),
    requestPermissionsAsync: () => Pedometer.requestPermissionsAsync(),
    // Day totals exist only on iOS (Core Motion); Android's module throws "not supported".
    getStepCountAsync: Platform.OS === 'ios' ? (start, end) => Pedometer.getStepCountAsync(start, end) : undefined,
    watchStepCount: (callback) => Pedometer.watchStepCount(callback),
  };
}

const HK_READ: HealthKitPermissions = {
  permissions: {
    read: [AppleHealthKit.Constants.Permissions.StepCount, AppleHealthKit.Constants.Permissions.DistanceWalkingRunning],
    write: [],
  },
};

function healthKitValue(read: (done: (error: string, result: HealthValue) => void) => void): Promise<number | null> {
  return new Promise((resolve) => {
    read((error, result) => resolve(error || !result || typeof result.value !== 'number' ? null : result.value));
  });
}

function healthKit(): HealthKitModule {
  return {
    isAvailable: () => new Promise((resolve) => AppleHealthKit.isAvailable((error, available) => resolve(!error && available))),
    requestRead: () => new Promise((resolve, reject) => {
      AppleHealthKit.initHealthKit(HK_READ, (error) => (error ? reject(new Error(error)) : resolve()));
    }),
    // includeManuallyAdded false: only steps the phone or a watch counted, not numbers typed into Health.
    stepCount: (day) => healthKitValue((done) => AppleHealthKit.getStepCount({ date: day.toISOString(), includeManuallyAdded: false }, done)),
    distanceMetres: (day) => healthKitValue((done) => AppleHealthKit.getDistanceWalkingRunning(
      { date: day.toISOString(), unit: AppleHealthKit.Constants.Units.meter, includeManuallyAdded: false }, done)),
  };
}

const HC_TYPES: readonly HealthConnectRecord[] = ['Steps', 'Distance'];
const isHcType = (value: string): value is HealthConnectRecord => (HC_TYPES as readonly string[]).includes(value);
const readsOf = (permissions: readonly Permission[]): HealthConnectRecord[] =>
  permissions.filter((p) => p.accessType === 'read').map((p) => p.recordType).filter(isHcType);

function healthConnect(): HealthConnectModule {
  return {
    sdkStatus: async () => {
      const status = await getSdkStatus();
      if (status === SdkAvailabilityStatus.SDK_AVAILABLE) return 'available';
      if (status === SdkAvailabilityStatus.SDK_UNAVAILABLE_PROVIDER_UPDATE_REQUIRED) return 'update_required';
      return 'unavailable';
    },
    initialize: () => initialize(),
    grantedReads: async () => readsOf(await getGrantedPermissions()),
    requestReads: async (types) => readsOf(await requestPermission(types.map((recordType) => ({ accessType: 'read', recordType })))),
    aggregate: async (type, start, end) => {
      const timeRangeFilter = { operator: 'between' as const, startTime: start.toISOString(), endTime: end.toISOString() };
      if (type === 'Steps') {
        const result = await aggregateRecord({ recordType: 'Steps', timeRangeFilter });
        return { value: result.COUNT_TOTAL, hasData: result.dataOrigins.length > 0 };
      }
      const result = await aggregateRecord({ recordType: 'Distance', timeRangeFilter });
      return { value: result.DISTANCE.inKilometers, hasData: result.dataOrigins.length > 0 };
    },
    openSettings: () => openHealthConnectSettings(),
  };
}

let built: readonly StepConnector[] | null = null;

/** This phone's step sources, most trusted first (built once per app session). */
export function nativeStepConnectors(): readonly StepConnector[] {
  if (built) return built;
  if (Platform.OS === 'ios') {
    built = [createHealthKitConnector(healthKit(), { openSettings: openAppSettings }), createPhoneMotionConnector(pedometer(), { openSettings: openAppSettings })];
  } else if (Platform.OS === 'android') {
    built = [createHealthConnectConnector(healthConnect()), createPhoneMotionConnector(pedometer(), { openSettings: openAppSettings })];
  } else {
    built = [];
  }
  return built;
}
