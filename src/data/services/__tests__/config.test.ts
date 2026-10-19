import { afterEach, describe, expect, it, vi } from 'vitest';
import * as http from '../http';
import { applyPublicConfig, getSetting, loadPublicConfig, parsePublicConfig, resetPublicConfig } from '../config';
import { publicSettingDefaults, publicSettingSpecs } from '../../../generated/settings';

vi.mock('../http', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../http')>();
  return { ...actual, apiRequest: vi.fn() };
});
const mocked = vi.mocked(http.apiRequest);
afterEach(() => { mocked.mockReset(); resetPublicConfig(); });

const bootMax = publicSettingSpecs['appearance.boot_wait_ms'].max ?? Number.MAX_SAFE_INTEGER;

describe('public config client', () => {
  it('returns the generated registry defaults before anything is loaded', () => {
    expect(getSetting('appearance.boot_wait_ms')).toBe(publicSettingDefaults['appearance.boot_wait_ms']);
    expect(getSetting('rewards.referral_points')).toBe(publicSettingDefaults['rewards.referral_points']);
  });

  it('keeps only values that fit their declaration', () => {
    const parsed = parsePublicConfig({ settings: {
      'appearance.boot_wait_ms': bootMax,
      'rewards.referral_points': bootMax * 100,       // above its max
      'meds.dose_undo_minutes': 12.5,                  // not a whole number
      'wellness.water_goal_ml_default': '2500',        // wrong type
      'rewards.referral_monthly_cap': 5,               // not public: not in the generated specs
      'unknown.key': 1,
    } });
    expect(parsed).toEqual({ 'appearance.boot_wait_ms': bootMax });
    expect(parsePublicConfig(null)).toEqual({});
    expect(parsePublicConfig({ settings: [] })).toEqual({});
  });

  it('loads once and uses the server value when valid', async () => {
    mocked.mockResolvedValue({ settings: { 'meds.dose_undo_minutes': 5 } });
    await Promise.all([loadPublicConfig(), loadPublicConfig()]);
    expect(mocked).toHaveBeenCalledTimes(1);
    expect(mocked).toHaveBeenCalledWith('/config/public');
    expect(getSetting('meds.dose_undo_minutes')).toBe(5);
    expect(getSetting('rewards.referral_points')).toBe(publicSettingDefaults['rewards.referral_points']);
  });

  it('falls back to the defaults when the request fails', async () => {
    mocked.mockRejectedValueOnce(new http.ApiError('down', 0));
    await expect(loadPublicConfig()).resolves.toBeUndefined();
    expect(getSetting('meds.dose_undo_minutes')).toBe(publicSettingDefaults['meds.dose_undo_minutes']);
  });
});

describe('applying a config body fetched elsewhere', () => {
  it('uses its settings and does not fetch again', async () => {
    applyPublicConfig({ posthog: { enabled: false }, settings: { 'wellness.water_goal_ml_default': 2500 } });
    await loadPublicConfig();
    expect(mocked).not.toHaveBeenCalled();
    expect(getSetting('wellness.water_goal_ml_default')).toBe(2500);
  });

  it('keeps the defaults for a body without settings (the offline fallback)', () => {
    applyPublicConfig({ posthog: { enabled: false } });
    expect(getSetting('wellness.water_goal_ml_default')).toBe(publicSettingDefaults['wellness.water_goal_ml_default']);
  });
});
