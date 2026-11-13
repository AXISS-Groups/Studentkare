import type { DataTableRow } from '@/design-system';
import type { ConsoleTableData, ConsoleTableSource } from './ConsoleTableViewModel';
import { muted, pill, strong } from './cells';
import { addDays, clock24, isLive, loadBookings, startOfWeek } from '../model/appointmentsSource';
import type { Booking, BookingsLoader } from '../model/appointmentsSource';
import type { T } from '../model/clinicalData';

const SHORT_MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DAYS_IN_WEEK = 7;

/** "Mon 29" */
function dayLabel(date: Date): string {
  return `${date.toLocaleDateString('en-IN', { weekday: 'short' })} ${String(date.getDate()).padStart(2, '0')}`;
}

/** One booked slot this week: every live booking that shares its start and end. */
interface SlotGroup { start: Date; end: Date | null; bookings: Booking[] }

function groupBySlot(bookings: Booking[]): SlotGroup[] {
  const groups = new Map<string, SlotGroup>();
  for (const booking of bookings) {
    const key = `${booking.start.getTime()}-${booking.end?.getTime() ?? ''}`;
    const group = groups.get(key) ?? { start: booking.start, end: booking.end, bookings: [] };
    group.bookings.push(booking);
    groups.set(key, group);
  }
  return [...groups.values()].sort((a, b) => a.start.getTime() - b.start.getTime());
}

function slotState(group: SlotGroup, t: T): DataTableRow['cells'][number] {
  const statuses = group.bookings.map((booking) => booking.status);
  if (statuses.some((status) => status === 'CONFIRMED' || status === 'REQUESTED')) return pill(t('clinSchedule.stateBooked'), 'action');
  if (statuses.some((status) => status === 'COMPLETED')) return pill(t('clinSchedule.stateDone'), 'positive');
  return pill(t('clinSchedule.stateNoShow'), 'neutral');
}

/**
 * This week's booked slots from the doctor's own bookings
 * (`GET /work/appointments`). The API returns bookings, not the slots offered,
 * their capacity, place or camp duty, so those figures stay "—" and empty
 * slots are not listed. Nothing is filled in.
 */
export function mapSchedule(bookings: Booking[], now: Date, t: T): ConsoleTableData {
  const from = startOfWeek(now);
  const to = addDays(from, DAYS_IN_WEEK);
  const week = bookings.filter((booking) => isLive(booking) && booking.start >= from && booking.start < to);
  const rows: DataTableRow[] = groupBySlot(week).map((group) => {
    const requested = group.bookings.filter((booking) => booking.status === 'REQUESTED').length;
    const booked = group.bookings.filter((booking) => booking.status !== 'NO_SHOW').length;
    const line = requested > 0 ? t('clinSchedule.bookedRequested', { booked, requested }) : t('clinSchedule.booked', { booked });
    return {
      id: `${group.start.getTime()}`,
      cells: [
        strong(dayLabel(group.start)),
        strong(group.end ? `${clock24(group.start)}–${clock24(group.end)}` : clock24(group.start)),
        muted(t('clinSchedule.whereUnreported')),
        muted(line),
        slotState(group, t),
      ],
    };
  });
  const bookedTotal = week.filter((booking) => booking.status !== 'NO_SHOW').length;
  return {
    subtitle: t('clinSchedule.weekOf', { date: `${from.getDate()} ${SHORT_MONTHS[from.getMonth()]}` }),
    stats: [
      { value: null, label: t('clinSchedule.statOffered') },
      { value: String(bookedTotal), label: t('clinSchedule.statBooked') },
      { value: null, label: t('clinSchedule.statCamp') },
      { value: null, label: t('clinSchedule.statGap') },
    ],
    rows,
  };
}

export function bookingsScheduleSource(t: T, load: BookingsLoader = loadBookings, now: () => Date = () => new Date()): ConsoleTableSource {
  return { load: async () => mapSchedule(await load(), now(), t) };
}
