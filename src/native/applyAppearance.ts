import { reloadAppAsync } from 'expo';
import { nativeColorScheme, setLaunchAppearance } from '@/design-system/nativeScheme';
import type { ThemePreference } from '@/features/account/appearance';

/**
 * Applies a choice the account already holds. The native palette is fixed
 * when the screens load, so a change of look restarts the JavaScript app; the
 * boot screen then reads the saved choice and every screen draws with it.
 * The session lives in the server's cookie, so the student stays signed in.
 * A choice that does not change the look (System on a light phone, then
 * Light) needs no restart.
 */
export function applyAppearanceAndRestart(preference: ThemePreference): void {
  const before = nativeColorScheme();
  setLaunchAppearance(preference);
  if (nativeColorScheme(preference) !== before) void reloadAppAsync('Appearance changed');
}
