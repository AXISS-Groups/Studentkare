import React from 'react';
import { isDev } from '@/core/env';
import { apiRequest } from '@/data/http';
import type { DataTableRow } from '@/design-system';
import { ConsoleTableScreen } from '../shared/ConsoleTableScreen';
import type { ConsoleTableConfig, ConsoleTableData, ConsoleTableSource } from '../shared/consoleTable';
import { cell, muted, pill, strong } from '../shared/cells';

/**
 * ClinicianChronic — chronic tracker (design page 5, Tier 3).
 *
 * Production reads `/work/chronic`. Students are "B-214 · KC" (room and
 * initials); the API sends no names. A student who leaves keeps their record,
 * stops being chased, and is never reported to their campus — stated on the
 * screen because it is why someone will leave a programme they need to leave.
 */
export const chronicConfig: ConsoleTableConfig = {
  title: 'Chronic tracker',
  subtitle: 'Students on a care programme with you',
  caption: 'Students on a care programme with you, their last review and when the next is due',
  columns: [
    { label: 'Student', width: '140px' },
    { label: 'Programme & target' },
    { label: 'Last review', width: '150px' },
    { label: 'Next due', width: '150px' },
    { label: 'State', width: '150px', align: 'end' },
  ],
  footnote:
    'A student who leaves a programme disappears from your follow-up list but keeps everything recorded. Nobody is chased after they opt out, and leaving is never flagged to their campus.',
  empty: { title: 'Nobody is on a programme with you yet.', body: 'Students you put on a care programme appear here with their review dates. Nobody is added without agreeing to it.' },
  unconnected: { title: 'The chronic tracker isn’t connected yet.', body: 'Programmes will appear here once they are connected. Until then this page shows nothing rather than a guess.' },
  errorTitle: 'Couldn’t load the chronic tracker',
  reference: 'Ref CHRONIC · ClinicianChronic',
};

/* ----------------------------------------------------------- API mapping */

const ENDED_BY_STUDENT = 'ENDED_BY_STUDENT';
const WEEK_SECONDS = 7 * 24 * 60 * 60;

export interface Programme {
  id: string;
  label: string;
  programme: string;
  target: string;
  /** Epoch seconds. */
  lastReviewAt: number | null;
  nextDueAt: number | null;
  state: string;
  overdueByDays: number | null;
}

export interface ChronicResponse {
  items: Programme[];
  onProgramme: number;
  overdue: number;
  dueThisWeek: number;
  endedByStudent: number;
}

function dayMonth(epochSeconds: number): string {
  return new Date(epochSeconds * 1000).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
}

export function mapChronic(data: ChronicResponse, nowSeconds: number = Date.now() / 1000): ConsoleTableData {
  const rows: DataTableRow[] = data.items.map((item) => {
    const ended = item.state === ENDED_BY_STUDENT;
    const overdue = !ended && item.overdueByDays !== null;
    const dueSoon = !ended && !overdue && item.nextDueAt !== null && item.nextDueAt - nowSeconds <= WEEK_SECONDS;
    const programme = ended ? `Left the programme${item.lastReviewAt ? ` ${dayMonth(item.lastReviewAt)}` : ''}` : [item.programme, item.target].filter(Boolean).join(' · ');
    let next = cell(item.nextDueAt ? dayMonth(item.nextDueAt) : 'After first review');
    if (ended) next = muted('—');
    else if (overdue) next = cell(`Overdue by ${item.overdueByDays} day${item.overdueByDays === 1 ? '' : 's'}`, 'danger');
    let state = pill('On track', 'positive');
    if (ended) state = pill('Ended by student', 'neutral');
    else if (overdue) state = pill('Chase', 'danger');
    else if (dueSoon) state = pill('Due this week', 'attention');
    return {
      id: item.id,
      cells: [strong(item.label), strong(programme), muted(item.lastReviewAt ? dayMonth(item.lastReviewAt) : 'Not yet'), next, state],
    };
  });
  return {
    badge: data.overdue > 0 ? { label: `${data.overdue} overdue review${data.overdue === 1 ? '' : 's'}`, tone: 'danger' } : undefined,
    stats: [
      { value: String(data.onProgramme), label: 'On a programme' },
      { value: String(data.overdue), label: 'Overdue', tone: data.overdue > 0 ? 'danger' : 'text' },
      { value: String(data.dueThisWeek), label: 'Due this week', tone: data.dueThisWeek > 0 ? 'attention' : 'text' },
      { value: String(data.endedByStudent), label: 'Left, kept records' },
    ],
    rows,
  };
}

export const chronicApiSource: ConsoleTableSource = {
  async load() {
    return mapChronic(await apiRequest<ChronicResponse>('/work/chronic'));
  },
};

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
      { id: 'c1', cells: [strong('C-108 · AK'), strong('Asthma · action plan in place'), muted('14 Aug'), cell('Overdue by 12 days', 'danger'), pill('Chase', 'danger')] },
      { id: 'c2', cells: [strong('B-214 · KC'), strong('Vitamin D · repeat at 12 weeks'), muted('20 Sep'), strong('13 Dec'), pill('On track', 'positive')] },
      { id: 'c3', cells: [strong('D-042 · NP'), strong('Anemia · Hb at 8 weeks'), muted('21 Sep'), strong('16 Nov'), pill('On track', 'positive')] },
      { id: 'c4', cells: [strong('B-119 · IS'), strong('Diabetes · HbA1c quarterly'), muted('02 Jul'), strong('01 Oct'), pill('Due this week', 'attention')] },
      { id: 'c5', cells: [strong('A-331 · RM'), strong('Left the programme 18 Sep'), muted('18 Sep'), muted('—'), pill('Ended by student', 'neutral')] },
    ],
  };
}

export function defaultChronicSource(): ConsoleTableSource {
  return isDev() ? { load: async () => chronicSample() } : chronicApiSource;
}

export function ClinicianChronicConsoleScreen({ source }: { source?: ConsoleTableSource }): React.ReactElement {
  return <ConsoleTableScreen navId="chronic-care" config={chronicConfig} source={source ?? defaultChronicSource()} />;
}
