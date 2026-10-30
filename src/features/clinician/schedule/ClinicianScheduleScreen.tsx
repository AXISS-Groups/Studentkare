import React, { useMemo } from 'react';
import { DestinationButton } from '@/design-system';
import type { DataTableRow } from '@/design-system';
import { useT } from '@/i18n';
import type { MessageKey, Vars } from '@/i18n';
import { navigate } from '@/lib/utils/workflowRouting';
import { ConsoleTableScreen } from '../shared/ConsoleTableScreen';
import type { ConsoleTableConfig, ConsoleTableData, ConsoleTableSource } from '../shared/consoleTable';
import { muted, pill, strong } from '../shared/cells';
import { addDays, clock24, isLive, loadBookings, startOfWeek } from '../shared/appointmentsSource';
import type { Booking, BookingsLoader } from '../shared/appointmentsSource';

type T = (key: MessageKey, vars?: Vars) => string;

/** ClinicianSchedule (design page 5, Tier 3). Copy from `clinSchedule.*` (en/te/hi). */
export function scheduleConfig(t: T): ConsoleTableConfig {
  return {
    title: t('clinSchedule.title'),
    subtitle: t('clinSchedule.subtitle'),
    caption: t('clinSchedule.caption'),
    tableTitle: t('clinSchedule.tableTitle'),
    hideColumnHeadings: true,
    columns: [
      { label: t('clinSchedule.colDay'), width: '106px' },
      { label: t('clinSchedule.colTime'), width: '146px' },
      { label: t('clinSchedule.colWhere') },
      { label: t('clinSchedule.colBookings'), width: '220px' },
      { label: t('clinSchedule.colState'), width: '130px', align: 'end' },
    ],
    footnote: t('clinSchedule.footnote'),
    empty: { title: t('clinSchedule.emptyTitle'), body: t('clinSchedule.emptyBody') },
    emptyIcon: 'stetho-alt--p4',
    unconnected: { title: t('clinSchedule.unconnectedTitle'), body: t('clinSchedule.unconnectedBody') },
    errorTitle: t('clinSchedule.errorTitle'),
    reference: t('clinSchedule.reference'),
    statLabels: [t('clinSchedule.statOffered'), t('clinSchedule.statBooked'), t('clinSchedule.statCamp'), t('clinSchedule.statGap')],
  };
}

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

function bookingsScheduleSource(t: T, load: BookingsLoader = loadBookings, now: () => Date = () => new Date()): ConsoleTableSource {
  return { load: async () => mapSchedule(await load(), now(), t) };
}

export function ClinicianScheduleScreen({ source }: { source?: ConsoleTableSource }): React.ReactElement {
  const t = useT();
  const config = useMemo(() => scheduleConfig(t), [t]);
  const [fallback] = React.useState(() => bookingsScheduleSource(t));
  return (
    <ConsoleTableScreen
      navId="schedule"
      config={config}
      source={source ?? fallback}
      headerAction={
        // No endpoint lets a doctor publish their own slots from here yet.
        <DestinationButton route={null} onNavigate={navigate} className="sk-btn sk-btn--primary">
          {t('clinSchedule.addAvailability')}
        </DestinationButton>
      }
    />
  );
}
