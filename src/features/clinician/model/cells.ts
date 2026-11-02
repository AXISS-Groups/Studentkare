import type { CellTone, DataTableCell, SkTone } from '@/design-system';

/** Terse builders for console table rows, so sample data reads like the picture. */
export const strong = (text: string, sub?: string): DataTableCell => ({ text, sub, weight: 'strong' });
export const cell = (text: string, tone?: CellTone): DataTableCell => ({ text, tone, weight: 'regular' });
export const muted = (text: string): DataTableCell => ({ text, weight: 'muted' });
export const pill = (label: string, tone: SkTone): DataTableCell => ({ pill: { label, tone } });
