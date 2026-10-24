import type { MessageKey } from '@/i18n';

/**
 * A citation's category as a student reads it. The help pack's own category has a
 * label; a category the clinical team typed in the Knowledge screen is shown as typed.
 */
const CATEGORY_LABEL: Readonly<Record<string, MessageKey>> = { PRODUCT_HELP: 'assist.ayush.category.PRODUCT_HELP' };
export function ayushCategoryLabel(category: string, t: (key: MessageKey) => string): string {
  const key = CATEGORY_LABEL[category];
  return key ? t(key) : category;
}
