import { Appearance } from 'react-native';
import type { SkColorScheme } from '@/theme/tokens/generated/skTokens';

type Preference = SkColorScheme | 'system';

let launchPreference: Preference = 'system';

/**
 * Native only. The account's System / Light / Dark choice, set by the boot
 * screen (src/native/boot.tsx) before any screen module loads, because the
 * native palette in ./theme is read once when that module is first loaded.
 * Also tells the OS, so system dialogs, the keyboard and pickers match.
 */
export function setLaunchAppearance(preference: Preference): void {
  launchPreference = preference;
  // Not every platform implements it (react-native-web does not).
  if (typeof Appearance.setColorScheme === 'function') Appearance.setColorScheme(preference === 'system' ? null : preference);
}

export function getLaunchAppearance(): Preference {
  return launchPreference;
}

/** The scheme the native palette uses: the person's choice, or the phone's for 'system'. */
export function nativeColorScheme(preference: Preference = launchPreference): SkColorScheme {
  if (preference !== 'system') return preference;
  return Appearance.getColorScheme() === 'dark' ? 'dark' : 'light';
}
