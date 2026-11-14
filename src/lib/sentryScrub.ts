/** Privacy boundary shared by web and JavaScript crash reporting on native. */
import type { Breadcrumb, ErrorEvent } from '@sentry/core';
import packageJson from '../../package.json';

// Protocol metadata, never values derived from a person, request or error message.
const ERROR_TYPES = ['Error', 'TypeError', 'RangeError', 'ReferenceError', 'SyntaxError', 'URIError', 'EvalError', 'AggregateError'] as const;
const LEVELS = ['fatal', 'error', 'warning', 'info', 'debug', 'log'] as const;
const ENVIRONMENTS = ['production', 'development', 'testing', 'test', 'demo'] as const;
const BREADCRUMB_CATEGORIES = ['fetch', 'xhr', 'navigation', 'ui.click'] as const;
const WITHHELD_ERROR = 'Error details withheld';

function record(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** Free-form text, URLs, stack symbols and arbitrary context have no safe default. */
export function scrubBreadcrumb(input: unknown): Breadcrumb | null {
  try {
    if (!record(input)) return null;
    const category = BREADCRUMB_CATEGORIES.find((allowed) => allowed === input.category);
    if (!category) return null;
    const level = LEVELS.find((allowed) => allowed === input.level);
    return { category, ...(level ? { level } : {}) };
  } catch {
    return null;
  }
}

/**
 * Reconstruct an error using only enumerated operational metadata. Keyword
 * redaction cannot establish that arbitrary strings or numeric readings are safe.
 * Detailed stacks are excluded, including source context and symbols.
 */
export function scrubEvent(input: unknown): ErrorEvent | null {
  try {
    if (!record(input) || input.type !== undefined) return null;
    const level = LEVELS.find((allowed) => allowed === input.level) ?? 'error';
    const environment = ENVIRONMENTS.find((allowed) => allowed === input.environment);
    const exception = record(input.exception) ? input.exception : undefined;
    const values = exception && Array.isArray(exception.values) ? exception.values : [];
    const lastException: unknown = values[values.length - 1];
    const errorType = record(lastException)
      ? ERROR_TYPES.find((allowed) => allowed === lastException.type) ?? 'Error'
      : 'Error';
    const breadcrumbs = Array.isArray(input.breadcrumbs)
      ? input.breadcrumbs.map(scrubBreadcrumb).filter((crumb): crumb is Breadcrumb => crumb !== null)
      : [];
    return {
      type: undefined,
      platform: 'javascript',
      release: packageJson.version,
      level,
      ...(environment ? { environment } : {}),
      exception: { values: [{ type: errorType, value: WITHHELD_ERROR }] },
      ...(breadcrumbs.length ? { breadcrumbs } : {}),
    };
  } catch {
    // An unreadable/malformed payload is denied without logging its contents.
    return null;
  }
}
