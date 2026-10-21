import { ApiError } from '@/data/services/http';
import type { MessageKey, Said, Vars } from '@/i18n';
import { wellnessEn } from '@/i18n/areas/wellness';

/**
 * What to show for a refused wellness or dose request. The server sends
 * `{ code, message, values }` (backend/services/wellness_messages.py); the copy
 * for a known code is `wellness.msg.<CODE>` in the student's language, with the
 * values (limits from the settings registry) filled in. An unknown code falls
 * back to the server's English text; anything else to `fallback`.
 */
export function serverSaid(error: unknown, fallback: MessageKey): Said {
  if (error instanceof ApiError) {
    const detail = error.detail;
    if (detail && typeof detail === 'object' && !Array.isArray(detail)) {
      const { code, values } = detail as { code?: unknown; values?: unknown };
      const key = `wellness.msg.${String(code)}`;
      if (typeof code === 'string' && Object.prototype.hasOwnProperty.call(wellnessEn, key)) {
        return { key: key as MessageKey, vars: plainVars(values) };
      }
    }
    if (error.status >= 400 && error.status < 500 && error.message) return { raw: error.message };
  }
  return { key: fallback };
}

/** The copy for a coded success reply (`{ code, values }`), when it has one. */
export function codedSaid(body: unknown): Said | null {
  if (!body || typeof body !== 'object') return null;
  const { code, values } = body as { code?: unknown; values?: unknown };
  const key = `wellness.msg.${String(code)}`;
  if (typeof code !== 'string' || !Object.prototype.hasOwnProperty.call(wellnessEn, key)) return null;
  return { key: key as MessageKey, vars: plainVars(values) };
}

function plainVars(values: unknown): Vars | undefined {
  if (!values || typeof values !== 'object' || Array.isArray(values)) return undefined;
  const out: Vars = {};
  for (const [name, value] of Object.entries(values)) {
    if (typeof value === 'string' || typeof value === 'number') out[name] = value;
  }
  return out;
}
