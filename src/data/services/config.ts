import { apiRequest } from './http';
import {
  publicSettingDefaults,
  publicSettingSpecs,
  type PublicSettingKey,
  type PublicSettings,
  type PublicSettingSpec,
} from '../../generated/settings';

/**
 * Public business settings (AGENTS.md rule 11), from GET /config/public.
 *
 * The defaults, types and bounds come from src/generated/settings.ts, which is
 * generated from backend/core/settings_registry.py (`npm run settings:build`) —
 * never a second copy here. Until the server answers, or if it cannot, every
 * getter returns the registry default. A value the server sends that does not
 * fit its declaration (wrong type, out of bounds) is ignored and the default
 * kept, so a bad response can never put an out-of-range limit into the UI.
 */

type Overrides = { -readonly [K in PublicSettingKey]?: PublicSettings[K] };

let overrides: Overrides = {};
let pending: Promise<void> | null = null;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isKey(key: string): key is PublicSettingKey {
  return Object.prototype.hasOwnProperty.call(publicSettingSpecs, key);
}

function fits(spec: PublicSettingSpec, value: unknown): boolean {
  switch (spec.type) {
    case 'bool':
      return typeof value === 'boolean';
    case 'int':
    case 'float':
      if (typeof value !== 'number' || !Number.isFinite(value)) return false;
      if (spec.type === 'int' && !Number.isInteger(value)) return false;
      if (spec.min !== null && value < spec.min) return false;
      return spec.max === null || value <= spec.max;
    case 'str':
      return typeof value === 'string' && (spec.allowed.length === 0 || spec.allowed.includes(value));
    case 'enum':
      return typeof value === 'string' && spec.allowed.includes(value);
  }
}

function assign<K extends PublicSettingKey>(target: Overrides, key: K, value: unknown): void {
  // `fits` has checked the value against this key's generated spec.
  target[key] = value as PublicSettings[K];
}

/** The valid public settings in a /config/public response. Anything else is dropped. */
export function parsePublicConfig(body: unknown): Overrides {
  const out: Overrides = {};
  if (!isRecord(body) || !isRecord(body.settings)) return out;
  for (const [key, value] of Object.entries(body.settings)) {
    if (isKey(key) && fits(publicSettingSpecs[key], value)) assign(out, key, value);
  }
  return out;
}

/**
 * Use a /config/public body the app already fetched (App.tsx reads the same
 * endpoint for its integrations at boot), so the settings cost no second request.
 */
export function applyPublicConfig(body: unknown): void {
  overrides = parsePublicConfig(body);
  pending = Promise.resolve();
}

/** Fetch the public settings once. Never rejects: on failure the defaults stay in force. */
export function loadPublicConfig(): Promise<void> {
  if (!pending) {
    pending = apiRequest<unknown>('/config/public')
      .then((body) => { overrides = parsePublicConfig(body); })
      .catch(() => { overrides = {}; });
  }
  return pending;
}

/** The effective value of a public setting: the server's, when valid and loaded, else the registry default. */
export function getSetting<K extends PublicSettingKey>(key: K): PublicSettings[K] {
  const value = overrides[key];
  return value === undefined ? publicSettingDefaults[key] : value;
}

/** Test seam: forget what was loaded. */
export function resetPublicConfig(): void {
  overrides = {};
  pending = null;
}
