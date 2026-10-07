import { Platform } from 'react-native';
import * as LocalAuthentication from 'expo-local-authentication';

export interface BiometricAuthResult {
  success: boolean;
  error?: string;
  biometricType?: string;
}

/**
 * Native Hardware Biometrics Bridge.
 *
 * Enforces Rule 1 (Fail-closed):
 * Any failure, rejection, or lack of hardware support returns success: false.
 */
export async function isBiometricsAvailable(): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  try {
    const hasHardware = await LocalAuthentication.hasHardwareAsync();
    if (!hasHardware) return false;
    const isEnrolled = await LocalAuthentication.isEnrolledAsync();
    return isEnrolled;
  } catch {
    return false;
  }
}

export async function getSupportedBiometricTypes(): Promise<string[]> {
  if (Platform.OS === 'web') return [];
  try {
    const types = await LocalAuthentication.supportedAuthenticationTypesAsync();
    return types.map((t) => {
      switch (t) {
        case LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION:
          return 'Face ID';
        case LocalAuthentication.AuthenticationType.FINGERPRINT:
          return 'Touch ID / Fingerprint';
        case LocalAuthentication.AuthenticationType.IRIS:
          return 'Iris Scanner';
        default:
          return 'Biometrics';
      }
    });
  } catch {
    return [];
  }
}

export async function authenticateWithBiometrics(
  promptMessage = 'Authenticate to access Studentkare health records'
): Promise<BiometricAuthResult> {
  if (Platform.OS === 'web') {
    return { success: false, error: 'Biometrics unavailable on web platform' };
  }

  try {
    const available = await isBiometricsAvailable();
    if (!available) {
      return { success: false, error: 'Biometric authentication hardware not available or not enrolled' };
    }

    const result = await LocalAuthentication.authenticateAsync({
      promptMessage,
      cancelLabel: 'Cancel',
      fallbackLabel: 'Use Device Passcode',
      disableDeviceFallback: false,
    });

    if (result.success) {
      return { success: true };
    }

    return {
      success: false,
      error: result.error === 'user_cancel' ? 'Authentication cancelled by user' : 'Biometric authentication failed',
    };
  } catch (err) {
    // Fail closed
    const errorMsg = err instanceof Error ? err.message : 'Biometric hardware failure';
    return { success: false, error: errorMsg };
  }
}
