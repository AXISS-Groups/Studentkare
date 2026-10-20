import type { MessageKey, Vars } from '@/i18n';

/** "1 item" / "3 items": the catalogue has one form for one and another for the rest (en, te and hi). */
export function plural(t: (key: MessageKey, vars?: Vars) => string, count: number, one: MessageKey, many: MessageKey, vars: Vars = {}): string {
  return t(count === 1 ? one : many, { ...vars, count });
}
