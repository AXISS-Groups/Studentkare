/**
 * The one crash-report scrubber, shared by the web Sentry wrapper
 * (src/lib/sentry.ts) and the phone app's crash reporting
 * (src/native/crashReporting.ts) so the two cannot drift apart. Pure
 * functions, no Sentry import, so both platforms bundle it.
 */
const PHI_KEYWORDS = [
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

const REDACTED_PHI = '[REDACTED: PHI]';

export function containsPhi(text: string): boolean {
  const lowered = (text || '').toLowerCase();
  return PHI_KEYWORDS.some((k) => lowered.includes(k));
}

/** Replaces every string that names a PHI keyword, at any depth. */
function scrubPhi<T>(value: T): T {
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

const EMAIL = /[^\s@]+@[^\s@]+\.[^\s@]+/g;
/** Phone numbers, Aadhaar (12) and ABHA (14) numbers, with or without separators. */
const LONG_NUMBER = /\+?\d(?:[\s-]?\d){7,}/g;
/** A path segment that identifies one record or person: a UUID, a long hex or digit run. */
const ID_SEGMENT = /^(?:[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}|[0-9a-f]{8,}|\d{4,})$/i;

/** Free text an error carried: PHI words redact the whole line; e-mails and long numbers are masked. */
export function scrubText(text: string): string {
  if (containsPhi(text)) return REDACTED_PHI;
  return text.replace(EMAIL, '[email]').replace(LONG_NUMBER, '[number]');
}

/**
 * Keeps only where an error happened, not whose page it was: the query and
 * fragment go (ids and search terms travel there), and any path segment that
 * looks like a record id becomes `:id`.
 */
export function scrubUrl(url: string): string {
  const bare = url.split(/[?#]/)[0] ?? '';
  return bare.split('/').map((segment) => (ID_SEGMENT.test(segment) ? ':id' : segment)).join('/');
}

interface CrumbShape {
  type?: unknown;
  category?: unknown;
  level?: unknown;
  timestamp?: unknown;
}

/** A breadcrumb keeps its category and level only: no URL, no route params, no console text. */
export function scrubBreadcrumb<C extends CrumbShape>(crumb: C): C | null {
  // Console lines can hold anything a screen logged; drop them outright.
  if (crumb.category === 'console') return null;
  return { type: crumb.type, category: crumb.category, level: crumb.level, timestamp: crumb.timestamp } as C;
}

interface FrameShape {
  vars?: unknown;
}
interface ExceptionShape {
  value?: string;
  stacktrace?: { frames?: FrameShape[] };
}
interface EventShape {
  user?: unknown;
  extra?: unknown;
  server_name?: unknown;
  transaction?: string;
  request?: { url?: string };
  message?: string;
  exception?: { values?: ExceptionShape[] };
  breadcrumbs?: CrumbShape[];
  contexts?: unknown;
  tags?: unknown;
}

/**
 * What every crash report passes through before it leaves the device, on web
 * and phone alike (AGENTS.md guardrail 9):
 * - no user, no extra data, no request headers, cookies, bodies or query strings;
 * - message text scrubbed; local variables stripped from stack frames;
 * - breadcrumbs reduced to category and level;
 * - an event that still names PHI after all that is dropped (returns null).
 */
export function scrubEvent<E extends object>(event: E): E | null {
  const scrubbed: EventShape = { ...(event as EventShape) };
  delete scrubbed.user;
  delete scrubbed.extra;
  delete scrubbed.server_name;
  if (scrubbed.request) scrubbed.request = scrubbed.request.url ? { url: scrubUrl(scrubbed.request.url) } : {};
  if (scrubbed.transaction) scrubbed.transaction = scrubUrl(scrubbed.transaction);
  if (scrubbed.message) scrubbed.message = scrubText(scrubbed.message);
  if (scrubbed.exception?.values) {
    scrubbed.exception = {
      ...scrubbed.exception,
      values: scrubbed.exception.values.map((value) => ({
        ...value,
        value: value.value ? scrubText(value.value) : value.value,
        stacktrace: value.stacktrace
          ? { ...value.stacktrace, frames: value.stacktrace.frames?.map(({ vars: _vars, ...frame }) => frame) }
          : value.stacktrace,
      })),
    };
  }
  if (scrubbed.breadcrumbs) {
    scrubbed.breadcrumbs = scrubbed.breadcrumbs.map(scrubBreadcrumb).filter((crumb): crumb is CrumbShape => crumb !== null);
  }
  if (scrubbed.contexts) scrubbed.contexts = scrubPhi(scrubbed.contexts);
  if (scrubbed.tags) scrubbed.tags = scrubPhi(scrubbed.tags);
  if (containsPhi(JSON.stringify(scrubbed))) return null;
  return scrubbed as E;
}
