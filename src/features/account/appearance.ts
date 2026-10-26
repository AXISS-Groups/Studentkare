import type { apiRequest } from '@/data/services/http';
import type { SkColorScheme } from '@/theme/tokens/generated/skTokens';

/** What the person chose; 'system' follows the device. The same shape as theme.tsx's ThemePreference, kept here so native code need not load the web theme. */
export type ThemePreference = SkColorScheme | 'system';

/**
 * The appearance choice as the account stores it
 * (GET / PATCH /profile/appearance, backend/services/member_profile_api.py).
 * `null` means the person has never chosen.
 */
export type AccountAppearance = 'SYSTEM' | 'DARK' | 'LIGHT';

export interface AppearanceResponse {
  appearance: AccountAppearance | null;
  updatedAt: number | null;
}

export const APPEARANCE_PATH = '/profile/appearance';

const TO_THEME: Record<AccountAppearance, ThemePreference> = { SYSTEM: 'system', DARK: 'dark', LIGHT: 'light' };
const TO_ACCOUNT: Record<ThemePreference, AccountAppearance> = { system: 'SYSTEM', dark: 'DARK', light: 'LIGHT' };

function toThemePreference(value: AccountAppearance): ThemePreference {
  return TO_THEME[value];
}

export function toAccountAppearance(value: ThemePreference): AccountAppearance {
  return TO_ACCOUNT[value];
}

/** The account's choice from a server answer; null for never chosen or anything malformed. */
export function readAppearance(body: unknown): ThemePreference | null {
  if (!body || typeof body !== 'object' || !('appearance' in body)) return null;
  const value = (body as { appearance: unknown }).appearance;
  return value === 'SYSTEM' || value === 'DARK' || value === 'LIGHT' ? TO_THEME[value] : null;
}

/**
 * The account's choice for the native app's launch, before any screen is
 * drawn. Never throws, and never waits longer than `waitMs()` counted from the
 * call: signed out, offline, slow or malformed all mean "follow the phone".
 *
 * `waitMs` is read twice: at once (the registry default, or whatever is
 * already loaded) and again when `settingsReady` settles, so a super admin's
 * `appearance.boot_wait_ms` override applies from the first launch that has
 * fetched it, without waiting for the settings before starting.
 */
export async function launchAppearance(
  request: typeof apiRequest,
  waitMs: () => number,
  settingsReady: Promise<unknown> = Promise.resolve(),
): Promise<ThemePreference> {
  const controller = new AbortController();
  const started = Date.now();
  let done = false;
  let timer = setTimeout(() => controller.abort(), waitMs());
  void settingsReady.then(() => {
    if (done) return;
    clearTimeout(timer);
    timer = setTimeout(() => controller.abort(), Math.max(0, started + waitMs() - Date.now()));
  }, () => undefined);
  try {
    const body = await request<AppearanceResponse>(APPEARANCE_PATH, { signal: controller.signal });
    return readAppearance(body) ?? 'system';
  } catch {
    return 'system';
  } finally {
    done = true;
    clearTimeout(timer);
  }
}
