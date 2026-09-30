import { describe, expect, it } from 'vitest';
import { mapEarnings, periodLabel, rupees } from '../../earnings/ClinicianEarningsConsoleScreen';
import type { EarningsResponse } from '../../earnings/ClinicianEarningsConsoleScreen';
import { mapChronic } from '../../chronic/ClinicianChronicConsoleScreen';
import type { ChronicResponse, Programme } from '../../chronic/ClinicianChronicConsoleScreen';
import type { DataTableCell } from '@/design-system';

const text = (cell: DataTableCell | undefined): string => {
  if (!cell) return '';
  return 'pill' in cell ? cell.pill.label : cell.text;
};

describe('earnings from /work/earnings', () => {
  const base: EarningsResponse = {
    periods: [{ start: '2026-09-01', end: '2026-09-15', consults: 42, grossPaise: 835800 }],
    grossPaise: 835800,
    consults: 42,
    windowDays: 180,
    commissionRate: null,
    settlementConfigured: false,
  };

  it('shows gross only, and says commission and settlement are not set up', () => {
    const data = mapEarnings(base);
    const cells = data.rows[0].cells.map(text);
    expect(cells).toEqual(['Sep 1-15', '42 consults', '₹8,358', 'Not set', '—', 'Settlement not set up']);
    expect(data.subtitle).toMatch(/no commission rate is set yet/);
    expect(data.badge?.label).toBe('Settlement not set up');
    expect(data.stats.map((s) => s.value)).toEqual(['₹8,358', '42', 'Not set']);
  });

  it('deducts commission per line, exact to the paisa, when a rate is set', () => {
    const data = mapEarnings({ ...base, commissionRate: 0.1, settlementConfigured: true });
    const cells = data.rows[0].cells.map(text);
    expect(cells.slice(2)).toEqual(['₹8,358', '−835.80', '₹7,522.20', '—']);
    expect(data.badge).toBeUndefined();
  });

  it('formats money and periods as the canvas does', () => {
    expect(rupees(1014950)).toBe('₹10,149.50');
    expect(periodLabel({ start: '2026-08-16', end: '2026-08-31' })).toBe('Aug 16-31');
  });
});

describe('chronic tracker from /work/chronic', () => {
  const NOW = Date.parse('2026-09-28T00:00:00Z') / 1000;
  const day = 24 * 60 * 60;
  const item = (over: Partial<Programme>): Programme => ({
    id: 'x', label: 'B-214 · KC', programme: 'Vitamin D', target: 'repeat at 12 weeks',
    lastReviewAt: NOW - 8 * day, nextDueAt: NOW + 60 * day, state: 'ACTIVE', overdueByDays: null, ...over,
  });
  const response = (items: Programme[]): ChronicResponse => ({ items, onProgramme: items.length, overdue: 1, dueThisWeek: 0, endedByStudent: 0 });

  it('marks overdue, due-this-week, on-track and ended rows', () => {
    const data = mapChronic(response([
      item({ id: 'a', overdueByDays: 12 }),
      item({ id: 'b', nextDueAt: NOW + 3 * day }),
      item({ id: 'c' }),
      item({ id: 'd', state: 'ENDED_BY_STUDENT' }),
    ]), NOW);
    expect(data.rows.map((row) => text(row.cells[4]))).toEqual(['Chase', 'Due this week', 'On track', 'Ended by student']);
    expect(text(data.rows[0].cells[3])).toBe('Overdue by 12 days');
    expect(text(data.rows[3].cells[3])).toBe('—');
    expect(text(data.rows[3].cells[1])).toMatch(/^Left the programme/);
    expect(data.badge?.label).toBe('1 overdue review');
  });

  it('invents no date for a programme never reviewed', () => {
    const data = mapChronic(response([item({ lastReviewAt: null, nextDueAt: null })]), NOW);
    expect(text(data.rows[0].cells[2])).toBe('Not yet');
    expect(text(data.rows[0].cells[3])).toBe('After first review');
  });
});
