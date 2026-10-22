/**
 * PHI scrubbing shared by the web Sentry wrapper (src/lib/sentry.ts) and the
 * phone app's crash reporting (src/native/crashReporting.ts). Pure functions,
 * no Sentry import, so both platforms bundle it.
 */
export const PHI_KEYWORDS = [
  'diagnosis',
  'prescription',
  'hiv',
  'cancer',
  'mental health',
  'therapy',
  'blood test result',
  'aadhaar',
  'abha',
  'patient',
];

export const REDACTED_PHI = '[REDACTED: PHI]';

export function containsPhi(text: string): boolean {
  const lowered = (text || '').toLowerCase();
  return PHI_KEYWORDS.some((k) => lowered.includes(k));
}

/** Replaces every string that names a PHI keyword, at any depth. */
export function scrubPhi<T>(value: T): T {
  return scrubValue(value) as T;
}

function scrubValue(value: unknown): unknown {
  if (value === null || value === undefined) return value;
  if (typeof value === 'string') return containsPhi(value) ? REDACTED_PHI : value;
  if (Array.isArray(value)) return value.map(scrubValue);
  if (typeof value === 'object') {
    const scrubbed: Record<string, unknown> = {};
    for (const [key, entry] of Object.entries(value)) scrubbed[key] = scrubValue(entry);
    return scrubbed;
  }
  return value;
}
