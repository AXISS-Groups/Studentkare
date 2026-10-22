import * as Location from 'expo-location';
import { getSetting } from '@/data/services/config';
import type { Locate, LocationResult } from '@/features/careDirectory/model/location';

/**
 * The Expo app's `Locate` for Find care: foreground ("while using the app")
 * permission only, asked when the student taps "Use my location" and never at
 * launch. The position goes back to the view model's memory and nowhere else.
 */
const MS_PER_SECOND = 1000;

function granted(object: Location.LocationObject): LocationResult {
  return { status: 'granted', coordinates: { latitude: object.coords.latitude, longitude: object.coords.longitude } };
}

export const deviceLocate: Locate = async () => {
  const permission = await Location.requestForegroundPermissionsAsync();
  if (permission.status !== Location.PermissionStatus.GRANTED) return { status: 'denied' };
  if (!(await Location.hasServicesEnabledAsync())) return { status: 'unavailable' };
  const recent = await Location.getLastKnownPositionAsync({ maxAge: getSetting('care_directory.location_max_age_seconds') * MS_PER_SECOND });
  if (recent) return granted(recent);
  const timeoutMs = getSetting('care_directory.location_timeout_seconds') * MS_PER_SECOND;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timedOut = new Promise<LocationResult>((resolve) => { timer = setTimeout(() => resolve({ status: 'timeout' }), timeoutMs); });
  try {
    return await Promise.race([Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }).then(granted), timedOut]);
  } catch {
    return { status: 'unavailable' };
  } finally {
    if (timer) clearTimeout(timer);
  }
};
