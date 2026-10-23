import type { Lang } from '@/i18n';

/** A server timestamp (seconds) as a date in the reader's language, e.g. "23 Oct 2026". */
export function dateOf(seconds: number, lang: Lang): string {
  return new Date(seconds * 1000).toLocaleDateString(`${lang}-IN`, { day: 'numeric', month: 'short', year: 'numeric' });
}
