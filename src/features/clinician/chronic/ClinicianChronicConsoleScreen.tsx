import React, { useMemo, useState } from 'react';
import { demoDataEnabled } from '@/core/env';
import { useT } from '@/i18n';
import { apiRequest } from '@/data/services/http';
import type { DataTableRow } from '@/design-system';
import { ConsoleTableScreen } from '../shared/ConsoleTableScreen';
import type { ConsoleTableConfig, ConsoleTableData, ConsoleTableSource } from '../shared/consoleTable';
import { cell, muted, pill, strong } from '../shared/cells';
import type { Request, T } from '../shared/clinicalData';

/**
 * ClinicianChronic — chronic tracker (design page 5, Tier 1, approved 2026-10-21).
 *
 * Production reads `/work/chronic`. Students are "B-214 · KC" (room and
 * initials); the API sends no names. A student who leaves keeps their record,
 * stops being chased, and is never reported to their campus — stated on the
 * screen because it is why someone will leave a programme they need to leave.
 */
export function chronicConfig(t: T): ConsoleTableConfig {
  return {
    title: t('clinChronic.title'),
    subtitle: t('clinChronic.subtitle'),
    caption: t('clinChronic.caption'),
    columns: [
      { label: t('clinChronic.col.student'), width: '140px' },
      { label: t('clinChronic.col.programme') },
      { label: t('clinChronic.col.last'), width: '150px' },
      { label: t('clinChronic.col.next'), width: '150px' },
      { label: t('clinChronic.col.state'), width: '150px', align: 'end' },
    ],
    footnote: t('clinChronic.footnote'),
    empty: { title: t('clinChronic.emptyTitle'), body: t('clinChronic.emptyBody') },
    emptyIcon: 'stetho-alt--p4',
    unconnected: { title: t('clinChronic.unconnectedTitle'), body: t('clinChronic.unconnectedBody') },
    errorTitle: t('clinChronic.errorTitle'),
    reference: t('clinChronic.reference'),
    statLabels: [t('clinChronic.stat.on'), t('clinChronic.stat.overdue'), t('clinChronic.stat.dueWeek'), t('clinChronic.stat.left')],
  };
}

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

function defaultChronicSource(t: T): ConsoleTableSource {
  return demoDataEnabled() ? { load: async () => chronicSample() } : chronicApiSource(t);
}

export function ClinicianChronicConsoleScreen({ source }: { source?: ConsoleTableSource }): React.ReactElement {
  const t = useT();
  const config = useMemo(() => chronicConfig(t), [t]);
  const [fallback] = useState(() => defaultChronicSource(t));
  return <ConsoleTableScreen navId="chronic-care" config={config} source={source ?? fallback} />;
}
