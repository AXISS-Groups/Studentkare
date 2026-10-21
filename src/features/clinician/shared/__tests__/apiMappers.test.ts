import { describe, expect, it } from 'vitest';
import { mapEarnings, periodLabel, rupees } from '../../earnings/ClinicianEarningsConsoleScreen';
import type { EarningsResponse } from '../../earnings/ClinicianEarningsConsoleScreen';
import { mapChronic } from '../../chronic/ClinicianChronicConsoleScreen';
import { mapSchedule } from '../../schedule/ClinicianScheduleScreen';
import type { ChronicResponse, Programme } from '../../chronic/ClinicianChronicConsoleScreen';
import type { DataTableCell } from '@/design-system';
import { translate } from '@/i18n';
import type { MessageKey, Vars } from '@/i18n';

const en = (key: MessageKey, vars?: Vars) => translate('en', key, vars);

const text = (cell: DataTableCell | undefined): string => {
  if (!cell || 'node' in cell) return '';
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
    const data = mapEarnings(base, en);
    const cells = data.rows[0].cells.map(text);
    expect(cells).toEqual(['Sep 1–15', '42 consults', '₹8,358', 'Not set', '—', 'Settlement not set up']);
    expect(data.subtitle).toMatch(/no platform commission is configured yet/);
    expect(data.badge?.label).toBe('Settlement not set up');
    expect(data.stats.map((s) => s.value)).toEqual(['₹8,358', '42', 'Not set', 'Not set up']);
  });

  it('never works out a commission or a net itself, even when a rate is set', () => {
    const data = mapEarnings({ ...base, commissionRate: 0.1, settlementConfigured: true }, en);
    expect(data.rows[0].cells.map(text).slice(2)).toEqual(['₹8,358', 'Not set', '—', '—']);
    expect(data.stats.map((s) => s.value)).toEqual(['₹8,358', '42', '10%', null]);
    expect(data.badge).toBeUndefined();
  });

  it('prints a per-line commission and net only as the server sends them', () => {
    const period = { ...base.periods[0], commissionPaise: 83580, netPaise: 752220 };
    const data = mapEarnings({ ...base, periods: [period], commissionRate: 0.1, settlementConfigured: true }, en);
    expect(data.rows[0].cells.map(text).slice(2)).toEqual(['₹8,358', '−835.80', '₹7,522.20', '—']);
  });

  it('formats money and periods as the canvas does', () => {
    expect(rupees(1014950)).toBe('₹10,149.50');
    expect(periodLabel({ start: '2026-08-16', end: '2026-08-31' })).toBe('Aug 16–31');
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

describe('schedule from /work/appointments', () => {
  const NOW = new Date(2026, 8, 24, 9, 46);
  const at = (day: number, hours: number) => new Date(2026, 8, day, hours);

  it('lists this week’s booked slots, grouped, without cancelled bookings or other weeks', () => {
    const data = mapSchedule([
      { id: 'a', patientName: 'A', status: 'CONFIRMED', start: at(21, 9), end: at(21, 13) },
      { id: 'b', patientName: 'B', status: 'REQUESTED', start: at(21, 9), end: at(21, 13) },
      { id: 'c', patientName: 'C', status: 'CANCELLED', start: at(22, 9), end: at(22, 13) },
      { id: 'd', patientName: 'D', status: 'COMPLETED', start: at(23, 18), end: at(23, 20) },
      { id: 'e', patientName: 'E', status: 'CONFIRMED', start: at(29, 9), end: at(29, 13) },
    ], NOW, en);
    expect(data.rows.map((row) => row.cells.map(text))).toEqual([
      ['Mon 21', '09:00–13:00', 'Place not reported', '2 booked · 1 to confirm', 'Booked'],
      ['Wed 23', '18:00–20:00', 'Place not reported', '1 booked', 'Done'],
    ]);
  });

  it('reports only what bookings can show: offered slots, camp duty and gaps stay unknown', () => {
    const data = mapSchedule([{ id: 'a', patientName: 'A', status: 'CONFIRMED', start: at(21, 9), end: at(21, 13) }], NOW, en);
    expect(data.stats.map((stat) => stat.value)).toEqual([null, '1', null, null]);
    expect(data.subtitle).toBe('Week of 21 Sep · booked slots');
  });
});
