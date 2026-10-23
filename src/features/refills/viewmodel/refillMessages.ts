import { ApiError } from '@/data/services/http';
import type { MessageKey, Said, Vars } from '@/i18n';
import { refillsEn } from '@/i18n/areas/refills';

/**
 * What to show for a refused refill request. The server sends
 * `{ code, message, values }` (backend/services/refill_tracker.py refill_error);
 * a known code is `refill.msg.<CODE>` in the student's language with the
 * registry's limits filled in. Anything else falls back to `fallback`.
 */
export function refillSaid(error: unknown, fallback: MessageKey): Said {
  if (error instanceof ApiError) {
    const detail = error.detail;
    if (detail && typeof detail === 'object' && !Array.isArray(detail)) {
      const { code, values } = detail as { code?: unknown; values?: unknown };
      const key = `refill.msg.${String(code)}`;
      if (typeof code === 'string' && Object.prototype.hasOwnProperty.call(refillsEn, key)) {
        return { key: key as MessageKey, vars: plainVars(values) };
      }
    }
  }
  return { key: fallback };
}

/** The server's refusal code, if it sent one. */
export function refusalCode(error: unknown): string {
  if (!(error instanceof ApiError)) return '';
  const detail = error.detail;
  if (detail && typeof detail === 'object' && !Array.isArray(detail)) {
    const { code } = detail as { code?: unknown };
    return typeof code === 'string' ? code : '';
  }
  return '';
}

function plainVars(values: unknown): Vars | undefined {
  if (!values || typeof values !== 'object' || Array.isArray(values)) return undefined;
  const out: Vars = {};
  for (const [name, value] of Object.entries(values)) {
    if (typeof value === 'string' || typeof value === 'number') out[name] = value;
  }
  return out;
}

/** A `YYYY-MM-DD` calendar day as a local Date (never shifted by the UTC offset). */
export function localDay(iso: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!match) return null;
  return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
}

/** "25 Oct" for a calendar day. */
export function dayText(iso: string): string {
  const day = localDay(iso);
  return day ? day.toLocaleDateString(undefined, { day: 'numeric', month: 'short' }) : '';
}

/** The local calendar date of an epoch-seconds time, as `YYYY-MM-DD`. */
export function isoDay(epochSeconds: number): string {
  const at = new Date(epochSeconds * 1000);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${at.getFullYear()}-${pad(at.getMonth() + 1)}-${pad(at.getDate())}`;
}

/** A whole number typed into a field, or null when it is not one in [min, max]. */
export function wholeIn(text: string, min: number, max: number): number | null {
  const trimmed = text.trim();
  if (!/^\d+$/.test(trimmed)) return null;
  const value = Number(trimmed);
  return value >= min && value <= max ? value : null;
}
