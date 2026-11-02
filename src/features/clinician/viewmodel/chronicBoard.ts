import { demoDataEnabled } from '@/core/env';
import { apiRequest } from '@/data/services/http';
import type { DataTableRow } from '@/design-system';
import type { ConsoleTableData, ConsoleTableSource } from './ConsoleTableViewModel';
import { cell, muted, pill, strong } from './cells';
import type { Request, T } from '../model/clinicalData';
import type { ChronicResponse } from '../model/chronic';

/* ----------------------------------------------------------- API mapping */

const ENDED_BY_STUDENT = 'ENDED_BY_STUDENT';
const WEEK_SECONDS = 7 * 24 * 60 * 60;

function dayMonth(epochSeconds: number): string {
  return new Date(epochSeconds * 1000).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
}

export function mapChronic(data: ChronicResponse, t: T, nowSeconds: number = Date.now() / 1000): ConsoleTableData {
  const rows: DataTableRow[] = data.items.map((item) => {
    const ended = item.state === ENDED_BY_STUDENT;
    const overdue = !ended && item.overdueByDays !== null;
    const dueSoon = !ended && !overdue && item.nextDueAt !== null && item.nextDueAt - nowSeconds <= WEEK_SECONDS;
    const programme = ended
      ? (item.lastReviewAt ? t('clinChronic.leftOn', { date: dayMonth(item.lastReviewAt) }) : t('clinChronic.left'))
      : [item.programme, item.target].filter(Boolean).join(' · ');
    let next = cell(item.nextDueAt ? dayMonth(item.nextDueAt) : t('clinChronic.afterFirst'));
    if (ended) next = muted('—');
    else if (overdue) next = cell(t(item.overdueByDays === 1 ? 'clinChronic.overdueOne' : 'clinChronic.overdueBy', { n: item.overdueByDays ?? 0 }), 'danger');
    // No chase endpoint exists, so an overdue row says "Overdue" — a state, not an action.
    let state = pill(t('clinChronic.state.onTrack'), 'positive');
    if (ended) state = pill(t('clinChronic.state.ended'), 'neutral');
    else if (overdue) state = pill(t('clinChronic.state.overdue'), 'danger');
    else if (dueSoon) state = pill(t('clinChronic.state.dueWeek'), 'attention');
    return {
      id: item.id,
      cells: [strong(item.label), strong(programme), muted(item.lastReviewAt ? dayMonth(item.lastReviewAt) : t('clinChronic.notYet')), next, state],
    };
  });
  return {
    badge: data.overdue > 0 ? { label: t(data.overdue === 1 ? 'clinChronic.badgeOne' : 'clinChronic.badge', { n: data.overdue }), tone: 'danger' } : undefined,
    stats: [
      { value: String(data.onProgramme), label: t('clinChronic.stat.on') },
      { value: String(data.overdue), label: t('clinChronic.stat.overdue'), tone: data.overdue > 0 ? 'danger' : 'text' },
      { value: String(data.dueThisWeek), label: t('clinChronic.stat.dueWeek'), tone: data.dueThisWeek > 0 ? 'attention' : 'text' },
      { value: String(data.endedByStudent), label: t('clinChronic.stat.left') },
    ],
    rows,
  };
}

function chronicApiSource(t: T, request: Request = apiRequest): ConsoleTableSource {
  return { load: async () => mapChronic(await request<ChronicResponse>('/work/chronic'), t) };
}

/* ------------------------------------------------------ development sample */

export function chronicSample(): ConsoleTableData {
  return {
    badge: { label: '1 overdue review', tone: 'danger' },
    stats: [
      { value: '4', label: 'On a programme' },
      { value: '1', label: 'Overdue', tone: 'danger' },
      { value: '1', label: 'Due this week', tone: 'attention' },
      { value: '1', label: 'Left, kept records' },
    ],
    rows: [
      { id: 'c1', cells: [strong('C-108 · AK'), strong('Asthma · action plan in place'), muted('14 Aug'), cell('Overdue by 12 days', 'danger'), pill('Overdue', 'danger')] },
      { id: 'c2', cells: [strong('B-214 · KC'), strong('Vitamin D · repeat at 12 weeks'), muted('20 Sep'), strong('13 Dec'), pill('On track', 'positive')] },
      { id: 'c3', cells: [strong('D-042 · NP'), strong('Anemia · Hb at 8 weeks'), muted('21 Sep'), strong('16 Nov'), pill('On track', 'positive')] },
      { id: 'c4', cells: [strong('B-119 · IS'), strong('Diabetes · HbA1c quarterly'), muted('02 Jul'), strong('01 Oct'), pill('Due this week', 'attention')] },
      { id: 'c5', cells: [strong('A-331 · RM'), strong('Left the programme 18 Sep'), muted('18 Sep'), muted('—'), pill('Ended by student', 'neutral')] },
    ],
  };
}

export function defaultChronicSource(t: T): ConsoleTableSource {
  return demoDataEnabled() ? { load: async () => chronicSample() } : chronicApiSource(t);
}
