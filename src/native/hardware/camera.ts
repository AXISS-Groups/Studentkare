import { Platform } from 'react-native';
import { Camera, type PermissionResponse } from 'expo-camera';

/**
 * Native Camera Hardware Bridge.
 *
 * Enforces Rule 1 (Fail-closed):
 * Any permission rejection or hardware error returns granted: false.
 */
export async function getCameraPermissionStatus(): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  try {
    const status: PermissionResponse = await Camera.getCameraPermissionsAsync();
    return status.granted;
  } catch {
    return false;
  }
}

export async function requestCameraPermission(): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  try {
    const response: PermissionResponse = await Camera.requestCameraPermissionsAsync();
    return response.granted;
  } catch {
    // Fail closed
    return false;
  }
}
