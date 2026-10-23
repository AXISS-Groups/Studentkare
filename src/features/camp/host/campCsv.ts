import type { MessageKey, Vars } from '@/i18n';
import { CAMPUS_MIN_GROUP, groupFigure } from '@/features/campus/boards/boardKit';
import type { HostCamp } from './hostApi';

type Translate = (key: MessageKey, vars?: Vars) => string;

/** One cell: quoted when it holds a comma, quote or line break; a leading = + - @ is defused (CSV injection). */
export function csvCell(value: string): string {
  const safe = /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
  return /[",\r\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
}

/**
 * A camp's bookings as CSV: one row per slot with places, booked, waitlist,
 * checked in and cancelled. Counts only — the board has no names to export. On
 * the campus console a count under the minimum group size is written as
 * withheld, exactly as the page shows it.
 */
export function campCsv(camp: HostCamp, withhold: boolean, t: Translate): string {
  const count = (n: number) => {
    if (!withhold) return String(n);
    const figure = groupFigure(n);
    return figure.shown ? String(figure.value) : t('campusBoards.withheld', { floor: CAMPUS_MIN_GROUP });
  };
  const header = [
    t('camps.csv.camp'), t('camps.csv.date'), t('camps.csv.start'), t('camps.csv.end'), t('campusBoards.camps.metric.capacity'),
    t('campusBoards.camps.metric.booked'), t('camps.host.metric.waitlist'), t('camps.host.metric.checkedIn'), t('camps.host.col.cancelled'),
  ];
  const rows = camp.slots.map((s) => [camp.name, camp.date, s.slotStart, s.slotEnd, String(s.capacity), count(s.booked), count(s.waitlisted), count(s.checkedIn), count(s.cancelled)]);
  return [header, ...rows].map((row) => row.map(csvCell).join(',')).join('\r\n');
}

export function csvFileName(camp: Pick<HostCamp, 'name' | 'date'>): string {
  const slug = camp.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'camp';
  return `${camp.date}-${slug}-bookings.csv`;
}

/** Web only: save the CSV. */
export function downloadCsv(csv: string, camp: Pick<HostCamp, 'name' | 'date'>): void {
  if (typeof document === 'undefined') return;
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = csvFileName(camp);
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}
